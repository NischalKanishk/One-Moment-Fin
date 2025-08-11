import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { AIService } from '../services/ai';
import { LeadStatusService } from '../services/leadStatusService';
import { DefaultAssessmentService } from '../services/defaultAssessmentService';
import { MigrateExistingUsersService } from '../services/migrateExistingUsers';

const router = express.Router();

// GET /api/assessments/test (Test endpoint for debugging - NO AUTH REQUIRED)
router.get('/test', async (req: express.Request, res: express.Response) => {
  try {
    return res.json({ 
      message: 'Assessments API is working',
      timestamp: new Date().toISOString(),
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        contentType: req.headers['content-type'] || 'Not set'
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({ error: 'Test failed' });
  }
});

// GET /api/assessments/public-test (Test public endpoint - NO AUTH REQUIRED)
router.get('/public-test', async (req: express.Request, res: express.Response) => {
  try {
    return res.json({ 
      message: 'Public assessments endpoint is working',
      timestamp: new Date().toISOString(),
      requestUrl: req.url,
      method: req.method
    });
  } catch (error) {
    console.error('Public test endpoint error:', error);
    return res.status(500).json({ error: 'Public test failed' });
  }
});

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

    // Update lead status to "Risk analyzed" when assessment form is submitted
    await LeadStatusService.updateStatusToRiskAnalyzed(lead_id);

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

// GET /api/assessments/forms (Get user's assessment forms)
router.get('/forms', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    // Ensure user has supabase_user_id
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

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
      .eq('user_id', req.user.supabase_user_id)
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

// GET /api/assessments/:lead_id (Get assessments for a lead)
router.get('/:lead_id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { lead_id } = req.params;

    // Ensure user has supabase_user_id
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

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
      .eq('user_id', req.user.supabase_user_id)
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

// POST /api/assessments/forms (Create new assessment form)
router.post('/forms', authenticateUser, [
  body('name').notEmpty().withMessage('Form name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('questions').isArray().withMessage('Questions must be an array'),
  body('questions.*.question_text').notEmpty().withMessage('Question text is required'),
  body('questions.*.type').isIn(['mcq', 'scale', 'text', 'dropdown', 'number']).withMessage('Valid question type required'),
  body('questions.*.options').optional().isArray().withMessage('Options must be an array'),
  body('questions.*.weight').optional().isInt({ min: 1 }).withMessage('Weight must be a positive integer')
], async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 Assessment creation request received');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Authenticated user:', req.user);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Ensure user has supabase_user_id
    if (!req.user?.supabase_user_id) {
      console.error('❌ User missing supabase_user_id:', req.user);
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { name, description, questions, is_active } = req.body;
    console.log('🔍 Creating assessment with data:', { name, description, questionsCount: questions.length, is_active });

    // If this is set as active, deactivate other forms
    if (is_active) {
      console.log('🔍 Deactivating other forms for user:', req.user.supabase_user_id);
      await supabase
        .from('assessments')
        .update({ is_active: false })
        .eq('user_id', req.user.supabase_user_id);
    }

    // Create assessment form
    const { data: form, error: formError } = await supabase
      .from('assessments')
      .insert({
        user_id: req.user.supabase_user_id,
        name,
        description,
        is_active: is_active || false
      })
      .select()
      .single();

    if (formError) {
      console.error('❌ Form creation error:', formError);
      return res.status(500).json({ error: 'Failed to create form' });
    }

    console.log('✅ Assessment form created:', form);

    // Create questions
    const questionsToInsert = questions.map((q: any) => ({
      assessment_id: form.id,
      question_text: q.question_text,
      type: q.type,
      options: q.options || null,
      weight: q.weight || 1
    }));

    console.log('🔍 Inserting questions:', questionsToInsert);

    const { error: questionsError } = await supabase
      .from('assessment_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('❌ Questions creation error:', questionsError);
      return res.status(500).json({ error: 'Failed to create questions' });
    }

    console.log('✅ Questions created successfully');

    return res.json({
      message: 'Assessment form created successfully',
      form: {
        ...form,
        questions: questionsToInsert
      }
    });
  } catch (error) {
    console.error('❌ Assessment creation error:', error);
    return res.status(500).json({ error: 'Failed to create assessment form' });
  }
});

// PUT /api/assessments/forms/:id (Update assessment form)
router.put('/forms/:id', authenticateUser, [
  body('name').notEmpty().withMessage('Form name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('questions').isArray().withMessage('Questions must be an array'),
  body('questions.*.question_text').notEmpty().withMessage('Question text is required'),
  body('questions.*.type').isIn(['mcq', 'scale', 'text', 'dropdown', 'number']).withMessage('Valid question type required'),
  body('questions.*.options').optional().isArray().withMessage('Options must be an array'),
  body('questions.*.weight').optional().isInt({ min: 1 }).withMessage('Weight must be a positive integer')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Ensure user has supabase_user_id
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { id } = req.params;
    const { name, description, questions, is_active } = req.body;

    // Check if user owns this assessment
    const { data: existingForm, error: checkError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (checkError || !existingForm) {
      return res.status(404).json({ error: 'Assessment form not found' });
    }

    // If this is set as active, deactivate other forms
    if (is_active) {
      await supabase
        .from('assessments')
        .update({ is_active: false })
        .eq('user_id', req.user.supabase_user_id);
    }

    // Update assessment form
    const { data: form, error: formError } = await supabase
      .from('assessments')
      .update({
        name,
        description,
        is_active: is_active || false
      })
      .eq('id', id)
      .select()
      .single();

    if (formError) {
      console.error('Form update error:', formError);
      return res.status(500).json({ error: 'Failed to update form' });
    }

    // Delete existing questions
    await supabase
      .from('assessment_questions')
      .delete()
      .eq('assessment_id', id);

    // Create new questions
    const questionsToInsert = questions.map((q: any) => ({
      assessment_id: id,
      question_text: q.question_text,
      type: q.type,
      options: q.options || null,
      weight: q.weight || 1
    }));

    const { error: questionsError } = await supabase
      .from('assessment_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Questions update error:', questionsError);
      return res.status(500).json({ error: 'Failed to update questions' });
    }

    return res.json({
      message: 'Assessment form updated successfully',
      form: {
        ...form,
        questions: questionsToInsert
      }
    });
  } catch (error) {
    console.error('Form update error:', error);
    return res.status(500).json({ error: 'Failed to update assessment form' });
  }
});

// DELETE /api/assessments/forms/:id (Delete assessment form)
router.delete('/forms/:id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    // Ensure user has supabase_user_id
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    // Check if user owns this assessment
    const { data: existingForm, error: checkError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (checkError || !existingForm) {
      return res.status(404).json({ error: 'Assessment form not found' });
    }

    // Delete questions first
    await supabase
      .from('assessment_questions')
      .delete()
      .eq('assessment_id', id);

    // Delete assessment
    const { error: deleteError } = await supabase
      .from('assessments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Form deletion error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete form' });
    }

    return res.json({ message: 'Assessment form deleted successfully' });
  } catch (error) {
    console.error('Form deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete assessment form' });
  }
});

// GET /api/assessments/public/:referralCode (Get public assessment by referral code)
router.get('/public/:referralCode', async (req: express.Request, res: express.Response) => {
  try {
    const { referralCode } = req.params;
    console.log('🔍 Public assessment request for referral code:', referralCode);
    
    // The referral code from the URL will be like "nischalEfM7c9"
    // But the database stores it as "/r/nischalEfM7c9"
    // So we need to construct the full referral link to search
    const fullReferralLink = `/r/${referralCode}`;
    console.log('🔍 Searching for referral link:', fullReferralLink);
    
    // First, find the user by their referral_link
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, referral_link, full_name')
      .eq('referral_link', fullReferralLink)
      .single();
    
    if (userError || !user) {
      console.log('❌ No user found for referral link:', fullReferralLink);
      console.log('🔍 User error:', userError);
      
      // Let's also check what users exist in the database
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, referral_link, full_name')
        .limit(5);
      
      if (!allUsersError && allUsers) {
        console.log('🔍 Available users in database:', allUsers);
      }
      
      return res.status(404).json({ error: 'Assessment not found or not published' });
    }

    console.log('✅ User found:', user);

    // Get the active assessment for this user
    const { data: assessment, error } = await supabase
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
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !assessment) {
      console.log('❌ No active assessment found for user:', user.id);
      console.log('🔍 Assessment error:', error);
      
      // Let's check what assessments exist for this user
      const { data: userAssessments, error: userAssessmentsError } = await supabase
        .from('assessments')
        .select('id, name, is_active')
        .eq('user_id', user.id);
      
      if (!userAssessmentsError && userAssessments) {
        console.log('🔍 User assessments:', userAssessments);
      }
      
      return res.status(404).json({ error: 'Assessment not found or not published' });
    }

    console.log('✅ Assessment found:', assessment);
    return res.json({ assessment });
  } catch (error) {
    console.error('❌ Public assessment fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// GET /api/assessments/default-questions (Get default assessment questions)
router.get('/default-questions', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const defaultQuestions = DefaultAssessmentService.getDefaultQuestions();
    return res.json({ questions: defaultQuestions });
  } catch (error) {
    console.error('Default questions fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch default questions' });
  }
});

// POST /api/assessments/reset-to-default/:id (Reset assessment to default questions)
router.post('/reset-to-default/:id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    // Ensure user has supabase_user_id
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    // Check if user owns this assessment
    const { data: existingForm, error: checkError } = await supabase
      .from('assessments')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (checkError || !existingForm) {
      return res.status(404).json({ error: 'Assessment form not found' });
    }

    // Reset to default questions
    const result = await DefaultAssessmentService.resetToDefault(req.user.supabase_user_id, id);

    if (result.success) {
      return res.json({
        message: 'Assessment reset to default successfully',
        questionsCount: result.questionsCount
      });
    } else {
      return res.status(500).json({ error: 'Failed to reset assessment to default' });
    }
  } catch (error) {
    console.error('Reset to default error:', error);
    return res.status(500).json({ error: 'Failed to reset assessment to default' });
  }
});

// POST /api/assessments/migrate-users (Admin endpoint to migrate existing users)
router.post('/migrate-users', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await MigrateExistingUsersService.migrateAllUsers();
    
    return res.json({
      message: 'Migration completed',
      ...result
    });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: 'Migration failed' });
  }
});

// GET /api/assessments/migration-status (Admin endpoint to check migration status)
router.get('/migration-status', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const status = await MigrateExistingUsersService.getMigrationStatus();
    
    return res.json(status);
  } catch (error) {
    console.error('Migration status error:', error);
    return res.status(500).json({ error: 'Failed to get migration status' });
  }
});

export default router;
