import express from 'express';
import { body, validationResult } from 'express-validator';
import { AssessmentService } from '../services/assessmentService';
import { getCFAFrameworkQuestions } from '../services/riskScoring';
import { supabase } from '../config/supabase';

const router = express.Router();

// ============================================================================
// USER ASSESSMENT LINK ROUTES (no authentication required)
// ============================================================================

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
      console.log('❌ No default assessment found for user, using CFA framework questions');
      
      // Use CFA framework questions directly
      try {
        const questions = await getCFAFrameworkQuestions();
        
        if (!questions || questions.length === 0) {
          console.log('❌ No CFA framework questions found');
          return res.status(404).json({ error: 'No assessment questions found' });
        }

        console.log('✅ Using CFA framework questions for user');
        
        return res.json({
          assessment: {
            id: 'cfa-framework',
            title: 'CFA Three-Pillar Risk Assessment',
            slug: 'cfa-risk-assessment'
          },
          questions: questions
        });
      } catch (error) {
        console.error('❌ Error getting CFA framework questions:', error);
        return res.status(500).json({ error: 'Failed to load assessment questions' });
      }
    }

    // If assessment exists, get its questions
    console.log('✅ Assessment found, getting questions');
    
    // Get CFA framework questions for the assessment
    try {
      const questions = await getCFAFrameworkQuestions();
      
      if (!questions || questions.length === 0) {
        console.log('❌ No CFA framework questions found');
        return res.status(404).json({ error: 'No assessment questions found' });
      }

      console.log('✅ CFA framework questions loaded:', questions.length);
      
      return res.json({
        assessment: {
          id: assessment.id,
          title: assessment.title,
          slug: assessment.slug
        },
        questions: questions
      });
    } catch (error) {
      console.error('❌ Error getting CFA framework questions:', error);
      return res.status(500).json({ error: 'Failed to load assessment questions' });
    }
  } catch (error) {
    console.error('❌ Public assessment error:', error);
    return res.status(500).json({ error: 'Failed to load assessment' });
  }
});

// POST /a/:userLink/submit - Submit public assessment by user assessment link
router.post('/:userLink/submit', [
  body('answers').isObject().withMessage('Answers must be an object'),
  body('submitterInfo.full_name').notEmpty().withMessage('Full name is required'),
  body('submitterInfo.email').optional().isEmail().withMessage('Email must be valid'),
  body('submitterInfo.phone').optional().custom((value) => {
    if (value && value.trim() !== '') {
      // Only validate if phone is provided and not empty
      if (!/^\+?[1-9]\d{1,14}$/.test(value)) {
        throw new Error('Phone must be a valid international number');
      }
    }
    return true;
  }).withMessage('Phone must be a valid international number')
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
    console.error('Submit assessment by user link error:', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

export default router;
