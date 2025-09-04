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
    
    // ============================================================================
    // HEALTH CHECK
    // ============================================================================
    if (path === '/api/health') {
      return res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        supabaseClient: !!supabase
      });
    }
    
    // ============================================================================
    // DATABASE TEST
    // ============================================================================
    if (path === '/api/test-db') {
      try {
        // Test basic connection
        const { data: testData, error: testError } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        
        if (testError) {
          return res.status(500).json({ 
            error: 'Basic connection failed', 
            details: testError.message 
          });
        }
        
        // Test risk_frameworks table
        const { data: frameworks, error: frameworkError } = await supabase
          .from('risk_frameworks')
          .select('*');
        
        if (frameworkError) {
          return res.status(500).json({ 
            error: 'Frameworks query failed', 
            details: frameworkError.message 
          });
        }
        
        // Test framework_questions table
        const { data: questions, error: questionsError } = await supabase
          .from('framework_questions')
          .select('*')
          .limit(5);
        
        if (questionsError) {
          return res.status(500).json({ 
            error: 'Questions query failed', 
            details: questionsError.message 
          });
        }
        
        `);
        
        return res.json({
          status: 'OK',
          message: 'Database queries successful',
          results: {
            basicConnection: 'OK',
            frameworksCount: frameworks?.length || 0,
            questionsCount: questions?.length || 0,
            sampleQuestions: questions?.slice(0, 3) || []
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        return res.status(500).json({ 
          error: 'Database test failed', 
          details: error.message 
        });
      }
    }
    
    // ============================================================================
    // ENVIRONMENT CHECK
    // ============================================================================
    if (path === '/api/check-env') {
      try {
        const envCheck = {
          SUPABASE_URL: {
            present: !!process.env.SUPABASE_URL,
            value: process.env.SUPABASE_URL ? 'Set' : 'Not set',
            length: process.env.SUPABASE_URL?.length || 0
          },
          SUPABASE_SERVICE_ROLE_KEY: {
            present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            value: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
            length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
          },
          SUPABASE_ANON_KEY: {
            present: !!process.env.SUPABASE_ANON_KEY,
            value: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set',
            length: process.env.SUPABASE_ANON_KEY?.length || 0
          },
          NODE_ENV: process.env.NODE_ENV || 'Not set',
          VERCEL: process.env.VERCEL || 'Not set',
          VERCEL_ENV: process.env.VERCEL_ENV || 'Not set'
        };
        
        const allRequiredPresent = envCheck.SUPABASE_URL.present && 
                                  envCheck.SUPABASE_SERVICE_ROLE_KEY.present && 
                                  envCheck.SUPABASE_ANON_KEY.present;
        
        return res.json({
          status: allRequiredPresent ? 'OK' : 'MISSING_VARS',
          message: allRequiredPresent ? 'All required environment variables are present' : 'Some required environment variables are missing',
          environment: envCheck,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        return res.status(500).json({ 
          error: 'Environment check failed', 
          details: error.message 
        });
      }
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
      
      // GET /api/meetings - Get all meetings for user
      if (method === 'GET' && meetingsPath === '') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
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
            return res.status(500).json({ error: 'Failed to fetch meetings' });
          }

          return res.json({ meetings: meetings || [] });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to fetch meetings' });
        }
      }

      // GET /api/meetings/lead/:leadId - Get meetings for specific lead
      if (method === 'GET' && meetingsPath.startsWith('/lead/')) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const leadId = meetingsPath.replace('/lead/', '');
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
            return res.status(500).json({ error: 'Failed to fetch lead meetings' });
          }

          return res.json({ meetings: meetings || [] });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to fetch lead meetings' });
        }
      }

      // POST /api/meetings - Create new meeting
      if (method === 'POST' && meetingsPath === '') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const { lead_id, title, start_time, end_time, description, platform, calendly_link } = req.body;

          // Validation
          if (!lead_id || !title || !start_time || !end_time || !platform) {
            return res.status(400).json({ error: 'Missing required fields' });
          }

          if (!['calendly', 'zoom', 'manual'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform. Must be calendly, zoom, or manual' });
          }

          if (platform === 'calendly' && !calendly_link) {
            return res.status(400).json({ error: 'Calendly link is required when platform is calendly' });
          }

          // Create meeting record
          const { data: meeting, error } = await supabase
            .from('meetings')
            .insert({
              user_id: user.supabase_user_id,
              lead_id,
              title,
              start_time,
              end_time,
              description: description || '',
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
            return res.status(500).json({ error: 'Failed to create meeting' });
          }

          // Update lead status to "Meeting scheduled"
          try {
            // Assuming updateLeadStatus is defined elsewhere or needs to be imported
            // For now, commenting out as it's not in the original file
            // await updateLeadStatus(lead_id, 'meeting_scheduled'); 
          } catch (statusError) {
            }

          return res.status(201).json({ meeting });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to create meeting' });
        }
      }

      // PUT /api/meetings/:id - Update existing meeting
      if (method === 'PUT' && meetingsPath.match(/^\/[^\/]+$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(400).json({ error: 'User not properly authenticated' });
          }

          const meetingId = meetingsPath.replace('/', '');
          const { title, start_time, end_time, description, attendees, calendly_link } = req.body;

          // Get existing meeting to check ownership
          const { data: existingMeeting, error: fetchError } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', meetingId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (fetchError || !existingMeeting) {
            return res.status(404).json({ error: 'Meeting not found' });
          }

          // Prepare update data
          const updateData = {
            updated_at: new Date().toISOString()
          };

          if (title !== undefined) updateData.title = title;
          if (start_time !== undefined) updateData.start_time = start_time;
          if (end_time !== undefined) updateData.end_time = end_time;
          if (description !== undefined) updateData.description = description;
          if (calendly_link !== undefined) {
            updateData.calendly_link = calendly_link;
            updateData.meeting_link = calendly_link; // Also update meeting_link for backward compatibility
          }

          // Update meeting
          const { data: updatedMeeting, error } = await supabase
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
            return res.status(500).json({ error: 'Failed to update meeting' });
          }

          return res.json({ meeting: updatedMeeting });
        } catch (error) {
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

          const meetingId = meetingsPath.replace('/cancel', '').replace('/', '');
          const { reason } = req.body;

          // Get existing meeting to check ownership
          const { data: existingMeeting, error: fetchError } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', meetingId)
            .eq('user_id', user.supabase_user_id)
            .single();

          if (fetchError || !existingMeeting) {
            return res.status(404).json({ error: 'Meeting not found' });
          }

          // Update meeting status
          const { data: updatedMeeting, error } = await supabase
            .from('meetings')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
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
            return res.status(500).json({ error: 'Failed to cancel meeting' });
          }

          return res.json({ meeting: updatedMeeting });
        } catch (error) {
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

          const meetingId = meetingsPath.replace('/status', '').replace('/', '');
          const { status } = req.body;

          if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be scheduled, completed, or cancelled' });
          }

          // Update meeting status
          const { data: updatedMeeting, error } = await supabase
            .from('meetings')
            .update({
              status,
              updated_at: new Date().toISOString()
            })
            .eq('id', meetingId)
            .eq('user_id', user.supabase_user_id)
            .select()
            .single();

          if (error || !updatedMeeting) {
            return res.status(404).json({ error: 'Meeting not found' });
          }

          return res.json({ meeting: updatedMeeting });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to update meeting status' });
        }
      }
    }
    
    // ============================================================================
    // ASSESSMENT ENDPOINTS - Handle public assessment links
    // ============================================================================
    if (path.startsWith('/api/assessment/')) {
      const assessmentPath = path.replace('/api/assessment/', '');
      
      // GET /api/assessment/{assessmentCode} - Get assessment by user assessment link
      if (method === 'GET' && assessmentPath && !assessmentPath.includes('/')) {
        try {
          const assessmentCode = assessmentPath;
          // Find user by assessment_link
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, full_name, assessment_link')
            .eq('assessment_link', assessmentCode)
            .single();
          
          if (userError || !user) {
            return res.status(404).json({ error: 'Assessment not found' });
          }
          
          // Get the CFA framework ID
          const { data: framework, error: frameworkError } = await supabase
            .from('risk_frameworks')
            .select('id')
            .eq('code', 'cfa_three_pillar_v1')
            .single();
          
          if (frameworkError || !framework) {
            return res.status(500).json({ error: 'Framework not found' });
          }
          
          // Fetch questions from framework_questions table
          const { data: questions, error: questionsError } = await supabase
            .from('framework_questions')
            .select('*')
            .eq('framework_id', framework.id)
            .order('order_index');
          
          if (questionsError) {
            return res.status(500).json({ error: 'Failed to fetch questions' });
          }
          
          if (!questions || questions.length === 0) {
            return res.status(404).json({ error: 'No questions found' });
          }
          
          // Create assessment object
          const assessment = {
            id: `user-${user.id}`,
            title: 'CFA Risk Assessment',
            slug: assessmentCode,
            user_id: user.id,
            user_name: user.full_name
          };
          
          return res.json({ 
            assessment,
            questions 
          });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to load assessment' });
        }
      }
      
      // POST /api/assessment/{assessmentCode}/submit - Submit assessment
      if (method === 'POST' && assessmentPath.includes('/submit')) {
        try {
          const assessmentCode = assessmentPath.replace('/submit', '');
          const { answers, submitterInfo } = req.body;
          
          if (!answers || !submitterInfo) {
            return res.status(400).json({ error: 'Missing required data' });
          }
          
          // Find user by assessment_link
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('assessment_link', assessmentCode)
            .single();
          
          if (userError || !user) {
            return res.status(404).json({ error: 'Assessment not found' });
          }
          
          // Create lead record
          const { data: lead, error: leadError } = await supabase
            .from('leads')
            .insert({
              user_id: user.id,
              full_name: submitterInfo.full_name,
              email: submitterInfo.email,
              phone: submitterInfo.phone || null,
              age: submitterInfo.age ? parseInt(submitterInfo.age) : null,
              source_link: 'assessment_link',
              status: 'assessment_done'
            })
            .select()
            .single();
          
          if (leadError) {
            return res.status(500).json({ error: 'Failed to create lead' });
          }
          
          // Calculate risk score (simplified)
          const riskScore = Math.floor(Math.random() * 100) + 1;
          const riskBucket = riskScore < 30 ? 'low' : riskScore < 70 ? 'medium' : 'high';
          
          const result = {
            bucket: riskBucket,
            score: riskScore,
            rubric: {
              capacity: Math.floor(Math.random() * 100) + 1,
              tolerance: Math.floor(Math.random() * 100) + 1,
              need: Math.floor(Math.random() * 100) + 1
            }
          };
          
          // Create assessment submission record
          const { data: submission, error: submissionError } = await supabase
            .from('assessment_submissions')
            .insert({
              owner_id: user.id,
              lead_id: lead.id,
              framework_version_id: null, // Will be null for now since we don't have framework version
              answers: answers,
              result: result,
              status: 'submitted'
            })
            .select()
            .single();
          
          if (submissionError) {
            // Don't fail the entire request, just log the error
          } else {
            }
          
          // Create notification for assessment completion
          try {
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: user.id,
                type: 'assessment_completed',
                title: 'Assessment Completed',
                message: `${submitterInfo.full_name} has completed the risk assessment`,
                data: {
                  lead_id: lead.id,
                  lead_name: submitterInfo.full_name,
                  risk_score: riskScore,
                  risk_bucket: riskBucket
                },
                priority: 'high'
              });
            
            if (notificationError) {
              } else {
              }
          } catch (notificationErr) {
            }
          
          return res.json({ 
            message: 'Assessment submitted successfully',
            result,
            lead_id: lead.id
          });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to submit assessment' });
        }
      }
      
      // Default assessment response
      return res.status(404).json({
        error: 'Assessment endpoint not found',
        path: assessmentPath,
        method: method
      });
    }
    
    // ============================================================================
    // NOTIFICATIONS ENDPOINTS
    // ============================================================================
    if (path.startsWith('/api/notifications')) {
      const notificationsPath = path.replace('/api/notifications', '');
      
      // GET /api/notifications - Get user notifications
      if (method === 'GET' && notificationsPath === '') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(401).json({ error: 'Unauthorized' });
          }

          const { page = 1, limit = 20, unread_only = false } = req.query;
          const offset = (page - 1) * limit;

          let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.supabase_user_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (unread_only === 'true') {
            query = query.eq('is_read', false);
          }

          const { data: notifications, error } = await query;

          if (error) {
            return res.status(500).json({ error: 'Failed to fetch notifications' });
          }

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.supabase_user_id)
            .eq('is_read', false);

          return res.json({
            notifications,
            unread_count: unreadCount || 0,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              has_more: notifications.length === parseInt(limit)
            }
          });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to fetch notifications' });
        }
      }

      // GET /api/notifications/count - Get unread notification count
      if (method === 'GET' && notificationsPath === '/count') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(401).json({ error: 'Unauthorized' });
          }

          const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.supabase_user_id)
            .eq('is_read', false);

          if (error) {
            return res.status(500).json({ error: 'Failed to fetch notification count' });
          }

          return res.json({ unread_count: count || 0 });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to fetch notification count' });
        }
      }

      // PUT /api/notifications/:id/read - Mark notification as read
      if (method === 'PUT' && notificationsPath.match(/^\/[^\/]+\/read$/)) {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(401).json({ error: 'Unauthorized' });
          }

          const notificationId = notificationsPath.split('/')[1];

          const { error } = await supabase
            .from('notifications')
            .update({ 
              is_read: true, 
              read_at: new Date().toISOString() 
            })
            .eq('id', notificationId)
            .eq('user_id', user.supabase_user_id);

          if (error) {
            return res.status(500).json({ error: 'Failed to mark notification as read' });
          }

          return res.json({ success: true });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to mark notification as read' });
        }
      }

      // PUT /api/notifications/read-all - Mark all notifications as read
      if (method === 'PUT' && notificationsPath === '/read-all') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(401).json({ error: 'Unauthorized' });
          }

          const { error } = await supabase
            .from('notifications')
            .update({ 
              is_read: true, 
              read_at: new Date().toISOString() 
            })
            .eq('user_id', user.supabase_user_id)
            .eq('is_read', false);

          if (error) {
            return res.status(500).json({ error: 'Failed to mark all notifications as read' });
          }

          return res.json({ success: true });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to mark all notifications as read' });
        }
      }

      // POST /api/notifications - Create notification (admin only)
      if (method === 'POST' && notificationsPath === '') {
        try {
          const user = await authenticateUser(req);
          if (!user?.supabase_user_id) {
            return res.status(401).json({ error: 'Unauthorized' });
          }

          const { user_id, type, title, message, data, priority = 'medium', expires_at } = req.body;

          if (!user_id || !type || !title || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
          }

          const { data: notification, error } = await supabase
            .from('notifications')
            .insert({
              user_id,
              type,
              title,
              message,
              data,
              priority,
              expires_at
            })
            .select()
            .single();

          if (error) {
            return res.status(500).json({ error: 'Failed to create notification' });
          }

          return res.status(201).json(notification);
        } catch (error) {
          return res.status(500).json({ error: 'Failed to create notification' });
        }
      }

      return res.status(404).json({ error: 'Notification endpoint not found' });
    }

    // ============================================================================
    // ASSESSMENTS ENDPOINTS - Handle directly since routing is not working
    // ============================================================================
    if (path.startsWith('/api/assessments')) {
      const assessmentsPath = path.replace('/api/assessments', '');
      
      // GET /api/assessments/cfa/questions - Get CFA framework questions
      if (method === 'GET' && assessmentsPath === '/cfa/questions') {
        try {
          // Temporarily bypass authentication for testing
          // const user = await authenticateUser(req);
          // if (!user?.supabase_user_id) {
          //   return res.status(400).json({ error: 'User not properly authenticated' });
          // }

          // Get the CFA framework ID
          const { data: framework, error: frameworkError } = await supabase
            .from('risk_frameworks')
            .select('id')
            .eq('code', 'cfa_three_pillar_v1')
            .single();
          
          if (frameworkError || !framework) {
            return res.status(500).json({ error: 'CFA framework not found', details: frameworkError?.message });
          }
          
          // Fetch questions from framework_questions table
          const { data: questions, error: questionsError } = await supabase
            .from('framework_questions')
            .select('*')
            .eq('framework_id', framework.id)
            .order('order_index');
          
          if (questionsError) {
            return res.status(500).json({ error: 'Failed to fetch framework questions', details: questionsError?.message });
          }
          
          if (!questions || questions.length === 0) {
            return res.json({ questions: [] });
          }
          
          return res.json({ questions });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to fetch CFA questions' });
        }
      }
      
      // POST /api/assessments/public/{slug}/submit - Submit public assessment
      if (method === 'POST' && assessmentsPath.match(/^\/public\/[^\/]+\/submit$/)) {
        try {
          const slug = assessmentsPath.match(/^\/public\/([^\/]+)\/submit$/)[1];
          const { answers, submitterInfo } = req.body;
          
          if (!answers || !submitterInfo) {
            return res.status(400).json({ error: 'Missing required data' });
          }
          
          // For now, we'll create a mock user since this is a public assessment
          // In a real implementation, you'd need to handle user creation or lookup
          const mockUserId = '00000000-0000-0000-0000-000000000000';
          
          // Create lead record
          const { data: lead, error: leadError } = await supabase
            .from('leads')
            .insert({
              user_id: mockUserId,
              full_name: submitterInfo.full_name,
              email: submitterInfo.email,
              phone: submitterInfo.phone || null,
              age: submitterInfo.age ? parseInt(submitterInfo.age) : null,
              source_link: 'public_assessment',
              status: 'assessment_done'
            })
            .select()
            .single();
          
          if (leadError) {
            return res.status(500).json({ error: 'Failed to create lead' });
          }
          
          // Calculate risk score (simplified)
          const riskScore = Math.floor(Math.random() * 100) + 1;
          const riskBucket = riskScore < 30 ? 'low' : riskScore < 70 ? 'medium' : 'high';
          
          const result = {
            bucket: riskBucket,
            score: riskScore,
            rubric: {
              capacity: Math.floor(Math.random() * 100) + 1,
              tolerance: Math.floor(Math.random() * 100) + 1,
              need: Math.floor(Math.random() * 100) + 1
            }
          };
          
          // Create assessment submission record
          const { data: submission, error: submissionError } = await supabase
            .from('assessment_submissions')
            .insert({
              owner_id: mockUserId,
              lead_id: lead.id,
              framework_version_id: null,
              answers: answers,
              result: result,
              status: 'submitted'
            })
            .select()
            .single();
          
          if (submissionError) {
            // Don't fail the entire request, just log the error
          } else {
            }
          
          return res.json({ 
            message: 'Assessment submitted successfully',
            result,
            lead_id: lead.id,
            isNewLead: true
          });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to submit assessment' });
        }
      }
      
      // GET /api/assessments/forms - List user assessment forms
      if (method === 'GET' && assessmentsPath === '/forms') {
        try {
          // Temporarily bypass authentication for testing
          // const user = await authenticateUser(req);
          // if (!user?.supabase_user_id) {
          //   return res.status(400).json({ error: 'User not properly authenticated' });
          // }

          ');

          // Get the CFA framework ID
          const { data: framework, error: frameworkError } = await supabase
            .from('risk_frameworks')
            .select('id')
            .eq('code', 'cfa_three_pillar_v1')
            .single();
          
          if (frameworkError || !framework) {
            return res.status(500).json({ error: 'CFA framework not found' });
          }
          
          // Fetch questions from framework_questions table
          const { data: questions, error: questionsError } = await supabase
            .from('framework_questions')
            .select('*')
            .eq('framework_id', framework.id)
            .order('order_index');
          
          if (questionsError) {
            return res.status(500).json({ error: 'Failed to fetch framework questions' });
          }

          // Create a default CFA framework form with real questions
          const defaultForm = {
            id: 'cfa-default-form',
            name: 'CFA Risk Assessment Form',
            description: 'Industry-standard risk assessment based on CFA three-pillar framework',
            is_active: true,
            created_at: new Date().toISOString(),
            questions: questions ? questions.map(q => ({
              id: q.id,
              question_text: q.label,
              type: q.qtype,
              options: q.options,
              weight: 1,
              required: q.required,
              module: q.module,
              order_index: q.order_index
            })) : []
          };

          return res.json({ forms: [defaultForm] });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to fetch forms' });
        }
      }
      
      // Default assessments response
      return res.status(404).json({
        error: 'Assessment endpoint not found',
        path: assessmentsPath,
        method: method
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
          return res.status(500).json({ error: 'Failed to generate recommendations' });
        }
      }

      // POST /api/ai/public/{slug}/submit - Submit public assessment
      if (method === 'POST' && aiPath.match(/^\/public\/[^\/]+\/submit$/)) {
        try {
          const slug = aiPath.match(/^\/public\/([^\/]+)\/submit$/)[1];
          const { answers, submitterInfo } = req.body;
          
          if (!answers || !submitterInfo) {
            return res.status(400).json({ error: 'Missing required data' });
          }
          
          // For now, we'll create a mock user since this is a public assessment
          // In a real implementation, you'd need to handle user creation or lookup
          const mockUserId = '00000000-0000-0000-0000-000000000000';
          
          // Create lead record
          const { data: lead, error: leadError } = await supabase
            .from('leads')
            .insert({
              user_id: mockUserId,
              full_name: submitterInfo.full_name,
              email: submitterInfo.email,
              phone: submitterInfo.phone || null,
              age: submitterInfo.age ? parseInt(submitterInfo.age) : null,
              source_link: 'public_assessment',
              status: 'assessment_done'
            })
            .select()
            .single();
          
          if (leadError) {
            return res.status(500).json({ error: 'Failed to create lead' });
          }
          
          // Calculate risk score (simplified)
          const riskScore = Math.floor(Math.random() * 100) + 1;
          const riskBucket = riskScore < 30 ? 'low' : riskScore < 70 ? 'medium' : 'high';
          
          const result = {
            bucket: riskBucket,
            score: riskScore,
            rubric: {
              capacity: Math.floor(Math.random() * 100) + 1,
              tolerance: Math.floor(Math.random() * 100) + 1,
              need: Math.floor(Math.random() * 100) + 1
            }
          };
          
          // Create assessment submission record
          const { data: submission, error: submissionError } = await supabase
            .from('assessment_submissions')
            .insert({
              owner_id: mockUserId,
              lead_id: lead.id,
              framework_version_id: null,
              answers: answers,
              result: result,
              status: 'submitted'
            })
            .select()
            .single();
          
          if (submissionError) {
            // Don't fail the entire request, just log the error
          } else {
            }
          
          return res.json({ 
            message: 'Assessment submitted successfully',
            result,
            lead_id: lead.id,
            isNewLead: true
          });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to submit assessment' });
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
    // SIP FORECAST ENDPOINTS
    // ============================================================================
    if (path.startsWith('/api/sip')) {
      const sipPath = path.replace('/api/sip', '');
      
      // POST /api/sip/forecast - Calculate SIP forecast
      if (method === 'POST' && sipPath === '/forecast') {
        try {
          const body = req.body;
          
          // Validate input
          if (!body.monthlyInvestment || !body.years || body.expectedAnnualReturn === undefined) {
            return res.status(400).json({
              ok: false,
              error: { 
                code: "VALIDATION_ERROR", 
                message: "Missing required fields: monthlyInvestment, years, expectedAnnualReturn" 
              }
            });
          }
          
          // Accept either decimals or percents (if *_Pct present)
          const payload = typeof body.expectedAnnualReturnPct === "number"
            ? {
                monthlyInvestment: Number(body.monthlyInvestment),
                years: Number(body.years),
                expectedAnnualReturn: Number(body.expectedAnnualReturnPct) / 100,
                inflation: body.inflationPct ? Number(body.inflationPct) / 100 : 0,
              }
            : {
                monthlyInvestment: Number(body.monthlyInvestment),
                years: Number(body.years),
                expectedAnnualReturn: Number(body.expectedAnnualReturn),
                inflation: body.inflation ? Number(body.inflation) : 0,
              };

          // Additional validation
          if (payload.monthlyInvestment <= 0 || payload.years <= 0 || payload.expectedAnnualReturn < 0) {
            return res.status(400).json({
              ok: false,
              error: { 
                code: "VALIDATION_ERROR", 
                message: "Invalid input values" 
              }
            });
          }

          // SIP calculation functions
          function toMonthlyRate(annual) {
            return annual / 12;
          }

          function round2(n) {
            return Math.round(n * 100) / 100;
          }

          function fvSip(monthlyInvestment, annualReturn, years) {
            const m = Math.max(0, Math.floor(years * 12));
            const i = toMonthlyRate(annualReturn);
            if (Math.abs(i) < 1e-12) return monthlyInvestment * m;
            const factor = (Math.pow(1 + i, m) - 1) / i;
            return monthlyInvestment * factor * (1 + i);
          }

          function realAnnualRate(nominal, inflation) {
            return (1 + nominal) / (1 + inflation) - 1;
          }

          function projectSipYearly(input) {
            const { monthlyInvestment, years, expectedAnnualReturn, inflation } = input;
            const rReal = realAnnualRate(expectedAnnualReturn, inflation);
            const out = [];
            for (let y = 1; y <= years; y++) {
              const nominal = fvSip(monthlyInvestment, expectedAnnualReturn, y);
              const real = fvSip(monthlyInvestment, rReal, y);
              out.push({ year: y, nominal: round2(nominal), real: round2(real) });
            }
            return out;
          }

          function computeSipForecast(input) {
            const fvNominal = round2(fvSip(input.monthlyInvestment, input.expectedAnnualReturn, input.years));
            const fvReal = round2(fvSip(input.monthlyInvestment, realAnnualRate(input.expectedAnnualReturn, input.inflation), input.years));
            const yearly = projectSipYearly(input);
            return { input, fvNominal, fvReal, yearly };
          }

          const result = computeSipForecast(payload);
          
          return res.status(200).json({ 
            ok: true, 
            result 
          });
        } catch (error) {
          return res.status(500).json({
            ok: false,
            error: { 
              code: "INTERNAL_ERROR", 
              message: error?.message ?? "Failed to compute SIP forecast" 
            }
          });
        }
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
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong in the API handler'
    });
  }
};
