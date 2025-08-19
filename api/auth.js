// Auth API handler
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
    
    console.log(`🔍 Auth API Request: ${method} ${path}`);
    
    // Remove /api/auth prefix
    const authPath = path.replace('/api/auth', '');
    
    // GET /api/auth/test - Simple test endpoint
    if (method === 'GET' && authPath === '/test') {
      return res.status(200).json({ 
        message: 'Auth API is working!',
        timestamp: new Date().toISOString(),
        endpoint: '/api/auth/test'
      });
    }

    // GET /api/auth/me - Get current user profile
    if (method === 'GET' && authPath === '/me') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        console.log(`🔍 Fetching user profile for: ${user.supabase_user_id}`);

        // Get full user profile from database
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.supabase_user_id)
          .single();

        if (error) {
          console.error('❌ Database error:', error);
          return res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
        }

        console.log(`✅ Found user profile: ${userProfile.full_name || userProfile.email}`);

        return res.json({ 
          user: {
            id: userProfile.id,
            clerk_id: userProfile.clerk_id,
            full_name: userProfile.full_name,
            email: userProfile.email,
            phone: userProfile.phone,
            role: userProfile.role,
            mfd_registration_number: userProfile.mfd_registration_number,
            referral_link: userProfile.referral_link,
            profile_image_url: userProfile.profile_image_url,
            created_at: userProfile.created_at,
            updated_at: userProfile.updated_at
          }
        });
      } catch (error) {
        console.error('❌ Error fetching user profile:', error);
        return res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
      }
    }

    // POST /api/auth/sync - Sync user data with Clerk
    if (method === 'POST' && authPath === '/sync') {
      try {
        const user = await authenticateUser(req);
        if (!user?.supabase_user_id) {
          return res.status(400).json({ error: 'User not properly authenticated' });
        }

        const { full_name, email, phone } = req.body;

        console.log(`🔍 Syncing user data for: ${user.supabase_user_id}`);

        // Update user profile
        const { data: updatedUser, error } = await supabase
          .from('users')
          .update({
            full_name: full_name || user.full_name,
            email: email || user.email,
            phone: phone || user.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.supabase_user_id)
          .select()
          .single();

        if (error) {
          console.error('❌ Database error:', error);
          return res.status(500).json({ error: 'Failed to sync user data', details: error.message });
        }

        console.log(`✅ Synced user data: ${updatedUser.full_name || updatedUser.email}`);

        return res.json({ 
          message: 'User data synced successfully',
          user: updatedUser
        });
      } catch (error) {
        console.error('❌ Error syncing user data:', error);
        return res.status(500).json({ error: 'Failed to sync user data', details: error.message });
      }
    }

    // POST /api/auth/logout - Logout user
    if (method === 'POST' && authPath === '/logout') {
      // For serverless functions, logout is typically handled client-side
      // But we can return a success message
      console.log('🔍 User logout requested');
      return res.json({ message: 'Logged out successfully' });
    }

    // POST /api/auth/login - Login with Clerk token
    if (method === 'POST' && authPath === '/login') {
      try {
        const { token } = req.body;
        
        if (!token) {
          return res.status(400).json({ error: 'Token is required' });
        }

        console.log('🔍 Processing login with Clerk token');

        // Set the token in headers for authentication
        req.headers.authorization = `Bearer ${token}`;
        
        // Authenticate the user
        const user = await authenticateUser(req);
        
        console.log(`✅ User logged in: ${user.supabase_user_id}`);

        return res.json({ 
          message: 'Login successful',
          user: {
            id: user.supabase_user_id,
            clerk_id: user.clerk_id,
            email: user.email,
            role: user.role
          }
        });
      } catch (error) {
        console.error('❌ Login error:', error);
        return res.status(401).json({ error: 'Login failed', details: error.message });
      }
    }

    // POST /api/auth/signup - Signup with Clerk token
    if (method === 'POST' && authPath === '/signup') {
      try {
        const { token, full_name, phone } = req.body;
        
        if (!token) {
          return res.status(400).json({ error: 'Token is required' });
        }

        console.log('🔍 Processing signup with Clerk token');

        // Set the token in headers for authentication
        req.headers.authorization = `Bearer ${token}`;
        
        // Authenticate the user (this will create the user if they don't exist)
        const user = await authenticateUser(req);
        
        // If additional data was provided, update the user
        if (full_name || phone) {
          const updateData = {};
          if (full_name) updateData.full_name = full_name;
          if (phone) updateData.phone = phone;

          console.log(`🔍 Updating user profile with additional data`);

          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.supabase_user_id)
            .select()
            .single();

          if (updateError) {
            console.error('❌ User update error:', updateError);
          } else {
            user.full_name = updatedUser.full_name;
            user.phone = updatedUser.phone;
            console.log(`✅ Updated user profile: ${updatedUser.full_name || updatedUser.email}`);
          }
        }
        
        console.log(`✅ User signup successful: ${user.supabase_user_id}`);

        return res.json({ 
          message: 'Signup successful',
          user: {
            id: user.supabase_user_id,
            clerk_id: user.clerk_id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            role: user.role
          }
        });
      } catch (error) {
        console.error('❌ Signup error:', error);
        return res.status(400).json({ error: 'Signup failed', details: error.message });
      }
    }

    // GET /api/auth/health - Health check endpoint
    if (method === 'GET' && authPath === '/health') {
      try {
        console.log('🔍 Auth API health check requested');
        
        // Test basic database connection
        const { data: testData, error: testError } = await supabase
          .from('users')
          .select('count')
          .limit(1);

        if (testError) {
          console.error('❌ Database health check failed:', testError);
          return res.status(500).json({ 
            status: 'Unhealthy',
            error: 'Database connection failed',
            details: testError.message,
            timestamp: new Date().toISOString()
          });
        }

        console.log('✅ Auth API health check passed');
        return res.json({ 
          status: 'Healthy',
          message: 'Auth API is working correctly',
          database: 'Connected',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Error in auth health check:', error);
        return res.status(500).json({ 
          status: 'Unhealthy',
          error: 'Health check failed', 
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Default response for auth endpoints
    return res.status(404).json({
      error: 'Auth endpoint not found',
      path: path,
      method: method
    });
    
  } catch (error) {
    console.error('❌ Auth API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong in the auth API handler',
      details: error.message
    });
  }
};
