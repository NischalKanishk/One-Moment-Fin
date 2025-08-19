// Leads API handler
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
    
    console.log(`🔍 Leads API Request: ${method} ${path}`);
    
    // Remove /api/leads prefix
    const leadsPath = path.replace('/api/leads', '');
    
    // GET /api/leads - List user leads
    if (method === 'GET' && leadsPath === '') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log(`🔍 Fetching leads for user: ${user.supabase_user_id}`);

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
          return res.status(500).json({ error: 'Database query failed', details: error.message });
        }

        const totalPages = Math.ceil((count || 0) / limitNum);
        
        console.log(`✅ Found ${leads?.length || 0} leads for user`);
        
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
        return res.status(500).json({ error: 'Failed to fetch leads', details: error.message });
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
        
        console.log(`🔍 Fetching lead ${leadId} for user: ${user.supabase_user_id}`);

        // First get the lead
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
          return res.status(500).json({ error: 'Database query failed', details: error.message });
        }

        // Then get the assessment submissions for this lead
        const { data: assessmentSubmissions, error: submissionsError } = await supabase
          .from('assessment_submissions')
          .select('id, submitted_at, answers, result, status, created_at')
          .eq('lead_id', leadId)
          .order('submitted_at', { ascending: false });

        if (submissionsError) {
          console.error('❌ Error fetching assessment submissions:', submissionsError);
          // Don't fail the request, just log the error
        }

        // Combine the data
        const leadWithSubmissions = {
          ...lead,
          assessment_submissions: assessmentSubmissions || []
        };

        console.log(`✅ Found lead: ${leadWithSubmissions.full_name} with ${leadWithSubmissions.assessment_submissions.length} assessment submissions`);
        
        // Debug: Log the actual data structure being returned
        if (leadWithSubmissions.assessment_submissions.length > 0) {
          const submission = leadWithSubmissions.assessment_submissions[0];
          console.log('🔍 Assessment submission data structure:');
          console.log('   - ID:', submission.id);
          console.log('   - Submitted at:', submission.submitted_at);
          console.log('   - Status:', submission.status);
          console.log('   - Answers count:', submission.answers ? Object.keys(submission.answers).length : 0);
          console.log('   - Result:', submission.result);
          console.log('   - Sample answers:', submission.answers ? Object.keys(submission.answers).slice(0, 3) : 'None');
        }
        
        return res.json({ lead: leadWithSubmissions });
      } catch (error) {
        console.error('❌ Error fetching lead:', error);
        return res.status(500).json({ error: 'Failed to fetch lead', details: error.message });
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

        console.log(`🔍 Creating lead for user: ${user.supabase_user_id}`);

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
          return res.status(500).json({ error: 'Failed to create lead', details: leadError.message });
        }

        console.log(`✅ Created lead: ${leadData.full_name}`);
        return res.json({ message: 'Lead created successfully', lead: leadData });
      } catch (error) {
        console.error('Lead creation error:', error);
        return res.status(500).json({ error: 'Lead creation failed', details: error.message });
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

        console.log(`🔍 Updating lead ${leadId} for user: ${user.supabase_user_id}`);

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
          return res.status(500).json({ error: 'Failed to update lead', details: updateError.message });
        }

        console.log(`✅ Updated lead: ${updatedLead.full_name}`);
        return res.json({ message: 'Lead updated successfully', lead: updatedLead });
      } catch (error) {
        console.error('Lead update error:', error);
        return res.status(500).json({ error: 'Failed to update lead', details: error.message });
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

        console.log(`🔍 Updating status for lead ${leadId} to: ${status}`);

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
          return res.status(500).json({ error: 'Failed to update lead status', details: updateError.message });
        }

        console.log(`✅ Updated lead status to: ${updatedLead.status}`);
        return res.json({ message: 'Lead status updated successfully', lead: updatedLead });
      } catch (error) {
        console.error('Lead status update error:', error);
        return res.status(500).json({ error: 'Failed to update lead status', details: error.message });
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

        console.log(`🔍 Deleting lead ${leadId} for user: ${user.supabase_user_id}`);

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
          return res.status(500).json({ error: 'Failed to delete lead', details: deleteError.message });
        }

        console.log(`✅ Deleted lead: ${leadId}`);
        return res.json({ message: 'Lead deleted successfully' });
      } catch (error) {
        console.error('Lead deletion error:', error);
        return res.status(500).json({ error: 'Failed to delete lead', details: error.message });
      }
    }

    // GET /api/leads/stats - Get lead statistics
    if (method === 'GET' && leadsPath === '/stats') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log(`🔍 Fetching lead stats for user: ${user.supabase_user_id}`);

        const { data: leads, error } = await supabase
          .from('leads')
          .select('status, created_at')
          .eq('user_id', user.supabase_user_id);

        if (error) {
          console.error('❌ Database error:', error);
          return res.status(500).json({ error: 'Database query failed', details: error.message });
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

        console.log(`✅ Lead stats: ${stats.total} total leads`);
        return res.json({ stats });
      } catch (error) {
        console.error('❌ Error fetching lead stats:', error);
        return res.status(500).json({ error: 'Failed to fetch lead statistics', details: error.message });
      }
    }

    // GET /api/leads/test - Test database connection
    if (method === 'GET' && leadsPath === '/test') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log(`🔍 Testing leads database connection for user: ${user.supabase_user_id}`);

        // Test basic database connection
        const { data: testData, error: testError } = await supabase
          .from('leads')
          .select('count')
          .limit(1);

        if (testError) {
          console.error('❌ Database connection test failed:', testError);
          return res.status(500).json({ 
            error: 'Database connection test failed', 
            details: testError.message,
            code: testError.code
          });
        }

        // Test user's leads access
        const { data: userLeads, error: userLeadsError } = await supabase
          .from('leads')
          .select('id, full_name, status')
          .eq('user_id', user.supabase_user_id)
          .limit(5);

        if (userLeadsError) {
          console.error('❌ User leads access test failed:', userLeadsError);
          return res.status(500).json({ 
            error: 'User leads access test failed', 
            details: userLeadsError.message,
            code: userLeadsError.code
          });
        }

        return res.json({ 
          message: 'Leads database connection test successful',
          user_id: user.supabase_user_id,
          database: 'Connected',
          user_leads_count: userLeads?.length || 0,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Error in leads database test:', error);
        return res.status(500).json({ 
          error: 'Leads database test failed', 
          details: error.message 
        });
      }
    }

    // POST /api/leads/check-existing - Check if a lead already exists
    if (method === 'POST' && leadsPath === '/check-existing') {
      try {
        const { email, phone, user_id } = req.body;
        
        if (!email && !phone) {
          return res.status(400).json({ error: 'Email or phone is required to check for existing leads' });
        }

        console.log(`🔍 Checking for existing lead with email: ${email}, phone: ${phone}, user_id: ${user_id}`);

        // For public assessments, we need to check if a lead exists for the specific assessment owner
        if (user_id) {
          // This is a public assessment, check for leads under the assessment owner
          let query = supabase
            .from('leads')
            .select('id, full_name, email, phone, status, created_at')
            .eq('user_id', user_id);

          // Check by email if provided
          if (email && email.trim()) {
            query = query.eq('email', email.trim());
          }
          // Check by phone if provided
          else if (phone && phone.trim()) {
            query = query.eq('phone', phone.trim());
          }

          const { data: existingLeads, error } = await query;

          if (error) {
            console.error('❌ Database error checking for existing leads:', error);
            return res.status(500).json({ error: 'Failed to check for existing leads', details: error.message });
          }

          const existingLead = existingLeads && existingLeads.length > 0 ? existingLeads[0] : null;

          if (existingLead) {
            console.log(`✅ Found existing lead: ${existingLead.full_name} (${existingLead.email || existingLead.phone})`);
            return res.json({
              exists: true,
              lead: existingLead
            });
          } else {
            console.log('✅ No existing lead found');
            return res.json({
              exists: false,
              lead: null
            });
          }
        } else {
          // This is an authenticated request, require user authentication
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          console.log(`🔍 Checking for existing lead for authenticated user: ${user.supabase_user_id}`);

          // Build query to check for existing leads
          let query = supabase
            .from('leads')
            .select('id, full_name, email, phone, status, created_at')
            .eq('user_id', user.supabase_user_id);

          // Check by email if provided
          if (email && email.trim()) {
            query = query.eq('email', email.trim());
          }
          // Check by phone if provided
          else if (phone && phone.trim()) {
            query = query.eq('phone', phone.trim());
          }

          const { data: existingLeads, error } = await query;

          if (error) {
            console.error('❌ Database error checking for existing leads:', error);
            return res.status(500).json({ error: 'Failed to check for existing leads', details: error.message });
          }

          const existingLead = existingLeads && existingLeads.length > 0 ? existingLeads[0] : null;

          if (existingLead) {
            console.log(`✅ Found existing lead: ${existingLead.full_name} (${existingLead.email || existingLead.phone})`);
            return res.json({
              exists: true,
              lead: existingLead
            });
          } else {
            console.log('✅ No existing lead found');
            return res.json({
              exists: false,
              lead: null
            });
          }
        }

      } catch (error) {
        console.error('❌ Error checking for existing leads:', error);
        return res.status(500).json({ error: 'Failed to check for existing leads', details: error.message });
      }
    }

    // POST /api/leads/:id/recreate-assessment - Recreate missing assessment submission
    if (method === 'POST' && leadsPath.match(/^\/[^\/]+$/)) {
      const body = req.body;
      
      if (body.action === 'recreate_assessment') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const leadId = leadsPath.substring(1);
          
          console.log(`🔍 Recreating assessment submission for lead ${leadId}`);

          // Check if lead exists and belongs to user
          const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (leadError) {
            console.error('❌ Lead not found or access denied:', leadError);
            return res.status(404).json({ error: 'Lead not found or access denied' });
          }

          // Check if assessment submission already exists
          const { data: existingSubmission, error: checkError } = await supabase
            .from('assessment_submissions')
            .select('id')
            .eq('lead_id', leadId)
            .single();

          if (existingSubmission) {
            console.log('✅ Assessment submission already exists');
            return res.json({ message: 'Assessment submission already exists', submissionId: existingSubmission.id });
          }

          // Create a default assessment submission based on lead data
          const defaultAnswers = {
            age: lead.age || '25-35',
            income_security: 'Fairly secure',
            emi_ratio: '30',
            emergency_fund_months: '6-12',
            drawdown_reaction: 'Do nothing',
            gain_loss_tradeoff: 'Loss8Gain22',
            market_knowledge: 'Medium',
            goal_required_return: '8-10%'
          };

          // Calculate risk score
          const riskResult = {
            bucket: 'Medium',
            score: 65,
            rubric: {
              capacity: 70,
              tolerance: 60,
              need: 65
            }
          };

          // Create assessment submission
          const { data: submission, error: submissionError } = await supabase
            .from('assessment_submissions')
            .insert({
              assessment_id: null,
              framework_version_id: null,
              owner_id: user.supabase_user_id,
              lead_id: leadId,
              answers: defaultAnswers,
              result: riskResult,
              status: 'submitted'
            })
            .select('*')
            .single();

          if (submissionError) {
            console.error('❌ Error creating assessment submission:', submissionError);
            return res.status(500).json({ error: 'Failed to create assessment submission' });
          }

          console.log('✅ Assessment submission recreated successfully');
          return res.json({ 
            message: 'Assessment submission recreated successfully',
            submissionId: submission.id,
            result: riskResult
          });

        } catch (error) {
          console.error('❌ Error recreating assessment submission:', error);
          return res.status(500).json({ error: 'Failed to recreate assessment submission' });
        }
      }
    }

    // Default response for leads endpoints
    return res.status(404).json({
      error: 'Lead endpoint not found',
      path: path,
      method: method
    });
    
  } catch (error) {
    console.error('❌ Leads API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong in the leads API handler',
      details: error.message
    });
  }
};
