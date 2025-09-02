// Test questions endpoint without authentication
const { supabase } = require('./lib/supabase.js');

module.exports = async function handler(req, res) {
  // Enhanced CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    console.log('🔍 Testing questions endpoint without authentication...');
    console.log('🔍 Supabase client:', !!supabase);
    
    // Get the CFA framework ID
    const { data: framework, error: frameworkError } = await supabase
      .from('risk_frameworks')
      .select('id')
      .eq('code', 'cfa_three_pillar_v1')
      .single();
    
    if (frameworkError || !framework) {
      console.error('❌ Error fetching CFA framework:', frameworkError);
      return res.status(500).json({ 
        error: 'CFA framework not found', 
        details: frameworkError?.message,
        supabaseClient: !!supabase
      });
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
      return res.status(500).json({ 
        error: 'Failed to fetch framework questions', 
        details: questionsError?.message,
        supabaseClient: !!supabase
      });
    }
    
    if (!questions || questions.length === 0) {
      console.warn('⚠️ No questions found for CFA framework');
      return res.json({ questions: [] });
    }
    
    console.log(`✅ Found ${questions.length} CFA framework questions`);
    return res.json({ questions });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return res.status(500).json({ 
      error: 'Test failed', 
      details: error.message,
      supabaseClient: !!supabase
    });
  }
};
