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
        
        // Calculate risk score based on answers
        console.log('🔍 Calculating risk score from answers:', answers);
        
        let riskScore = 0;
        let capacityScore = 0;
        let toleranceScore = 0;
        let needScore = 0;
        let questionCount = 0;
        
        // Risk scoring logic based on CFA framework
        Object.entries(answers).forEach(([questionKey, answer]) => {
          questionCount++;
          
          // Capacity questions (financial ability)
          if (['age', 'dependents', 'income_security', 'emi_ratio', 'liquidity_withdrawal_2y', 'emergency_fund_months'].includes(questionKey)) {
            let score = 0;
            switch (questionKey) {
              case 'age':
                if (answer === '<25') score = 20;
                else if (answer === '25-35') score = 30;
                else if (answer === '36-50') score = 40;
                else if (answer === '51+') score = 50;
                break;
              case 'dependents':
                if (answer === '0') score = 50;
                else if (answer === '1') score = 40;
                else if (answer === '2') score = 30;
                else if (answer === '3') score = 20;
                else score = 10;
                break;
              case 'income_security':
                if (answer === 'Very secure') score = 50;
                else if (answer === 'Fairly secure') score = 40;
                else if (answer === 'Somewhat secure') score = 30;
                else score = 20;
                break;
              case 'emi_ratio':
                const emiRatio = parseInt(answer);
                if (emiRatio <= 20) score = 50;
                else if (emiRatio <= 35) score = 40;
                else if (emiRatio <= 50) score = 30;
                else score = 20;
                break;
              case 'liquidity_withdrawal_2y':
                const withdrawalRatio = parseInt(answer);
                if (withdrawalRatio <= 10) score = 50;
                else if (withdrawalRatio <= 25) score = 40;
                else if (withdrawalRatio <= 50) score = 30;
                else score = 20;
                break;
              case 'emergency_fund_months':
                if (answer === '>12') score = 50;
                else if (answer === '6-12') score = 40;
                else if (answer === '3-6') score = 30;
                else score = 20;
                break;
            }
            capacityScore += score;
          }
          
          // Tolerance questions (risk behavior)
          else if (['drawdown_reaction', 'gain_loss_tradeoff', 'loss_threshold'].includes(questionKey)) {
            let score = 0;
            switch (questionKey) {
              case 'drawdown_reaction':
                if (answer === 'Buy more') score = 50;
                else if (answer === 'Do nothing') score = 30;
                else score = 10;
                break;
              case 'gain_loss_tradeoff':
                if (answer === 'Loss25Gain50') score = 50;
                else if (answer === 'Loss8Gain22') score = 30;
                else score = 10;
                break;
              case 'loss_threshold':
                if (answer === '>15%') score = 50;
                else if (answer === '9-15%') score = 40;
                else if (answer === '3-8%') score = 30;
                else score = 20;
                break;
            }
            toleranceScore += score;
          }
          
          // Need questions (investment requirements)
          else if (['goal_required_return', 'liquidity_constraint'].includes(questionKey)) {
            let score = 0;
            switch (questionKey) {
              case 'goal_required_return':
                const requiredReturn = parseInt(answer);
                if (requiredReturn <= 8) score = 20;
                else if (requiredReturn <= 12) score = 30;
                else if (requiredReturn <= 16) score = 40;
                else score = 50;
                break;
              case 'liquidity_constraint':
                if (answer === 'locked_ok') score = 50;
                else if (answer === '1y') score = 40;
                else if (answer === '3m') score = 30;
                else score = 20;
                break;
            }
            needScore += score;
          }
          
          // Knowledge questions (market understanding)
          else if (['market_knowledge', 'investing_experience'].includes(questionKey)) {
            let score = 0;
            switch (questionKey) {
              case 'market_knowledge':
                const knowledgeLevel = parseInt(answer);
                score = knowledgeLevel * 10; // 1-5 scale becomes 10-50
                break;
              case 'investing_experience':
                if (answer === '>10y') score = 50;
                else if (answer === '3-10y') score = 40;
                else if (answer === '<3y') score = 30;
                else score = 20;
                break;
            }
            toleranceScore += score; // Knowledge affects risk tolerance
          }
        });
        
        // Calculate average scores
        const capacityQuestions = ['age', 'dependents', 'income_security', 'emi_ratio', 'liquidity_withdrawal_2y', 'emergency_fund_months'].filter(q => answers[q]);
        const toleranceQuestions = ['drawdown_reaction', 'gain_loss_tradeoff', 'loss_threshold', 'market_knowledge', 'investing_experience'].filter(q => answers[q]);
        const needQuestions = ['goal_required_return', 'liquidity_constraint'].filter(q => answers[q]);
        
        capacityScore = capacityQuestions.length > 0 ? Math.round(capacityScore / capacityQuestions.length) : 0;
        toleranceScore = toleranceQuestions.length > 0 ? Math.round(toleranceScore / toleranceQuestions.length) : 0;
        needScore = needQuestions.length > 0 ? Math.round(needScore / needQuestions.length) : 0;
        
        // Overall risk score (weighted average)
        riskScore = Math.round((capacityScore * 0.4 + toleranceScore * 0.4 + needScore * 0.2));
        
        // Determine risk bucket
        let riskBucket = 'Medium';
        if (riskScore <= 25) riskBucket = 'Low';
        else if (riskScore >= 40) riskBucket = 'High';
        
        console.log('🔍 Risk scoring results:', {
          capacityScore,
          toleranceScore,
          needScore,
          riskScore,
          riskBucket
        });
        
        // Debug the answers object
        console.log('🔍 Answers object debug:');
        console.log('🔍 - Answers type:', typeof answers);
        console.log('🔍 - Answers keys:', Object.keys(answers || {}));
        console.log('🔍 - Answers sample:', JSON.stringify(answers, null, 2).substring(0, 500));
        
        // Check if answers is valid JSONB
        try {
          JSON.stringify(answers);
          console.log('✅ Answers is valid JSON');
        } catch (jsonError) {
          console.error('❌ Answers is not valid JSON:', jsonError);
        }
        
        // Clean and validate answers data
        console.log('🔍 Cleaning and validating answers data...');
        const cleanedAnswers = {};
        
        if (answers && typeof answers === 'object') {
          Object.entries(answers).forEach(([key, value]) => {
            // Skip null/undefined values
            if (value !== null && value !== undefined) {
              // Convert to string if it's not a primitive type
              if (typeof value === 'object' && !Array.isArray(value)) {
                cleanedAnswers[key] = JSON.stringify(value);
              } else if (Array.isArray(value)) {
                // Handle arrays - ensure all elements are strings
                cleanedAnswers[key] = value.map(item => String(item));
              } else {
                cleanedAnswers[key] = String(value);
              }
            }
          });
        }
        
        console.log('🔍 Cleaned answers:', cleanedAnswers);
        console.log('🔍 Cleaned answers keys:', Object.keys(cleanedAnswers));
        
        // Store assessment submission data with calculated scores
        console.log('🔍 Storing assessment submission with calculated scores...');
        
        // Create or get a default CFA assessment form record FIRST
        console.log('🔍 Creating/getting default CFA assessment form...');
        let defaultAssessmentId = null;
        
        try {
          // First try to find an existing CFA assessment form
          const { data: existingAssessment, error: findError } = await supabase
            .from('assessment_forms')
            .select('id')
            .eq('name', 'CFA Three-Pillar Risk Assessment')
            .eq('user_id', user.id)
            .single();
          
          if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found
            console.error('❌ Error finding existing assessment form:', findError);
          } else if (existingAssessment) {
            defaultAssessmentId = existingAssessment.id;
            console.log('✅ Found existing CFA assessment form:', defaultAssessmentId);
          } else {
            // Create a new default assessment form
            const { data: newAssessment, error: createError } = await supabase
              .from('assessment_forms')
              .insert({
                user_id: user.id,
                name: 'CFA Three-Pillar Risk Assessment',
                description: 'Default CFA framework assessment form for public submissions',
                is_active: true
              })
              .select('id')
              .single();
            
            if (createError) {
              console.error('❌ Error creating default assessment form:', createError);
              console.error('❌ Create error details:', createError);
            } else {
              defaultAssessmentId = newAssessment.id;
              console.log('✅ Created new CFA assessment form:', defaultAssessmentId);
            }
          }
        } catch (assessmentError) {
          console.error('❌ Error with assessment form creation/finding:', assessmentError);
        }
        
        // If we still don't have an assessment ID, try to use null (but this might fail due to constraints)
        if (!defaultAssessmentId) {
          console.log('⚠️ No assessment form ID available, will try with null');
          console.log('⚠️ This might cause insertion to fail due to foreign key constraints');
          
          // Try to find ANY assessment form that might work
          try {
            const { data: anyAssessment, error: anyError } = await supabase
              .from('assessment_forms')
              .select('id')
              .limit(1)
              .single();
            
            if (!anyError && anyAssessment) {
              defaultAssessmentId = anyAssessment.id;
              console.log('⚠️ Using fallback assessment form ID:', defaultAssessmentId);
            }
          } catch (fallbackError) {
            console.log('⚠️ Fallback assessment form lookup failed:', fallbackError.message);
          }
        }
        
        // Test database connection and permissions first
        console.log('🔍 Testing database connection and permissions...');
        console.log('🔍 Environment variables check:');
        console.log('🔍 - SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
        console.log('🔍 - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set (' + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...)' : 'Missing');
        console.log('🔍 - SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set (' + process.env.SUPABASE_ANON_KEY.substring(0, 10) + '...)' : 'Missing');
        console.log('🔍 - NODE_ENV:', process.env.NODE_ENV || 'Not set');
        
        // Check which Supabase client is being used
        console.log('🔍 Supabase client check:');
        console.log('🔍 - Client URL:', supabase.supabaseUrl);
        console.log('🔍 - Client key type:', supabase.supabaseKey ? (supabase.supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role' : 'Anon Key') : 'No key');
        
        try {
          // Test basic connection
          const { data: testData, error: testError } = await supabase
            .from('assessment_submissions')
            .select('id')
            .limit(1);
          
          if (testError) {
            console.error('❌ Database connection test failed:', testError);
            console.error('❌ Error code:', testError.code);
            console.error('❌ Error message:', testError.message);
            console.error('❌ Error details:', testError.details);
          } else {
            console.log('✅ Database connection test successful');
          }
          
          // Test if we can insert (this will test RLS policies)
          console.log('🔍 Testing insert permissions...');
          console.log('🔍 Current user ID:', user.id);
          console.log('🔍 Current lead ID:', lead.id);
          
          const testInsertData = {
            assessment_id: defaultAssessmentId, // Use the assessment form ID
            framework_version_id: null,
            owner_id: user.id,
            lead_id: lead.id,
            submitted_at: new Date().toISOString(),
            answers: { test: 'data' },
            result: { test: 'result' }
            // Removed status field as it doesn't exist in the table
          };
        
        console.log('🔍 Test insert data:', testInsertData);
        
        const { data: testInsert, error: testInsertError } = await supabase
          .from('assessment_submissions')
          .insert(testInsertData)
          .select('id')
          .single();
        
        if (testInsertError) {
          console.error('❌ Test insert failed:', testInsertError);
          console.error('❌ Test insert error code:', testInsertError.code);
          console.error('❌ Test insert error message:', testInsertError.message);
          console.error('❌ Test insert error details:', testInsertError.details);
          
          // Check if it's an RLS policy issue
          if (testInsertError.code === '42501') {
            console.error('❌ RLS POLICY VIOLATION - The migration needs to be applied to fix this');
            console.error('❌ Current RLS policies require authentication, but public users are not authenticated');
          }
          
          // Try to get more info about the table structure
          try {
            console.log('🔍 Testing table structure queries...');
            
            // Test basic select
            const { data: tableInfo, error: tableError } = await supabase
              .from('assessment_submissions')
              .select('*')
              .limit(0);
            
            if (tableError) {
              console.error('❌ Cannot even query table structure:', tableError);
              console.error('❌ Table error code:', tableError.code);
              console.error('❌ Table error message:', tableError.message);
            } else {
              console.log('✅ Table structure query successful');
            }
            
                    // Test if we can see any existing data
        const { data: existingData, error: existingError } = await supabase
          .from('assessment_submissions')
          .select('id, owner_id, lead_id, submitted_at')
          .limit(5);
        
        if (existingError) {
          console.error('❌ Cannot query existing data:', existingError);
        } else {
          console.log('✅ Existing data query successful, count:', existingData?.length || 0);
          if (existingData && existingData.length > 0) {
            console.log('🔍 Sample existing data:', existingData[0]);
          }
        }
        
        // Test table structure by trying to get column info
        console.log('🔍 Testing table structure...');
        try {
          // Test if we can access assessment_forms table
          console.log('🔍 Testing assessment_forms table access...');
          const { data: formsData, error: formsError } = await supabase
            .from('assessment_forms')
            .select('id, name')
            .limit(1);
          
          if (formsError) {
            console.error('❌ Cannot access assessment_forms table:', formsError);
            console.error('❌ Forms error code:', formsError.code);
            console.error('❌ Forms error message:', formsError.message);
          } else {
            console.log('✅ Assessment forms table accessible, count:', formsData?.length || 0);
            if (formsData && formsData.length > 0) {
              console.log('🔍 Sample form:', formsData[0]);
            }
          }
          
          // Try to insert minimal data to see what columns are required
          const minimalData = {
            owner_id: user.id,
            lead_id: lead.id,
            answers: { test: 'minimal' }
          };
          
          console.log('🔍 Testing minimal insert with data:', minimalData);
          
          const { data: minimalInsert, error: minimalError } = await supabase
            .from('assessment_submissions')
            .insert(minimalData)
            .select('id')
            .single();
          
          if (minimalError) {
            console.error('❌ Minimal insert failed:', minimalError);
            console.error('❌ Minimal error code:', minimalError.code);
            console.error('❌ Minimal error message:', minimalError.message);
            console.error('❌ Minimal error details:', minimalError.details);
          } else {
            console.log('✅ Minimal insert successful, ID:', minimalInsert.id);
            
            // Clean up minimal test data
            const { error: deleteError } = await supabase
              .from('assessment_submissions')
              .delete()
              .eq('id', minimalInsert.id);
            
            if (deleteError) {
              console.log('⚠️ Could not clean up minimal test data:', deleteError.message);
            } else {
              console.log('✅ Minimal test data cleaned up successfully');
            }
          }
        } catch (minimalTestError) {
          console.error('❌ Minimal insert test error:', minimalTestError);
        }
            
          } catch (tableQueryError) {
            console.error('❌ Table structure query failed:', tableQueryError);
          }
          
        } else {
          console.log('✅ Test insert successful, ID:', testInsert.id);
          
          // Clean up test data
          const { error: deleteError } = await supabase
            .from('assessment_submissions')
            .delete()
            .eq('id', testInsert.id);
          
          if (deleteError) {
            console.log('⚠️ Could not clean up test data:', deleteError.message);
          } else {
            console.log('✅ Test data cleaned up successfully');
          }
        }
          
        } catch (testError) {
          console.error('❌ Database connection test error:', testError);
        }
        
        // Assessment form ID is already set above, no need to duplicate
        
        const submissionData = {
          assessment_id: defaultAssessmentId, // Use the assessment form ID
          framework_version_id: null, // No specific framework version for now
          owner_id: user.id,
          lead_id: lead.id,
          submitted_at: new Date().toISOString(),
          answers: cleanedAnswers, // Use cleaned answers
          result: {
            bucket: riskBucket,
            score: riskScore,
            rubric: {
              capacity: capacityScore,
              tolerance: toleranceScore,
              need: needScore
            }
          }
          // Removed status field as it doesn't exist in the table
        };
        
        console.log('🔍 Inserting assessment submission with data:', submissionData);
        console.log('🔍 Owner ID type:', typeof submissionData.owner_id, 'Value:', submissionData.owner_id);
        console.log('🔍 Lead ID type:', typeof submissionData.lead_id, 'Value:', submissionData.lead_id);
        console.log('🔍 Owner ID valid UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionData.owner_id));
        console.log('🔍 Lead ID valid UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionData.lead_id));
        
        // Check if user and lead exist in their respective tables
        console.log('🔍 Verifying user and lead existence...');
        try {
          const { data: userCheck, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('id', submissionData.owner_id)
            .single();
          
          if (userCheckError) {
            console.error('❌ User check failed:', userCheckError);
          } else {
            console.log('✅ User exists:', userCheck.id);
          }
          
          const { data: leadCheck, error: leadCheckError } = await supabase
            .from('leads')
            .select('id')
            .eq('id', submissionData.lead_id)
            .single();
          
          if (leadCheckError) {
            console.error('❌ Lead check failed:', leadCheckError);
          } else {
            console.log('✅ Lead exists:', leadCheck.id);
          }
        } catch (checkError) {
          console.error('❌ User/Lead check error:', checkError);
        }
        
        console.log('🔍 Attempting to insert assessment submission...');
        const { data: submission, error: submissionError } = await supabase
          .from('assessment_submissions')
          .insert(submissionData)
          .select()
          .single();

        if (submissionError) {
          console.error('❌ Failed to create assessment submission:', submissionError);
          console.error('❌ Error code:', submissionError.code);
          console.error('❌ Error message:', submissionError.message);
          console.error('❌ Error details:', submissionError.details);
          console.error('❌ Error hint:', submissionError.hint);
          
          // Check if it's an RLS policy issue
          if (submissionError.code === '42501') {
            console.error('❌ This is an RLS policy violation - the migration needs to be applied');
          }
          
          // Don't fail the whole request, just log the error
        } else {
          console.log('✅ Assessment submission created successfully:', submission.id);
        }
        
        // Update lead with risk profile information
        const riskProfileData = {
          risk_bucket: riskBucket,
          risk_score: riskScore
        };
        
        // Only set risk_profile_id if submission was created successfully
        if (submission && !submissionError) {
          riskProfileData.risk_profile_id = submission.id;
        }
        
        console.log('🔍 Updating lead with risk profile:', riskProfileData);
        
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
            bucket: riskBucket,
            score: riskScore,
            rubric: {
              capacity: capacityScore,
              tolerance: toleranceScore,
              need: needScore
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
    // DEBUG ENDPOINTS
    // ============================================================================
    
    // GET /api/assessments/debug/leads - Debug leads and their risk data
    if (method === 'GET' && path === '/debug/leads') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        // Get leads with their risk data for debugging
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select(`
            id,
            full_name,
            email,
            risk_category,
            risk_bucket,
            risk_score,
            risk_profile_id,
            created_at
          `)
          .eq('user_id', user.supabase_user_id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (leadsError) {
          console.error('❌ Debug leads error:', leadsError);
          return res.status(500).json({ error: 'Failed to fetch leads for debugging' });
        }

        return res.json({
          message: 'Debug leads data retrieved successfully',
          leads: leads || [],
          summary: {
            total_leads: leads?.length || 0,
            with_risk_category: leads?.filter(l => l.risk_category)?.length || 0,
            with_risk_bucket: leads?.filter(l => l.risk_bucket)?.length || 0,
            with_risk_score: leads?.filter(l => l.risk_score)?.length || 0,
            risk_categories: leads?.reduce((acc, l) => {
              if (l.risk_category) acc[l.risk_category] = (acc[l.risk_category] || 0) + 1;
              return acc;
            }, {}) || {},
            risk_buckets: leads?.reduce((acc, l) => {
              if (l.risk_bucket) acc[l.risk_bucket] = (acc[l.risk_bucket] || 0) + 1;
              return acc;
            }, {}) || {}
          }
        });
      } catch (error) {
        console.error('❌ Debug leads error:', error);
        return res.status(500).json({ error: 'Failed to debug leads' });
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

        // Get CFA framework questions - try multiple approaches
        console.log('🔍 Fetching CFA framework questions...');
        
        let questions = [];
        
        // Approach 1: Try to find CFA framework and get questions from framework_questions table
        console.log('🔍 Approach 1: Looking for CFA framework and framework_questions table...');
        const { data: framework, error: frameworkError } = await supabase
          .from('risk_frameworks')
          .select('id')
          .eq('code', 'cfa_three_pillar_v1')
          .single();
        
        if (!frameworkError && framework) {
          console.log('✅ Found CFA framework:', framework.id);
          
          // Get questions from framework_questions table
          const { data: frameworkQuestions, error: questionsError } = await supabase
            .from('framework_questions')
            .select('*')
            .eq('framework_id', framework.id)
            .order('order_index');
          
          if (!questionsError && frameworkQuestions) {
            questions = frameworkQuestions;
            console.log('✅ Got questions from framework_questions table:', questions.length);
          }
        }
        
        // Approach 2: If no framework questions, try question_bank table
        if (questions.length === 0) {
          console.log('🔍 Approach 2: Trying question_bank table...');
          const { data: bankQuestions, error: bankError } = await supabase
            .from('question_bank')
            .select('*')
            .eq('is_active', true)
            .order('order_index');
          
          if (!bankError && bankQuestions) {
            questions = bankQuestions;
            console.log('✅ Got questions from question_bank table:', questions.length);
          }
        }
        
        // Approach 3: If still no questions, try assessment_question_snapshots (working backend fallback)
        if (questions.length === 0) {
          console.log('🔍 Approach 3: Trying assessment_question_snapshots table (working backend fallback)...');
          
          // Try to find any assessment and get its snapshots
          const { data: assessments, error: assessmentsError } = await supabase
            .from('assessments')
            .select('id')
            .limit(1);
          
          if (!assessmentsError && assessments && assessments.length > 0) {
            const assessmentId = assessments[0].id;
            console.log('🔍 Found assessment, checking snapshots for:', assessmentId);
            
            const { data: snapshots, error: snapshotsError } = await supabase
              .from('assessment_question_snapshots')
              .select('*')
              .eq('assessment_id', assessmentId)
              .order('order_index');
            
            if (!snapshotsError && snapshots && snapshots.length > 0) {
              questions = snapshots;
              console.log('✅ Got questions from assessment_question_snapshots:', snapshots.length);
            } else {
              console.log('⚠️ No snapshots found for assessment:', assessmentId);
            }
          } else {
            console.log('⚠️ No assessments found to check snapshots');
          }
        }
        
        // Approach 4: If still no questions, log the issue
        if (questions.length === 0) {
          console.log('⚠️ No questions found in any table. The working backend had fallback logic that is missing.');
          console.log('⚠️ Check if assessment_question_snapshots table has data or if framework_questions table exists.');
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
