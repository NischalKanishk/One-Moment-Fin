import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';

interface UserSettings {
  calendly_url: string;
  calendly_api_key: string;
  google_calendar_id: string;
  notification_preferences: Record<string, any>;
}

interface UseSettingsReturn {
  settings: UserSettings | null;
  isLoading: boolean;
  saveSettings: (newSettings: Partial<UserSettings>) => Promise<boolean>;
  removeCalendlySettings: () => Promise<boolean>;
  hasCalendlyConfig: boolean;
}

export function useSettings(): UseSettingsReturn {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<UserSettings>): Promise<boolean> => {
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      toast.success('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
      return false;
    }
  };

  const removeCalendlySettings = async (): Promise<boolean> => {
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/calendly`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove Calendly settings');
      }

      // Update local state
      setSettings(prev => prev ? {
        ...prev,
        calendly_url: '',
        calendly_api_key: ''
      } : null);

      toast.success('Calendly settings removed successfully');
      return true;
    } catch (error) {
      console.error('Failed to remove Calendly settings:', error);
      toast.error('Failed to remove Calendly settings');
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const hasCalendlyConfig = Boolean(
    settings?.calendly_url && 
    settings?.calendly_api_key
  );

  return {
    settings,
    isLoading,
    saveSettings,
    removeCalendlySettings,
    hasCalendlyConfig
  };
}
