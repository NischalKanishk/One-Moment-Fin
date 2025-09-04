// Check environment variables in Vercel deployment
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
};
