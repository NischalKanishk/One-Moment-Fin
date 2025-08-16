const { supabase } = require('./lib/supabase.js');

module.exports = async function handler(req, res) {
  // Force JSON content type
  res.setHeader('Content-Type', 'application/json');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    console.log('🔍 DB Test: Testing database connection...');

    // Test 1: Check if users table exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);

    console.log('🔍 DB Test: Users table result:', { users, usersError });

    // Test 2: Check if leads table exists  
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('count(*)')
      .limit(1);

    console.log('🔍 DB Test: Leads table result:', { leads, leadsError });

    // Test 3: Check if meetings table exists
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('count(*)')
      .limit(1);

    console.log('🔍 DB Test: Meetings table result:', { meetings, meetingsError });

    const results = {
      message: 'Database connection test completed',
      timestamp: new Date().toISOString(),
      tests: {
        users: {
          exists: !usersError,
          error: usersError?.message || null,
          count: users?.[0]?.count || 0
        },
        leads: {
          exists: !leadsError,
          error: leadsError?.message || null,
          count: leads?.[0]?.count || 0
        },
        meetings: {
          exists: !meetingsError,
          error: meetingsError?.message || null,
          count: meetings?.[0]?.count || 0
        }
      },
      overall_status: (!usersError && !leadsError && !meetingsError) ? 'SUCCESS' : 'PARTIAL_FAILURE'
    };

    console.log('🔍 DB Test: Final results:', results);
    return res.status(200).json(results);

  } catch (error) {
    console.error('❌ DB Test: Error:', error);
    
    // Force valid JSON response even on errors
    try {
      return res.status(500).json({ 
        error: 'Database test failed',
        message: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } catch (jsonError) {
      // If JSON fails, send plain text
      res.status(500).setHeader('Content-Type', 'text/plain');
      return res.end('Database test failed');
    }
  }
};
