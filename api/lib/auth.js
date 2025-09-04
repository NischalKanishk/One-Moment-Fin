const { supabase } = require('./supabase.js');

// Extend Request interface to include user
const authenticateUser = async (req) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No valid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    // Handle Clerk JWT tokens (both development and production)
    if (token.split('.').length === 3) {
      try {
        // Try to decode the JWT payload
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        // Extract Clerk user ID from the token
        // Clerk tokens use 'sub' as the standard claim for user ID
        const clerkUserId = payload.sub;
        
        if (!clerkUserId) {
          );
          throw new Error('Invalid JWT token: missing user ID (sub)');
        }
        
        // Log additional Clerk-specific fields for debugging
        if (payload.iss) if (payload.aud) if (payload.iat) );
        if (payload.exp) );
        
        // Look up the corresponding Supabase user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, phone, role')
          .eq('clerk_id', clerkUserId)
          .single();
        
        if (userError) {
          if (userError.code === 'PGRST116') {
            } else {
            throw new Error('Database lookup failed');
          }
        }
        
        if (!userData) {
          // Create a new user in the database
          const newUserData = {
            clerk_id: clerkUserId,
            full_name: payload.name || payload.full_name || 'New User',
            email: payload.email || payload.email_address || 'dev@example.com',
            phone: payload.phone_number || payload.phone || '+91 99999 99999',
            auth_provider: 'clerk',
            role: 'mfd',
            referral_link: `/r/${clerkUserId.slice(-8)}` // Generate referral link
          };
          
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert(newUserData)
            .select('id, email, phone, role')
            .single();
          
          if (createError) {
            throw new Error('User creation failed');
          }
          
          return {
            clerk_id: clerkUserId,
            supabase_user_id: newUser.id,
            email: newUser.email,
            phone: newUser.phone,
            role: newUser.role
          };
        }
        
        return {
          clerk_id: clerkUserId,
          supabase_user_id: userData.id,
          email: userData.email,
          phone: userData.phone,
          role: userData.role
        };
      } catch (error) {
        // Provide more specific error messages for common JWT issues
        if (error.message.includes('Unexpected token')) {
          throw new Error('Invalid JWT token format: malformed payload');
        } else if (error.message.includes('Unexpected end')) {
          throw new Error('Invalid JWT token format: incomplete payload');
        } else {
          throw new Error(`Invalid JWT token: ${error.message}`);
        }
      }
    } else {
      throw new Error('Invalid JWT format');
    }
  } catch (error) {
    throw error;
  }
};

// Helper function to create error response
const createErrorResponse = (statusCode, message) => ({
  statusCode,
  body: JSON.stringify({ error: message }),
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
});

// Helper function to create success response
const createSuccessResponse = (data, statusCode = 200) => ({
  statusCode,
  body: JSON.stringify(data),
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
});

module.exports = { authenticateUser, createErrorResponse, createSuccessResponse };
