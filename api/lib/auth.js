const { supabase } = require('./supabase.js');

// Extend Request interface to include user
const authenticateUser = async (req) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth: No valid authorization header');
      throw new Error('No valid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔍 Auth: Token received, length:', token.length);
    
    // Handle Clerk JWT tokens (both development and production)
    if (token.split('.').length === 3) {
      try {
        // Try to decode the JWT payload
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log('🔍 Auth: JWT payload decoded:', payload);
        
        // Extract Clerk user ID from the token
        const clerkUserId = payload.sub || payload.user_id || payload.clerk_id;
        
        if (!clerkUserId) {
          console.error('❌ Auth: JWT token missing user ID field');
          throw new Error('Invalid JWT token: missing user ID');
        }
        
        console.log('🔍 Auth: Looking up user with clerk_id:', clerkUserId);
        
        // Look up the corresponding Supabase user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, phone, role')
          .eq('clerk_id', clerkUserId)
          .single();
        
        if (userError) {
          console.error('❌ Auth: Database error during user lookup:', userError);
          if (userError.code === 'PGRST116') {
            console.log('ℹ️ Auth: User not found in database, will create new user');
          } else {
            throw new Error('Database lookup failed');
          }
        }
        
        if (!userData) {
          console.log('⚠️ Auth: User not found in database, creating new user');
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
          
          console.log('🔍 Auth: Creating user with data:', newUserData);
          
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert(newUserData)
            .select('id, email, phone, role')
            .single();
          
          if (createError) {
            console.error('❌ Auth: Error creating new user:', createError);
            throw new Error('User creation failed');
          }
          
          console.log('✅ Auth: New user created successfully:', newUser?.id);
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
        console.error('❌ Auth: JWT decode error:', error);
        throw new Error('Invalid JWT token');
      }
    } else {
      throw new Error('Invalid JWT format');
    }
  } catch (error) {
    console.error('❌ Auth: Authentication failed:', error);
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
