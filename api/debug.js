const { supabase } = require('./lib/supabase.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { query } = req;
    
    // If ?db=test is passed, run database connectivity test
    if (query.db === 'test') {
      console.log('🔍 DB Test: Testing database connection...');

      // Test 1: Check if users table exists
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      // Test 2: Check if leads table exists  
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id')
        .limit(1);

      // Test 3: Check if meetings table exists
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('id')
        .limit(1);

      const results = {
        message: 'Database connection test completed',
        timestamp: new Date().toISOString(),
        tests: {
          users: {
            exists: !usersError,
            error: usersError?.message || null,
            count: users?.length || 0
          },
          leads: {
            exists: !leadsError,
            error: leadsError?.message || null,
            count: leads?.length || 0
          },
          meetings: {
            exists: !meetingsError,
            error: meetingsError?.message || null,
            count: meetings?.length || 0
          }
        },
        overall_status: (!usersError && !leadsError && !meetingsError) ? 'SUCCESS' : 'PARTIAL_FAILURE'
      };

      console.log('🔍 DB Test: Final results:', results);
      return res.status(200).json(results);
    }

    // Default debug response
    res.status(200).json({
      message: 'Debug endpoint working!',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: !!process.env.VERCEL
      },
      usage: {
        database_test: 'Add ?db=test to test database connectivity'
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
};
