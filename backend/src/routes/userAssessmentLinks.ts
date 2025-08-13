import express from 'express';
import { body, validationResult } from 'express-validator';
import { AssessmentService } from '../services/assessmentService';
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
