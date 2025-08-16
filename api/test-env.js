module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Check critical environment variables
    const envStatus = {
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      VERCEL: !!process.env.VERCEL,
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT_SET',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT_SET',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? 'SET' : 'NOT_SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT_SET',
      FRONTEND_URL: process.env.FRONTEND_URL || 'NOT_SET',
      timestamp: new Date().toISOString()
    };

    // Check if we have the minimum required variables
    const hasRequiredVars = envStatus.SUPABASE_URL === 'SET' && 
                           envStatus.SUPABASE_ANON_KEY === 'SET' && 
                           envStatus.SUPABASE_SERVICE_ROLE_KEY === 'SET';

    res.status(200).json({
      message: hasRequiredVars ? 'Environment variables are properly configured' : 'Missing critical environment variables',
      status: hasRequiredVars ? 'OK' : 'ERROR',
      environment: envStatus,
      recommendations: hasRequiredVars ? [] : [
        'Set SUPABASE_URL in Vercel environment variables',
        'Set SUPABASE_ANON_KEY in Vercel environment variables', 
        'Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables',
        'Set CLERK_SECRET_KEY in Vercel environment variables',
        'Set JWT_SECRET in Vercel environment variables'
      ]
    });
  } catch (error) {
    console.error('Error in test-env:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
