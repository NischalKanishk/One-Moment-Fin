import { supabase } from '../config/supabase';
import { AssessmentForm, AssessmentFormVersion, LeadAssessmentAssignment, AssessmentSubmission, AssessmentLink } from '../config/supabase';
import { validateFormData, FormSchema } from '../lib/forms/validate';
import { calculateRiskScore, ScoringConfig } from '../lib/forms/score';
import { generateToken } from '../lib/links/token';

export class AssessmentFormService {
  /**
   * Create a new assessment form
   */
    static async createForm(userId: string, data: {
    name: string;
    description?: string;
    is_active?: boolean;
  }): Promise<AssessmentForm> {
    const { data: form, error } = await supabase
      .from('assessment_forms')
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description,
        is_active: data.is_active ?? true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create assessment form: ${error.message}`);
    }

    return form;
  }

  /**
   * Create a new version of an assessment form
   */
  static async createVersion(formId: string, data: {
    schema: FormSchema;
    ui?: any;
    scoring?: ScoringConfig;
  }): Promise<AssessmentFormVersion> {
    // Get the latest version number
    const { data: latestVersion } = await supabase
      .from('assessment_form_versions')
      .select('version')
      .eq('form_id', formId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersionNumber = (latestVersion?.version || 0) + 1;

    const { data: version, error } = await supabase
      .from('assessment_form_versions')
      .insert({
        form_id: formId,
        version: newVersionNumber,
        schema: data.schema,
        ui: data.ui,
        scoring: data.scoring
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create form version: ${error.message}`);
    }

    return version;
  }

  /**
   * Get all forms for a user with their latest versions
   */
  static async getUserForms(userId: string): Promise<Array<AssessmentForm & { latest_version?: AssessmentFormVersion }>> {
    // First get all forms for the user
    const { data: forms, error: formsError } = await supabase
      .from('assessment_forms')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (formsError) {
      throw new Error(`Failed to fetch user forms: ${formsError.message}`);
    }

    if (!forms || forms.length === 0) {
      return [];
    }

    // For each form, get the latest version
    const formsWithVersions = await Promise.all(
      forms.map(async (form) => {
        const { data: latestVersion } = await supabase
          .from('assessment_form_versions')
          .select('id, version, schema, ui, scoring, created_at')
          .eq('form_id', form.id)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        return {
          ...form,
          latest_version: latestVersion || undefined
        };
      })
    );

    return formsWithVersions;
  }

  /**
   * Get a specific form with all its versions
   */
  static async getFormWithVersions(formId: string, userId: string): Promise<AssessmentForm & { versions: AssessmentFormVersion[] }> {
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .select('*')
      .eq('id', formId)
      .eq('user_id', userId)
      .single();

    if (formError || !form) {
      throw new Error('Form not found');
    }

    const { data: versions, error: versionsError } = await supabase
      .from('assessment_form_versions')
      .select('*')
      .eq('form_id', formId)
      .order('version', { ascending: false });

    if (versionsError) {
      throw new Error(`Failed to fetch form versions: ${versionsError.message}`);
    }

    return {
      ...form,
      versions: versions || []
    };
  }

  /**
   * Get the effective form and version for a lead
   */
  static async getEffectiveFormForLead(userId: string, leadId: string): Promise<{
    form: AssessmentForm;
    version: AssessmentFormVersion;
  }> {
    // Check for lead-specific assignment
    const { data: assignment } = await supabase
      .from('lead_assessment_assignments')
      .select(`
        form_id,
        version_id,
        form:assessment_forms(*)
      `)
      .eq('user_id', userId)
      .eq('lead_id', leadId)
      .single();

    let formId: string;
    let versionId: string | undefined;

    if (assignment) {
      // Use lead-specific assignment
      formId = assignment.form_id;
      versionId = assignment.version_id;
    } else {
      // Use user's default form
      const { data: user } = await supabase
        .from('users')
        .select('default_assessment_form_id')
        .eq('id', userId)
        .single();

      if (!user?.default_assessment_form_id) {
        throw new Error('No default assessment form found');
      }

      formId = user.default_assessment_form_id;
    }

    // Get the form
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .select('*')
      .eq('id', formId)
      .eq('user_id', userId)
      .single();

    if (formError || !form) {
      throw new Error('Assessment form not found');
    }

          // Get the version (specific or latest)
      let version: AssessmentFormVersion;
      if (versionId) {
        // Use pinned version
        const { data: pinnedVersion, error: versionError } = await supabase
          .from('assessment_form_versions')
          .select('*')
          .eq('id', versionId)
          .single();

        if (versionError || !pinnedVersion) {
          throw new Error('Pinned version not found');
        }

        version = pinnedVersion;
      } else {
        // Use latest version
        const { data: latestVersion, error: versionError } = await supabase
          .from('assessment_form_versions')
          .select('*')
          .eq('form_id', formId)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        if (versionError || !latestVersion) {
          throw new Error('No versions found for form');
        }

        version = latestVersion;
      }

    return { form, version };
  }

  /**
   * Set user's default assessment form
   */
  static async setDefaultForm(userId: string, formId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ default_assessment_form_id: formId })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to set default form: ${error.message}`);
    }
  }

  /**
   * Assign a specific form to a lead
   */
  static async assignFormToLead(userId: string, leadId: string, formId: string, versionId?: string): Promise<void> {
    const { error } = await supabase
      .from('lead_assessment_assignments')
      .upsert({
        user_id: userId,
        lead_id: leadId,
        form_id: formId,
        version_id: versionId
      });

    if (error) {
      throw new Error(`Failed to assign form to lead: ${error.message}`);
    }
  }

  /**
   * Create an expiring assessment link
   */
  static async createAssessmentLink(userId: string, data: {
    leadId?: string;
    formId: string;
    versionId?: string;
    expiresInDays?: number;
  }): Promise<AssessmentLink> {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 3));

    const { data: link, error } = await supabase
      .from('assessment_links')
      .insert({
        token,
        user_id: userId,
        lead_id: data.leadId,
        form_id: data.formId,
        version_id: data.versionId,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create assessment link: ${error.message}`);
    }

    return link;
  }

  /**
   * Submit an assessment
   */
  static async submitAssessment(data: {
    userId: string;
    leadId?: string;
    formId: string;
    versionId: string;
    filledBy: 'lead' | 'mfd';
    answers: any;
  }): Promise<AssessmentSubmission> {
    // Get the form version to validate and score
    const { data: version, error: versionError } = await supabase
      .from('assessment_form_versions')
      .select('*')
      .eq('id', data.versionId)
      .single();

    if (versionError || !version) {
      throw new Error('Form version not found');
    }

    // Validate answers against schema
    const validation = validateFormData(version.schema, data.answers);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Calculate score if scoring config exists
    let score: number | undefined;
    let riskCategory: string | undefined;

    if (version.scoring) {
      const scoringResult = calculateRiskScore(data.answers, version.scoring);
      score = scoringResult.score;
      riskCategory = scoringResult.risk_category;
    }

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('assessment_submissions')
      .insert({
        user_id: data.userId,
        lead_id: data.leadId,
        form_id: data.formId,
        version_id: data.versionId,
        filled_by: data.filledBy,
        answers: data.answers,
        score,
        risk_category: riskCategory
      })
      .select()
      .single();

    if (submissionError) {
      throw new Error(`Failed to create submission: ${submissionError.message}`);
    }

    return submission;
  }

  /**
   * Get assessment submissions for a lead
   */
  static async getLeadSubmissions(userId: string, leadId: string): Promise<AssessmentSubmission[]> {
    const { data: submissions, error } = await supabase
      .from('assessment_submissions')
      .select(`
        *,
        form:assessment_forms(name),
        version:assessment_form_versions(version)
      `)
      .eq('user_id', userId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch lead submissions: ${error.message}`);
    }

    return submissions || [];
  }

  /**
   * Update submission status
   */
  static async updateSubmissionStatus(
    submissionId: string, 
    userId: string, 
    status: 'approved' | 'rejected',
    reviewReason?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('assessment_submissions')
      .update({ 
        status, 
        review_reason: reviewReason 
      })
      .eq('id', submissionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update submission status: ${error.message}`);
    }
  }
}
