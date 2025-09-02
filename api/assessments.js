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

        // Get the CFA framework ID
        const { data: framework, error: frameworkError } = await supabase
          .from('risk_frameworks')
          .select('id')
          .eq('code', 'cfa_three_pillar_v1')
          .single();
        
        if (frameworkError || !framework) {
          console.error('❌ Error fetching CFA framework:', frameworkError);
          return res.status(500).json({ error: 'CFA framework not found' });
        }
        
        // Fetch questions from framework_questions table
        const { data: questions, error: questionsError } = await supabase
          .from('framework_questions')
          .select('*')
          .eq('framework_id', framework.id)
          .order('order_index');
        
        if (questionsError) {
          console.error('❌ Error fetching framework questions:', questionsError);
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
        
        // Get the CFA framework ID
        const { data: framework, error: frameworkError } = await supabase
          .from('risk_frameworks')
          .select('id')
          .eq('code', 'cfa_three_pillar_v1')
          .single();
        
        if (frameworkError || !framework) {
          console.error('❌ Error fetching CFA framework:', frameworkError);
          return res.status(500).json({ error: 'CFA framework not found' });
        }
        
        console.log(`✅ Found CFA framework: ${framework.id}`);
        
        // Fetch questions from framework_questions table
        const { data: questions, error: questionsError } = await supabase
          .from('framework_questions')
          .select('*')
          .eq('framework_id', framework.id)
          .order('order_index');
        
        if (questionsError) {
          console.error('❌ Error fetching framework questions:', questionsError);
          return res.status(500).json({ error: 'Failed to fetch framework questions' });
        }
        
        if (!questions || questions.length === 0) {
          console.warn('⚠️ No questions found for CFA framework');
          return res.json({ questions: [] });
        }
        
        console.log(`✅ Returning ${questions.length} CFA framework questions from database`);
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
