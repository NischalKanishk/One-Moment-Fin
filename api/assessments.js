// Assessments API handler
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
    
    console.log(`🔍 Assessments API Request: ${method} ${path}`);
    
    // Remove /api/assessments prefix
    const assessmentsPath = path.replace('/api/assessments', '');
    
    // GET /api/assessments - List user assessments
    if (method === 'GET' && assessmentsPath === '') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log(`🔍 Fetching assessments for user: ${user.supabase_user_id}`);

        const { data: assessments, error } = await supabase
          .from('assessments')
          .select('*')
          .eq('user_id', user.supabase_user_id);

        if (error) {
          console.error('❌ Database error:', error);
          return res.status(500).json({ error: 'Failed to fetch assessments', details: error.message });
        }

        console.log(`✅ Found ${assessments?.length || 0} assessments`);
        return res.json({ assessments: assessments || [] });
      } catch (error) {
        console.error('❌ Error fetching assessments:', error);
        return res.status(500).json({ error: 'Failed to fetch assessments', details: error.message });
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
          return res.status(500).json({ error: 'Failed to create assessment', details: error.message });
        }

        return res.json({ message: 'Assessment created successfully', assessment });
      } catch (error) {
        console.error('❌ Error creating assessment:', error);
        return res.status(500).json({ error: 'Failed to create assessment', details: error.message });
      }
    }

    // GET /api/assessments/forms - Get assessment forms (what frontend expects)
    if (method === 'GET' && assessmentsPath === '/forms') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log(`🔍 Fetching assessment forms for user: ${user.supabase_user_id}`);

        // First, try to get from assessment_forms table (new system)
        let { data: forms, error: formsError } = await supabase
          .from('assessment_forms')
          .select('*')
          .eq('user_id', user.supabase_user_id)
          .eq('is_active', true);

        if (formsError) {
          console.error('❌ Error fetching assessment_forms:', formsError);
          forms = [];
        }

        // If no forms in new system, fall back to old assessments table
        if (!forms || forms.length === 0) {
          console.log('🔍 No forms found in new system, falling back to assessments table');
          
          const { data: assessments, error: assessmentsError } = await supabase
            .from('assessments')
            .select('*')
            .eq('user_id', user.supabase_user_id);

          if (assessmentsError) {
            console.error('❌ Database error:', assessmentsError);
            return res.status(500).json({ error: 'Failed to fetch assessments', details: assessmentsError.message });
          }

          // Transform assessments to match frontend "forms" structure
          forms = assessments?.map(assessment => ({
            id: assessment.id,
            name: assessment.name,
            description: assessment.description,
            is_active: assessment.is_active,
            created_at: assessment.created_at,
            questions: [] // Will be populated when needed
          })) || [];
        }

        console.log(`✅ Found ${forms?.length || 0} assessment forms`);
        return res.json({ forms });
      } catch (error) {
        console.error('❌ Error fetching assessment forms:', error);
        return res.status(500).json({ error: 'Failed to fetch assessment forms', details: error.message });
      }
    }

    // GET /api/assessments/cfa/questions - Get CFA questions (what frontend expects)
    if (method === 'GET' && assessmentsPath === '/cfa/questions') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log(`🔍 Fetching CFA questions for user: ${user.supabase_user_id}`);

        // Try to get CFA framework questions from the database
        let questions = [];

        // First, try to get the CFA framework
        const { data: cfaFramework, error: frameworkError } = await supabase
          .from('risk_frameworks')
          .select('id')
          .eq('code', 'cfa_three_pillar')
          .eq('is_active', true)
          .single();

        if (!frameworkError && cfaFramework) {
          // Get the default version of the CFA framework
          const { data: frameworkVersion, error: versionError } = await supabase
            .from('risk_framework_versions')
            .select('id')
            .eq('framework_id', cfaFramework.id)
            .eq('is_default', true)
            .single();

          if (!versionError && frameworkVersion) {
            // Get questions from framework_question_map and question_bank
            const { data: frameworkQuestions, error: questionsError } = await supabase
              .from('framework_question_map')
              .select(`
                *,
                question:question_bank(*)
              `)
              .eq('framework_version_id', frameworkVersion.id)
              .order('order_index', { ascending: true });

            if (!questionsError && frameworkQuestions) {
              questions = frameworkQuestions.map(fq => ({
                id: fq.question?.id || fq.id,
                qkey: fq.qkey,
                label: fq.question?.label || fq.qkey,
                qtype: fq.question?.qtype || 'mcq',
                options: fq.options_override || fq.question?.options || [],
                required: fq.required,
                order_index: fq.order_index,
                module: fq.question?.module || 'risk_assessment'
              }));
            }
          }
        }

        // If no questions found in database, return default questions
        if (questions.length === 0) {
          console.log('🔍 No CFA questions found in database, returning default questions');
          questions = [
            {
              id: 'investment_horizon',
              qkey: 'investment_horizon',
              label: 'What is your investment horizon?',
              qtype: 'single',
              options: ['Less than 1 year', '1-3 years', '3-5 years', 'More than 5 years'],
              required: true,
              order_index: 1,
              module: 'capacity'
            },
            {
              id: 'investment_amount',
              qkey: 'investment_amount',
              label: 'What percentage of your total assets do you plan to invest?',
              qtype: 'single',
              options: ['Less than 10%', '10-25%', '25-50%', 'More than 50%'],
              required: true,
              order_index: 2,
              module: 'capacity'
            },
            {
              id: 'income_stability',
              qkey: 'income_stability',
              label: 'How stable is your current income?',
              qtype: 'single',
              options: ['Very unstable', 'Somewhat unstable', 'Stable', 'Very stable'],
              required: true,
              order_index: 3,
              module: 'capacity'
            },
            {
              id: 'emergency_fund',
              qkey: 'emergency_fund',
              label: 'Do you have an emergency fund covering 6+ months of expenses?',
              qtype: 'single',
              options: ['No', 'Less than 3 months', '3-6 months', 'More than 6 months'],
              required: true,
              order_index: 4,
              module: 'capacity'
            },
            {
              id: 'risk_tolerance',
              qkey: 'risk_tolerance',
              label: 'How would you react to a 20% drop in your investment value?',
              qtype: 'single',
              options: ['Sell immediately', 'Sell some', 'Hold', 'Buy more'],
              required: true,
              order_index: 5,
              module: 'tolerance'
            },
            {
              id: 'volatility_comfort',
              qkey: 'volatility_comfort',
              label: 'How comfortable are you with investment volatility?',
              qtype: 'single',
              options: ['Very uncomfortable', 'Somewhat uncomfortable', 'Comfortable', 'Very comfortable'],
              required: true,
              order_index: 6,
              module: 'tolerance'
            },
            {
              id: 'loss_aversion',
              qkey: 'loss_aversion',
              label: 'What is your maximum acceptable loss on investments?',
              qtype: 'single',
              options: ['0-5%', '5-15%', '15-25%', 'More than 25%'],
              required: true,
              order_index: 7,
              module: 'tolerance'
            },
            {
              id: 'market_timing',
              qkey: 'market_timing',
              label: 'Do you believe in timing the market?',
              qtype: 'single',
              options: ['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree'],
              required: true,
              order_index: 8,
              module: 'tolerance'
            },
            {
              id: 'investment_goals',
              qkey: 'investment_goals',
              label: 'What are your primary investment goals?',
              qtype: 'single',
              options: ['Capital preservation', 'Income generation', 'Growth', 'Tax efficiency'],
              required: true,
              order_index: 9,
              module: 'need'
            },
            {
              id: 'investment_experience',
              qkey: 'investment_experience',
              label: 'How would you describe your investment experience?',
              qtype: 'single',
              options: ['Beginner', 'Some experience', 'Experienced', 'Very experienced'],
              required: true,
              order_index: 10,
              module: 'need'
            },
            {
              id: 'financial_knowledge',
              qkey: 'financial_knowledge',
              label: 'How would you rate your financial knowledge?',
              qtype: 'single',
              options: ['Basic', 'Intermediate', 'Advanced', 'Expert'],
              required: true,
              order_index: 11,
              module: 'need'
            },
            {
              id: 'professional_advice',
              qkey: 'professional_advice',
              label: 'Do you prefer professional financial advice?',
              qtype: 'single',
              options: ['Strongly prefer', 'Somewhat prefer', 'Neutral', 'Prefer self-directed'],
              required: true,
              order_index: 12,
              module: 'need'
            }
          ];
        }

        console.log(`✅ Returning ${questions.length} CFA questions`);
        return res.json({ questions });
      } catch (error) {
        console.error('❌ Error fetching CFA questions:', error);
        return res.status(500).json({ error: 'Failed to fetch CFA questions', details: error.message });
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
          .select('id')
          .eq('id', assessmentId)
          .eq('user_id', user.supabase_user_id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Assessment not found' });
          }
          console.error('❌ Database error:', error);
          return res.status(500).json({ error: 'Database query failed', details: error.message });
        }

        return res.json({ assessment });
      } catch (error) {
        console.error('❌ Error fetching assessment:', error);
        return res.status(500).json({ error: 'Failed to fetch assessment', details: error.message });
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
          return res.status(500).json({ error: 'Failed to update assessment', details: updateError.message });
        }

        return res.json({ message: 'Assessment updated successfully', assessment: updatedAssessment });
      } catch (error) {
        console.error('❌ Error updating assessment:', error);
        return res.status(500).json({ error: 'Failed to update assessment', details: error.message });
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
          return res.status(500).json({ error: 'Failed to delete assessment', details: deleteError.message });
        }

        return res.json({ message: 'Assessment deleted successfully' });
      } catch (error) {
        console.error('❌ Error deleting assessment:', error);
        return res.status(500).json({ error: 'Failed to delete assessment', details: error.message });
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
          return res.status(500).json({ error: 'Failed to fetch questions', details: error.message });
        }

        return res.json({ questions: questions || [] });
      } catch (error) {
        console.error('❌ Error fetching assessment questions:', error);
        return res.status(500).json({ error: 'Failed to fetch assessment questions', details: error.message });
      }
    }

    // GET /api/assessments/frameworks - Get risk frameworks
    if (method === 'GET' && assessmentsPath === '/frameworks') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        // Get frameworks from the risk_frameworks table
        const { data: frameworks, error } = await supabase
          .from('risk_frameworks')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('❌ Database error:', error);
          return res.status(500).json({ error: 'Failed to fetch frameworks', details: error.message });
        }

        return res.json({ frameworks: frameworks || [] });
      } catch (error) {
        console.error('❌ Error fetching frameworks:', error);
        return res.status(500).json({ error: 'Failed to fetch frameworks', details: error.message });
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

        // Get framework questions from the framework_question_map and question_bank tables
        const { data: frameworkQuestions, error } = await supabase
          .from('framework_question_map')
          .select(`
            *,
            question:question_bank(*)
          `)
          .eq('framework_version_id', frameworkId)
          .order('order_index', { ascending: true });

        if (error) {
          console.error('❌ Database error:', error);
          return res.status(500).json({ error: 'Failed to fetch framework questions', details: error.message });
        }

        // Transform the data to match frontend expectations
        const questions = frameworkQuestions?.map(fq => ({
          id: fq.question?.id || fq.id,
          qkey: fq.qkey,
          label: fq.question?.label || fq.qkey,
          qtype: fq.question?.qtype || 'mcq',
          options: fq.options_override || fq.question?.options || [],
          required: fq.required,
          order_index: fq.order_index,
          module: fq.question?.module || 'risk_assessment'
        })) || [];

        return res.json({ questions });
      } catch (error) {
        console.error('❌ Error fetching framework questions:', error);
        return res.status(500).json({ error: 'Failed to fetch framework questions', details: error.message });
      }
    }

    

    // GET /api/assessments/submissions - Get user's assessment submissions
    if (method === 'GET' && assessmentsPath === '/submissions') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log(`🔍 Fetching assessment submissions for user: ${user.supabase_user_id}`);

        const { data: submissions, error } = await supabase
          .from('assessment_submissions')
          .select(`
            *,
            assessment:assessments(*),
            lead:leads(full_name, email)
          `)
          .eq('owner_id', user.supabase_user_id)
          .order('submitted_at', { ascending: false });

        if (error) {
          console.error('❌ Database error:', error);
          return res.status(500).json({ error: 'Failed to fetch submissions', details: error.message });
        }

        console.log(`✅ Found ${submissions?.length || 0} assessment submissions`);
        return res.json({ submissions: submissions || [] });
      } catch (error) {
        console.error('❌ Error fetching assessment submissions:', error);
        return res.status(500).json({ error: 'Failed to fetch assessment submissions', details: error.message });
      }
    }

    // GET /api/assessments/test - Test database connection
    if (method === 'GET' && assessmentsPath === '/test') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log(`🔍 Testing assessments database connection for user: ${user.supabase_user_id}`);

        // Test basic database connection
        const { data: testData, error: testError } = await supabase
          .from('assessments')
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

        // Test user authentication
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, clerk_id, email')
          .eq('id', user.supabase_user_id)
          .single();

        if (userError) {
          console.error('❌ User lookup test failed:', userError);
          return res.status(500).json({ 
            error: 'User lookup test failed', 
            details: userError.message,
            code: userError.code
          });
        }

        // Test framework questions access
        const { data: frameworkData, error: frameworkError } = await supabase
          .from('risk_frameworks')
          .select('id, code, name')
          .limit(1);

        return res.json({ 
          message: 'Assessments database connection test successful',
          user: userData,
          database: 'Connected',
          frameworks_available: !frameworkError,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Error in assessments database test:', error);
        return res.status(500).json({ 
          error: 'Assessments database test failed', 
          details: error.message 
        });
      }
    }

    // Default response for assessments endpoints
    return res.status(404).json({
      error: 'Assessment endpoint not found',
      path: path,
      method: method,
      available_endpoints: [
        '/api/assessments',
        '/api/assessments/forms',
        '/api/assessments/cfa/questions',
        '/api/assessments/frameworks',
        '/api/assessments/submissions',
        '/api/assessments/test'
      ]
    });
    
  } catch (error) {
    console.error('❌ Assessments API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong in the assessments API handler',
      details: error.message
    });
  }
};
