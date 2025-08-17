const { supabase } = require('./lib/supabase.js');
const { authenticateUser } = require('./lib/auth.js');

module.exports = async function handler(req, res) {
  // Force JSON content type
  res.setHeader('Content-Type', 'application/json');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const { method, url } = req;
    
    // Parse URL properly to separate path from query parameters
    const urlObj = new URL(url, `http://localhost`);
    const path = urlObj.pathname.replace('/api/leads', '');

    console.log(`🔍 Leads API: ${method} ${path} - URL: ${url}`);

    // ============================================================================
    // TEST ENDPOINT
    // ============================================================================
    
    // GET /api/leads/test - Simple test endpoint
    if (method === 'GET' && path === '/test') {
      return res.status(200).json({ 
        message: 'Leads API is working!',
        timestamp: new Date().toISOString(),
        method,
        path,
        url
      });
    }

    // ============================================================================
    // LEADS ENDPOINTS
    // ============================================================================

    // GET /api/leads - List user leads
    if (method === 'GET' && path === '') {
      console.log('✅ Handling GET /api/leads request');
      
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

        const { data: leads, error: leadsError, count } = await query;
        if (leadsError) {
          console.error('❌ Database error:', leadsError);
          return res.status(500).json({ error: 'Failed to fetch leads', details: leadsError.message });
        }

        // Calculate pagination info
        const total = count || 0;
        const totalPages = Math.ceil(total / limitNum);
        const hasNext = pageNum < totalPages;
        const hasPrev = pageNum > 1;

        console.log('✅ Leads fetched successfully:', leads?.length || 0, 'total:', total);
        return res.status(200).json({ 
          leads: leads || [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNext,
            hasPrev
          }
        });
      } catch (error) {
        console.error('❌ Error in leads endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch leads',
          message: error.message || 'Unknown error'
        });
      }
    }

    // POST /api/leads - Create a new lead
    if (method === 'POST' && path === '') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { full_name, email, phone, age } = req.body;
        if (!full_name) {
          return res.status(400).json({ error: 'Full name is required' });
        }

        const { data: lead, error: createError } = await supabase
          .from('leads')
          .insert({
            user_id: user.supabase_user_id,
            full_name,
            email: email || null,
            phone: phone || null,
            age: age ? parseInt(age) : null,
            source_link: 'Manually Added',
            status: 'lead',
            kyc_status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          return res.status(500).json({ error: 'Failed to create lead' });
        }

        return res.status(201).json({ message: 'Lead created successfully', lead });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Lead creation failed' });
      }
    }

    // POST /api/leads/create - Create lead from public form
    if (method === 'POST' && path === '/create') {
      try {
        const { full_name, email, phone, age, source_link } = req.body;
        if (!full_name) {
          return res.status(400).json({ error: 'Full name is required' });
        }

        // For public submissions, determine user_id from source_link
        let user_id = null;
        if (source_link) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .or(`referral_link.eq.${source_link},referral_link.eq./r/${source_link}`)
            .single();
          user_id = userData?.id;
        }

        if (!user_id) {
          return res.status(400).json({ error: 'Invalid source link or referral' });
        }

        const { data: lead, error: createError } = await supabase
          .from('leads')
          .insert({
            user_id,
            full_name,
            email: email || null,
            phone: phone || null,
            age: age ? parseInt(age) : null,
            source_link: source_link || 'Public Form',
            status: 'lead',
            kyc_status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          return res.status(500).json({ error: 'Failed to create lead' });
        }

        return res.status(201).json({ message: 'Lead created successfully', lead });
      } catch (error) {
        return res.status(500).json({ error: 'Lead creation failed' });
      }
    }

    // PUT /api/leads/:id - Update a lead
    if (method === 'PUT' && path.match(/^\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const leadId = path.substring(1); // Remove leading slash
        const { full_name, email, phone, age, notes, cfa_goals, cfa_min_investment, cfa_investment_horizon } = req.body;

        // Verify lead belongs to user
        const { data: existingLead, error: checkError } = await supabase
          .from('leads')
          .select('id')
          .eq('id', leadId)
          .eq('user_id', user.supabase_user_id)
          .single();

        if (checkError || !existingLead) {
          return res.status(404).json({ error: 'Lead not found or you do not have permission to update it' });
        }

        // Update the lead
        const updateData = {};
        if (full_name !== undefined) updateData.full_name = full_name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (age !== undefined) updateData.age = age;
        if (notes !== undefined) updateData.notes = notes;
        if (cfa_goals !== undefined) updateData.cfa_goals = cfa_goals;
        if (cfa_min_investment !== undefined) updateData.cfa_min_investment = cfa_min_investment;
        if (cfa_investment_horizon !== undefined) updateData.cfa_investment_horizon = cfa_investment_horizon;

        const { data: updatedLead, error: updateError } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', leadId)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Database error:', updateError);
          return res.status(500).json({ error: 'Failed to update lead', details: updateError.message });
        }

        console.log('✅ Lead updated successfully:', leadId);
        return res.status(200).json({ lead: updatedLead });
      } catch (error) {
        console.error('❌ Error in update lead endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to update lead',
          message: error.message || 'Unknown error'
        });
      }
    }

    // DELETE /api/leads/:id - Delete a lead
    if (method === 'DELETE' && path.match(/^\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const leadId = path.substring(1); // Remove leading slash

        // Verify lead belongs to user and delete it
        const { data: deletedLead, error: deleteError } = await supabase
          .from('leads')
          .delete()
          .eq('id', leadId)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (deleteError) {
          if (deleteError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Lead not found or you do not have permission to delete it' });
          }
          console.error('❌ Database error:', deleteError);
          return res.status(500).json({ error: 'Failed to delete lead', details: deleteError.message });
        }

        console.log('✅ Lead deleted successfully:', leadId);
        return res.status(200).json({ message: 'Lead deleted successfully', lead: deletedLead });
      } catch (error) {
        console.error('❌ Error in delete lead endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to delete lead',
          message: error.message || 'Unknown error'
        });
      }
    }

    // GET /api/leads/:id - Get a specific lead
    if (method === 'GET' && path.match(/^\/[^\/]+$/) && !path.includes('search') && !path.includes('stats') && !path.includes('meetings')) {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const leadId = path.substring(1); // Remove leading slash

        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .eq('user_id', user.supabase_user_id)
          .single();

        if (leadError) {
          if (leadError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Lead not found or you do not have permission to access it' });
          }
          console.error('❌ Database error:', leadError);
          return res.status(500).json({ error: 'Failed to fetch lead', details: leadError.message });
        }

        console.log('✅ Lead fetched successfully:', leadId);
        return res.status(200).json({ lead });
      } catch (error) {
        console.error('❌ Error in get lead by ID endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch lead',
          message: error.message || 'Unknown error'
        });
      }
    }

    // GET /api/leads/search - Search leads
    if (method === 'GET' && path === '/search') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { search = '', limit = 20 } = req.query;
        let query = supabase.from('leads').select('*').eq('user_id', user.supabase_user_id);

        if (search) {
          query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data: leads, error: searchError } = await query
          .order('created_at', { ascending: false })
          .limit(parseInt(limit));

        if (searchError) {
          return res.status(500).json({ error: 'Failed to search leads' });
        }

        return res.json({ leads: leads || [] });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to search leads' });
      }
    }

    // POST /api/leads/check-existing - Check if lead already exists
    if (method === 'POST' && path === '/check-existing') {
      try {
        const { email, phone } = req.body;
        if (!email && !phone) {
          return res.status(400).json({ error: 'Email or phone is required' });
        }

        let query = supabase.from('leads').select('id, full_name, email, phone, status');
        if (email) {
          query = query.eq('email', email);
        } else if (phone) {
          query = query.eq('phone', phone);
        }

        const { data: existingLeads, error: checkError } = await query;
        if (checkError) {
          return res.status(500).json({ error: 'Failed to check existing leads' });
        }

        return res.json({ 
          exists: existingLeads && existingLeads.length > 0,
          leads: existingLeads || []
        });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to check existing leads' });
      }
    }

    // ============================================================================
    // MEETINGS ENDPOINTS
    // ============================================================================

    // GET /api/leads/meetings - List user meetings
    if (method === 'GET' && path === '/meetings') {
      console.log('✅ Handling GET /api/leads/meetings request');
      
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { limit = 50, status } = req.query;
        let query = supabase
          .from('meetings')
          .select(`
            *,
            leads (
              id,
              full_name,
              email,
              phone
            )
          `)
          .eq('user_id', user.supabase_user_id);

        if (status) {
          query = query.eq('status', status);
        }

        const { data: meetings, error: meetingsError } = await query
          .order('created_at', { ascending: false })
          .limit(parseInt(limit));

        if (meetingsError) {
          console.error('❌ Database error:', meetingsError);
          return res.status(500).json({ error: 'Failed to fetch meetings', details: meetingsError.message });
        }

        console.log('✅ Meetings fetched successfully:', meetings?.length || 0);
        return res.status(200).json({ meetings: meetings || [] });
      } catch (error) {
        console.error('❌ Error in meetings endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch meetings',
          message: error.message || 'Unknown error'
        });
      }
    }

    // POST /api/leads/meetings - Create a new meeting
    if (method === 'POST' && path === '/meetings') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { lead_id, title, description, start_time, end_time, meeting_link, platform } = req.body;

        if (!lead_id || !title) {
          return res.status(400).json({ error: 'Lead ID and title are required' });
        }

        // Verify lead belongs to user
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('id')
          .eq('id', lead_id)
          .eq('user_id', user.supabase_user_id)
          .single();

        if (leadError || !lead) {
          return res.status(400).json({ error: 'Invalid lead ID' });
        }

        // Create meeting
        const { data: meeting, error: createError } = await supabase
          .from('meetings')
          .insert({
            user_id: user.supabase_user_id,
            lead_id,
            title,
            description: description || null,
            start_time: start_time || null,
            end_time: end_time || null,
            meeting_link: meeting_link || null,
            platform: platform || 'manual',
            status: 'scheduled',
            is_synced: false,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          return res.status(500).json({ error: 'Failed to create meeting' });
        }

        // Update lead status
        await supabase
          .from('leads')
          .update({ status: 'meeting_scheduled' })
          .eq('id', lead_id);

        return res.status(201).json({ message: 'Meeting created successfully', meeting });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to create meeting' });
      }
    }

    // PATCH /api/leads/meetings/:id - Update meeting
    if (method === 'PATCH' && path.match(/^\/meetings\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        const meetingId = path.split('/')[2];
        
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { title, description, start_time, end_time, meeting_link, status } = req.body;

        // Update meeting
        const { data: meeting, error: updateError } = await supabase
          .from('meetings')
          .update({
            title,
            description,
            start_time,
            end_time,
            meeting_link,
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', meetingId)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ error: 'Failed to update meeting' });
        }

        return res.json({ message: 'Meeting updated successfully', meeting });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to update meeting' });
      }
    }

    // PUT /api/leads/meetings/:id - Update meeting (alternative method)
    if (method === 'PUT' && path.match(/^\/meetings\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        const meetingId = path.split('/')[2];
        
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { title, description, start_time, end_time, meeting_link, status } = req.body;

        // Update meeting
        const { data: meeting, error: updateError } = await supabase
          .from('meetings')
          .update({
            title,
            description,
            start_time,
            end_time,
            meeting_link,
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', meetingId)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ error: 'Failed to update meeting' });
        }

        return res.json({ message: 'Meeting updated successfully', meeting });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to update meeting' });
      }
    }

    // DELETE /api/leads/meetings/:id - Cancel meeting
    if (method === 'DELETE' && path.match(/^\/meetings\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        const meetingId = path.split('/')[2];
        
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        // Get meeting to update lead status
        const { data: meeting, error: getError } = await supabase
          .from('meetings')
          .select('lead_id')
          .eq('id', meetingId)
          .eq('user_id', user.supabase_user_id)
          .single();

        if (getError) {
          return res.status(404).json({ error: 'Meeting not found' });
        }

        // Delete meeting
        const { error: deleteError } = await supabase
          .from('meetings')
          .delete()
          .eq('id', meetingId)
          .eq('user_id', user.supabase_user_id);

        if (deleteError) {
          return res.status(500).json({ error: 'Failed to delete meeting' });
        }

        // Update lead status back to lead
        if (meeting?.lead_id) {
          await supabase
            .from('leads')
            .update({ status: 'lead' })
            .eq('id', meeting.lead_id);
        }

        return res.json({ message: 'Meeting cancelled successfully' });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to cancel meeting' });
      }
    }

    // POST /api/leads/meetings/:id/status - Update meeting status
    if (method === 'POST' && path.match(/^\/meetings\/[^\/]+\/status$/)) {
      try {
        const user = await authenticateUser(req);
        const meetingId = path.split('/')[2];
        
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { status } = req.body;
        if (!status) {
          return res.status(400).json({ error: 'Status is required' });
        }

        // Update meeting status
        const { data: meeting, error: updateError } = await supabase
          .from('meetings')
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', meetingId)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ error: 'Failed to update meeting status' });
        }

        // Update lead status based on meeting status
        if (status === 'completed' && meeting?.lead_id) {
          await supabase
            .from('leads')
            .update({ status: 'converted' })
            .eq('id', meeting.lead_id);
        }

        return res.json({ message: 'Meeting status updated successfully', meeting });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to update meeting status' });
      }
    }

    // GET /api/leads/meetings/google-status - Check Google Calendar connection
    if (method === 'GET' && path === '/meetings/google-status') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        // For now, return a mock status
        // In production, you would check the actual Google Calendar connection
        return res.json({
          connected: false,
          calendar_id: null,
          message: 'Google Calendar integration not yet implemented'
        });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to check Google Calendar status' });
      }
    }

    // POST /api/leads/meetings/google-auth - Get Google Calendar auth URL
    if (method === 'POST' && path === '/meetings/google-auth') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        // For now, return a mock auth URL
        // In production, you would implement Google OAuth flow
        return res.json({
          authUrl: 'https://accounts.google.com/o/oauth2/auth?client_id=mock&redirect_uri=mock&scope=https://www.googleapis.com/auth/calendar&response_type=code',
          message: 'Google Calendar OAuth not yet implemented'
        });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to get Google auth URL' });
      }
    }

    // POST /api/leads/meetings/:id/cancel - Cancel meeting
    if (method === 'POST' && path.match(/^\/meetings\/[^\/]+\/cancel$/)) {
      try {
        const user = await authenticateUser(req);
        const meetingId = path.split('/')[2];
        
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { reason } = req.body;

        // Update meeting status to cancelled
        const { data: meeting, error: updateError } = await supabase
          .from('meetings')
          .update({
            status: 'cancelled',
            cancellation_reason: reason || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', meetingId)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ error: 'Failed to cancel meeting' });
        }

        // Update lead status back to lead
        if (meeting?.lead_id) {
          await supabase
            .from('leads')
            .update({ status: 'lead' })
            .eq('id', meeting.lead_id);
        }

        return res.json({ message: 'Meeting cancelled successfully', meeting });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to cancel meeting' });
      }
    }

    // GET /api/leads/stats - Get leads statistics
    if (method === 'GET' && path === '/stats') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        // Get all leads for the user
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('status, created_at')
          .eq('user_id', user.supabase_user_id);

        if (leadsError) {
          console.error('❌ Database error:', leadsError);
          return res.status(500).json({ error: 'Failed to fetch leads statistics', details: leadsError.message });
        }

        // Calculate statistics
        const total = leads?.length || 0;
        const byStatus = {
          lead: leads?.filter(l => l.status === 'lead').length || 0,
          assessment_done: leads?.filter(l => l.status === 'assessment_done').length || 0,
          meeting_scheduled: leads?.filter(l => l.status === 'meeting_scheduled').length || 0,
          converted: leads?.filter(l => l.status === 'converted').length || 0,
          dropped: leads?.filter(l => l.status === 'dropped').length || 0,
        };

        // Calculate this month's leads
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonth = leads?.filter(l => {
          const leadDate = new Date(l.created_at);
          return leadDate >= thisMonthStart;
        }).length || 0;

        const stats = {
          total,
          byStatus,
          thisMonth
        };

        console.log('✅ Stats calculated successfully:', stats);
        return res.status(200).json({ stats });
      } catch (error) {
        console.error('❌ Error in stats endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch statistics',
          message: error.message || 'Unknown error'
        });
      }
    }

    // If we get here, no matching endpoint was found
    console.log(`❌ No matching endpoint found for ${method} ${path}`);
    return res.status(404).json({ 
      error: 'Endpoint not found',
      method,
      path,
      available_endpoints: [
        'GET /api/leads',
        'POST /api/leads',
        'GET /api/leads/:id',
        'PUT /api/leads/:id',
        'DELETE /api/leads/:id',
        'GET /api/leads/search',
        'GET /api/leads/stats',
        'POST /api/leads/create',
        'POST /api/leads/check-existing',
        'GET /api/leads/meetings',
        'POST /api/leads/meetings',
        'PATCH /api/leads/meetings/:id',
        'DELETE /api/leads/meetings/:id',
        'POST /api/leads/meetings/:id/status',
        'POST /api/leads/meetings/:id/cancel',
        'GET /api/leads/meetings/google-status',
        'POST /api/leads/meetings/google-auth'
      ]
    });

  } catch (error) {
    console.error('Leads & Meetings API error:', error);
    
    // Force valid JSON response even on errors
    try {
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message || 'Unknown error'
      });
    } catch (jsonError) {
      // If JSON fails, send plain text
      res.status(500).setHeader('Content-Type', 'text/plain');
      return res.end('Internal server error');
    }
  }
}
