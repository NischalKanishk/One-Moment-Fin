import { supabase } from '../config/supabase';

export interface CalendlyConfig {
  username: string;
  organizationUri?: string;
  userUri?: string;
}

export interface CalendlyEventType {
  uri: string;
  name: string;
  active: boolean;
  duration: number;
  description?: string;
}

export interface CalendlySchedulingLink {
  uri: string;
  booking_url: string;
}

export class CalendlyService {
  private baseUrl = 'https://api.calendly.com/v2';

  async getUserConfig(userId: string): Promise<CalendlyConfig | null> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('calendly_username, calendly_organization_uri, calendly_user_uri')
        .eq('user_id', userId)
        .single();

      if (error || !data?.calendly_username) {
        return null;
      }

      return {
        username: data.calendly_username,
        organizationUri: data.calendly_organization_uri || undefined,
        userUri: data.calendly_user_uri || undefined
      };
    } catch (error) {
      console.error('Error fetching Calendly config:', error);
      return null;
    }
  }

  async saveUserConfig(userId: string, username: string): Promise<boolean> {
    try {
      // Validate username format
      if (!username || username.includes('calendly.com/') || username.includes('http')) {
        throw new Error('Invalid username format. Please enter only your username (e.g., "johnsmith")');
      }

      // Clean username (remove any extra characters)
      const cleanUsername = username.replace(/[^a-zA-Z0-9_-]/g, '');

      // Check if username exists on Calendly (basic validation)
      const isValid = await this.validateCalendlyUsername(cleanUsername);
      if (!isValid) {
        throw new Error('Username not found on Calendly. Please check and try again.');
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          calendly_username: cleanUsername,
          calendly_organization_uri: null,
          calendly_user_uri: null
        });

      if (error) {
        throw new Error(`Failed to save configuration: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error saving Calendly config:', error);
      throw error;
    }
  }

  async validateCalendlyUsername(username: string): Promise<boolean> {
    try {
      // Try to fetch user's public profile from Calendly
      const response = await fetch(`https://calendly.com/${username}`, {
        method: 'HEAD',
        redirect: 'follow'
      });

      // If we get a 200 or 301/302 redirect, the username exists
      return response.ok || response.status === 301 || response.status === 302;
    } catch (error) {
      console.error('Error validating Calendly username:', error);
      return false;
    }
  }

  async getEventTypes(username: string): Promise<CalendlyEventType[]> {
    try {
      // For now, we'll return a placeholder since we don't have API access
      // When Scheduling API launches, this will be replaced with actual API calls
      return [
        {
          uri: `https://calendly.com/${username}/30min`,
          name: '30 Minute Meeting',
          active: true,
          duration: 30,
          description: 'General consultation meeting'
        },
        {
          uri: `https://calendly.com/${username}/60min`,
          name: '60 Minute Meeting',
          active: true,
          duration: 60,
          description: 'Detailed consultation meeting'
        }
      ];
    } catch (error) {
      console.error('Error fetching event types:', error);
      return [];
    }
  }

  generateCalendlyLink(username: string, eventType?: string): string {
    if (eventType) {
      return `https://calendly.com/${username}/${eventType}`;
    }
    return `https://calendly.com/${username}`;
  }

  hasValidConfig(username: string): boolean {
    return !!username && username.length > 0;
  }

  getDisplayUsername(username: string): string {
    return username.startsWith('@') ? username : `@${username}`;
  }

  // Future method for when Scheduling API launches
  async createScheduledEvent(username: string, eventData: any): Promise<any> {
    // This will be implemented when Calendly's Scheduling API launches
    console.log('Scheduling API not yet available. Using fallback link generation.');
    
    const eventType = eventData.eventType || '30min';
    return {
      booking_url: this.generateCalendlyLink(username, eventType),
      status: 'pending',
      message: 'Redirecting to Calendly for scheduling'
    };
  }
}
