const { supabase } = require('./lib/supabase.js');
const { authenticateUser } = require('./lib/auth.js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const { method, url } = req;
    const path = url.replace('/api/auth', '');

    // GET /api/auth/test - Test authentication endpoint
    if (method === 'GET' && path === '/test') {
      try {
        const user = await authenticateUser(req);
        return res.json({ 
          message: 'Authentication working',
          user,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
    }

    // GET /api/auth/me - Get current user profile
    if (method === 'GET' && path === '/me') {
      try {
        const user = await authenticateUser(req);
        const clerkId = user.clerk_id;

        // Try to get user data from database
        let { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', clerkId)
          .single();

        if (error && error.code === 'PGRST116') {
          // User doesn't exist, create them with basic info
          const phoneValue = user.phone === '' ? null : user.phone;
          
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              clerk_id: clerkId,
              full_name: user.email?.split('@')[0] || 'New User',
              email: user.email || null,
              phone: phoneValue,
              auth_provider: 'clerk',
              role: 'mfd',
              referral_link: `ref_${clerkId.slice(-8)}`,
            })
            .select()
            .single();

          if (createError) {
            return res.status(500).json({ error: 'Failed to create user profile' });
          }

          userData = newUser;
        } else if (error) {
          return res.status(500).json({ error: 'Failed to fetch user data' });
        }

        return res.json({ user: userData });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to fetch user profile' });
      }
    }

    // POST /api/auth/sync - Sync user data with Clerk
    if (method === 'POST' && path === '/sync') {
      try {
        const user = await authenticateUser(req);
        const { email, phone, full_name } = req.body;

        // Update user profile
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            email: email || user.email,
            phone: phone || user.phone,
            full_name: full_name || user.full_name,
            updated_at: new Date().toISOString()
          })
          .eq('clerk_id', user.clerk_id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ error: 'Failed to update user profile' });
        }

        return res.json({ message: 'Profile updated successfully', user: updatedUser });
      } catch (error) {
        if (error.message.includes('authorization')) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.status(500).json({ error: 'Failed to update profile' });
      }
    }

    // POST /api/auth/logout - Logout (placeholder)
    if (method === 'POST' && path === '/logout') {
      try {
        await authenticateUser(req);
        return res.json({ message: 'Logout successful' });
      } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
