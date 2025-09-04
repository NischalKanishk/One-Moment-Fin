import { supabase } from '../config/supabase';
import { getCFAFrameworkConfig, getCFAFrameworkQuestions } from './riskScoring';

export interface Assessment {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  framework_id: string;
  is_default: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentSnapshot {
  id: string;
  assessment_id: string;
  qkey: string;
  label: string;
  qtype: string;
  options: any;
  required: boolean;
  order_index: number;
}

export interface AssessmentSubmission {
  id: string;
  assessment_id: string;
  framework_id: string;
  owner_id: string;
  submitted_at: string;
  answers: Record<string, any>;
  result: any;
  lead_id?: string;
}

export interface CreateAssessmentData {
  title: string;
  framework_id?: string;
  is_default?: boolean;
}

export interface UpdateAssessmentData {
  title?: string;
  framework_id?: string;
  is_published?: boolean;
}

export class AssessmentService {
  /**
   * Create a new assessment for a user
   */
  static async createAssessment(userId: string, data: CreateAssessmentData): Promise<Assessment> {
    try {
      // Get the CFA framework ID
      const { data: cfaFramework } = await supabase
        .from('risk_frameworks')
        .select('id')
        .eq('code', 'cfa_three_pillar_v1')
        .single();
      
      if (!cfaFramework) {
        throw new Error('CFA framework not found');
      }

      // Create the assessment
      const { data: assessment, error } = await supabase
        .from('assessments')
        .insert({
          user_id: userId,
          title: data.title,
          slug: this.generateSlug(data.title),
          framework_id: cfaFramework.id,
          is_default: data.is_default || false,
          is_published: false
        })
        .select()
        .single();

      if (error || !assessment) {
        throw new Error(error?.message || 'Failed to create assessment');
      }

      return assessment as Assessment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing assessment
   */
  static async updateAssessment(
    assessmentId: string, 
    userId: string, 
    data: UpdateAssessmentData
  ): Promise<Assessment> {
    try {
      // Verify ownership
      const { data: existingAssessment, error: fetchError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !existingAssessment) {
        throw new Error('Assessment not found or access denied');
      }

      // If framework is changing, regenerate snapshot
      if (data.framework_id && data.framework_id !== existingAssessment.framework_id) {
        try {
          await this.generateSnapshot(assessmentId, data.framework_id);
        } catch (error) {
          // Continue with the update even if snapshot generation fails
        }
      }

      // Update the assessment
      const { data: assessment, error } = await supabase
        .from('assessments')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', assessmentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !assessment) {
        throw new Error(error?.message || 'Failed to update assessment');
      }

      return assessment as Assessment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get assessment by ID (owner only)
   */
  static async getAssessment(assessmentId: string, userId: string): Promise<Assessment | null> {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Assessment;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get assessment by slug (public)
   */
  static async getAssessmentBySlug(slug: string): Promise<{ assessment: Assessment; snapshot: AssessmentSnapshot[] } | null> {
    try {
      // Get the assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (assessmentError || !assessment) {
        return null;
      }

      // Get the snapshot
      const { data: snapshot, error: snapshotError } = await supabase
        .from('assessment_question_snapshots')
        .select('*')
        .eq('assessment_id', assessment.id)
        .order('order_index');

      if (snapshotError) {
        return null;
      }

      return {
        assessment: assessment as Assessment,
        snapshot: snapshot as AssessmentSnapshot[]
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user's assessments
   */
  static async getUserAssessments(userId: string): Promise<Assessment[]> {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as Assessment[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate question snapshot from CFA framework
   */
  static async generateSnapshot(assessmentId: string, frameworkId: string): Promise<void> {
    try {
      // Get CFA framework questions
      const questions = await getCFAFrameworkQuestions();
      
      if (questions.length === 0) {
        // Don't throw error, just clear existing snapshot and return
        await supabase
          .from('assessment_question_snapshots')
          .delete()
          .eq('assessment_id', assessmentId);
        return;
      }

      // Delete existing snapshot
      await supabase
        .from('assessment_question_snapshots')
        .delete()
        .eq('assessment_id', assessmentId);

      // Create new snapshot from CFA framework questions
      const snapshotData = questions.map(q => ({
        assessment_id: assessmentId,
        qkey: q.qkey,
        label: q.label,
        qtype: q.qtype,
        options: q.options,
        required: q.required,
        order_index: q.order_index
      }));

      const { error } = await supabase
        .from('assessment_question_snapshots')
        .insert(snapshotData);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Submit assessment and create/update lead
   */
  static async submitAssessment(
    assessmentId: string,
    answers: Record<string, any>,
    submitterInfo: { full_name: string; email?: string; phone?: string; age?: number },
    sourceLink?: string
  ): Promise<{ submission: AssessmentSubmission; leadId: string; isNewLead: boolean }> {
    try {
      // Get assessment details
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('is_published', true)
        .single();

      if (assessmentError || !assessment) {
        throw new Error('Assessment not found or not published');
      }
      
      // Get CFA framework config and score
      const frameworkConfig = await getCFAFrameworkConfig();
      if (!frameworkConfig) {
        throw new Error('CFA framework configuration not found');
      }
      
      // Import scoring function
      const { scoreSubmission } = await import('./riskScoring');
      const result = scoreSubmission(frameworkConfig, answers);
      // Create submission using existing assessment_submissions table
      const { data: submission, error: submissionError } = await supabase
        .from('assessment_submissions')
        .insert({
          framework_version_id: assessment.framework_id, // Use framework_version_id instead of assessment_id
          owner_id: assessment.user_id,
          submitted_at: new Date().toISOString(),
          answers: answers,
          result: {
            score: result.score,
            bucket: result.bucket,
            rubric: result.rubric
          }
        })
        .select()
        .single();

      if (submissionError || !submission) {
        throw new Error(submissionError?.message || 'Failed to create assessment submission');
      }

      // Check if lead with same email already exists for this user
      let lead;
      let isNewLead = false;
      
      if (submitterInfo.email) {
        const { data: existingLead, error: existingLeadError } = await supabase
          .from('leads')
          .select('*')
          .eq('user_id', assessment.user_id)
          .eq('email', submitterInfo.email)
          .single();

        if (existingLead && !existingLeadError) {
          // Update existing lead
          const { data: updatedLead, error: updateError } = await supabase
            .from('leads')
            .update({
              full_name: submitterInfo.full_name,
              phone: submitterInfo.phone,
              age: submitterInfo.age,
              source_link: sourceLink || `Assessment: ${assessment.title}`,
              status: 'assessment_done',
              risk_profile_id: submission.id, // Link to the new submission
              risk_bucket: result.bucket,
              risk_score: result.score,
              risk_category: result.bucket
            })
            .eq('id', existingLead.id)
            .select()
            .single();

          if (updateError || !updatedLead) {
            throw new Error(updateError?.message || 'Failed to update existing lead');
          }
          
          lead = updatedLead;
        } else {
          // Create new lead
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              user_id: assessment.user_id,
              full_name: submitterInfo.full_name,
              email: submitterInfo.email,
              phone: submitterInfo.phone,
              age: submitterInfo.age,
              source_link: sourceLink || `Assessment: ${assessment.title}`,
              status: 'assessment_done'
            })
            .select()
            .single();

          if (leadError || !newLead) {
            throw new Error(leadError?.message || 'Failed to create lead');
          }
          
          lead = newLead;
          isNewLead = true;
        }
      } else {
        // No email provided, always create new lead
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            user_id: assessment.user_id,
            full_name: submitterInfo.full_name,
            email: submitterInfo.email,
            phone: submitterInfo.phone,
            age: submitterInfo.age,
            source_link: sourceLink || `Assessment: ${assessment.title}`,
            status: 'assessment_done'
          })
          .select()
          .single();

        if (leadError || !newLead) {
          throw new Error(leadError?.message || 'Failed to create lead');
        }
        
        lead = newLead;
        isNewLead = true;
      }

      // Update submission with lead ID
      await supabase
        .from('assessment_submissions')
        .update({ lead_id: lead.id })
        .eq('id', submission.id);

      return {
        submission: submission as AssessmentSubmission,
        leadId: lead.id,
        isNewLead
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get assessment submissions for owner
   */
  static async getAssessmentSubmissions(assessmentId: string, userId: string): Promise<AssessmentSubmission[]> {
    try {
      // Verify ownership
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('id')
        .eq('id', assessmentId)
        .eq('user_id', userId)
        .single();

      if (assessmentError || !assessment) {
        throw new Error('Assessment not found or access denied');
      }

      const { data, error } = await supabase
        .from('assessment_submissions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('submitted_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as AssessmentSubmission[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get assessment by ID for a specific user
   */
  static async getAssessmentById(assessmentId: string, userId: string): Promise<any> {
    try {
      // Get assessment form with latest version
      const { data: form, error: formError } = await supabase
        .from('assessment_forms')
        .select(`
          *,
          assessment_form_versions (
            id,
            version,
            schema,
            ui,
            scoring,
            created_at
          )
        `)
        .eq('id', assessmentId)
        .eq('user_id', userId)
        .order('assessment_form_versions.created_at', { ascending: false })
        .limit(1)
        .single();

      if (formError || !form) {
        return null;
      }

      // Get questions from the latest version
      const latestVersion = form.assessment_form_versions?.[0];
      if (!latestVersion) {
        return null;
      }

      return {
        assessment: form,
        questions: this.schemaToQuestions(latestVersion.schema),
        snapshot: this.schemaToQuestions(latestVersion.schema)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get default assessment for a user
   */
  static async getDefaultAssessment(userId: string): Promise<any> {
    try {
      // Get CFA framework questions
      const questions = await getCFAFrameworkQuestions();
      
      if (!questions || questions.length === 0) {
        return null;
      }

      // Get or create default assessment for user
      let { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (assessmentError || !assessment) {
        // Create default assessment if it doesn't exist
        const { data: cfaFramework } = await supabase
          .from('risk_frameworks')
          .select('id')
          .eq('code', 'cfa_three_pillar_v1')
          .single();

        if (!cfaFramework) {
          throw new Error('CFA framework not found');
        }

        const { data: newAssessment, error: createError } = await supabase
          .from('assessments')
          .insert({
            user_id: userId,
            title: 'CFA Three-Pillar Risk Assessment',
            slug: 'cfa-risk-assessment',
            framework_id: cfaFramework.id,
            is_default: true,
            is_published: true
          })
          .select()
          .single();

        if (createError || !newAssessment) {
          throw new Error('Failed to create default assessment');
        }

        assessment = newAssessment;
      }

      return {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          slug: assessment.slug,
          user_id: assessment.user_id,
          framework_id: assessment.framework_id
        },
        questions: questions,
        snapshot: questions
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert schema to questions format
   */
  private static schemaToQuestions(schema: any): any[] {
    if (!schema || !schema.properties) {
      return [];
    }

    return Object.entries(schema.properties).map(([key, prop]: [string, any], index) => ({
      id: key,
      qkey: key,
      label: prop.title || key,
      qtype: prop.type || 'text',
      options: prop.enum || prop.oneOf || [],
      required: schema.required?.includes(key) || false,
      order_index: index
    }));
  }

  /**
   * Get submission details
   */
  static async getSubmission(submissionId: string, userId: string): Promise<AssessmentSubmission | null> {
    try {
      const { data, error } = await supabase
        .from('assessment_submissions')
        .select('*')
        .eq('id', submissionId)
        .eq('owner_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as AssessmentSubmission;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create default assessment for new user
   */
  static async createDefaultAssessment(userId: string): Promise<Assessment> {
    try {
      // Get CFA framework
      const { data: cfaFramework, error: frameworkError } = await supabase
        .from('risk_frameworks')
        .select('id')
        .eq('code', 'cfa_three_pillar_v1')
        .single();

      if (frameworkError || !cfaFramework) {
        throw new Error('CFA framework not found');
      }

      // Create default assessment
      const assessment = await this.createAssessment(userId, {
        title: 'CFA Three-Pillar Risk Assessment',
        framework_id: cfaFramework.id,
        is_default: true
      });

      // Publish it
      await this.updateAssessment(assessment.id, userId, { is_published: true });

      return assessment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate unique slug
   */
  private static generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    return `${baseSlug}-${Date.now()}`;
  }
}
