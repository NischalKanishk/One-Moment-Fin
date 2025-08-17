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
    
    // Parse URL properly to separate path from query parameters
    const urlObj = new URL(url, `http://localhost`);
    const path = urlObj.pathname.replace('/api/assessments', '');

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

        const { name, is_active } = req.body;
        if (!name) {
          return res.status(400).json({ error: 'Assessment name is required' });
        }

        const { data: assessment, error: createError } = await supabase
          .from('assessments')
          .insert({
            user_id: user.supabase_user_id,
            name,
            is_active: is_active || false
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

        const { name, is_active } = req.body;
        
        // Build update object with only fields that exist in the database
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (is_active !== undefined) updateData.is_active = is_active;
        
        const { data: assessment, error: updateError } = await supabase
          .from('assessments')
          .update(updateData)
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

        // Check if user already has a default assessment
        const { data: existingAssessment, error: checkError } = await supabase
          .from('assessments')
          .select('id')
          .eq('user_id', user.supabase_user_id)
          .eq('is_active', true)
          .single();

        if (existingAssessment) {
          return res.status(200).json({ 
            assessment: existingAssessment,
            message: 'Default assessment already exists'
          });
        }

        // Get the default framework info
        const { data: defaultFramework, error: frameworkError } = await supabase
          .from('risk_framework_versions')
          .select(`
            id,
            version,
            risk_frameworks (
              id,
              code,
              name,
              description
            )
          `)
          .eq('is_default', true)
          .single();

        let frameworkInfo = 'CFA Three Pillar v1';
        let frameworkData = null;
        
        if (!frameworkError && defaultFramework) {
          frameworkInfo = `${defaultFramework.risk_frameworks.name} v${defaultFramework.version}`;
          frameworkData = {
            framework_version_id: defaultFramework.id,
            framework_code: defaultFramework.risk_frameworks.code,
            framework_name: defaultFramework.risk_frameworks.name
          };
        }

        // Create new default assessment (simplified - no description to avoid schema issues)
        const { data: assessment, error: createError } = await supabase
          .from('assessments')
          .insert({
            user_id: user.supabase_user_id,
            name: `Default Risk Assessment - ${frameworkInfo}`,
            is_active: true
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Database error creating assessment:', createError);
          return res.status(500).json({ 
            error: 'Failed to create default assessment',
            details: createError.message 
          });
        }

        console.log('✅ Default assessment created successfully:', assessment.id);
        return res.status(201).json({ assessment });
      } catch (error) {
        console.error('❌ Error in default assessment endpoint:', error);
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ 
          error: 'Failed to create default assessment',
          message: error.message || 'Unknown error'
        });
      }
    }

    // GET /api/assessments/default/framework - Get default framework info
    if (method === 'GET' && path === '/default/framework') {
      try {
        const { data: defaultFramework, error: frameworkError } = await supabase
          .from('risk_framework_versions')
          .select(`
            id,
            version,
            is_default,
            risk_frameworks (
              id,
              code,
              name,
              description,
              engine
            )
          `)
          .eq('is_default', true)
          .single();

        if (frameworkError || !defaultFramework) {
          return res.status(404).json({ error: 'No default framework found' });
        }

        return res.status(200).json({ 
          framework: {
            id: defaultFramework.risk_frameworks.id,
            code: defaultFramework.risk_frameworks.code,
            name: defaultFramework.risk_frameworks.name,
            description: defaultFramework.risk_frameworks.description,
            engine: defaultFramework.risk_frameworks.engine,
            version: {
              id: defaultFramework.id,
              version: defaultFramework.version,
              is_default: defaultFramework.is_default
            }
          }
        });
      } catch (error) {
        console.error('❌ Error getting default framework:', error);
        return res.status(500).json({ 
          error: 'Failed to get default framework',
          message: error.message || 'Unknown error'
        });
      }
    }

    // ============================================================================
    // FORMS ENDPOINTS
    // ============================================================================

    // GET /api/assessments/forms - List user assessment forms
    if (method === 'GET' && path === '/forms') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { data: forms, error: formsError } = await supabase
          .from('assessments')
          .select('*')
          .eq('user_id', user.supabase_user_id);

        if (formsError) {
          console.error('❌ Database error:', formsError);
          return res.status(500).json({ error: 'Failed to fetch forms', details: formsError.message });
        }

        console.log('✅ Forms fetched successfully:', forms?.length || 0);
        return res.status(200).json({ forms: forms || [] });
      } catch (error) {
        console.error('❌ Error in forms endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch forms',
          message: error.message || 'Unknown error'
        });
      }
    }

    // POST /api/assessments/forms - Create a new assessment form
    if (method === 'POST' && path === '/forms') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { name, is_active = true } = req.body;
        if (!name) {
          return res.status(400).json({ error: 'Form name is required' });
        }

        const { data: form, error: formError } = await supabase
          .from('assessments')
          .insert({
            user_id: user.supabase_user_id,
            name,
            is_active
          })
          .select()
          .single();

        if (formError) {
          console.error('❌ Database error:', formError);
          return res.status(500).json({ error: 'Failed to create form', details: formError.message });
        }

        console.log('✅ Form created successfully:', form.id);
        return res.status(201).json({ form });
      } catch (error) {
        console.error('❌ Error in create form endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to create form',
          message: error.message || 'Unknown error'
        });
      }
    }

    // PUT /api/assessments/forms/:id - Update an assessment form
    if (method === 'PUT' && path.match(/^\/forms\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const formId = path.split('/')[2];
        const { name, is_active } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { data: form, error: formError } = await supabase
          .from('assessments')
          .update(updateData)
          .eq('id', formId)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (formError) {
          if (formError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Form not found or you do not have permission to update it' });
          }
          console.error('❌ Database error:', formError);
          return res.status(500).json({ error: 'Failed to update form', details: formError.message });
        }

        console.log('✅ Form updated successfully:', formId);
        return res.status(200).json({ form });
      } catch (error) {
        console.error('❌ Error in update form endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to update form',
          message: error.message || 'Unknown error'
        });
      }
    }

    // DELETE /api/assessments/forms/:id - Delete an assessment form
    if (method === 'DELETE' && path.match(/^\/forms\/[^\/]+$/)) {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const formId = path.split('/')[2];

        const { data: form, error: formError } = await supabase
          .from('assessments')
          .delete()
          .eq('id', formId)
          .eq('user_id', user.supabase_user_id)
          .select()
          .single();

        if (formError) {
          if (formError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Form not found or you do not have permission to delete it' });
          }
          console.error('❌ Database error:', formError);
          return res.status(500).json({ error: 'Failed to delete form', details: formError.message });
        }

        console.log('✅ Form deleted successfully:', formId);
        return res.status(200).json({ message: 'Form deleted successfully', form });
      } catch (error) {
        console.error('❌ Error in delete form endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to delete form',
          message: error.message || 'Unknown error'
        });
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
        
        // For now, return mock CFA Three Pillar questions since there's no framework_questions table
        // TODO: Create proper framework_questions table or store questions differently
        const mockCFAQuestions = [
          {
            id: '1',
            qkey: 'risk_capacity_income',
            label: 'What is your current annual income?',
            qtype: 'select',
            options: ['Below ₹50,000', '₹50,000 - ₹2,00,000', '₹2,00,000 - ₹5,00,000', '₹5,00,000 - ₹10,00,000', 'Above ₹10,00,000'],
            required: true,
            order_index: 1,
            module: 'capacity'
          },
          {
            id: '2',
            qkey: 'risk_capacity_savings',
            label: 'What percentage of your income do you save monthly?',
            qtype: 'select',
            options: ['Below 10%', '10% - 20%', '20% - 30%', '30% - 40%', 'Above 40%'],
            required: true,
            order_index: 2,
            module: 'capacity'
          },
          {
            id: '3',
            qkey: 'risk_tolerance_loss',
            label: 'How would you react if your investment lost 20% of its value in a month?',
            qtype: 'select',
            options: ['Sell immediately to prevent further losses', 'Worry but hold the investment', 'Stay calm and review the situation', 'See it as an opportunity to buy more'],
            required: true,
            order_index: 3,
            module: 'tolerance'
          },
          {
            id: '4',
            qkey: 'investment_need_goal',
            label: 'What is your primary investment goal?',
            qtype: 'select',
            options: ['Wealth preservation', 'Regular income generation', 'Moderate capital growth', 'Aggressive capital growth'],
            required: true,
            order_index: 4,
            module: 'need'
          },
          {
            id: '5',
            qkey: 'investment_horizon',
            label: 'What is your investment time horizon?',
            qtype: 'select',
            options: ['Less than 1 year', '1 - 3 years', '3 - 5 years', '5 - 10 years', 'More than 10 years'],
            required: true,
            order_index: 5,
            module: 'need'
          }
        ];

        console.log('✅ Framework questions fetched (mock data):', mockCFAQuestions.length);
        return res.json({ questions: mockCFAQuestions });
      } catch (error) {
        console.error('❌ Error in framework questions endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch questions',
          message: error.message || 'Unknown error'
        });
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
