// Assessments API handler for Vercel
const { supabase } = require('./lib/supabase.js');
const { authenticateUser } = require('./lib/auth.js');

module.exports = async function handler(req, res) {
  // Enhanced CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
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
    
    // ============================================================================
    // GET /api/assessments/forms - List user assessment forms
    // ============================================================================
    if (method === 'GET' && path === '/api/assessments/forms') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log('🔍 Getting assessment forms for user:', user.supabase_user_id);

        // Check if risk_frameworks table exists
        let framework = null;
        let questions = [];
        
        try {
          // Get the CFA framework ID
          const { data: frameworkData, error: frameworkError } = await supabase
            .from('risk_frameworks')
            .select('id')
            .eq('code', 'cfa_three_pillar_v1')
            .single();
          
          if (frameworkError) {
            console.log('⚠️ Risk frameworks table not found or empty, using fallback questions');
            framework = null;
          } else {
            framework = frameworkData;
          }
        } catch (error) {
          console.log('⚠️ Risk frameworks table not accessible, using fallback questions');
          framework = null;
        }
        
        // Try to fetch questions if framework exists
        if (framework) {
          try {
            const { data: questionsData, error: questionsError } = await supabase
              .from('framework_questions')
              .select('*')
              .eq('framework_id', framework.id)
              .order('order_index');
            
            if (questionsError) {
              console.log('⚠️ Framework questions table not found, using fallback questions');
              questions = [];
            } else {
              questions = questionsData || [];
            }
          } catch (error) {
            console.log('⚠️ Framework questions table not accessible, using fallback questions');
            questions = [];
          }
        }

        // Fallback questions if database tables don't exist
        const fallbackQuestions = [
          {
            id: 'primary_goal',
            question_text: 'What is your primary financial goal?',
            type: 'select',
            options: ['Retirement planning', 'Wealth accumulation', 'Education funding', 'Home purchase', 'Emergency fund'],
            weight: 1,
            required: true,
            module: 'Capacity',
            order_index: 1
          },
          {
            id: 'investment_horizon',
            question_text: 'What is your investment time horizon?',
            type: 'select',
            options: ['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', 'More than 10 years'],
            weight: 1,
            required: true,
            module: 'Capacity',
            order_index: 2
          },
          {
            id: 'age',
            question_text: 'What is your age?',
            type: 'select',
            options: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'],
            weight: 1,
            required: true,
            module: 'Capacity',
            order_index: 3
          },
          {
            id: 'income',
            question_text: 'What is your annual income?',
            type: 'select',
            options: ['Less than ₹3 lakhs', '₹3-5 lakhs', '₹5-10 lakhs', '₹10-20 lakhs', '₹20+ lakhs'],
            weight: 1,
            required: true,
            module: 'Capacity',
            order_index: 4
          },
          {
            id: 'market_experience',
            question_text: 'What is your experience with market investments?',
            type: 'select',
            options: ['No experience', 'Limited experience', 'Moderate experience', 'Extensive experience'],
            weight: 1,
            required: true,
            module: 'Tolerance',
            order_index: 5
          },
          {
            id: 'volatility_comfort',
            question_text: 'How comfortable are you with market volatility?',
            type: 'select',
            options: ['Very uncomfortable', 'Somewhat uncomfortable', 'Neutral', 'Somewhat comfortable', 'Very comfortable'],
            weight: 1,
            required: true,
            module: 'Tolerance',
            order_index: 6
          },
          {
            id: 'return_expectation',
            question_text: 'What is your expected annual return?',
            type: 'select',
            options: ['Less than 5%', '5-8%', '8-12%', '12-15%', 'More than 15%'],
            weight: 1,
            required: true,
            module: 'Need',
            order_index: 7
          }
        ];

        // Create a default CFA framework form with questions
        const defaultForm = {
          id: 'cfa-default-form',
          name: 'CFA Risk Assessment Form',
          description: 'Industry-standard risk assessment based on CFA three-pillar framework',
          is_active: true,
          created_at: new Date().toISOString(),
          questions: questions && questions.length > 0 ? questions.map(q => ({
            id: q.id,
            question_text: q.label,
            type: q.qtype,
            options: q.options,
            weight: 1,
            required: q.required,
            module: q.module,
            order_index: q.order_index
          })) : fallbackQuestions
        };

        console.log(`✅ Returning CFA form with ${questions?.length || 0} questions from database`);
        return res.json({ forms: [defaultForm] });
      } catch (error) {
        console.error('❌ Get forms error:', error);
        return res.status(500).json({ error: 'Failed to fetch forms' });
      }
    }
    
    // ============================================================================
    // GET /api/assessments/cfa/questions - Get CFA framework questions
    // ============================================================================
    if (method === 'GET' && path === '/api/assessments/cfa/questions') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log('🔍 Getting CFA framework questions from database...');
        console.log('🔍 Supabase client initialized:', !!supabase);
        
        // Check if risk_frameworks table exists
        let framework = null;
        let questions = [];
        
        try {
          // Get the CFA framework ID
          const { data: frameworkData, error: frameworkError } = await supabase
            .from('risk_frameworks')
            .select('id')
            .eq('code', 'cfa_three_pillar_v1')
            .single();
          
          if (frameworkError) {
            console.log('⚠️ Risk frameworks table not found or empty, using fallback questions');
            framework = null;
          } else {
            framework = frameworkData;
            console.log(`✅ Found CFA framework: ${framework.id}`);
          }
        } catch (error) {
          console.log('⚠️ Risk frameworks table not accessible, using fallback questions');
          framework = null;
        }
        
        // Try to fetch questions if framework exists
        if (framework) {
          try {
            const { data: questionsData, error: questionsError } = await supabase
              .from('framework_questions')
              .select('*')
              .eq('framework_id', framework.id)
              .order('order_index');
            
            if (questionsError) {
              console.log('⚠️ Framework questions table not found, using fallback questions');
              questions = [];
            } else {
              questions = questionsData || [];
            }
          } catch (error) {
            console.log('⚠️ Framework questions table not accessible, using fallback questions');
            questions = [];
          }
        }
        
        // Use fallback questions if no questions found
        if (!questions || questions.length === 0) {
          console.log('⚠️ No questions found, using fallback questions');
          questions = [
            {
              id: 'primary_goal',
              label: 'What is your primary financial goal?',
              qtype: 'select',
              options: ['Retirement planning', 'Wealth accumulation', 'Education funding', 'Home purchase', 'Emergency fund'],
              required: true,
              module: 'Capacity',
              order_index: 1
            },
            {
              id: 'investment_horizon',
              label: 'What is your investment time horizon?',
              qtype: 'select',
              options: ['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', 'More than 10 years'],
              required: true,
              module: 'Capacity',
              order_index: 2
            },
            {
              id: 'age',
              label: 'What is your age?',
              qtype: 'select',
              options: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'],
              required: true,
              module: 'Capacity',
              order_index: 3
            },
            {
              id: 'income',
              label: 'What is your annual income?',
              qtype: 'select',
              options: ['Less than ₹3 lakhs', '₹3-5 lakhs', '₹5-10 lakhs', '₹10-20 lakhs', '₹20+ lakhs'],
              required: true,
              module: 'Capacity',
              order_index: 4
            },
            {
              id: 'market_experience',
              label: 'What is your experience with market investments?',
              qtype: 'select',
              options: ['No experience', 'Limited experience', 'Moderate experience', 'Extensive experience'],
              required: true,
              module: 'Tolerance',
              order_index: 5
            },
            {
              id: 'volatility_comfort',
              label: 'How comfortable are you with market volatility?',
              qtype: 'select',
              options: ['Very uncomfortable', 'Somewhat uncomfortable', 'Neutral', 'Somewhat comfortable', 'Very comfortable'],
              required: true,
              module: 'Tolerance',
              order_index: 6
            },
            {
              id: 'return_expectation',
              label: 'What is your expected annual return?',
              qtype: 'select',
              options: ['Less than 5%', '5-8%', '8-12%', '12-15%', 'More than 15%'],
              required: true,
              module: 'Need',
              order_index: 7
            }
          ];
        }
        
        console.log(`✅ Returning ${questions.length} CFA framework questions`);
        return res.json({ questions });
      } catch (error) {
        console.error('❌ Get CFA questions error:', error);
        return res.status(500).json({ error: 'Failed to fetch CFA questions' });
      }
    }
    
    // ============================================================================
    // GET /api/assessments/frameworks - Get available frameworks
    // ============================================================================
    if (method === 'GET' && path === '/api/assessments/frameworks') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        // Return CFA framework information
        const frameworks = [{
          id: 'cfa-framework',
          code: 'cfa_three_pillar_v1',
          name: 'CFA Three-Pillar (Capacity, Tolerance, Need)',
          description: 'Industry-standard risk assessment framework',
          engine: 'three_pillar',
          risk_framework_versions: [{
            id: 'cfa-v1',
            version: 1,
            is_default: true,
            created_at: new Date().toISOString()
          }]
        }];
        
        return res.json({ frameworks });
      } catch (error) {
        console.error('❌ Get frameworks error:', error);
        return res.status(500).json({ error: 'Failed to fetch frameworks' });
      }
    }
    
    // ============================================================================
    // GET /api/assessments - List user assessments (legacy)
    // ============================================================================
    if (method === 'GET' && path === '/api/assessments') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        // Since assessments table was removed in the optimization,
        // we'll return a default CFA assessment for now
        const defaultAssessment = {
          id: 'cfa-default-assessment',
          name: 'CFA Risk Assessment',
          title: 'CFA Risk Assessment',
          framework_id: 'cfa-framework',
          is_default: true,
          is_active: true,
          user_id: user.supabase_user_id,
          created_at: new Date().toISOString()
        };

        console.log('✅ Returning default CFA assessment');
        return res.json({ assessments: [defaultAssessment] });
      } catch (error) {
        console.error('❌ Get assessments error:', error);
        return res.status(500).json({ error: 'Failed to fetch assessments' });
      }
    }
    
    // ============================================================================
    // POST /api/assessments/forms - Create a new assessment form
    // ============================================================================
    if (method === 'POST' && path === '/api/assessments/forms') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { name, description, is_active } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Form name is required' });
        }

        // Since assessment_forms table was removed in the optimization,
        // we'll return a mock form creation response
        const mockForm = {
          id: `form-${Date.now()}`,
          user_id: user.supabase_user_id,
          name,
          description: description || '',
          is_active: is_active !== undefined ? is_active : true,
          created_at: new Date().toISOString()
        };

        console.log('✅ Mock form created:', mockForm.id);
        return res.status(201).json({ form: mockForm });
      } catch (error) {
        console.error('❌ Create form error:', error);
        return res.status(500).json({ error: 'Failed to create assessment form' });
      }
    }
    
    // ============================================================================
    // POST /api/assessments - Create a new assessment
    // ============================================================================
    if (method === 'POST' && path === '/api/assessments') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { title, framework_id, is_default } = req.body;

        if (!title) {
          return res.status(400).json({ error: 'Assessment title is required' });
        }

        // Since assessments table was removed in the optimization,
        // we'll return a mock assessment creation response
        const mockAssessment = {
          id: `assessment-${Date.now()}`,
          user_id: user.supabase_user_id,
          name: title,
          title: title,
          framework_id: framework_id || 'cfa-framework',
          is_default: is_default || false,
          is_active: true,
          created_at: new Date().toISOString()
        };

        console.log('✅ Mock assessment created:', mockAssessment.id);
        return res.status(201).json({ assessment: mockAssessment });
      } catch (error) {
        console.error('❌ Create assessment error:', error);
        return res.status(500).json({ error: 'Failed to create assessment' });
      }
    }
    
    // ============================================================================
    // DEFAULT RESPONSE
    // ============================================================================
    return res.status(404).json({
      error: 'Endpoint not found',
      path: path,
      method: method,
      message: 'This assessments endpoint is not implemented'
    });
    
  } catch (error) {
    console.error('❌ Assessments API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong in the assessments API handler'
    });
  }
};
