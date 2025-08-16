const { supabase } = require('./lib/supabase.js');
const { authenticateUser } = require('./lib/auth.js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const { method, url } = req;
    const path = url.replace('/api/assessments', '');

    // ============================================================================
    // ASSESSMENTS ENDPOINTS
    // ============================================================================

    // GET /api/assessments - List user assessments
    if (method === 'GET' && path === '') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { data: assessments, error: assessmentsError } = await supabase
          .from('assessments')
          .select('*')
          .eq('user_id', user.supabase_user_id);

        if (assessmentsError) {
          return res.status(500).json({ error: 'Failed to fetch assessments' });
        }

        return res.json({ assessments: assessments || [] });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to fetch assessments' });
      }
    }

    // POST /api/assessments - Create a new assessment
    if (method === 'POST' && path === '') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { title, framework_version_id, is_default } = req.body;
        if (!title) {
          return res.status(400).json({ error: 'Assessment title is required' });
        }

        const { data: assessment, error: createError } = await supabase
          .from('assessments')
          .insert({
            user_id: user.supabase_user_id,
            title,
            framework_version_id,
            is_default: is_default || false,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          return res.status(500).json({ error: 'Failed to create assessment' });
        }

        return res.status(201).json({ assessment });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to create assessment' });
      }
    }

    // PATCH /api/assessments/:id - Update assessment
    if (method === 'PATCH' && path.match(/^\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        const assessmentId = path.split('/')[1];
        
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { framework_version_id } = req.body;
        const { data: assessment, error: updateError } = await supabase
          .from('assessments')
          .update({
            framework_version_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', assessmentId)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ error: 'Failed to update assessment' });
        }

        return res.json({ assessment });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to update assessment' });
      }
    }

    // POST /api/assessments/default - Create default assessment
    if (method === 'POST' && path === '/default') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { data: defaultFramework, error: frameworkError } = await supabase
          .from('risk_framework_versions')
          .select('id')
          .eq('is_default', true)
          .single();

        if (frameworkError || !defaultFramework) {
          return res.status(500).json({ error: 'No default framework available' });
        }

        const { data: assessment, error: createError } = await supabase
          .from('assessments')
          .insert({
            user_id: user.supabase_user_id,
            title: 'Default Assessment',
            framework_version_id: defaultFramework.id,
            is_default: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          return res.status(500).json({ error: 'Failed to create default assessment' });
        }

        return res.status(201).json({ assessment });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to create default assessment' });
      }
    }

    // ============================================================================
    // FRAMEWORKS ENDPOINTS
    // ============================================================================

    // GET /api/assessments/frameworks - Get available frameworks
    if (method === 'GET' && path === '/frameworks') {
      try {
        const { data: frameworks, error: frameworksError } = await supabase
          .from('risk_frameworks')
          .select(`
            id,
            code,
            name,
            description,
            engine,
            risk_framework_versions (
              id,
              version,
              is_default,
              created_at
            )
          `);

        if (frameworksError) {
          return res.status(500).json({ error: 'Failed to fetch frameworks' });
        }

        return res.json({ frameworks: frameworks || [] });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch frameworks' });
      }
    }

    // GET /api/assessments/frameworks/:id/questions - Get framework questions
    if (method === 'GET' && path.match(/^\/frameworks\/[^\/]+\/questions$/)) {
      try {
        const frameworkVersionId = path.split('/')[2];
        
        const { data: questions, error: questionsError } = await supabase
          .from('framework_questions')
          .select('*')
          .eq('framework_version_id', frameworkVersionId)
          .order('order_index');

        if (questionsError) {
          return res.status(500).json({ error: 'Failed to fetch questions' });
        }

        return res.json({ questions: questions || [] });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch questions' });
      }
    }

    // ============================================================================
    // ASSESSMENT LINKS ENDPOINTS
    // ============================================================================

    // GET /api/assessments/links - List user's assessment links
    if (method === 'GET' && path === '/links') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { data: links, error: linksError } = await supabase
          .from('assessment_links')
          .select(`
            *,
            assessment_forms (
              id,
              name,
              description
            ),
            leads (
              id,
              full_name,
              email,
              phone
            )
          `)
          .eq('user_id', user.supabase_user_id)
          .order('created_at', { ascending: false });

        if (linksError) {
          return res.status(500).json({ error: 'Failed to fetch assessment links' });
        }

        return res.json({ links: links || [] });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to fetch assessment links' });
      }
    }

    // POST /api/assessments/links - Create new assessment link
    if (method === 'POST' && path === '/links') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { form_id, version_id, lead_id, expires_in_days = 30 } = req.body;
        if (!form_id) {
          return res.status(400).json({ error: 'Form ID is required' });
        }

        const token = `assess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + expires_in_days);

        const { data: link, error: createError } = await supabase
          .from('assessment_links')
          .insert({
            token,
            user_id: user.supabase_user_id,
            form_id,
            version_id: version_id || null,
            lead_id: lead_id || null,
            status: 'active',
            expires_at: expires_at.toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          return res.status(500).json({ error: 'Failed to create assessment link' });
        }

        return res.status(201).json({ 
          message: 'Assessment link created successfully', 
          link,
          public_url: `${process.env.FRONTEND_URL || 'https://one-moment-fin.vercel.app'}/a/${token}`
        });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to create assessment link' });
      }
    }

    // PATCH /api/assessments/links/:token - Update assessment link
    if (method === 'PATCH' && path.match(/^\/links\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        const token = path.split('/')[2];
        
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { status, expires_in_days } = req.body;
        let updateData = {};
        
        if (status) updateData.status = status;
        if (expires_in_days) {
          const expires_at = new Date();
          expires_at.setDate(expires_at.getDate() + expires_in_days);
          updateData.expires_at = expires_at.toISOString();
        }

        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        updateData.updated_at = new Date().toISOString();

        const { data: link, error: updateError } = await supabase
          .from('assessment_links')
          .update(updateData)
          .eq('token', token)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ error: 'Failed to update assessment link' });
        }

        return res.json({ message: 'Assessment link updated successfully', link });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to update assessment link' });
      }
    }

    // DELETE /api/assessments/links/:token - Revoke assessment link
    if (method === 'DELETE' && path.match(/^\/links\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        const token = path.split('/')[2];
        
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { error: deleteError } = await supabase
          .from('assessment_links')
          .delete()
          .eq('token', token)
          .eq('user_id', user.supabase_user_id);

        if (deleteError) {
          return res.status(500).json({ error: 'Failed to revoke assessment link' });
        }

        return res.json({ message: 'Assessment link revoked successfully' });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to revoke assessment link' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Assessments API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
