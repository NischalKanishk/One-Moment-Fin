// Consolidated API handler for Vercel - handles all routes in one function
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
    // LEADS ENDPOINTS
    // ============================================================================
    if (path.startsWith('/api/leads')) {
      const leadsPath = path.replace('/api/leads', '');
      
      // GET /api/leads - List user leads
      if (method === 'GET' && leadsPath === '') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const { 
            page = 1, 
            limit = 50, 
            sort_by = 'created_at', 
            sort_order = 'desc',
            status,
            search,
            source_link,
            risk_category 
          } = req.query;

          // Build the query
          let query = supabase
            .from('leads')
            .select('*', { count: 'exact' })
            .eq('user_id', user.supabase_user_id);

          // Apply filters
          if (status && status !== 'all') {
            query = query.eq('status', status);
          }
          if (source_link && source_link !== 'all') {
            query = query.eq('source_link', source_link);
          }
          if (risk_category && risk_category !== 'all') {
            query = query.eq('risk_category', risk_category);
          }
          if (search && search.trim()) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
          }

          // Apply sorting
          if (sort_by && sort_order) {
            query = query.order(sort_by, { ascending: sort_order === 'asc' });
          }

          // Apply pagination
          const pageNum = parseInt(page) || 1;
          const limitNum = parseInt(limit) || 50;
          const offset = (pageNum - 1) * limitNum;
          
          query = query.range(offset, offset + limitNum - 1);
          
          const { data: leads, error, count } = await query;

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Database query failed' });
          }

          const totalPages = Math.ceil((count || 0) / limitNum);
          
          return res.json({ 
            leads: leads || [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: count || 0,
              totalPages,
              hasNext: pageNum < totalPages,
              hasPrev: pageNum > 1
            }
          });
        } catch (error) {
          console.error('❌ Error fetching leads:', error);
          return res.status(500).json({ error: 'Failed to fetch leads' });
        }
      }

      // GET /api/leads/:id - Get lead by ID
      if (method === 'GET' && leadsPath.match(/^\/[^\/]+$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const leadId = leadsPath.substring(1); // Remove the leading slash
          
          const { data: lead, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              return res.status(404).json({ error: 'Lead not found' });
            }
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Database query failed' });
          }

          return res.json({ lead });
        } catch (error) {
          console.error('❌ Error fetching lead:', error);
          return res.status(500).json({ error: 'Failed to fetch lead' });
        }
      }

      // POST /api/leads - Create lead
      if (method === 'POST' && leadsPath === '') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const { full_name, email, phone, age } = req.body;

          if (!full_name) {
            return res.status(400).json({ error: 'Full name is required' });
          }

          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .insert({
              user_id: user.supabase_user_id,
              full_name,
              email,
              phone,
              age,
              source_link: 'Manually Added',
              status: 'lead',
            })
            .select()
            .single();

          if (leadError) {
            console.error('Lead creation error:', leadError);
            return res.status(500).json({ error: 'Failed to create lead' });
          }

          return res.json({ message: 'Lead created successfully', lead: leadData });
        } catch (error) {
          console.error('Lead creation error:', error);
          return res.status(500).json({ error: 'Lead creation failed' });
        }
      }

      // PUT /api/leads/:id - Update lead
      if (method === 'PUT' && leadsPath.match(/^\/[^\/]+$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const leadId = leadsPath.substring(1);
          const updateData = req.body;

          // Check if lead exists and belongs to user
          const { data: existingLead, error: checkError } = await supabase
            .from('leads')
            .select('id')
            .eq('id', leadId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (checkError || !existingLead) {
            return res.status(404).json({ error: 'Lead not found' });
          }

          const { data: updatedLead, error: updateError } = await supabase
            .from('leads')
            .update(updateData)
            .eq('id', leadId)
            .select()
            .single();

          if (updateError) {
            console.error('Lead update error:', updateError);
            return res.status(500).json({ error: 'Failed to update lead' });
          }

          return res.json({ message: 'Lead updated successfully', lead: updatedLead });
        } catch (error) {
          console.error('Lead update error:', error);
          return res.status(500).json({ error: 'Failed to update lead' });
        }
      }

      // PATCH /api/leads/:id/status - Update lead status
      if (method === 'PATCH' && leadsPath.match(/^\/[^\/]+\/status$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const leadId = leadsPath.split('/')[1];
          const { status, notes } = req.body;

          if (!status) {
            return res.status(400).json({ error: 'Status is required' });
          }

          // Check if lead exists and belongs to user
          const { data: existingLead, error: checkError } = await supabase
            .from('leads')
            .select('id')
            .eq('id', leadId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (checkError || !existingLead) {
            return res.status(404).json({ error: 'Lead not found' });
          }

          const updateData = { status };
          if (notes !== undefined) {
            updateData.notes = notes;
          }

          const { data: updatedLead, error: updateError } = await supabase
            .from('leads')
            .update(updateData)
            .eq('id', leadId)
            .select()
            .single();

          if (updateError) {
            console.error('Lead status update error:', updateError);
            return res.status(500).json({ error: 'Failed to update lead status' });
          }

          return res.json({ message: 'Lead status updated successfully', lead: updatedLead });
        } catch (error) {
          console.error('Lead status update error:', error);
          return res.status(500).json({ error: 'Failed to update lead status' });
        }
      }

      // DELETE /api/leads/:id - Delete lead
      if (method === 'DELETE' && leadsPath.match(/^\/[^\/]+$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const leadId = leadsPath.substring(1);

          // Check if lead exists and belongs to user
          const { data: existingLead, error: checkError } = await supabase
            .from('leads')
            .select('id')
            .eq('id', leadId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (checkError || !existingLead) {
            return res.status(404).json({ error: 'Lead not found' });
          }

          const { error: deleteError } = await supabase
            .from('leads')
            .delete()
            .eq('id', leadId);

          if (deleteError) {
            console.error('Lead deletion error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete lead' });
          }

          return res.json({ message: 'Lead deleted successfully' });
        } catch (error) {
          console.error('Lead deletion error:', error);
          return res.status(500).json({ error: 'Failed to delete lead' });
        }
      }

      // GET /api/leads/stats - Get lead statistics
      if (method === 'GET' && leadsPath === '/stats') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const { data: leads, error } = await supabase
            .from('leads')
            .select('status, created_at')
            .eq('user_id', user.supabase_user_id);

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Database query failed' });
          }

          const stats = {
            total: leads?.length || 0,
            byStatus: {
              lead: leads?.filter(l => l.status === 'lead').length || 0,
              assessment_done: leads?.filter(l => l.status === 'assessment_done').length || 0,
              meeting_scheduled: leads?.filter(l => l.status === 'meeting_scheduled').length || 0,
              converted: leads?.filter(l => l.status === 'converted').length || 0,
              dropped: leads?.filter(l => l.status === 'dropped').length || 0,
            },
            thisMonth: leads?.filter(l => {
              const leadDate = new Date(l.created_at);
              const now = new Date();
              return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
            }).length || 0
          };

          return res.json({ stats });
        } catch (error) {
          console.error('❌ Error fetching lead stats:', error);
          return res.status(500).json({ error: 'Failed to fetch lead statistics' });
        }
      }
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
    // ASSESSMENTS ENDPOINTS (Basic)
    // ============================================================================
    if (path.startsWith('/api/assessments')) {
      const assessmentsPath = path.replace('/api/assessments', '');
      
      // GET /api/assessments - List user assessments
      if (method === 'GET' && assessmentsPath === '') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const { data: assessments, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('user_id', user.supabase_user_id);

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch assessments' });
          }

          return res.json({ assessments: assessments || [] });
        } catch (error) {
          console.error('❌ Error fetching assessments:', error);
          return res.status(500).json({ error: 'Failed to fetch assessments' });
        }
      }

      // POST /api/assessments - Create assessment
      if (method === 'POST' && assessmentsPath === '') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const { name, description } = req.body;

          if (!name) {
            return res.status(400).json({ error: 'Assessment name is required' });
          }

          const { data: assessment, error } = await supabase
            .from('assessments')
            .insert({
              user_id: user.supabase_user_id,
              name,
              description,
              is_active: true
            })
            .select()
            .single();

          if (error) {
            console.error('❌ Assessment creation error:', error);
            return res.status(500).json({ error: 'Failed to create assessment' });
          }

          return res.json({ message: 'Assessment created successfully', assessment });
        } catch (error) {
          console.error('❌ Error creating assessment:', error);
          return res.status(500).json({ error: 'Failed to create assessment' });
        }
      }

      // GET /api/assessments/:id - Get assessment by ID
      if (method === 'GET' && assessmentsPath.match(/^\/[^\/]+$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const assessmentId = assessmentsPath.substring(1);

          const { data: assessment, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('id', assessmentId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              return res.status(404).json({ error: 'Assessment not found' });
            }
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Database query failed' });
          }

          return res.json({ assessment });
        } catch (error) {
          console.error('❌ Error fetching assessment:', error);
          return res.status(500).json({ error: 'Failed to fetch assessment' });
        }
      }

      // PUT /api/assessments/:id - Update assessment
      if (method === 'PUT' && assessmentsPath.match(/^\/[^\/]+$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const assessmentId = assessmentsPath.substring(1);
          const updateData = req.body;

          // Check if assessment exists and belongs to user
          const { data: existingAssessment, error: checkError } = await supabase
            .from('assessments')
            .select('id')
            .eq('id', assessmentId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (checkError || !existingAssessment) {
            return res.status(404).json({ error: 'Assessment not found' });
          }

          const { data: updatedAssessment, error: updateError } = await supabase
            .from('assessments')
            .update(updateData)
            .eq('id', assessmentId)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Assessment update error:', updateError);
            return res.status(500).json({ error: 'Failed to update assessment' });
          }

          return res.json({ message: 'Assessment updated successfully', assessment: updatedAssessment });
        } catch (error) {
          console.error('❌ Error updating assessment:', error);
          return res.status(500).json({ error: 'Failed to update assessment' });
        }
      }

      // DELETE /api/assessments/:id - Delete assessment
      if (method === 'DELETE' && assessmentsPath.match(/^\/[^\/]+$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const assessmentId = assessmentsPath.substring(1);

          // Check if assessment exists and belongs to user
          const { data: existingAssessment, error: checkError } = await supabase
            .from('assessments')
            .select('id')
            .eq('id', assessmentId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (checkError || !existingAssessment) {
            return res.status(404).json({ error: 'Assessment not found' });
          }

          const { error: deleteError } = await supabase
            .from('assessments')
            .delete()
            .eq('id', assessmentId);

          if (deleteError) {
            console.error('❌ Assessment deletion error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete assessment' });
          }

          return res.json({ message: 'Assessment deleted successfully' });
        } catch (error) {
          console.error('❌ Error deleting assessment:', error);
          return res.status(500).json({ error: 'Failed to delete assessment' });
        }
      }

      // GET /api/assessments/:id/questions - Get assessment questions
      if (method === 'GET' && assessmentsPath.match(/^\/[^\/]+\/questions$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const assessmentId = assessmentsPath.split('/')[1];

          // Check if assessment belongs to user
          const { data: assessment, error: assessmentError } = await supabase
            .from('assessments')
            .select('id')
            .eq('id', assessmentId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (assessmentError || !assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
          }

          const { data: questions, error } = await supabase
            .from('assessment_questions')
            .select('*')
            .eq('assessment_id', assessmentId)
            .order('created_at', { ascending: true });

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch questions' });
          }

          return res.json({ questions: questions || [] });
        } catch (error) {
          console.error('❌ Error fetching assessment questions:', error);
          return res.status(500).json({ error: 'Failed to fetch assessment questions' });
        }
      }

      // GET /api/assessments/frameworks - Get risk frameworks
      if (method === 'GET' && assessmentsPath === '/frameworks') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          // This would typically come from a risk_frameworks table
          // For now, return a basic structure
          return res.json({ 
            frameworks: [
              {
                id: 'cfa-three-pillar',
                name: 'CFA Three Pillar Framework',
                description: 'Comprehensive risk assessment framework',
                is_active: true
              }
            ]
          });
        } catch (error) {
          console.error('❌ Error fetching frameworks:', error);
          return res.status(500).json({ error: 'Failed to fetch frameworks' });
        }
      }

      // GET /api/assessments/frameworks/:id/questions - Get framework questions
      if (method === 'GET' && assessmentsPath.match(/^\/frameworks\/[^\/]+\/questions$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const frameworkId = assessmentsPath.split('/')[2];

          // This would typically come from a framework_questions table
          // For now, return a basic structure
          return res.json({ 
            questions: [
              {
                id: 'q1',
                question_text: 'What is your investment horizon?',
                type: 'mcq',
                options: ['Less than 1 year', '1-3 years', '3-5 years', 'More than 5 years'],
                weight: 1
              },
              {
                id: 'q2',
                question_text: 'How would you react to a 20% drop in your investment value?',
                type: 'mcq',
                options: ['Sell immediately', 'Sell some', 'Hold', 'Buy more'],
                weight: 2
              }
            ]
          });
        } catch (error) {
          console.error('❌ Error fetching framework questions:', error);
          return res.status(500).json({ error: 'Failed to fetch framework questions' });
        }
      }

      // GET /api/assessments/forms - Get assessment forms (what frontend expects)
      if (method === 'GET' && assessmentsPath === '/forms') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          // Get user's assessments and transform them to match frontend expectations
          const { data: assessments, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('user_id', user.supabase_user_id);

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch assessments' });
          }

          // Transform assessments to match frontend "forms" structure
          const forms = assessments?.map(assessment => ({
            id: assessment.id,
            name: assessment.name,
            description: assessment.description,
            is_active: assessment.is_active,
            created_at: assessment.created_at,
            questions: [] // Will be populated when needed
          })) || [];

          return res.json({ forms });
        } catch (error) {
          console.error('❌ Error fetching assessment forms:', error);
          return res.status(500).json({ error: 'Failed to fetch assessment forms' });
        }
      }

      // GET /api/assessments/cfa/questions - Get CFA questions (what frontend expects)
      if (method === 'GET' && assessmentsPath === '/cfa/questions') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          // Return CFA framework questions
          return res.json({ 
            questions: [
              {
                id: 'q1',
                qkey: 'investment_horizon',
                label: 'What is your investment horizon?',
                qtype: 'mcq',
                options: ['Less than 1 year', '1-3 years', '3-5 years', 'More than 5 years'],
                required: true,
                order_index: 1,
                module: 'risk_assessment'
              },
              {
                id: 'q2',
                qkey: 'risk_tolerance',
                label: 'How would you react to a 20% drop in your investment value?',
                qtype: 'mcq',
                options: ['Sell immediately', 'Sell some', 'Hold', 'Buy more'],
                required: true,
                order_index: 2,
                module: 'risk_assessment'
              },
              {
                id: 'q3',
                qkey: 'investment_goals',
                label: 'What are your primary investment goals?',
                qtype: 'mcq',
                options: ['Capital preservation', 'Income generation', 'Growth', 'Tax efficiency'],
                required: true,
                order_index: 3,
                module: 'investment_objectives'
              },
              {
                id: 'q4',
                qkey: 'investment_experience',
                label: 'How would you describe your investment experience?',
                qtype: 'mcq',
                options: ['Beginner', 'Some experience', 'Experienced', 'Very experienced'],
                required: true,
                order_index: 4,
                module: 'background'
              }
            ]
          });
        } catch (error) {
          console.error('❌ Error fetching CFA questions:', error);
          return res.status(500).json({ error: 'Failed to fetch CFA questions' });
        }
      }
    }
    
    // ============================================================================
    // AUTH ENDPOINTS (Basic)
    // ============================================================================
    if (path.startsWith('/api/auth')) {
      const authPath = path.replace('/api/auth', '');
      
      // GET /api/auth/test - Simple test endpoint
      if (method === 'GET' && authPath === '/test') {
        return res.status(200).json({ message: 'Auth API is working!' });
      }

      // GET /api/auth/me - Get current user profile
      if (method === 'GET' && authPath === '/me') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          // Get full user profile from database
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.supabase_user_id)
            .single();

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
          }

          return res.json({ 
            user: {
              id: userProfile.id,
              clerk_id: userProfile.clerk_id,
              full_name: userProfile.full_name,
              email: userProfile.email,
              phone: userProfile.phone,
              role: userProfile.role,
              mfd_registration_number: userProfile.mfd_registration_number,
              referral_link: userProfile.referral_link,
              profile_image_url: userProfile.profile_image_url,
              created_at: userProfile.created_at,
              updated_at: userProfile.updated_at
            }
          });
        } catch (error) {
          console.error('❌ Error fetching user profile:', error);
          return res.status(500).json({ error: 'Failed to fetch user profile' });
        }
      }

      // POST /api/auth/sync - Sync user data with Clerk
      if (method === 'POST' && authPath === '/sync') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const { full_name, email, phone } = req.body;

          // Update user profile
          const { data: updatedUser, error } = await supabase
            .from('users')
            .update({
              full_name: full_name || user.full_name,
              email: email || user.email,
              phone: phone || user.phone,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.supabase_user_id)
            .select()
            .single();

          if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to sync user data' });
          }

          return res.json({ 
            message: 'User data synced successfully',
            user: updatedUser
          });
        } catch (error) {
          console.error('❌ Error syncing user data:', error);
          return res.status(500).json({ error: 'Failed to sync user data' });
        }
      }

      // POST /api/auth/logout - Logout user
      if (method === 'POST' && authPath === '/logout') {
        // For serverless functions, logout is typically handled client-side
        // But we can return a success message
        return res.json({ message: 'Logged out successfully' });
      }

      // POST /api/auth/login - Login with Clerk token
      if (method === 'POST' && authPath === '/login') {
        try {
          const { token } = req.body;
          
          if (!token) {
            return res.status(400).json({ error: 'Token is required' });
          }

          // Set the token in headers for authentication
          req.headers.authorization = `Bearer ${token}`;
          
          // Authenticate the user
          const user = await authenticateUser(req);
          
          return res.json({ 
            message: 'Login successful',
            user: {
              id: user.supabase_user_id,
              clerk_id: user.clerk_id,
              email: user.email,
              role: user.role
            }
          });
        } catch (error) {
          console.error('❌ Login error:', error);
          return res.status(401).json({ error: 'Login failed' });
        }
      }

      // POST /api/auth/signup - Signup with Clerk token
      if (method === 'POST' && authPath === '/signup') {
        try {
          const { token, full_name, phone } = req.body;
          
          if (!token) {
            return res.status(400).json({ error: 'Token is required' });
          }

          // Set the token in headers for authentication
          req.headers.authorization = `Bearer ${token}`;
          
          // Authenticate the user (this will create the user if they don't exist)
          const user = await authenticateUser(req);
          
          // If additional data was provided, update the user
          if (full_name || phone) {
            const updateData = {};
            if (full_name) updateData.full_name = full_name;
            if (phone) updateData.phone = phone;

            const { data: updatedUser, error: updateError } = await supabase
              .from('users')
              .update(updateData)
              .eq('id', user.supabase_user_id)
              .select()
              .single();

            if (updateError) {
              console.error('❌ User update error:', updateError);
            } else {
              user.full_name = updatedUser.full_name;
              user.phone = updatedUser.phone;
            }
          }
          
          return res.json({ 
            message: 'Signup successful',
            user: {
              id: user.supabase_user_id,
              clerk_id: user.clerk_id,
              email: user.email,
              full_name: user.full_name,
              phone: user.phone,
              role: user.role
            }
          });
        } catch (error) {
          console.error('❌ Signup error:', error);
          return res.status(400).json({ error: 'Signup failed' });
        }
      }
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
