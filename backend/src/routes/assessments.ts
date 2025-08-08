import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { AIService } from '../services/ai';

const router = express.Router();

// POST /api/assessments/submit (Public endpoint for assessment submission)
router.post('/submit', [
  body('lead_id').notEmpty().withMessage('Lead ID is required'),
  body('assessment_id').notEmpty().withMessage('Assessment ID is required'),
  body('responses').isArray().withMessage('Responses must be an array'),
  body('responses.*.question_id').notEmpty().withMessage('Question ID is required'),
  body('responses.*.answer_value').notEmpty().withMessage('Answer value is required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lead_id, assessment_id, responses } = req.body;

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get assessment questions
    const { data: questions, error: questionsError } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessment_id);

    if (questionsError) {
      console.error('Questions fetch error:', questionsError);
      return res.status(500).json({ error: 'Failed to fetch assessment questions' });
    }

    // Create risk assessment
    const { data: riskAssessment, error: riskError } = await supabase
      .from('risk_assessments')
      .insert({
        lead_id,
        user_id: lead.user_id,
        assessment_id,
        ai_used: true
      })
      .select()
      .single();

    if (riskError) {
      console.error('Risk assessment creation error:', riskError);
      return res.status(500).json({ error: 'Failed to create risk assessment' });
    }

    // Save answers
    const answersToInsert = responses.map((response: any) => ({
      risk_assessment_id: riskAssessment.id,
      question_id: response.question_id,
      answer_value: response.answer_value
    }));

    const { error: answersError } = await supabase
      .from('risk_assessment_answers')
      .insert(answersToInsert);

    if (answersError) {
      console.error('Answers save error:', answersError);
      return res.status(500).json({ error: 'Failed to save answers' });
    }

    // Prepare answers for AI analysis
    const answersWithQuestions = responses.map((response: any) => {
      const question = questions.find((q: any) => q.id === response.question_id);
      return {
        question_text: question?.question_text || 'Unknown question',
        answer_value: response.answer_value
      };
    });

    // Get AI risk assessment
    const aiResult = await AIService.assessRisk(answersWithQuestions, lead.age);

    // Update risk assessment with AI results
    const { error: updateError } = await supabase
      .from('risk_assessments')
      .update({
        risk_score: aiResult.risk_score,
        risk_category: aiResult.risk_category
      })
      .eq('id', riskAssessment.id);

    if (updateError) {
      console.error('Risk assessment update error:', updateError);
    }

    // Update lead status
    await supabase
      .from('leads')
      .update({ status: 'assessment_done' })
      .eq('id', lead_id);

    return res.json({
      message: 'Assessment submitted successfully',
      risk_assessment: {
        ...riskAssessment,
        risk_score: aiResult.risk_score,
        risk_category: aiResult.risk_category,
        reasoning: aiResult.reasoning,
        confidence: aiResult.confidence
      }
    });
  } catch (error) {
    console.error('Assessment submission error:', error);
    return res.status(500).json({ error: 'Assessment submission failed' });
  }
});

// GET /api/assessments/:lead_id (Get assessments for a lead)
router.get('/:lead_id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { lead_id } = req.params;

    const { data: assessments, error } = await supabase
      .from('risk_assessments')
      .select(`
        *,
        risk_assessment_answers (
          id,
          answer_value,
          assessment_questions (
            id,
            question_text,
            type,
            options
          )
        )
      `)
      .eq('lead_id', lead_id)
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Assessments fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch assessments' });
    }

    return res.json({ assessments });
  } catch (error) {
    console.error('Assessments fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// POST /api/assessments/score (Internal AI scoring endpoint)
router.post('/score', authenticateUser, [
  body('answers').isArray().withMessage('Answers must be an array'),
  body('lead_age').optional().isInt().withMessage('Lead age must be a number')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { answers, lead_age } = req.body;

    const aiResult = await AIService.assessRisk(answers, lead_age);

    return res.json({
      risk_score: aiResult.risk_score,
      risk_category: aiResult.risk_category,
      reasoning: aiResult.reasoning,
      confidence: aiResult.confidence
    });
  } catch (error) {
    console.error('AI scoring error:', error);
    return res.status(500).json({ error: 'AI scoring failed' });
  }
});

// GET /api/assessments/forms (Get user's assessment forms)
router.get('/forms', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { data: forms, error } = await supabase
      .from('assessments')
      .select(`
        *,
        assessment_questions (
          id,
          question_text,
          type,
          options,
          weight
        )
      `)
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Forms fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch forms' });
    }

    return res.json({ forms });
  } catch (error) {
    console.error('Forms fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// POST /api/assessments/forms (Create new assessment form)
router.post('/forms', authenticateUser, [
  body('name').notEmpty().withMessage('Form name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('questions').isArray().withMessage('Questions must be an array'),
  body('questions.*.question_text').notEmpty().withMessage('Question text is required'),
  body('questions.*.type').isIn(['mcq', 'scale', 'text']).withMessage('Valid question type required'),
  body('questions.*.options').optional().isArray().withMessage('Options must be an array'),
  body('questions.*.weight').optional().isInt({ min: 1 }).withMessage('Weight must be a positive integer')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, questions, is_active } = req.body;

    // If this is set as active, deactivate other forms
    if (is_active) {
      await supabase
        .from('assessments')
        .update({ is_active: false })
        .eq('user_id', req.user!.id);
    }

    // Create assessment form
    const { data: form, error: formError } = await supabase
      .from('assessments')
      .insert({
        user_id: req.user!.id,
        name,
        description,
        is_active: is_active || false
      })
      .select()
      .single();

    if (formError) {
      console.error('Form creation error:', formError);
      return res.status(500).json({ error: 'Failed to create form' });
    }

    // Create questions
    const questionsToInsert = questions.map((q: any) => ({
      assessment_id: form.id,
      question_text: q.question_text,
      type: q.type,
      options: q.options || null,
      weight: q.weight || 1
    }));

    const { error: questionsError } = await supabase
      .from('assessment_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Questions creation error:', questionsError);
      return res.status(500).json({ error: 'Failed to create questions' });
    }

    return res.json({
      message: 'Assessment form created successfully',
      form: {
        ...form,
        questions: questionsToInsert
      }
    });
  } catch (error) {
    console.error('Form creation error:', error);
    return res.status(500).json({ error: 'Failed to create assessment form' });
  }
});

export default router;
