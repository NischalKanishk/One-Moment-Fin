import express from 'express';
import { body, validationResult } from 'express-validator';
import { AssessmentService } from '../services/assessmentService';
import { supabase } from '../config/supabase';

const router = express.Router();

// ============================================================================
// PUBLIC ASSESSMENT ROUTES (no authentication required)
// ============================================================================

// GET /assessment/:assessmentCode - Get assessment by assessment code
router.get('/:assessmentCode', async (req: express.Request, res: express.Response) => {
  try {
    const { assessmentCode } = req.params;

    // Get user by assessment code
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, assessment_link')
      .eq('assessment_link', `/assessment/${assessmentCode}`)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Assessment link not found' });
    }

    // Get default/active assessment for the user
    const assessmentData = await AssessmentService.getDefaultAssessment(user.id);
    if (!assessmentData) {
      return res.status(404).json({ error: 'No assessment found for this user' });
    }

    return res.json({
      assessment: {
        id: assessmentData.assessment.id,
        title: assessmentData.assessment.name,
        slug: assessmentData.assessment.slug || `assessment/${assessmentCode}`,
        user_id: user.id,
        user_name: user.full_name
      },
      questions: assessmentData.questions || assessmentData.snapshot,
      assessment_code: assessmentCode
    });
  } catch (error) {
    console.error('Get assessment by code error:', error);
    return res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// POST /assessment/:assessmentCode/submit - Submit assessment by assessment code
router.post('/:assessmentCode/submit', [
  body('answers').isObject().withMessage('Answers must be an object'),
  body('submitterInfo.full_name').notEmpty().withMessage('Full name is required'),
  body('submitterInfo.email').notEmpty().isEmail().withMessage('Valid email is required'),
  body('submitterInfo.phone').optional().isString().withMessage('Phone must be a string'),
  body('submitterInfo.age').optional().isInt({ min: 18, max: 100 }).withMessage('Age must be between 18 and 100')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assessmentCode } = req.params;
    const { answers, submitterInfo } = req.body;

    // Get user by assessment code
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, assessment_link')
      .eq('assessment_link', `/assessment/${assessmentCode}`)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Assessment link not found' });
    }

    // Get default assessment for the user
    const assessmentData = await AssessmentService.getDefaultAssessment(user.id);
    if (!assessmentData) {
      return res.status(404).json({ error: 'No assessment found for this user' });
    }

    // Submit assessment and create lead with assessment source
    const { submission, leadId } = await AssessmentService.submitAssessment(
      assessmentData.assessment.id,
      answers,
      submitterInfo,
      `/assessment/${assessmentCode}` // Use assessment link as source
    );

    return res.json({
      message: 'Assessment submitted successfully',
      result: {
        bucket: submission.result.bucket,
        score: submission.result.score,
        rubric: submission.result.rubric
      },
      leadId,
      submissionId: submission.id,
      assessment_code: assessmentCode
    });
  } catch (error) {
    console.error('Submit assessment by code error:', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// GET /r/:referralCode - Get referral-based assessment form
router.get('/referral/:referralCode', async (req: express.Request, res: express.Response) => {
  try {
    const { referralCode } = req.params;
    const { assessment: assessmentId } = req.query;

    // Get user by referral code
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, referral_link')
      .eq('referral_link', `r/${referralCode}`)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Referral link not found' });
    }

    // If assessment ID is provided, get that specific assessment
    let assessmentData;
    if (assessmentId) {
      assessmentData = await AssessmentService.getAssessmentById(assessmentId as string, user.id);
    } else {
      // Get default/active assessment for the user
      assessmentData = await AssessmentService.getDefaultAssessment(user.id);
    }

    if (!assessmentData) {
      return res.status(404).json({ error: 'Assessment not found or not accessible' });
    }

    return res.json({
      assessment: {
        id: assessmentData.assessment.id,
        title: assessmentData.assessment.name,
        slug: assessmentData.assessment.slug || `r/${referralCode}`,
        user_id: user.id,
        user_name: user.full_name
      },
      questions: assessmentData.snapshot || assessmentData.questions,
      referral_code: referralCode
    });
  } catch (error) {
    console.error('Get referral assessment error:', error);
    return res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// GET /a/:slug - Get public assessment form
router.get('/:slug', async (req: express.Request, res: express.Response) => {
  try {
    const { slug } = req.params;

    const assessmentData = await AssessmentService.getAssessmentBySlug(slug);

    if (!assessmentData) {
      return res.status(404).json({ error: 'Assessment not found or not published' });
    }

    return res.json({
      assessment: {
        id: assessmentData.assessment.id,
        title: assessmentData.assessment.title,
        slug: assessmentData.assessment.slug
      },
      questions: assessmentData.snapshot
    });
  } catch (error) {
    console.error('Get public assessment error:', error);
    return res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// POST /r/:referralCode/submit - Submit referral-based assessment
router.post('/referral/:referralCode/submit', [
  body('answers').isObject().withMessage('Answers must be an object'),
  body('submitterInfo.full_name').notEmpty().withMessage('Full name is required'),
  body('submitterInfo.email').optional().isEmail().withMessage('Email must be valid'),
  body('submitterInfo.phone').optional().isMobilePhone('any').withMessage('Phone must be valid'),
  body('assessmentId').optional().isUUID().withMessage('Assessment ID must be valid UUID')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { referralCode } = req.params;
    const { answers, submitterInfo, assessmentId } = req.body;

    // Get user by referral code
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, referral_link')
      .eq('referral_link', `r/${referralCode}`)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Referral link not found' });
    }

    // Get assessment data
    let assessmentData;
    if (assessmentId) {
      assessmentData = await AssessmentService.getAssessmentById(assessmentId, user.id);
    } else {
      assessmentData = await AssessmentService.getDefaultAssessment(user.id);
    }

    if (!assessmentData) {
      return res.status(404).json({ error: 'Assessment not found or not accessible' });
    }

    // Submit assessment and create lead with referral source
    const { submission, leadId } = await AssessmentService.submitAssessment(
      assessmentData.assessment.id,
      answers,
      submitterInfo,
      `r/${referralCode}` // Use referral link as source
    );

    return res.json({
      message: 'Assessment submitted successfully',
      result: {
        bucket: submission.result.bucket,
        score: submission.result.score,
        rubric: submission.result.rubric
      },
      leadId,
      submissionId: submission.id,
      referral_code: referralCode
    });
  } catch (error) {
    console.error('Submit referral assessment error:', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// POST /a/:slug/submit - Submit public assessment
router.post('/:slug/submit', [
  body('answers').isObject().withMessage('Answers must be an object'),
  body('submitterInfo.full_name').notEmpty().withMessage('Full name is required'),
  body('submitterInfo.email').optional().isEmail().withMessage('Email must be valid'),
  body('submitterInfo.phone').optional().isMobilePhone('any').withMessage('Phone must be valid')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { slug } = req.params;
    const { answers, submitterInfo } = req.body;

    // Get assessment data
    const assessmentData = await AssessmentService.getAssessmentBySlug(slug);
    if (!assessmentData) {
      return res.status(404).json({ error: 'Assessment not found or not published' });
    }

    // Submit assessment and create lead
    const { submission, leadId } = await AssessmentService.submitAssessment(
      assessmentData.assessment.id,
      answers,
      submitterInfo
    );

    return res.json({
      message: 'Assessment submitted successfully',
      result: {
        bucket: submission.result.bucket,
        score: submission.result.score,
        rubric: submission.result.rubric
      },
      leadId,
      submissionId: submission.id
    });
  } catch (error) {
    console.error('Submit public assessment error:', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

export default router;
