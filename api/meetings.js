// Meetings API endpoints for Vercel
const { supabase } = require('./lib/supabase.js');
const { authenticateUser } = require('./lib/auth.js');

module.exports = async function handler(req, res) {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    const { method, url } = req;
    
    // Parse URL properly
    const urlObj = new URL(url, `http://localhost`);
    const path = urlObj.pathname;
    
    console.log(`🔍 Meetings API Request: ${method} ${path}`);
    
    // ============================================================================
    // CALENDLY CONFIGURATION ENDPOINTS
    // ============================================================================
    
    // GET /api/meetings/calendly-config - Get user's Calendly configuration
    if (method === 'GET' && path === '/api/meetings/calendly-config') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const { data, error } = await supabase
          .from('user_settings')
          .select('calendly_username, calendly_organization_uri, calendly_user_uri')
          .eq('user_id', user.supabase_user_id)
          .single();

        if (error) {
          console.error('Error fetching Calendly config:', error);
          return res.status(500).json({ error: 'Failed to fetch Calendly configuration' });
        }

        const config = data?.calendly_username ? {
          username: data.calendly_username,
          organizationUri: data.calendly_organization_uri || undefined,
          userUri: data.calendly_user_uri || undefined
        } : null;

        res.json({ config });
      } catch (error) {
        console.error('Error in calendly-config GET:', error);
        res.status(500).json({ error: 'Failed to fetch Calendly configuration' });
      }
      return;
    }

    // POST /api/meetings/calendly-config - Save user's Calendly configuration
    if (method === 'POST' && path === '/api/meetings/calendly-config') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const { username } = req.body;
        
        if (!username) {
          return res.status(400).json({ error: 'Calendly username is required' });
        }

        // Validate username format
        if (username.includes('calendly.com/') || username.includes('http')) {
          return res.status(400).json({ 
            error: 'Invalid username format. Please enter only your username (e.g., "johnsmith")' 
          });
        }

        // Clean username (remove any extra characters)
        const cleanUsername = username.replace(/[^a-zA-Z0-9_-]/g, '');

        // Basic validation - check if username exists on Calendly
        try {
          const response = await fetch(`https://calendly.com/${cleanUsername}`, {
            method: 'HEAD',
            redirect: 'follow'
          });

          if (!response.ok && response.status !== 301 && response.status !== 302) {
            return res.status(400).json({ 
              error: 'Username not found on Calendly. Please check and try again.' 
            });
          }
        } catch (validationError) {
          console.error('Error validating Calendly username:', validationError);
          // Continue anyway - this is just a basic validation
        }

        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.supabase_user_id,
            calendly_username: cleanUsername,
            calendly_organization_uri: null,
            calendly_user_uri: null
          });

        if (error) {
          console.error('Error saving Calendly config:', error);
          return res.status(500).json({ error: 'Failed to save Calendly configuration' });
        }

        res.json({ 
          message: 'Calendly configuration saved successfully',
          config: { username: cleanUsername }
        });
      } catch (error) {
        console.error('Error in calendly-config POST:', error);
        res.status(500).json({ 
          error: error.message || 'Failed to save Calendly configuration' 
        });
      }
      return;
    }

    // POST /api/meetings/calendly-validate - Validate Calendly username
    if (method === 'POST' && path === '/api/meetings/calendly-validate') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const { username } = req.body;
        
        if (!username) {
          return res.status(400).json({ error: 'Calendly username is required' });
        }

        // Validate username format
        if (username.includes('calendly.com/') || username.includes('http')) {
          return res.status(400).json({ 
            error: 'Invalid username format. Please enter only your username (e.g., "johnsmith")' 
          });
        }

        // Clean username
        const cleanUsername = username.replace(/[^a-zA-Z0-9_-]/g, '');

        // Check if username exists on Calendly
        try {
          const response = await fetch(`https://calendly.com/${cleanUsername}`, {
            method: 'HEAD',
            redirect: 'follow'
          });

          const isValid = response.ok || response.status === 301 || response.status === 302;

          if (isValid) {
            res.json({ 
              isValid: true,
              message: 'Username validated successfully'
            });
          } else {
            res.json({ 
              isValid: false,
              error: 'Username not found on Calendly. Please check and try again.'
            });
          }
        } catch (validationError) {
          console.error('Error validating Calendly username:', validationError);
          res.json({ 
            isValid: false,
            error: 'Failed to validate username. Please try again.'
          });
        }
      } catch (error) {
        console.error('Error in calendly-validate:', error);
        res.status(500).json({ 
          isValid: false,
          error: 'Failed to validate username' 
        });
      }
      return;
    }

    // GET /api/meetings/calendly-event-types - Get user's Calendly event types
    if (method === 'GET' && path === '/api/meetings/calendly-event-types') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        // Get user's Calendly username
        const { data: userData, error: userError } = await supabase
          .from('user_settings')
          .select('calendly_username')
          .eq('user_id', user.supabase_user_id)
          .single();

        if (userError || !userData?.calendly_username) {
          return res.status(400).json({ error: 'Calendly username not configured' });
        }

        const username = userData.calendly_username;

        // For now, return placeholder event types since we don't have API access
        // When Scheduling API launches, this will be replaced with actual API calls
        const eventTypes = [
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

        res.json({ eventTypes });
      } catch (error) {
        console.error('Error in calendly-event-types:', error);
        res.status(500).json({ error: 'Failed to fetch event types' });
      }
      return;
    }

    // ============================================================================
    // MEETINGS CRUD ENDPOINTS
    // ============================================================================
    
    // GET /api/meetings - Get all meetings for user
    if (method === 'GET' && path === '/api/meetings') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

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
          .eq('user_id', user.supabase_user_id)
          .order('start_time', { ascending: false });

        if (error) {
          console.error('Error fetching meetings:', error);
          return res.status(500).json({ error: 'Failed to fetch meetings' });
        }

        res.json(meetings);
      } catch (error) {
        console.error('Error in meetings GET:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
      }
      return;
    }

    // GET /api/meetings/lead/:leadId - Get meetings for a specific lead
    if (method === 'GET' && path.match(/^\/api\/meetings\/lead\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const leadId = path.split('/').pop();
        
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
          .eq('user_id', user.supabase_user_id)
          .eq('lead_id', leadId)
          .order('start_time', { ascending: false });

        if (error) {
          console.error('Error fetching lead meetings:', error);
          return res.status(500).json({ error: 'Failed to fetch lead meetings' });
        }

        res.json(meetings);
      } catch (error) {
        console.error('Error in lead meetings GET:', error);
        res.status(500).json({ error: 'Failed to fetch lead meetings' });
      }
      return;
    }

    // POST /api/meetings - Create a new meeting
    if (method === 'POST' && path === '/api/meetings') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const { lead_id, title, start_time, end_time, description, platform, calendly_link } = req.body;
        
        // Validate required fields
        if (!lead_id || !title || !start_time || !end_time || !platform) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate platform
        const validPlatforms = ['calendly', 'zoom', 'manual'];
        if (!validPlatforms.includes(platform)) {
          return res.status(400).json({ error: 'Invalid platform. Must be one of: calendly, zoom, manual' });
        }

        // Validate calendly_link if platform is calendly
        if (platform === 'calendly' && !calendly_link) {
          return res.status(400).json({ error: 'Calendly link is required when platform is calendly' });
        }

        const { data: meeting, error } = await supabase
          .from('meetings')
          .insert({
            user_id: user.supabase_user_id,
            lead_id,
            title,
            start_time,
            end_time,
            description,
            platform,
            meeting_link: calendly_link || null,
            calendly_link: calendly_link || null,
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
          console.error('Meeting creation error:', error);
          return res.status(500).json({ error: 'Failed to create meeting' });
        }

        res.status(201).json(meeting);
      } catch (error) {
        console.error('Error in meetings POST:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
      return;
    }

    // PUT /api/meetings/:id - Update a meeting
    if (method === 'PUT' && path.match(/^\/api\/meetings\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const meetingId = path.split('/').pop();
        const { lead_id, title, start_time, end_time, description, platform, calendly_link } = req.body;
        
        // Validate required fields
        if (!lead_id || !title || !start_time || !end_time || !platform) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate platform
        const validPlatforms = ['calendly', 'zoom', 'manual'];
        if (!validPlatforms.includes(platform)) {
          return res.status(400).json({ error: 'Invalid platform. Must be one of: calendly, zoom, manual' });
        }

        // Validate calendly_link if platform is calendly
        if (platform === 'calendly' && !calendly_link) {
          return res.status(400).json({ error: 'Calendly link is required when platform is calendly' });
        }

        const updateData = {
          lead_id,
          title,
          start_time,
          end_time,
          description,
          platform,
          meeting_link: calendly_link || null,
          calendly_link: calendly_link || null,
          updated_at: new Date().toISOString()
        };

        const { data: meeting, error } = await supabase
          .from('meetings')
          .update(updateData)
          .eq('id', meetingId)
          .eq('user_id', user.supabase_user_id)
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
          console.error('Meeting update error:', error);
          return res.status(500).json({ error: 'Failed to update meeting' });
        }

        if (!meeting) {
          return res.status(404).json({ error: 'Meeting not found' });
        }

        res.json(meeting);
      } catch (error) {
        console.error('Error in meetings PUT:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
      return;
    }

    // DELETE /api/meetings/:id - Delete a meeting
    if (method === 'DELETE' && path.match(/^\/api\/meetings\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const meetingId = path.split('/').pop();
        
        const { error } = await supabase
          .from('meetings')
          .delete()
          .eq('id', meetingId)
          .eq('user_id', user.supabase_user_id);

        if (error) {
          console.error('Meeting deletion error:', error);
          return res.status(500).json({ error: 'Failed to delete meeting' });
        }

        res.json({ message: 'Meeting deleted successfully' });
      } catch (error) {
        console.error('Error in meetings DELETE:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
      return;
    }

    // PATCH /api/meetings/:id/status - Update meeting status
    if (method === 'PATCH' && path.match(/^\/api\/meetings\/[^\/]+\/status$/)) {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const meetingId = path.split('/')[3]; // Get the meeting ID from the path
        const { status } = req.body;
        
        if (!status) {
          return res.status(400).json({ error: 'Status is required' });
        }

        const validStatuses = ['scheduled', 'completed', 'cancelled', 'rescheduled'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }

        const { data: meeting, error } = await supabase
          .from('meetings')
          .update({ 
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', meetingId)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (error) {
          console.error('Meeting status update error:', error);
          return res.status(500).json({ error: 'Failed to update meeting status' });
        }

        if (!meeting) {
          return res.status(404).json({ error: 'Meeting not found' });
        }

        res.json(meeting);
      } catch (error) {
        console.error('Error in meeting status PATCH:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
      return;
    }

    // ============================================================================
    // DEFAULT RESPONSE
    // ============================================================================
    return res.status(404).json({
      error: 'Meetings endpoint not found',
      path: path,
      method: method,
      message: 'This meetings endpoint is not implemented'
    });
    
  } catch (error) {
    console.error('❌ Meetings API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong in the meetings API handler'
    });
  }
};
