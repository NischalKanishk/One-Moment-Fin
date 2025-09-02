// Test Supabase connection in Vercel
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
    console.log('🔍 Testing Supabase connection...');
    console.log('🔍 Supabase client:', !!supabase);
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Supabase connection test failed:', testError);
      return res.status(500).json({ 
        error: 'Supabase connection failed', 
        details: testError.message,
        supabaseClient: !!supabase
      });
    }
    
    console.log('✅ Supabase connection test successful');
    
    // Test framework query
    const { data: frameworks, error: frameworkError } = await supabase
      .from('risk_frameworks')
      .select('*');
    
    if (frameworkError) {
      console.error('❌ Framework query failed:', frameworkError);
      return res.status(500).json({ 
        error: 'Framework query failed', 
        details: frameworkError.message 
      });
    }
    
    console.log(`✅ Found ${frameworks?.length || 0} frameworks`);
    
    return res.json({ 
      success: true, 
      message: 'Supabase connection working',
      frameworks: frameworks?.length || 0,
      supabaseClient: !!supabase
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return res.status(500).json({ 
      error: 'Test failed', 
      details: error.message,
      supabaseClient: !!supabase
    });
  }
};
