import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { AssessmentFormService } from '../services/assessmentFormService';
import { AIService } from '../services/ai';
import { LeadStatusService } from '../services/leadStatusService';
import { AssessmentService } from '../services/assessmentService';

const router = express.Router();

// ============================================================================
// AUTHENTICATED ROUTES (MFD Dashboard)
// ============================================================================

// GET /api/assessments - List user assessments
router.get('/', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const assessments = await AssessmentService.getUserAssessments(req.user.supabase_user_id);
    return res.json({ assessments });
  } catch (error) {
    console.error('Get assessments error:', error);
    return res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// POST /api/assessments - Create a new assessment
router.post('/', authenticateUser, [
  body('title').notEmpty().withMessage('Assessment title is required'),
  body('framework_version_id').optional().isUUID().withMessage('Framework version ID must be a valid UUID'),
  body('is_default').optional().isBoolean().withMessage('is_default must be a boolean')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { title, framework_version_id, is_default } = req.body;

    const assessment = await AssessmentService.createAssessment(req.user.supabase_user_id, {
      title,
      framework_version_id,
      is_default
    });

    return res.status(201).json({ assessment });
  } catch (error) {
    console.error('Create assessment error:', error);
    return res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// POST /api/assessments/forms - Create a new assessment form
router.post('/forms', authenticateUser, [
  body('name').notEmpty().withMessage('Form name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { name, description, is_active } = req.body;

    const form = await AssessmentFormService.createForm(req.user.supabase_user_id, {
      name,
      description,
      is_active
    });

    return res.status(201).json({ form });
  } catch (error) {
    console.error('Create form error:', error);
    return res.status(500).json({ error: 'Failed to create assessment form' });
  }
});

// POST /api/assessments/forms/:formId/versions - Create a new version
router.post('/forms/:formId/versions', authenticateUser, [
  body('schema').isObject().withMessage('Schema is required'),
  body('ui').optional().isObject().withMessage('UI must be an object'),
  body('scoring').optional().isObject().withMessage('Scoring must be an object')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { formId } = req.params;
    const { schema, ui, scoring } = req.body;

    // Verify form ownership
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .select('id')
      .eq('id', formId)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const version = await AssessmentFormService.createVersion(formId, {
      schema,
      ui,
      scoring
    });

    return res.status(201).json({ version });
  } catch (error) {
    console.error('Create version error:', error);
    return res.status(500).json({ error: 'Failed to create form version' });
  }
});

// GET /api/assessments/forms - List user assessments with questions
router.get('/forms', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 Forms endpoint called');
    console.log('User:', req.user);
    console.log('User supabase_user_id:', req.user?.supabase_user_id);
    
    if (!req.user?.supabase_user_id) {
      console.error('❌ No supabase_user_id in request');
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    // Get user's assessments from the assessments table (show all, not just active ones)
    console.log('🔍 Querying assessments for user:', req.user.supabase_user_id);
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', req.user.supabase_user_id);

    if (assessmentsError) {
      console.error('❌ Get assessments error:', assessmentsError);
      return res.status(500).json({ error: 'Failed to fetch assessments' });
    }

    console.log('✅ Assessments found:', assessments?.length || 0);

    if (!assessments || assessments.length === 0) {
      console.log('ℹ️ No assessments found, returning empty array');
      return res.json({ forms: [] });
    }

    // For each assessment, get the questions
    console.log('🔍 Fetching questions for assessments...');
    const assessmentsWithQuestions = await Promise.all(
      assessments.map(async (assessment) => {
        console.log(`🔍 Fetching questions for assessment: ${assessment.id}`);
        const { data: questions, error: questionsError } = await supabase
          .from('assessment_questions')
          .select('*')
          .eq('assessment_id', assessment.id)
          .order('created_at', { ascending: true });

        if (questionsError) {
          console.error('❌ Error fetching questions for assessment:', assessment.id, questionsError);
          return {
            ...assessment,
            questions: []
          };
        }

        console.log(`✅ Questions found for assessment ${assessment.id}:`, questions?.length || 0);

        return {
          id: assessment.id,
          name: assessment.name,
          description: assessment.description,
          is_active: assessment.is_active,
          created_at: assessment.created_at,
          questions: questions || []
        };
      })
    );

    console.log('✅ Final result:', assessmentsWithQuestions.length, 'assessments with questions');
    return res.json({ forms: assessmentsWithQuestions });
  } catch (error) {
    console.error('❌ Get forms error:', error);
    return res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// GET /api/assessments/forms/:formId - Get form with all versions
router.get('/forms/:formId', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { formId } = req.params;
    const form = await AssessmentFormService.getFormWithVersions(formId, req.user.supabase_user_id);
    return res.json({ form });
  } catch (error) {
    console.error('Get form error:', error);
    if (error instanceof Error && error.message === 'Form not found') {
      return res.status(404).json({ error: 'Form not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch form' });
  }
});

// PUT /api/assessments/forms/:formId - Update assessment form
router.put('/forms/:formId', authenticateUser, [
  body('name').optional().isString().withMessage('Name must be a string'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { formId } = req.params;
    const { name, is_active } = req.body;

    // Verify form ownership and get current form data
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .select('id, name, is_active')
      .eq('id', formId)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Update the form
    const { data: updatedForm, error: updateError } = await supabase
      .from('assessment_forms')
      .update({ 
        name: name || form.name,
        is_active: is_active !== undefined ? is_active : form.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .eq('user_id', req.user.supabase_user_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update form error:', updateError);
      return res.status(500).json({ error: 'Failed to update form' });
    }

    return res.json({ form: updatedForm });
  } catch (error) {
    console.error('Update form error:', error);
    return res.status(500).json({ error: 'Failed to update assessment form' });
  }
});

// POST /api/assessments/users/default - Set default assessment form
router.post('/users/default', authenticateUser, [
  body('formId').isUUID().withMessage('Valid form ID is required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { formId } = req.body;

    // Verify form ownership
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .select('id')
      .eq('id', formId)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    await AssessmentFormService.setDefaultForm(req.user.supabase_user_id, formId);
    return res.json({ message: 'Default form updated successfully' });
  } catch (error) {
    console.error('Set default form error:', error);
    return res.status(500).json({ error: 'Failed to set default form' });
  }
});



// POST /api/assessments/assign - Assign form to a lead
router.post('/assign', authenticateUser, [
  body('leadId').isUUID().withMessage('Valid lead ID is required'),
  body('formId').isUUID().withMessage('Valid form ID is required'),
  body('versionId').optional().isUUID().withMessage('Version ID must be a valid UUID')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { leadId, formId, versionId } = req.body;

    // Verify lead ownership
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Verify form ownership
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .select('id')
      .eq('id', formId)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    await AssessmentFormService.assignFormToLead(req.user.supabase_user_id, leadId, formId, versionId);
    return res.json({ message: 'Form assigned to lead successfully' });
  } catch (error) {
    console.error('Assign form error:', error);
    return res.status(500).json({ error: 'Failed to assign form to lead' });
  }
});

// POST /api/assessments/links - Create expiring assessment link
router.post('/links', authenticateUser, [
  body('formId').isUUID().withMessage('Valid form ID is required'),
  body('leadId').optional().isUUID().withMessage('Lead ID must be a valid UUID'),
  body('versionId').optional().isUUID().withMessage('Version ID must be a valid UUID'),
  body('expiresInDays').optional().isInt({ min: 1, max: 30 }).withMessage('Expires in days must be 1-30')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { formId, leadId, versionId, expiresInDays } = req.body;

    // Verify form ownership
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .select('id')
      .eq('id', formId)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const link = await AssessmentFormService.createAssessmentLink(req.user.supabase_user_id, {
      leadId,
      formId,
      versionId,
      expiresInDays
    });

    const publicUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/assess/${link.token}`;

    return res.json({ 
      link,
      publicUrl,
      message: 'Assessment link created successfully'
    });
  } catch (error) {
    console.error('Create link error:', error);
    return res.status(500).json({ error: 'Failed to create assessment link' });
  }
});

// POST /api/assessments/manual-submit - Manual submission by MFD
router.post('/manual-submit', authenticateUser, [
  body('leadId').isUUID().withMessage('Valid lead ID is required'),
  body('formId').isUUID().withMessage('Valid form ID is required'),
  body('versionId').optional().isUUID().withMessage('Version ID must be a valid UUID'),
  body('answers').isObject().withMessage('Answers must be an object')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { leadId, formId, versionId, answers } = req.body;

    // Verify lead ownership
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get effective form and version
    const { form, version } = await AssessmentFormService.getEffectiveFormForLead(
      req.user.supabase_user_id, 
      leadId
    );

    const submission = await AssessmentFormService.submitAssessment({
      userId: req.user.supabase_user_id,
      leadId,
      formId: form.id,
      versionId: version.id,
      filledBy: 'mfd',
      answers
    });

    // Update lead status
    await LeadStatusService.updateStatusToRiskAnalyzed(leadId);

    return res.json({ 
      submission,
      message: 'Assessment submitted successfully'
    });
  } catch (error) {
    console.error('Manual submit error:', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// GET /api/assessments/submissions/:leadId - Get submissions for a lead
router.get('/submissions/:leadId', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { leadId } = req.params;

    // Verify lead ownership
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('user_id', req.user.supabase_user_id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const submissions = await AssessmentFormService.getLeadSubmissions(req.user.supabase_user_id, leadId);
    return res.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// PATCH /api/assessments/submissions/:submissionId/status - Update submission status
router.patch('/submissions/:submissionId/status', authenticateUser, [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('reviewReason').optional().isString().withMessage('Review reason must be a string')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { submissionId } = req.params;
    const { status, reviewReason } = req.body;

    await AssessmentFormService.updateSubmissionStatus(
      submissionId,
      req.user.supabase_user_id,
      status,
      reviewReason
    );

    return res.json({ message: 'Submission status updated successfully' });
  } catch (error) {
    console.error('Update submission status error:', error);
    return res.status(500).json({ error: 'Failed to update submission status' });
  }
});

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// POST /api/assessments/submit - Submit assessment responses (public)
router.post('/submit', [
  body('lead_id').isUUID().withMessage('Valid lead ID is required'),
  body('assessment_id').isUUID().withMessage('Valid assessment ID is required'),
  body('responses').isArray().withMessage('Responses must be an array'),
  body('responses.*.question_id').isString().withMessage('Question ID is required'),
  body('responses.*.answer_value').notEmpty().withMessage('Answer value is required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lead_id, assessment_id, responses } = req.body;

    // Verify the lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, user_id')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Verify the assessment form exists
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .select('id, user_id')
      .eq('id', assessment_id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Assessment form not found' });
    }

    // Verify the lead belongs to the same user as the assessment form
    if (lead.user_id !== form.user_id) {
      return res.status(403).json({ error: 'Lead and assessment form mismatch' });
    }

    // Get the latest version of the assessment form
    const { data: version, error: versionError } = await supabase
      .from('assessment_form_versions')
      .select('*')
      .eq('form_id', assessment_id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (versionError || !version) {
      return res.status(404).json({ error: 'Assessment form version not found' });
    }

    // Create assessment submission
    const { data: submission, error: submissionError } = await supabase
      .from('assessment_submissions')
      .insert({
        user_id: lead.user_id,
        lead_id: lead_id,
        form_id: assessment_id,
        version_id: version.id,
        filled_by: 'lead',
        answers: responses,
        status: 'submitted'
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Assessment submission error:', submissionError);
      return res.status(500).json({ error: 'Failed to submit assessment' });
    }

    // Update lead status to 'assessment_done'
    await supabase
      .from('leads')
      .update({ status: 'assessment_done' })
      .eq('id', lead_id);

    // TODO: Trigger AI scoring here if needed
    // For now, just return success

    return res.json({ 
      submission,
      message: 'Assessment submitted successfully'
    });
  } catch (error) {
    console.error('Public assessment submission error:', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// GET /api/assessments/public/:referralCode - Get public assessment by referral code
router.get('/public/:referralCode', async (req: express.Request, res: express.Response) => {
  try {
    const { referralCode } = req.params;

    // Get user by referral code
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, default_assessment_form_id')
      .eq('referral_link', `/r/${referralCode}`)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Referral code not found' });
    }

    if (!user.default_assessment_form_id) {
      return res.status(404).json({ error: 'No assessment form configured' });
    }

    // Get the latest version of the default form
    const { data: version, error: versionError } = await supabase
      .from('assessment_form_versions')
      .select('*')
      .eq('form_id', user.default_assessment_form_id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (versionError || !version) {
      return res.status(404).json({ error: 'Assessment form not available' });
    }

    // Get form details
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .select('name, description')
      .eq('id', user.default_assessment_form_id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Assessment form not found' });
    }

    return res.json({
      assessment: {
        id: user.default_assessment_form_id,
        name: form.name,
        description: form.description,
        schema: version.schema,
        ui: version.ui,
        user_id: user.id, // Include user_id for lead creation
        branding: {
          mfd_name: user.full_name
        }
      }
    });
  } catch (error) {
    console.error('Public assessment error:', error);
    return res.status(500).json({ error: 'Failed to load assessment' });
  }
});

// GET /api/assessments/token/:token - Get assessment by token
router.get('/token/:token', async (req: express.Request, res: express.Response) => {
  try {
    const { token } = req.params;

    // Get assessment link
    const { data: link, error: linkError } = await supabase
      .from('assessment_links')
      .select(`
        *,
        form:assessment_forms(name, description),
        version:assessment_form_versions(*)
      `)
      .eq('token', token)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (linkError || !link) {
      return res.status(404).json({ error: 'Assessment link not found or expired' });
    }

    return res.json({
      assessment: {
        id: link.form_id,
        name: link.form.name,
        description: link.form.description,
        schema: link.version.schema,
        ui: link.version.ui,
        branding: {
          mfd_name: 'Financial Advisor' // Generic branding for token links
        }
      }
    });
  } catch (error) {
    console.error('Token assessment error:', error);
    return res.status(500).json({ error: 'Failed to load assessment' });
  }
});

// POST /api/assessments/token/:token/submit - Submit assessment via token
router.post('/token/:token/submit', [
  body('answers').isObject().withMessage('Answers must be an object'),
  body('leadData').optional().isObject().withMessage('Lead data must be an object')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.params;
    const { answers, leadData } = req.body;

    // Get and validate assessment link
    const { data: link, error: linkError } = await supabase
      .from('assessment_links')
      .select('*')
      .eq('token', token)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (linkError || !link) {
      return res.status(404).json({ error: 'Assessment link not found or expired' });
    }

    let leadId = link.lead_id;

    // Create lead if not exists (new intake)
    if (!leadId && leadData) {
      const { data: newLead, error: leadCreateError } = await supabase
        .from('leads')
        .insert({
          user_id: link.user_id,
          full_name: leadData.full_name,
          email: leadData.email,
          phone: leadData.phone,
          age: leadData.age,
          source_link: `Token: ${token.substring(0, 8)}...`,
          status: 'lead'
        })
        .select()
        .single();

      if (leadCreateError) {
        throw new Error(`Failed to create lead: ${leadCreateError.message}`);
      }

      leadId = newLead.id;
    }

    // Submit assessment
    const submission = await AssessmentFormService.submitAssessment({
      userId: link.user_id,
      leadId,
      formId: link.form_id,
      versionId: link.version_id || '', // Should always have version for token links
      filledBy: 'lead',
      answers
    });

    // Mark link as submitted
    await supabase
      .from('assessment_links')
      .update({ 
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .eq('id', link.id);

    return res.json({ 
      submission,
      message: 'Assessment submitted successfully'
    });
  } catch (error) {
    console.error('Token submit error:', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// ============================================================================
// RISK ASSESSMENT SYSTEM ROUTES
// ============================================================================

// GET /api/assessments/frameworks - Get available risk frameworks
router.get('/frameworks', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const frameworks = await AssessmentService.getFrameworks();
    return res.json({ frameworks });
  } catch (error) {
    console.error('Get frameworks error:', error);
    return res.status(500).json({ error: 'Failed to fetch frameworks' });
  }
});

// POST /api/assessments - Create new assessment
router.post('/', authenticateUser, [
  body('title').notEmpty().withMessage('Title is required'),
  body('framework_version_id').optional().isUUID().withMessage('Framework version ID must be valid UUID'),
  body('is_default').optional().isBoolean().withMessage('is_default must be a boolean')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { title, framework_version_id, is_default } = req.body;

    const assessment = await AssessmentService.createAssessment(req.user.supabase_user_id, {
      title,
      framework_version_id,
      is_default
    });

    return res.status(201).json({ assessment });
  } catch (error) {
    console.error('Create assessment error:', error);
    return res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// PATCH /api/assessments/:id - Update assessment
router.patch('/:id', authenticateUser, [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('framework_version_id').optional().isUUID().withMessage('Framework version ID must be valid UUID'),
  body('is_published').optional().isBoolean().withMessage('is_published must be a boolean')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { id } = req.params;
    const updateData = req.body;

    const assessment = await AssessmentService.updateAssessment(id, req.user.supabase_user_id, updateData);

    return res.json({ assessment });
  } catch (error) {
    console.error('Update assessment error:', error);
    return res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// GET /api/assessments/:id - Get assessment details (owner only)
router.get('/:id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { id } = req.params;
    const assessment = await AssessmentService.getAssessment(id, req.user.supabase_user_id);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    return res.json({ assessment });
  } catch (error) {
    console.error('Get assessment error:', error);
    return res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// GET /api/assessments/:id/submissions - Get assessment submissions
router.get('/:id/submissions', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { id } = req.params;
    const submissions = await AssessmentService.getAssessmentSubmissions(id, req.user.supabase_user_id);

    return res.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/submissions/:id - Get submission details
router.get('/submissions/:id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { id } = req.params;
    const submission = await AssessmentService.getSubmission(id, req.user.supabase_user_id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.json({ submission });
  } catch (error) {
    console.error('Get submission error:', error);
    return res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// GET /api/assessments/frameworks/:frameworkId/questions - Get questions for a specific framework
router.get('/frameworks/:frameworkId/questions', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const { frameworkId } = req.params;

    // Get questions for the framework by joining framework_question_map with question_bank
    const { data: questions, error: questionsError } = await supabase
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
      .eq('framework_version_id', frameworkId)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('❌ Error fetching framework questions:', questionsError);
      return res.status(500).json({ error: 'Failed to fetch framework questions' });
    }

    // Transform the data to match the expected format
    const transformedQuestions = questions?.map((q: any) => ({
      id: q.id,
      qkey: q.qkey,
      label: q.question_bank?.label,
      qtype: q.question_bank?.qtype,
      options: q.options_override || q.question_bank?.options,
      required: q.required,
      order_index: q.order_index,
      module: q.question_bank?.module
    })) || [];

    console.log(`✅ Found ${transformedQuestions.length} questions for framework ${frameworkId}`);
    return res.json({ questions: transformedQuestions });

  } catch (error) {
    console.error('❌ Get framework questions error:', error);
    return res.status(500).json({ error: 'Failed to fetch framework questions' });
  }
});

// ============================================================================
// LEGACY COMPATIBILITY ROUTES (for backward compatibility)
// ============================================================================

// GET /api/assessments/health - Health check endpoint (no auth required)
router.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 Health check endpoint called');
    
    // Test basic database connection
    const { data: testData, error: testError } = await supabase
      .from('assessments')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Health check database error:', testError);
      return res.status(500).json({ 
        status: 'unhealthy',
        error: 'Database connection failed',
        details: testError.message 
      });
    }
    
    return res.json({ 
      status: 'healthy',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    return res.status(500).json({ 
      status: 'unhealthy',
      error: 'Health check failed' 
    });
  }
});

// GET /api/assessments/test - Test endpoint to verify database connectivity
router.get('/test', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 Test endpoint called');
    console.log('User:', req.user);
    console.log('User supabase_user_id:', req.user?.supabase_user_id);
    
    // Test basic database connection
    const { data: testData, error: testError } = await supabase
      .from('assessments')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('Database test error:', testError);
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: testError.message 
      });
    }
    
    return res.json({ 
      message: 'Database connection successful',
      user: req.user,
      testData
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({ error: 'Test failed' });
  }
});

export default router;
