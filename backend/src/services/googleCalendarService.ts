import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase';

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface MeetingDetails {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
}

export interface UserGoogleCredentials {
  accessToken: string;
  refreshToken?: string;
  email: string;
  name?: string;
}

export class GoogleCalendarService {
  private oauth2Client: any;
  private calendar: any;
  private userEmail: string | null = null;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI
    );
  }

  // Get authorization URL for user to grant access
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  async getTokensFromCode(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Get user info to extract email
      this.oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      return {
        ...tokens,
        email: userInfo.data.email,
        name: userInfo.data.name
      };
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw new Error('Failed to get access tokens');
    }
  }

  // Set credentials for a specific user
  setUserCredentials(credentials: UserGoogleCredentials) {
    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken
    });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.userEmail = credentials.email;
  }

  // Create a Google Calendar event and return meeting details
  async createMeeting(meetingDetails: MeetingDetails): Promise<any> {
    try {
      if (!this.calendar || !this.userEmail) {
        throw new Error('User Google Calendar not initialized. Please connect your Google account first.');
      }

      const event = {
        summary: meetingDetails.title,
        description: meetingDetails.description || 'Meeting scheduled via OneMFin',
        start: {
          dateTime: meetingDetails.startTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: meetingDetails.endTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        attendees: [
          { email: this.userEmail }, // Organizer
          ...meetingDetails.attendees.map(email => ({ email }))
        ],
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 15 } // 15 minutes before
          ]
        }
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all'
      });

      const createdEvent = response.data;
      
      return {
        eventId: createdEvent.id,
        meetingLink: createdEvent.conferenceData?.entryPoints?.[0]?.uri || null,
        htmlLink: createdEvent.htmlLink,
        startTime: createdEvent.start?.dateTime,
        endTime: createdEvent.end?.dateTime
      };
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw new Error('Failed to create Google Calendar event');
    }
  }

  // Update an existing meeting
  async updateMeeting(eventId: string, meetingDetails: MeetingDetails): Promise<any> {
    try {
      if (!this.calendar || !this.userEmail) {
        throw new Error('User Google Calendar not initialized. Please connect your Google account first.');
      }

      const event = {
        summary: meetingDetails.title,
        description: meetingDetails.description || 'Meeting updated via OneMFin',
        start: {
          dateTime: meetingDetails.startTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: meetingDetails.endTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        attendees: [
          { email: this.userEmail }, // Organizer
          ...meetingDetails.attendees.map(email => ({ email }))
        ]
      };

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
        sendUpdates: 'all'
      });

      return {
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        startTime: response.data.start?.dateTime,
        endTime: response.data.end?.dateTime
      };
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw new Error('Failed to update Google Calendar event');
    }
  }

  // Cancel a meeting
  async cancelMeeting(eventId: string, reason?: string): Promise<any> {
    try {
      if (!this.calendar || !this.userEmail) {
        throw new Error('User Google Calendar not initialized. Please connect your Google account first.');
      }

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all'
      });

      return { success: true };
    } catch (error) {
      console.error('Error cancelling Google Calendar event:', error);
      throw new Error('Failed to cancel Google Calendar event');
    }
  }

  // Send email notification using user's Gmail
  async sendMeetingEmail(
    toEmail: string,
    subject: string,
    htmlContent: string,
    userCredentials: UserGoogleCredentials
  ) {
    try {
      // Create transporter using user's Gmail credentials
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: userCredentials.email,
          pass: userCredentials.accessToken // Use access token for Gmail API
        }
      });

      const mailOptions = {
        from: `${userCredentials.name || 'OneMFin User'} <${userCredentials.email}>`,
        to: toEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email notification');
    }
  }

  // Generate meeting invitation email HTML
  generateMeetingInviteHTML(
    title: string,
    description: string,
    startTime: Date,
    endTime: Date,
    meetingLink: string,
    organizerName: string,
    organizerEmail: string,
    isUpdate: boolean = false
  ) {
    const action = isUpdate ? 'updated' : 'scheduled';
    const formattedStart = startTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const formattedEnd = endTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Meeting ${action}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting ${action}</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>A meeting has been ${action} by <strong>${organizerName}</strong> (${organizerEmail}).</p>
            
            <div class="details">
              <h3>${title}</h3>
              <p><strong>Date & Time:</strong> ${formattedStart} - ${formattedEnd}</p>
              ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
              <p><strong>Organizer:</strong> ${organizerName}</p>
            </div>

            ${meetingLink ? `
              <div style="text-align: center;">
                <a href="${meetingLink}" class="button">Join Meeting</a>
              </div>
              <p style="text-align: center; font-size: 14px; color: #666;">
                Or copy this link: <a href="${meetingLink}">${meetingLink}</a>
              </p>
            ` : ''}

            <div class="footer">
              <p>This meeting was ${action} via OneMFin</p>
              <p>If you have any questions, please contact the organizer at ${organizerEmail}.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Check if user has valid Google credentials
  hasValidCredentials(): boolean {
    return !!(this.calendar && this.userEmail);
  }

  // Get current user email
  getUserEmail(): string | null {
    return this.userEmail;
  }
}

export default GoogleCalendarService;
