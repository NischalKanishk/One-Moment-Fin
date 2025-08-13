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
    const { submission, leadId, isNewLead } = await AssessmentService.submitAssessment(
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
      isNewLead,
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

// GET /a/:userLink - Get public assessment form by user assessment link
router.get('/:userLink', async (req: express.Request, res: express.Response) => {
  try {
    const { userLink } = req.params;
    console.log('🔍 Public assessment requested for user link:', userLink);

    // First, try to find user by assessment link
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, assessment_link')
      .eq('assessment_link', userLink)
      .single();

    if (userError || !user) {
      console.log('❌ User not found by assessment link, trying as assessment slug...');
      
      // If not found by assessment link, try as assessment slug (fallback)
      const assessmentData = await AssessmentService.getAssessmentBySlug(userLink);
      
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
    }

    console.log('✅ User found:', user.full_name);

    // Get the user's default assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .eq('is_published', true)
      .single();

    if (assessmentError || !assessment) {
      console.log('❌ No default assessment found for user');
      return res.status(404).json({ error: 'No assessment found for this user' });
    }

    console.log('✅ Assessment found:', assessment.title);

    // Get the assessment questions from framework (since snapshots might not exist)
    let questions = [];
    
    if (assessment.framework_version_id) {
      try {
        // Get framework questions
        const { data: frameworkQuestions, error: frameworkError } = await supabase
          .from('framework_question_map')
          .select(`
            id,
            qkey,
            required,
            order_index,
            alias,
            transform,
            options_override,
            question_bank!inner (
              label,
              qtype,
              options,
              module
            )
          `)
          .eq('framework_version_id', assessment.framework_version_id)
          .order('order_index', { ascending: true });

        if (frameworkError) {
          console.log('❌ Framework questions error:', frameworkError);
        } else {
          console.log('✅ Framework questions found:', frameworkQuestions?.length || 0);
          
          // Transform to match expected format
          questions = frameworkQuestions?.map((q: any) => ({
            id: q.id,
            qkey: q.qkey,
            label: q.question_bank?.label,
            qtype: q.question_bank?.qtype,
            options: q.options_override || q.question_bank?.options,
            required: q.required,
            order_index: q.order_index
          })) || [];
        }
      } catch (error) {
        console.log('❌ Error getting framework questions:', error);
      }
    }

    // If no framework questions, try to get from snapshots
    if (questions.length === 0) {
      const { data: snapshots, error: snapshotError } = await supabase
        .from('assessment_question_snapshots')
        .select('*')
        .eq('assessment_id', assessment.id)
        .order('order_index');

      if (!snapshotError && snapshots) {
        questions = snapshots;
        console.log('✅ Using question snapshots:', snapshots.length);
      }
    }

    if (questions.length === 0) {
      console.log('❌ No questions found for assessment');
      return res.status(404).json({ error: 'No questions found for this assessment' });
    }

    console.log('✅ Returning assessment with', questions.length, 'questions');

    return res.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        slug: assessment.slug,
        user_id: user.id,
        user_name: user.full_name
      },
      questions: questions
    });

  } catch (error) {
    console.error('Get public assessment by user link error:', error);
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
    const { submission, leadId, isNewLead } = await AssessmentService.submitAssessment(
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
      isNewLead,
      submissionId: submission.id,
      referral_code: referralCode
    });
  } catch (error) {
    console.error('Submit referral assessment error:', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// POST /a/:userLink/submit - Submit public assessment by user assessment link
router.post('/:userLink/submit', [
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

    const { userLink } = req.params;
    const { answers, submitterInfo } = req.body;
    console.log('🔍 Assessment submission requested for user link:', userLink);

    // First, try to find user by assessment link
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, assessment_link')
      .eq('assessment_link', userLink)
      .single();

    let assessmentId: string;
    let source: string;

    if (userError || !user) {
      console.log('❌ User not found by assessment link, trying as assessment slug...');
      
      // If not found by assessment link, try as assessment slug (fallback)
      const assessmentData = await AssessmentService.getAssessmentBySlug(userLink);
      if (!assessmentData) {
        return res.status(404).json({ error: 'Assessment not found or not published' });
      }
      
      assessmentId = assessmentData.assessment.id;
      source = userLink; // Use the slug as source
    } else {
      console.log('✅ User found:', user.full_name);
      
      // Get the user's default assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .eq('is_published', true)
        .single();

      if (assessmentError || !assessment) {
        return res.status(404).json({ error: 'No assessment found for this user' });
      }
      
      assessmentId = assessment.id;
      source = userLink; // Use the user assessment link as source
    }

    console.log('✅ Assessment ID for submission:', assessmentId);

    // Submit assessment and create lead
    const { submission, leadId, isNewLead } = await AssessmentService.submitAssessment(
      assessmentId,
      answers,
      submitterInfo,
      source
    );

    return res.json({
      message: 'Assessment submitted successfully',
      result: {
        bucket: submission.result.bucket,
        score: submission.result.score,
        rubric: submission.result.rubric
      },
      leadId,
      isNewLead,
      submissionId: submission.id,
      source: source
    });
  } catch (error) {
    console.error('Submit public assessment error:', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// POST /a/:slug/test - Submit test assessment (marks as test data)
router.post('/:slug/test', [
  body('answers').isObject().withMessage('Answers must be an object'),
  body('submitterInfo.full_name').notEmpty().withMessage('Full name is required'),
  body('submitterInfo.email').optional().isEmail().withMessage('Email must be valid'),
  body('submitterInfo.phone').optional().isMobilePhone('any').withMessage('Phone must be valid'),
  body('submitterInfo.age').optional().isInt({ min: 18, max: 100 }).withMessage('Age must be between 18 and 100')
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

    // Submit assessment and create lead with test marker
    const { submission, leadId, isNewLead } = await AssessmentService.submitAssessment(
      assessmentData.assessment.id,
      answers,
      submitterInfo,
      `TEST: ${slug}` // Mark as test submission
    );

    return res.json({
      message: 'Test assessment submitted successfully',
      result: {
        bucket: submission.result.bucket,
        score: submission.result.score,
        rubric: submission.result.rubric
      },
      leadId,
      isNewLead,
      submissionId: submission.id,
      isTest: true
    });
  } catch (error) {
    console.error('Submit test assessment error:', error);
    return res.status(500).json({ error: 'Failed to submit test assessment' });
  }
});

export default router;
