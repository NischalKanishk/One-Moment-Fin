const { supabase } = require('./lib/supabase.js');
const { authenticateUser } = require('./lib/auth.js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');

    const { method, url } = req;
    
    // Parse URL properly to separate path from query parameters
    const urlObj = new URL(url, `http://localhost`);
    let path = urlObj.pathname;
    
    // Handle different routing scenarios
    if (path.startsWith('/api/assessments')) {
      // Standard API route
      path = path.replace('/api/assessments', '');
    } else if (path.startsWith('/a/')) {
      // Direct /a/ route (from Vercel rewrite)
      path = path; // Keep as is
    } else if (path.startsWith('/assessment/')) {
      // Direct /assessment/ route (from Vercel rewrite)
      path = path; // Keep as is
    }
    
    console.log('🔍 Request details:', { method, url, path });

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

        // Get the default framework info - handle case where framework tables don't exist
        let frameworkInfo = 'CFA Three Pillar v1';
        let frameworkData = null;
        
        try {
          // Try to query risk_framework_versions table if it exists
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

          if (!frameworkError && defaultFramework) {
            frameworkInfo = `${defaultFramework.risk_frameworks.name} v${defaultFramework.version}`;
            frameworkData = {
              framework_version_id: defaultFramework.id,
              framework_code: defaultFramework.risk_frameworks.code,
              framework_name: defaultFramework.risk_frameworks.name
            };
          }
        } catch (e) {
          console.log('⚠️ Framework tables not accessible, using default info:', e.message);
          // Use default framework info since tables don't exist
          frameworkInfo = 'CFA Three Pillar v1';
        }

        // Create new default assessment (using only existing columns)
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
        // Try to query risk_framework_versions table if it exists
        let defaultFramework = null;
        let frameworkError = null;
        
        try {
          const result = await supabase
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
            
          defaultFramework = result.data;
          frameworkError = result.error;
        } catch (e) {
          console.log('⚠️ Framework tables not accessible:', e.message);
          frameworkError = new Error('Framework tables not accessible');
        }

        if (frameworkError || !defaultFramework) {
          // Return a default framework since the tables don't exist
          return res.status(200).json({ 
            framework: {
              id: 'default-cfa-framework',
              code: 'CFA',
              name: 'CFA Three Pillar',
              description: 'Comprehensive risk assessment framework based on CFA principles',
              engine: 'cfa_three_pillar',
              version: {
                id: 'default-version-1',
                version: 1,
                is_default: true
              }
            }
          });
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
    // HELPER FUNCTIONS
    // ============================================================================
    
    // Get questions for different framework types
    const getQuestionsForFramework = (frameworkCode) => {
      switch (frameworkCode) {
        case 'cfa_three_pillar_v1':
          return [
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
          
        case 'dsp_style_10q_v1':
          return [
            {
              id: '1',
              qkey: 'age_group',
              label: 'What is your age group?',
              qtype: 'select',
              options: ['Below 25 years', '25-35 years', '36-45 years', '46-55 years', 'Above 55 years'],
              required: true,
              order_index: 1,
              module: 'demographics'
            },
            {
              id: '2',
              qkey: 'income_stability',
              label: 'How stable is your income?',
              qtype: 'select',
              options: ['Very unstable', 'Somewhat unstable', 'Stable', 'Very stable', 'Extremely stable'],
              required: true,
              order_index: 2,
              module: 'capacity'
            },
            {
              id: '3',
              qkey: 'investment_knowledge',
              label: 'How would you rate your investment knowledge?',
              qtype: 'select',
              options: ['Beginner', 'Somewhat knowledgeable', 'Knowledgeable', 'Very knowledgeable', 'Expert'],
              required: true,
              order_index: 3,
              module: 'knowledge'
            },
            {
              id: '4',
              qkey: 'risk_tolerance',
              label: 'What is your risk tolerance level?',
              qtype: 'select',
              options: ['Very conservative', 'Conservative', 'Moderate', 'Aggressive', 'Very aggressive'],
              required: true,
              order_index: 4,
              module: 'tolerance'
            },
            {
              id: '5',
              qkey: 'investment_horizon',
              label: 'What is your investment time horizon?',
              qtype: 'select',
              options: ['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', 'More than 10 years'],
              required: true,
              order_index: 5,
              module: 'need'
            }
          ];
          
        case 'nippon_style_v1':
          return [
            {
              id: '1',
              qkey: 'age',
              label: 'What is your age?',
              qtype: 'select',
              options: ['18-25', '26-35', '36-45', '46-55', '56-65', 'Above 65'],
              required: true,
              order_index: 1,
              module: 'demographics'
            },
            {
              id: '2',
              qkey: 'income_stability',
              label: 'Is your income stable?',
              qtype: 'select',
              options: ['No', 'Somewhat', 'Yes'],
              required: true,
              order_index: 2,
              module: 'capacity'
            },
            {
              id: '3',
              qkey: 'investment_knowledge',
              label: 'Do you understand investments?',
              qtype: 'select',
              options: ['No', 'Somewhat', 'Yes'],
              required: true,
              order_index: 3,
              module: 'knowledge'
            },
            {
              id: '4',
              qkey: 'time_horizon',
              label: 'How long can you invest?',
              qtype: 'select',
              options: ['Short term (< 1 year)', 'Medium term (1-5 years)', 'Long term (> 5 years)'],
              required: true,
              order_index: 4,
              module: 'need'
            }
          ];
          
        default:
          return [];
      }
    };

    // ============================================================================
    // GENERAL ASSESSMENTS ENDPOINTS
    // ============================================================================

    // GET /api/assessments - List all user assessments with framework info
    if (method === 'GET' && path === '') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        // Get user's assessments
        const { data: userAssessments, error: assessmentsError } = await supabase
          .from('assessments')
          .select('*')
          .eq('user_id', user.supabase_user_id);

        if (assessmentsError) {
          console.error('❌ Database error:', assessmentsError);
          return res.status(500).json({ error: 'Failed to fetch assessments', details: assessmentsError.message });
        }

        // Get default framework info to mark default assessments
        let defaultFrameworkVersionId = null;
        try {
          const { data: defaultFramework } = await supabase
            .from('risk_framework_versions')
            .select('id')
            .eq('is_default', true)
            .single();
          
          if (defaultFramework) {
            defaultFrameworkVersionId = defaultFramework.id;
          }
        } catch (e) {
          console.log('⚠️ Could not get default framework version:', e.message);
        }

        // Transform assessments to match frontend expectations
        const transformedAssessments = (userAssessments || []).map(assessment => ({
          id: assessment.id,
          title: assessment.name, // Map 'name' to 'title'
          slug: `assessment-${assessment.id}`, // Generate slug
          framework_version_id: defaultFrameworkVersionId, // Use default framework
          is_default: assessment.is_active, // Mark as default if active (simplified logic)
          is_published: assessment.is_active, // Map 'is_active' to 'is_published'
          created_at: assessment.created_at,
          updated_at: assessment.created_at // Use created_at since updated_at doesn't exist
        }));

        console.log('✅ Assessments fetched successfully:', transformedAssessments.length);
        return res.status(200).json({ assessments: transformedAssessments });
      } catch (error) {
        console.error('❌ Error in assessments endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch assessments',
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
          .from('assessment_forms')
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
          .from('assessment_forms')
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
          .from('assessment_forms')
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
          .from('assessment_forms')
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
        
        console.log('🔍 Fetching questions for framework version:', frameworkVersionId);
        
        // First, let's try to query the actual database tables to see what exists
        // We'll try different table names that might contain framework questions
        
        // Try 1: Check if framework_questions table exists
        let questions = [];
        let querySource = 'unknown';
        
        try {
          // Try to query framework_questions table first
          const { data: frameworkQuestions, error: frameworkError } = await supabase
          .from('framework_questions')
          .select('*')
          .eq('framework_version_id', frameworkVersionId)
          .order('order_index');

          if (!frameworkError && frameworkQuestions && frameworkQuestions.length > 0) {
            questions = frameworkQuestions;
            querySource = 'framework_questions';
            console.log('✅ Found questions in framework_questions table:', questions.length);
          }
        } catch (e) {
          console.log('❌ framework_questions table not accessible:', e.message);
        }
        
        // Try 2: Check if framework_question_map table exists
        if (questions.length === 0) {
          try {
            const { data: mappedQuestions, error: mapError } = await supabase
              .from('framework_question_map')
              .select(`
                *,
                questions (*)
              `)
              .eq('framework_version_id', frameworkVersionId);
              
            if (!mapError && mappedQuestions && mappedQuestions.length > 0) {
              questions = mappedQuestions.map(mq => mq.questions).filter(q => q);
              querySource = 'framework_question_map';
              console.log('✅ Found questions in framework_question_map table:', questions.length);
            }
          } catch (e) {
            console.log('❌ framework_question_map table not accessible:', e.message);
          }
        }
        
        // Try 3: Check if questions are stored in risk_frameworks table
        if (questions.length === 0) {
          try {
            const { data: frameworkData, error: frameworkError } = await supabase
              .from('risk_frameworks')
              .select(`
                *,
                risk_framework_versions!inner (
                  id,
                  questions
                )
              `)
              .eq('risk_framework_versions.id', frameworkVersionId);
              
            if (!frameworkError && frameworkData && frameworkData[0]?.risk_framework_versions?.[0]?.questions) {
              questions = frameworkData[0].risk_framework_versions[0].questions;
              querySource = 'risk_frameworks.questions';
              console.log('✅ Found questions in risk_frameworks table:', questions.length);
            }
          } catch (e) {
            console.log('❌ risk_frameworks table not accessible:', e.message);
          }
        }
        
        // If no questions found in database, create them for this framework
        if (questions.length === 0) {
          console.log('⚠️ No questions found in database for framework version:', frameworkVersionId);
          console.log('📝 Creating questions for this framework in database...');
          
          try {
            // Get framework info to determine which questions to create
            const { data: frameworkInfo } = await supabase
              .from('risk_framework_versions')
              .select(`
                id,
                version,
                risk_frameworks (
                  id,
                  code,
                  name
                )
              `)
              .eq('id', frameworkVersionId)
              .single();
            
            if (frameworkInfo) {
              // Create questions based on framework type
              const questionsToCreate = getQuestionsForFramework(frameworkInfo.risk_frameworks.code);
              
              // Create a temporary mapping - store questions in memory for this session
              // In production, you should create a proper framework_questions table
              console.log('📝 Creating framework questions mapping for:', frameworkInfo.risk_frameworks.code);
              
              // For now, return the questions directly since we can't store them permanently
              // TODO: Create proper framework_questions table in database
              const frameworkQuestions = questionsToCreate.map((q, index) => ({
                id: `${frameworkVersionId}_q_${index + 1}`,
                qkey: q.qkey,
                label: q.label,
                qtype: q.qtype,
                options: q.options,
                required: q.required,
                order_index: q.order_index,
                module: q.module
              }));
              
                            return res.json({ questions: frameworkQuestions });
            }
          } catch (e) {
            console.error('❌ Error creating questions:', e);
          }
          
          // If all else fails, return empty array
          return res.json({ questions: [] });
        }
        
        // Transform questions to match expected frontend format
        const transformedQuestions = questions.map((q, index) => {
          // Handle different possible data structures
          if (q.question_text || q.label) {
            return {
              id: q.id || `q_${index + 1}`,
              qkey: q.qkey || q.question_key || `question_${index + 1}`,
              label: q.label || q.question_text || q.question,
              qtype: q.qtype || q.type || 'select',
              options: Array.isArray(q.options) ? q.options : 
                       (q.options && typeof q.options === 'object' ? Object.values(q.options) : 
                       (q.option_values ? q.option_values.split(',') : [])),
              required: q.required !== undefined ? q.required : true,
              order_index: q.order_index || q.sort_order || index + 1,
              module: q.module || q.category || 'general'
            };
          }
          
          // If it's a simple question object
          return {
            id: q.id || `q_${index + 1}`,
                         qkey: q.qkey || `question_${index + 1}`,
             label: q.label || q.question || `Question ${index + 1}`,
             qtype: q.qtype || q.type || 'select',
             options: Array.isArray(q.options) ? q.options : [],
            required: true,
            order_index: index + 1,
            module: 'general'
          };
        });
        
        console.log(`✅ Framework questions fetched from ${querySource}:`, transformedQuestions.length);
        return res.json({ questions: transformedQuestions });
      } catch (error) {
        console.error('❌ Error in framework questions endpoint:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch questions',
          message: error.message || 'Unknown error'
        });
      }
    }

    // ============================================================================
    // DEBUG ENDPOINTS (remove in production)
    // ============================================================================
    
    // GET /api/assessments/debug/links - Debug assessment links
    if (method === 'GET' && path === '/debug/links') {
      try {
        console.log('🔍 Debug: Checking assessment_links table accessibility');
        
        // Try to query the assessment_links table
        const { data: links, error: linksError } = await supabase
          .from('assessment_links')
          .select('*')
          .limit(5);
        
        console.log('🔍 Debug: Assessment links query result:', { links, linksError });
        
        if (linksError) {
          return res.status(500).json({ 
            error: 'Failed to query assessment_links table',
            details: linksError.message,
            code: linksError.code
          });
        }
        
        return res.json({ 
          message: 'Assessment links table is accessible',
          count: links?.length || 0,
          sample: links?.slice(0, 2) || []
        });
      } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        return res.status(500).json({ 
          error: 'Debug endpoint failed',
          message: error.message 
        });
      }
    }
    
    // GET /api/assessments/debug/forms - Debug assessment forms
    if (method === 'GET' && path === '/debug/forms') {
      try {
        console.log('🔍 Debug: Checking assessment_forms table accessibility');
        
        // Try to query the assessment_forms table
        const { data: forms, error: formsError } = await supabase
          .from('assessment_forms')
          .select('*')
          .limit(5);
        
        console.log('🔍 Debug: Assessment forms query result:', { forms, formsError });
        
        if (formsError) {
          return res.status(500).json({ 
            error: 'Failed to query assessment_forms table',
            details: formsError.message,
            code: formsError.code
          });
        }
        
        return res.json({ 
          message: 'Assessment forms table is accessible',
          count: forms?.length || 0,
          sample: forms?.slice(0, 2) || []
        });
      } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        return res.status(500).json({ 
          error: 'Debug endpoint failed',
          message: error.message 
        });
      }
    }

    // ============================================================================
    // PUBLIC ASSESSMENT ROUTES
    // ============================================================================
    
    // GET /assessment/:assessmentCode - Get assessment by assessment code (backend route)
    if (method === 'GET' && path.match(/^\/assessment\/[^\/]+$/)) {
      try {
        const assessmentCode = path.split('/')[2];
        console.log('🔍 Backend assessment route called with code:', assessmentCode);
        
        // Get user by assessment code (matches backend logic)
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, full_name, assessment_link')
          .eq('assessment_link', `/assessment/${assessmentCode}`)
          .single();

        if (userError || !user) {
          console.log('❌ User not found for assessment code:', assessmentCode);
          return res.status(404).json({ error: 'Assessment link not found' });
        }

        console.log('✅ User found for assessment code:', user.id);
        
        // Get CFA framework questions (since this is the default assessment)
        let questions = [];
        try {
          // First get the framework ID
          const { data: framework, error: frameworkError } = await supabase
            .from('risk_frameworks')
            .select('id')
            .eq('code', 'cfa_three_pillar_v1')
            .single();

          if (frameworkError || !framework) {
            console.log('❌ CFA framework not found');
            return res.status(500).json({ error: 'CFA framework not found' });
          }

          // Then get the questions
          const { data: frameworkQuestions, error: questionsError } = await supabase
            .from('framework_questions')
            .select('*')
            .eq('framework_id', framework.id)
            .order('order_index');

          if (questionsError) {
            console.log('❌ Error fetching questions, trying fallback');
            // Try fallback to question_bank table
            const { data: fallbackQuestions, error: fallbackError } = await supabase
              .from('question_bank')
              .select('*')
              .eq('is_active', true)
              .order('order_index');
            
            if (fallbackError) {
              console.log('❌ Fallback questions also failed');
              return res.status(500).json({ error: 'Failed to fetch assessment questions' });
            }
            
            questions = fallbackQuestions || [];
          } else {
            questions = frameworkQuestions || [];
          }
        } catch (error) {
          console.error('❌ Error in questions query:', error);
          return res.status(500).json({ error: 'Failed to fetch assessment questions' });
        }

        // Return the assessment data (matches backend format)
        return res.json({
          assessment: {
            id: `assessment_${assessmentCode}`,
            title: 'CFA Three-Pillar Risk Assessment',
            slug: `assessment/${assessmentCode}`,
            user_id: user.id,
            user_name: user.full_name
          },
          questions: questions,
          assessment_code: assessmentCode
        });

      } catch (error) {
        console.error('❌ Backend assessment route error:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }

    // POST /assessment/:assessmentCode/submit - Submit assessment by assessment code
    if (method === 'POST' && path.match(/^\/assessment\/[^\/]+\/submit$/)) {
      try {
        const assessmentCode = path.split('/')[2];
        console.log('🔍 Assessment submission endpoint called with code:', assessmentCode);
        
        const { answers, submitterInfo } = req.body;
        
        // Validate required fields
        if (!answers || !submitterInfo?.full_name || !submitterInfo?.email) {
          return res.status(400).json({ error: 'Missing required fields: answers, submitterInfo.full_name, submitterInfo.email' });
        }

        // Get user by assessment code
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, full_name, assessment_link')
          .eq('assessment_link', `/assessment/${assessmentCode}`)
          .single();

        if (userError || !user) {
          console.log('❌ User not found for assessment code:', assessmentCode);
          return res.status(404).json({ error: 'Assessment link not found' });
        }

        console.log('✅ User found for assessment submission:', user.id);
        
        // Create lead record
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .insert({
            user_id: user.id,
            full_name: submitterInfo.full_name,
            email: submitterInfo.email,
            phone: submitterInfo.phone || null,
            age: submitterInfo.age ? parseInt(submitterInfo.age) : null,
            source_link: `/assessment/${assessmentCode}`,
            status: 'assessment_done'
          })
          .select()
          .single();

        if (leadError) {
          console.error('❌ Failed to create lead:', leadError);
          return res.status(500).json({ error: 'Failed to create lead record' });
        }

        console.log('✅ Lead created successfully:', lead.id);
        
        // For now, return a simple success response
        // In the future, this could integrate with the full assessment scoring system
        return res.json({
          message: 'Assessment submitted successfully',
          result: {
            bucket: 'moderate', // Default bucket
            score: 50, // Default score
            rubric: {
              capacity: 50,
              tolerance: 50,
              need: 50
            }
          },
          leadId: lead.id,
          isNewLead: true,
          submissionId: `sub_${Date.now()}`,
          assessment_code: assessmentCode
        });

      } catch (error) {
        console.error('❌ Assessment submission error:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }

    // ============================================================================
    // PUBLIC ASSESSMENT ROUTES (API endpoints for React app)
    // ============================================================================
    
    // GET /api/assessments/public/:slug - Get public assessment data by slug (for React app)
    if (method === 'GET' && path.match(/^\/public\/[^\/]+$/)) {
      try {
        const slug = path.split('/')[2];
        console.log('🔍 Public assessment API called with slug:', slug);
        
        // Get the user by assessment_link field (should contain just the slug)
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('assessment_link', slug)
          .single();

        if (userError || !user) {
          console.log('❌ User not found for assessment link:', slug);
          return res.status(404).json({ error: 'Assessment link not found' });
        }

        console.log('✅ User found for assessment link:', user.id);
        
        // Get CFA framework questions
        let questions = [];
        try {
          // First get the framework ID
          const { data: framework, error: frameworkError } = await supabase
            .from('risk_frameworks')
            .select('id')
            .eq('code', 'cfa_three_pillar_v1')
            .single();

          if (frameworkError || !framework) {
            console.log('❌ CFA framework not found');
            return res.status(500).json({ error: 'CFA framework not found' });
          }

          // Then get the questions
          const { data: frameworkQuestions, error: questionsError } = await supabase
            .from('framework_questions')
            .select('*')
            .eq('framework_id', framework.id)
            .order('order_index');

          if (questionsError) {
            console.log('❌ Error fetching questions, trying fallback');
            // Try fallback to question_bank table
            const { data: fallbackQuestions, error: fallbackError } = await supabase
              .from('question_bank')
              .select('*')
              .eq('is_active', true)
              .order('order_index');
            
            if (fallbackError) {
              console.log('❌ Fallback questions also failed');
              return res.status(500).json({ error: 'Failed to fetch assessment questions' });
            }
            
            questions = fallbackQuestions || [];
          } else {
            questions = frameworkQuestions || [];
          }
        } catch (error) {
          console.error('❌ Error in questions query:', error);
          return res.status(500).json({ error: 'Failed to fetch assessment questions' });
        }

        // Return the assessment data
        return res.json({
          assessment: {
            id: `assessment_${slug}`,
            title: 'CFA Three-Pillar Risk Assessment',
            slug: slug,
            user_id: user.id,
            user_name: user.full_name
          },
          questions: questions
        });

      } catch (error) {
        console.error('❌ Public assessment API error:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }
    
    // POST /api/assessments/public/:slug/submit - Submit assessment by slug (API endpoint)
    if (method === 'POST' && path.match(/^\/public\/[^\/]+\/submit$/)) {
      try {
        const slug = path.split('/')[2];
        console.log('🔍 Public assessment submission endpoint called with slug:', slug);
        
        const { answers, submitterInfo } = req.body;
        
        // Validate required fields
        if (!answers || !submitterInfo?.full_name || !submitterInfo?.email) {
          return res.status(400).json({ error: 'Missing required fields: answers, submitterInfo.full_name, submitterInfo.email' });
        }

        // Get the user by assessment_link field
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('assessment_link', slug)
          .single();

        if (userError || !user) {
          console.log('❌ User not found for assessment link:', slug);
          return res.status(404).json({ error: 'Assessment link not found' });
        }

        console.log('✅ User found for assessment submission:', user.id);
        
        // Create lead record under the correct user
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .insert({
            user_id: user.id,
            full_name: submitterInfo.full_name,
            email: submitterInfo.email,
            phone: submitterInfo.phone || null,
            age: submitterInfo.age ? parseInt(submitterInfo.age) : null,
            source_link: `/a/${slug}`,
            status: 'assessment_done'
          })
          .select()
          .single();

        if (leadError) {
          console.error('❌ Failed to create lead:', leadError);
          return res.status(500).json({ error: 'Failed to create lead record' });
        }

        console.log('✅ Lead created successfully:', lead.id);
        


        // Store assessment submission data
        console.log('🔍 Attempting to store assessment submission...');
        console.log('🔍 Data to insert:', {
          owner_id: user.id,
          lead_id: lead.id,
          answers: answers,
          result: {
            bucket: 'moderate',
            score: 50,
            rubric: { capacity: 50, tolerance: 50, need: 50 }
          }
        });
        
        const { data: submission, error: submissionError } = await supabase
          .from('assessment_submissions')
          .insert({
            assessment_id: null, // No specific assessment form for now
            framework_version_id: null, // No specific framework version for now
            owner_id: user.id,
            lead_id: lead.id,
            submitted_at: new Date().toISOString(),
            answers: answers,
            result: {
              bucket: 'moderate', // Default bucket
              score: 50, // Default score
              rubric: {
                capacity: 50,
                tolerance: 50,
                need: 50
              }
            },
            status: 'submitted'
          })
          .select()
          .single();

        if (submissionError) {
          console.error('❌ Failed to create assessment submission:', submissionError);
          console.error('❌ Error details:', submissionError);
          // Don't fail the whole request, just log the error
        } else {
          console.log('✅ Assessment submission created successfully:', submission.id);
        }
        
        // Update lead with risk profile information (always try to update)
        const riskProfileData = {
          risk_bucket: 'moderate',
          risk_score: 50
        };
        
        // Only set risk_profile_id if submission was created successfully
        if (submission && !submissionError) {
          riskProfileData.risk_profile_id = submission.id;
        }
        
        const { error: updateError } = await supabase
          .from('leads')
          .update(riskProfileData)
          .eq('id', lead.id);

        if (updateError) {
          console.error('❌ Failed to update lead risk profile:', updateError);
        } else {
          console.log('✅ Lead risk profile updated successfully');
        }
        
        return res.json({
          message: 'Assessment submitted successfully',
          result: {
            bucket: 'moderate', // Default bucket
            score: 50, // Default score
            rubric: {
              capacity: 50,
              tolerance: 50,
              need: 50
            }
          },
          leadId: lead.id,
          isNewLead: true,
          submissionId: submission?.id || `sub_${Date.now()}`,
          slug: slug
        });

      } catch (error) {
        console.error('❌ Public assessment submission error:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
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

        console.log('🔍 Creating assessment link with data:', {
          token,
          user_id: user.supabase_user_id,
          form_id,
          status: 'active',
          expires_at: expires_at.toISOString()
        });

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
          console.error('❌ Failed to create assessment link:', createError);
          return res.status(500).json({ error: 'Failed to create assessment link' });
        }

        console.log('✅ Assessment link created successfully:', link);

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

    // GET /api/assessments/cfa/questions - Get CFA framework questions
    if (method === 'GET' && (path === '/cfa/questions' || path === '/cfa/questions/')) {
      try {
        console.log('🔍 CFA questions endpoint called');
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        // Get CFA framework questions from the framework_questions table
        // First get the framework ID
        console.log('🔍 Fetching CFA framework...');
        const { data: framework, error: frameworkError } = await supabase
          .from('risk_frameworks')
          .select('id')
          .eq('code', 'cfa_three_pillar_v1')
          .single();

        if (frameworkError) {
          console.error('Error fetching CFA framework:', frameworkError);
          return res.status(500).json({ error: 'CFA framework not found', details: frameworkError.message });
        }

        if (!framework) {
          console.error('CFA framework not found in database');
          return res.status(500).json({ error: 'CFA framework not found in database' });
        }

        console.log('✅ CFA framework found:', framework.id);

        // Then get the questions
        let questions = [];
        try {
          console.log('🔍 Fetching questions for framework:', framework.id);
          const { data: frameworkQuestions, error: questionsError } = await supabase
            .from('framework_questions')
            .select('*')
            .eq('framework_id', framework.id)
            .order('order_index');

          if (questionsError) {
            console.error('Error fetching CFA framework questions:', questionsError);
            // Try fallback to question_bank table if framework_questions doesn't exist
            const { data: fallbackQuestions, error: fallbackError } = await supabase
              .from('question_bank')
              .select('*')
              .eq('is_active', true)
              .order('order_index');
            
            if (fallbackError) {
              console.error('Fallback questions also failed:', fallbackError);
              return res.status(500).json({ error: 'Failed to fetch CFA questions' });
            }
            
            questions = fallbackQuestions || [];
          } else {
            questions = frameworkQuestions || [];
          }
        } catch (error) {
          console.error('Error in CFA questions query:', error);
          return res.status(500).json({ error: 'Failed to fetch CFA questions' });
        }

        console.log(`✅ CFA questions fetched successfully: ${questions.length} questions`);
        return res.json({ questions: questions || [] });
      } catch (error) {
        console.error('Get CFA questions error:', error);
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to fetch CFA questions' });
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
