import express from 'express';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

// GET /api/settings - Get user settings
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const user_id = req.user?.supabase_user_id;
    if (!user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    // Return settings or empty object if none exist
    return res.json({ 
      settings: data || {
        calendly_url: '',
        calendly_api_key: '',
        google_calendar_id: '',
        notification_preferences: {}
      }
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/settings - Create or update user settings
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const user_id = req.user?.supabase_user_id;
    if (!user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { calendly_url, calendly_api_key, google_calendar_id, notification_preferences } = req.body;

    // Validate Calendly configuration if provided
    if (calendly_url || calendly_api_key) {
      if (!calendly_url || !calendly_api_key) {
        return res.status(400).json({ 
          error: 'Both Calendly URL and API key are required when configuring Calendly' 
        });
      }

      // Validate Calendly URL format
      if (!calendly_url.startsWith('https://calendly.com/')) {
        return res.status(400).json({ 
          error: 'Calendly URL must start with https://calendly.com/' 
        });
      }

      // Validate API key format - Calendly uses JWT tokens
      if (calendly_api_key.length < 100) {
        return res.status(400).json({ 
          error: 'Calendly API key appears to be too short. Please check your API key.' 
        });
      }

      // Test Calendly API key by making a simple request
      try {
        const testResponse = await fetch('https://api.calendly.com/users/me', {
          headers: {
            'Authorization': `Bearer ${calendly_api_key}`,
            'Content-Type': 'application/json'
          }
        });

        if (!testResponse.ok) {
          if (testResponse.status === 401) {
            return res.status(400).json({ 
              error: 'Invalid Calendly API key. The API key is not valid or has expired. Please check your API key in Calendly dashboard.' 
            });
          } else if (testResponse.status === 403) {
            return res.status(400).json({ 
              error: 'Calendly API key does not have required permissions. Please ensure your API key has access to user information.' 
            });
          } else if (testResponse.status === 404) {
            return res.status(400).json({ 
              error: 'Calendly API endpoint not found. This might indicate an invalid API key or insufficient permissions. Please check your API key in Calendly dashboard.' 
            });
          } else {
            return res.status(400).json({ 
              error: `Calendly API error (${testResponse.status}). Please check your API key and try again.` 
            });
          }
        }
      } catch (apiError) {
        console.error('Calendly API validation error:', apiError);
        return res.status(400).json({ 
          error: 'Failed to connect to Calendly API. Please check your internet connection and try again.' 
        });
      }
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id,
        calendly_url: calendly_url || null,
        calendly_api_key: calendly_api_key || null,
        google_calendar_id: google_calendar_id || null,
        notification_preferences: notification_preferences || {}
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Settings upsert error:', error);
      return res.status(500).json({ error: 'Failed to save settings' });
    }

    return res.json({ 
      message: 'Settings saved successfully',
      settings: data
    });
  } catch (error) {
    console.error('Settings save error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/settings/calendly - Remove Calendly configuration
router.delete('/calendly', async (req: express.Request, res: express.Response) => {
  try {
    const user_id = req.user?.supabase_user_id;
    if (!user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { error } = await supabase
      .from('user_settings')
      .update({
        calendly_url: null,
        calendly_api_key: null
      })
      .eq('user_id', user_id);

    if (error) {
      console.error('Calendly settings removal error:', error);
      return res.status(500).json({ error: 'Failed to remove Calendly settings' });
    }

    return res.json({ message: 'Calendly settings removed successfully' });
  } catch (error) {
    console.error('Calendly settings removal error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
