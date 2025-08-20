import { supabase } from '../config/supabase';
import GoogleCalendarService, { MeetingDetails, UserGoogleCredentials } from './googleCalendarService';
import { LeadStatusService } from './leadStatusService';

export interface CreateMeetingRequest {
  lead_id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  platform: 'google_meet' | 'zoom' | 'manual';
  attendees?: string[];
}

export interface UpdateMeetingRequest {
  title?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  attendees?: string[];
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
  external_event_id?: string;
  lead_name?: string;
  lead_email?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export class MeetingService {
  private googleCalendarService: GoogleCalendarService;

  constructor() {
    this.googleCalendarService = new GoogleCalendarService();
  }

  // Create a new meeting
  async createMeeting(userId: string, request: CreateMeetingRequest): Promise<MeetingResponse> {
    try {
      let externalEventId = null;
      let meetingLink = null;

      // If Google Meet is selected, create calendar event
      if (request.platform === 'google_meet') {
        try {
          // Get user's Google Calendar credentials
          const { data: userSettings, error: settingsError } = await supabase
            .from('user_settings')
            .select('google_access_token, google_refresh_token, google_email, google_name')
            .eq('user_id', userId)
            .single();

          if (settingsError || !userSettings?.google_access_token || !userSettings?.google_email) {
            throw new Error('Google Calendar not connected. Please connect your Google account first.');
          }

          // Set Google Calendar credentials for this user
          const userCredentials: UserGoogleCredentials = {
            accessToken: userSettings.google_access_token,
            refreshToken: userSettings.google_refresh_token,
            email: userSettings.google_email,
            name: userSettings.google_name
          };

          this.googleCalendarService.setUserCredentials(userCredentials);

          // Create Google Calendar event
          const meetingDetails: MeetingDetails = {
            title: request.title,
            description: request.description,
            startTime: new Date(request.start_time),
            endTime: new Date(request.end_time),
            attendees: request.attendees || []
          };

          const calendarEvent = await this.googleCalendarService.createMeeting(meetingDetails);

          externalEventId = calendarEvent.eventId;
          meetingLink = calendarEvent.meetingLink;

          // Send email invitation to lead using user's Gmail
          if (request.attendees && request.attendees.length > 0) {
            await this.sendMeetingInvitations(
              request.attendees,
              request.title,
              request.description || '',
              new Date(request.start_time),
              new Date(request.end_time),
              meetingLink || '',
              userCredentials
            );
          }
        } catch (error) {
          console.error('Google Calendar integration failed:', error);
          // Fall back to manual meeting creation
          request.platform = 'manual';
        }
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
          external_event_id: externalEventId,
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

      let externalEventId = existingMeeting.external_event_id;
      let meetingLink = existingMeeting.meeting_link;

      // If meeting has Google Calendar integration, update there too
      if (existingMeeting.external_event_id && existingMeeting.platform === 'google_meet') {
        try {
          const { data: userSettings, error: settingsError } = await supabase
            .from('user_settings')
            .select('google_access_token, google_refresh_token, google_email, google_name')
            .eq('user_id', userId)
            .single();

          if (!settingsError && userSettings?.google_access_token && userSettings?.google_email) {
            const userCredentials: UserGoogleCredentials = {
              accessToken: userSettings.google_access_token,
              refreshToken: userSettings.google_refresh_token,
              email: userSettings.google_email,
              name: userSettings.google_name
            };

            this.googleCalendarService.setUserCredentials(userCredentials);

            const meetingDetails: MeetingDetails = {
              title: request.title || existingMeeting.title,
              description: request.description || existingMeeting.description || '',
              startTime: new Date(request.start_time || existingMeeting.start_time),
              endTime: new Date(request.end_time || existingMeeting.end_time),
              attendees: request.attendees || []
            };

            const calendarEvent = await this.googleCalendarService.updateMeeting(
              existingMeeting.external_event_id,
              meetingDetails
            );

            meetingLink = calendarEvent.meetingLink;

            // Send update notifications using user's Gmail
            if (request.attendees && request.attendees.length > 0) {
              await this.sendMeetingInvitations(
                request.attendees,
                request.title || existingMeeting.title,
                request.description || existingMeeting.description || '',
                new Date(request.start_time || existingMeeting.start_time),
                new Date(request.end_time || existingMeeting.end_time),
                meetingLink || '',
                userCredentials,
                true
              );
            }
          }
        } catch (error) {
          console.error('Google Calendar update failed:', error);
        }
      }

      // Update meeting in database
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (request.title) updateData.title = request.title;
      if (request.start_time) updateData.start_time = request.start_time;
      if (request.end_time) updateData.end_time = request.end_time;
      if (request.description !== undefined) updateData.description = request.description;
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

      // If meeting has Google Calendar integration, cancel there too
      if (existingMeeting.external_event_id && existingMeeting.platform === 'google_meet') {
        try {
          const { data: userSettings, error: settingsError } = await supabase
            .from('user_settings')
            .select('google_access_token, google_refresh_token, google_email, google_name')
            .eq('user_id', userId)
            .single();

          if (!settingsError && userSettings?.google_access_token && userSettings?.google_email) {
            const userCredentials: UserGoogleCredentials = {
              accessToken: userSettings.google_access_token,
              refreshToken: userSettings.google_refresh_token,
              email: userSettings.google_email,
              name: userSettings.google_name
            };

            this.googleCalendarService.setUserCredentials(userCredentials);
            await this.googleCalendarService.cancelMeeting(existingMeeting.external_event_id, reason);
          }
        } catch (error) {
          console.error('Google Calendar cancellation failed:', error);
        }
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

  // Check if user has Google Calendar connected
  async checkGoogleCalendarConnection(userId: string): Promise<{
    isConnected: boolean;
    email?: string;
    name?: string;
  }> {
    try {
      const { data: userSettings, error } = await supabase
        .from('user_settings')
        .select('google_access_token, google_email, google_name')
        .eq('user_id', userId)
        .single();

      if (error || !userSettings) {
        return { isConnected: false };
      }

      // Check if user has Google credentials (temporary fix until google_calendar_connected column is added)
      const hasGoogleCredentials = !!(userSettings.google_access_token && userSettings.google_email);
      
      return {
        isConnected: hasGoogleCredentials,
        email: userSettings.google_email,
        name: userSettings.google_name
      };
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
      return { isConnected: false };
    }
  }

  // Send meeting invitations via email using user's Gmail
  private async sendMeetingInvitations(
    attendees: string[],
    title: string,
    description: string,
    startTime: Date,
    endTime: Date,
    meetingLink: string,
    userCredentials: UserGoogleCredentials,
    isUpdate: boolean = false
  ) {
    try {
      const subject = isUpdate 
        ? `Meeting Updated: ${title}`
        : `Meeting Invitation: ${title}`;

      const htmlContent = this.googleCalendarService.generateMeetingInviteHTML(
        title,
        description,
        startTime,
        endTime,
        meetingLink,
        userCredentials.name || 'OneMFin User',
        userCredentials.email,
        isUpdate
      );

      // Send to all attendees using user's Gmail
      for (const attendeeEmail of attendees) {
        try {
          await this.googleCalendarService.sendMeetingEmail(
            attendeeEmail,
            subject,
            htmlContent,
            userCredentials
          );
        } catch (emailError) {
          console.error(`Failed to send email to ${attendeeEmail}:`, emailError);
        }
      }
    } catch (error) {
      console.error('Failed to send meeting invitations:', error);
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
      external_event_id: meeting.external_event_id,
      lead_name: meeting.leads?.full_name,
      lead_email: meeting.leads?.email,
      created_by: meeting.users?.full_name,
      created_at: meeting.created_at,
      updated_at: meeting.updated_at
    };
  }
}

export default MeetingService;
