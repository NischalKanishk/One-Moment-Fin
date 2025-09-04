import { supabase } from '../config/supabase';

export class LeadStatusService {
  /**
   * Update lead status to "Risk analyzed" when assessment form is submitted
   */
  static async updateStatusToRiskAnalyzed(leadId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'assessment_done' })
        .eq('id', leadId);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update lead status to "Meeting scheduled" when at least 1 meeting is created
   */
  static async updateStatusToMeetingScheduled(leadId: string): Promise<void> {
    try {
      // Check if lead already has meeting_scheduled status or higher
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('status')
        .eq('id', leadId)
        .single();

      if (leadError) {
        throw leadError;
      }

      // Only update if current status is 'assessment_done' or 'lead'
      // Don't downgrade from 'converted', 'dropped', or 'meeting_scheduled'
      if (lead.status === 'lead' || lead.status === 'assessment_done') {
        const { error } = await supabase
          .from('leads')
          .update({ status: 'meeting_scheduled' })
          .eq('id', leadId);

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if lead should be updated to meeting_scheduled status
   * This is called when a meeting is created
   */
  static async checkAndUpdateMeetingStatus(leadId: string): Promise<void> {
    try {
      // Count meetings for this lead
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('id')
        .eq('lead_id', leadId);

      if (meetingsError) {
        throw meetingsError;
      }

      // If at least 1 meeting exists, update status
      if (meetings && meetings.length > 0) {
        await this.updateStatusToMeetingScheduled(leadId);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current lead status
   */
  static async getLeadStatus(leadId: string): Promise<string | null> {
    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .select('status')
        .eq('id', leadId)
        .single();

      if (error) {
        throw error;
      }

      return lead.status;
    } catch (error) {
      throw error;
    }
  }
}
