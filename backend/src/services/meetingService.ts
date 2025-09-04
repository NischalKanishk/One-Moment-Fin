import { supabase } from '../config/supabase';
import { LeadStatusService } from './leadStatusService';

export interface CreateMeetingRequest {
  lead_id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  platform: 'calendly' | 'zoom' | 'manual';
  attendees?: string[];
  calendly_link?: string;
}

export interface UpdateMeetingRequest {
  title?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  attendees?: string[];
  calendly_link?: string;
}

export interface MeetingResponse {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  meeting_link?: string;
  platform: string;
  status: string;
  calendly_link?: string;
  lead_name?: string;
  lead_email?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export class MeetingService {
  // Create a new meeting
  async createMeeting(userId: string, request: CreateMeetingRequest): Promise<MeetingResponse> {
    try {
      let meetingLink = null;

      // If Calendly is selected, use the provided link
      if (request.platform === 'calendly' && request.calendly_link) {
        meetingLink = request.calendly_link;
      }

      // Create meeting record in database
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          user_id: userId,
          lead_id: request.lead_id,
          title: request.title,
          start_time: request.start_time,
          end_time: request.end_time,
          description: request.description,
          platform: request.platform,
          meeting_link: meetingLink,
          calendly_link: request.calendly_link,
          status: 'scheduled'
        })
        .select(`
          *,
          leads!meetings_lead_id_fkey (
            full_name,
            email
          ),
          users!meetings_user_id_fkey (
            full_name
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create meeting: ${error.message}`);
      }

      // Update lead status to "Meeting scheduled"
      try {
        await LeadStatusService.checkAndUpdateMeetingStatus(request.lead_id);
      } catch (statusError) {
        console.error('Failed to update lead status:', statusError);
      }

      return this.transformMeetingData(meeting);
    } catch (error) {
      console.error('Meeting creation error:', error);
      throw error;
    }
  }

  // Update an existing meeting
  async updateMeeting(
    userId: string,
    meetingId: string,
    request: UpdateMeetingRequest
  ): Promise<MeetingResponse> {
    try {
      // Get existing meeting
      const { data: existingMeeting, error: fetchError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !existingMeeting) {
        throw new Error('Meeting not found');
      }

      let meetingLink = existingMeeting.meeting_link;

      // If meeting has Calendly integration, update the link
      if (existingMeeting.platform === 'calendly' && request.calendly_link) {
        meetingLink = request.calendly_link;
      }

      // Update meeting in database
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (request.title) updateData.title = request.title;
      if (request.start_time) updateData.start_time = request.start_time;
      if (request.end_time) updateData.end_time = request.end_time;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.calendly_link !== undefined) updateData.calendly_link = request.calendly_link;
      if (meetingLink) updateData.meeting_link = meetingLink;

      const { data: updatedMeeting, error } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', meetingId)
        .eq('user_id', userId)
        .select(`
          *,
          leads!meetings_lead_id_fkey (
            full_name,
            email
          ),
          users!meetings_user_id_fkey (
            full_name
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update meeting: ${error.message}`);
      }

      return this.transformMeetingData(updatedMeeting);
    } catch (error) {
      console.error('Meeting update error:', error);
      throw error;
    }
  }

  // Cancel a meeting
  async cancelMeeting(userId: string, meetingId: string, reason?: string): Promise<MeetingResponse> {
    try {
      // Get existing meeting
      const { data: existingMeeting, error: fetchError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !existingMeeting) {
        throw new Error('Meeting not found');
      }

      // Update meeting status in database
      const { data: updatedMeeting, error } = await supabase
        .from('meetings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        .eq('user_id', userId)
        .select(`
          *,
          leads!meetings_lead_id_fkey (
            full_name,
            email
          ),
          users!meetings_user_id_fkey (
            full_name
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to cancel meeting: ${error.message}`);
      }

      return this.transformMeetingData(updatedMeeting);
    } catch (error) {
      console.error('Meeting cancellation error:', error);
      throw error;
    }
  }

  // Get all meetings for a user
  async getUserMeetings(userId: string): Promise<MeetingResponse[]> {
    try {
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select(`
          *,
          leads!meetings_lead_id_fkey (
            full_name,
            email
          ),
          users!meetings_user_id_fkey (
            full_name
          )
        `)
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch meetings: ${error.message}`);
      }

      return meetings?.map(meeting => this.transformMeetingData(meeting)) || [];
    } catch (error) {
      console.error('Fetch meetings error:', error);
      throw error;
    }
  }

  // Get meetings for a specific lead
  async getLeadMeetings(userId: string, leadId: string): Promise<MeetingResponse[]> {
    try {
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select(`
          *,
          leads!meetings_lead_id_fkey (
            full_name,
            email
          ),
          users!meetings_user_id_fkey (
            full_name
          )
        `)
        .eq('user_id', userId)
        .eq('lead_id', leadId)
        .order('start_time', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch lead meetings: ${error.message}`);
      }

      return meetings?.map(meeting => this.transformMeetingData(meeting)) || [];
    } catch (error) {
      console.error('Fetch lead meetings error:', error);
      throw error;
    }
  }

  // Transform database meeting data to response format
  private transformMeetingData(meeting: any): MeetingResponse {
    return {
      id: meeting.id,
      title: meeting.title,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      description: meeting.description,
      meeting_link: meeting.meeting_link,
      platform: meeting.platform,
      status: meeting.status,
      calendly_link: meeting.calendly_link,
      lead_name: meeting.leads?.full_name,
      lead_email: meeting.leads?.email,
      created_by: meeting.users?.full_name,
      created_at: meeting.created_at,
      updated_at: meeting.updated_at
    };
  }
}

export default MeetingService;
