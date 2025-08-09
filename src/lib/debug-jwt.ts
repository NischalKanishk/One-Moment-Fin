import { useAuth } from '@clerk/clerk-react';

export async function debugJWTToken() {
  try {
    const { getToken } = useAuth();
    
    console.log('🔍 Debugging JWT token generation...');
    
    // Try to get the token
    const token = await getToken({ template: 'supabase' });
    
    if (token) {
      console.log('✅ JWT token generated successfully!');
      console.log('Token length:', token.length);
      console.log('Token preview:', token.substring(0, 50) + '...');
      
      // Decode the JWT to see the payload
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('JWT Payload:', payload);
          console.log('JWT Header:', JSON.parse(atob(parts[0])));
          
          // Check if the token has the expected fields
          if (payload.sub) {
            console.log('✅ JWT has "sub" field:', payload.sub);
          } else {
            console.log('❌ JWT missing "sub" field');
          }
          
          if (payload.aud) {
            console.log('✅ JWT has "aud" field:', payload.aud);
          } else {
            console.log('❌ JWT missing "aud" field');
          }
          
          if (payload.role) {
            console.log('✅ JWT has "role" field:', payload.role);
          } else {
            console.log('❌ JWT missing "role" field');
          }
          
        } else {
          console.log('❌ Invalid JWT format - should have 3 parts');
        }
      } catch (e) {
        console.log('❌ Could not decode JWT payload:', e);
      }
      
      return token;
    } else {
      console.error('❌ JWT token is null or undefined');
      return null;
    }
  } catch (error) {
    console.error('❌ Error generating JWT token:', error);
    return null;
  }
}

// Test function that can be called from browser console
export function debugJWT() {
  debugJWTToken().then(token => {
    if (token) {
      console.log('🎉 JWT token debugging complete!');
    } else {
      console.log('💥 JWT token debugging failed!');
    }
  });
}

// Export for use in components
export default debugJWTToken;
