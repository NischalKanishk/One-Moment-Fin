import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { AssessmentFormService } from '../services/assessmentFormService';
import { AIService } from '../services/ai';
import { LeadStatusService } from '../services/leadStatusService';

const router = express.Router();

// ============================================================================
// AUTHENTICATED ROUTES (MFD Dashboard)
// ============================================================================

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

// GET /api/assessments/forms - List user forms with latest versions
router.get('/forms', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(400).json({ error: 'User not properly authenticated' });
    }

    const forms = await AssessmentFormService.getUserForms(req.user.supabase_user_id);
    return res.json({ forms });
  } catch (error) {
    console.error('Get forms error:', error);
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
// LEGACY COMPATIBILITY ROUTES (for backward compatibility)
// ============================================================================

// GET /api/assessments/test - Test endpoint
router.get('/test', async (req: express.Request, res: express.Response) => {
  try {
    return res.json({ 
      message: 'Assessments API v2 is working',
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({ error: 'Test failed' });
  }
});

export default router;
