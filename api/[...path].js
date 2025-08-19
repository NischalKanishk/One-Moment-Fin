// Consolidated API handler for Vercel - handles remaining routes in one function
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
    
    console.log(`🔍 API Request: ${method} ${path}`);
    
    // ============================================================================
    // HEALTH CHECK
    // ============================================================================
    if (path === '/api/health') {
      return res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    }
    
    // ============================================================================
    // LEADS ENDPOINTS - Now handled by dedicated leads.js file
    // ============================================================================
    if (path.startsWith('/api/leads')) {
      // Leads are now handled by the dedicated leads.js file
      return res.status(200).json({ 
        message: 'Leads endpoint redirected to dedicated file',
        note: 'This endpoint is handled by /api/leads.js'
      });
    }
    
    // ============================================================================
    // MEETINGS ENDPOINTS
    // ============================================================================
    if (path.startsWith('/api/meetings')) {
      const meetingsPath = path.replace('/api/meetings', '');
      
      // GET /api/meetings - List user meetings
      if (method === 'GET' && meetingsPath === '') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          // Get meetings for the user
          const { data: meetings, error } = await supabase
            .from('meetings')
            .select(`
              *,
              leads:lead_id (
                full_name,
                email
              )
            `)
            .eq('user_id', user.supabase_user_id)
            .order('start_time', { ascending: true });

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch meetings' });
          }

          // Transform the data to match frontend expectations
          const transformedMeetings = meetings?.map(meeting => ({
            id: meeting.id,
            title: meeting.title,
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            description: meeting.description,
            meeting_link: meeting.meeting_link,
            platform: meeting.platform,
            status: meeting.status,
            lead_name: meeting.leads?.full_name || null,
            lead_email: meeting.leads?.email || null,
            created_by: meeting.created_by,
            created_at: meeting.created_at,
            lead_id: meeting.lead_id
          })) || [];

          return res.status(200).json({ meetings: transformedMeetings });
        } catch (error) {
          console.error('❌ Error fetching meetings:', error);
          return res.status(500).json({ error: 'Failed to fetch meetings' });
        }
      }

      // GET /api/meetings/google-status - Check Google Calendar connection
      if (method === 'GET' && meetingsPath === '/google-status') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          // Check if user has Google Calendar connected
          const { data: userSettings, error } = await supabase
            .from('user_settings')
            .select('google_access_token, google_email, google_name')
            .eq('user_id', user.supabase_user_id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to check Google connection' });
          }

          const isConnected = !!(userSettings?.google_access_token);
          
          return res.status(200).json({
            isConnected,
            email: userSettings?.google_email || null,
            name: userSettings?.google_name || null
          });
        } catch (error) {
          console.error('❌ Error checking Google status:', error);
          return res.status(500).json({ error: 'Failed to check Google connection' });
        }
      }

      // POST /api/meetings - Create new meeting
      if (method === 'POST' && meetingsPath === '') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const { lead_id, title, start_time, end_time, description, platform, attendees } = req.body;

          // Validate required fields
          if (!lead_id || !title || !start_time || !end_time || !platform) {
            return res.status(400).json({ error: 'Missing required fields' });
          }

          // Create the meeting
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
              status: 'scheduled',
              attendees: attendees || []
            })
            .select()
            .single();

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to create meeting' });
          }

          return res.status(201).json({ meeting });
        } catch (error) {
          console.error('❌ Error creating meeting:', error);
          return res.status(500).json({ error: 'Failed to create meeting' });
        }
      }

      // PUT /api/meetings/:id - Update meeting
      if (method === 'PUT' && meetingsPath.match(/^\/[^\/]+$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const meetingId = meetingsPath.substring(1); // Remove leading slash
          const { title, start_time, end_time, description, attendees } = req.body;

          // Update the meeting
          const { data: meeting, error } = await supabase
            .from('meetings')
            .update({
              title,
              start_time,
              end_time,
              description,
              attendees: attendees || []
            })
            .eq('id', meetingId)
            .eq('user_id', user.supabase_user_id) // Ensure user owns the meeting
            .select()
            .single();

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to update meeting' });
          }

          return res.status(200).json({ meeting });
        } catch (error) {
          console.error('❌ Error updating meeting:', error);
          return res.status(500).json({ error: 'Failed to update meeting' });
        }
      }

      // POST /api/meetings/:id/cancel - Cancel meeting
      if (method === 'POST' && meetingsPath.match(/^\/[^\/]+\/cancel$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const meetingId = meetingsPath.split('/')[1]; // Get meeting ID
          const { reason } = req.body;

          // Update meeting status to cancelled
          const { data: meeting, error } = await supabase
            .from('meetings')
            .update({
              status: 'cancelled',
              cancelled_reason: reason
            })
            .eq('id', meetingId)
            .eq('user_id', user.supabase_user_id) // Ensure user owns the meeting
            .select()
            .single();

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to cancel meeting' });
          }

          return res.status(200).json({ meeting });
        } catch (error) {
          console.error('❌ Error cancelling meeting:', error);
          return res.status(500).json({ error: 'Failed to cancel meeting' });
        }
      }

      // PATCH /api/meetings/:id/status - Update meeting status
      if (method === 'PATCH' && meetingsPath.match(/^\/[^\/]+\/status$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const meetingId = meetingsPath.split('/')[1]; // Get meeting ID
          const { status } = req.body;

          if (!status) {
            return res.status(400).json({ error: 'Status is required' });
          }

          // Update meeting status
          const { data: meeting, error } = await supabase
            .from('meetings')
            .update({ status })
            .eq('id', meetingId)
            .eq('user_id', user.supabase_user_id) // Ensure user owns the meeting
            .select()
            .single();

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to update meeting status' });
          }

          return res.status(200).json({ meeting });
        } catch (error) {
          console.error('❌ Error updating meeting status:', error);
          return res.status(500).json({ error: 'Failed to update meeting status' });
        }
      }

      // POST /api/meetings/google-auth - Get Google OAuth URL
      if (method === 'POST' && meetingsPath === '/google-auth') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          // Generate OAuth URL with state parameter for security
          const state = Buffer.from(JSON.stringify({ userId: user.supabase_user_id })).toString('base64');
          const authUrl = `https://accounts.google.com/oauth/authorize?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&scope=https://www.googleapis.com/auth/calendar&response_type=code&access_type=offline&state=${state}`;
          
          return res.status(200).json({ authUrl });
        } catch (error) {
          console.error('❌ Error getting Google auth URL:', error);
          return res.status(500).json({ error: 'Failed to get Google auth URL' });
        }
      }

      // GET /api/meetings/google-callback - Handle Google OAuth callback
      if (method === 'GET' && meetingsPath === '/google-callback') {
        try {
          const { code, state, error } = req.query;
          
          if (error) {
            console.error('❌ Google OAuth error:', error);
            return res.redirect(`${process.env.FRONTEND_URL}/app/meetings?error=oauth_failed`);
          }
          
          if (!code || !state) {
            console.error('❌ Missing code or state parameter');
            return res.redirect(`${process.env.FRONTEND_URL}/app/meetings?error=invalid_callback`);
          }

          // Decode state parameter
          let decodedState;
          try {
            decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
          } catch (e) {
            console.error('❌ Invalid state parameter');
            return res.redirect(`${process.env.FRONTEND_URL}/app/meetings?error=invalid_state`);
          }

          const { userId } = decodedState;
          
          // Exchange code for tokens
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              code,
              client_id: process.env.GOOGLE_CLIENT_ID,
              client_secret: process.env.GOOGLE_CLIENT_SECRET,
              redirect_uri: process.env.GOOGLE_REDIRECT_URI,
              grant_type: 'authorization_code',
            }),
          });

          if (!tokenResponse.ok) {
            console.error('❌ Failed to exchange code for tokens');
            return res.redirect(`${process.env.FRONTEND_URL}/app/meetings?error=token_exchange_failed`);
          }

          const tokens = await tokenResponse.json();
          
          // Get user info from Google
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
            },
          });

          if (!userInfoResponse.ok) {
            console.error('❌ Failed to get user info from Google');
            return res.redirect(`${process.env.FRONTEND_URL}/app/meetings?error=user_info_failed`);
          }

          const userInfo = await userInfoResponse.json();

          // Store tokens in database
          const { error: dbError } = await supabase
            .from('user_settings')
            .upsert({
              user_id: userId,
              google_access_token: tokens.access_token,
              google_refresh_token: tokens.refresh_token,
              google_email: userInfo.email,
              google_name: userInfo.name,
            }, {
              onConflict: 'user_id'
            });

          if (dbError) {
            console.error('❌ Database error storing tokens:', dbError);
            return res.redirect(`${process.env.FRONTEND_URL}/app/meetings?error=storage_failed`);
          }

          console.log('✅ Google Calendar connected successfully for user:', userId);
          return res.redirect(`${process.env.FRONTEND_URL}/app/meetings?success=google_connected`);
          
        } catch (error) {
          console.error('❌ Error in Google callback:', error);
          return res.redirect(`${process.env.FRONTEND_URL}/app/meetings?error=callback_failed`);
        }
      }
    }
    
    // ============================================================================
    // ASSESSMENTS ENDPOINTS - Now handled by dedicated assessments.js file
    // ============================================================================
    if (path.startsWith('/api/assessments')) {
      // Assessments are now handled by the dedicated assessments.js file
      return res.status(200).json({ 
        message: 'Assessments endpoint redirected to dedicated file',
        note: 'This endpoint is handled by /api/assessments.js'
      });
    }
    
    // ============================================================================
    // AUTH ENDPOINTS - Now handled by dedicated auth.js file
    // ============================================================================
    if (path.startsWith('/api/auth')) {
      // Auth endpoints are now handled by the dedicated auth.js file
      return res.status(200).json({ 
        message: 'Auth endpoint redirected to dedicated file',
        note: 'This endpoint is handled by /api/auth.js'
      });
    }
    
    // ============================================================================
    // AI ENDPOINTS (Basic)
    // ============================================================================
    if (path.startsWith('/api/ai')) {
      const aiPath = path.replace('/api/ai', '');
      
      // POST /api/ai/analyze-assessment - Analyze assessment results
      if (method === 'POST' && aiPath === '/analyze-assessment') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const { assessment_data, lead_id } = req.body;

          if (!assessment_data) {
            return res.status(400).json({ error: 'Assessment data is required' });
          }

          // This would typically call an AI service
          // For now, return a basic analysis structure
          const analysis = {
            risk_score: Math.floor(Math.random() * 100) + 1,
            risk_category: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
            recommendations: [
              'Consider conservative investment options',
              'Diversify your portfolio',
              'Review investment goals regularly'
            ],
            next_steps: [
              'Schedule a follow-up meeting',
              'Complete additional risk assessment',
              'Review investment options'
            ]
          };

          return res.json({ 
            message: 'Assessment analysis completed',
            analysis,
            lead_id
          });
        } catch (error) {
          console.error('❌ Error analyzing assessment:', error);
          return res.status(500).json({ error: 'Failed to analyze assessment' });
        }
      }

      // POST /api/ai/generate-recommendations - Generate investment recommendations
      if (method === 'POST' && aiPath === '/generate-recommendations') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const { risk_profile, investment_goals, investment_horizon } = req.body;

          if (!risk_profile || !investment_goals) {
            return res.status(400).json({ error: 'Risk profile and investment goals are required' });
          }

          // This would typically call an AI service
          // For now, return basic recommendations
          const recommendations = {
            portfolio_allocation: {
              equity: risk_profile === 'High' ? '70%' : risk_profile === 'Medium' ? '50%' : '30%',
              debt: risk_profile === 'High' ? '20%' : risk_profile === 'Medium' ? '40%' : '60%',
              gold: '10%'
            },
            investment_products: [
              'Mutual Funds',
              'Direct Equity',
              'Government Bonds',
              'Corporate FDs'
            ],
            risk_management: [
              'Regular portfolio rebalancing',
              'Stop-loss strategies',
              'Diversification across sectors'
            ]
          };

          return res.json({ 
            message: 'Recommendations generated successfully',
            recommendations
          });
        } catch (error) {
          console.error('❌ Error generating recommendations:', error);
          return res.status(500).json({ error: 'Failed to generate recommendations' });
        }
      }

      // GET /api/ai/health - AI service health check
      if (method === 'GET' && aiPath === '/health') {
        return res.json({ 
          status: 'OK',
          service: 'AI Recommendation Engine',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // ============================================================================
    // DEFAULT RESPONSE
    // ============================================================================
    return res.status(404).json({
      error: 'Endpoint not found',
      path: path,
      method: method,
      message: 'This endpoint is not implemented in the consolidated API handler'
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong in the API handler'
    });
  }
};
