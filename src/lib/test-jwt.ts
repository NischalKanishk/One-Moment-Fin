import { useAuth } from '@clerk/clerk-react';

export async function testJWTToken() {
  try {
    const { getToken } = useAuth();
    
    console.log('🔍 Testing JWT token generation...');
    
    const token = await getToken({ template: 'supabase' });
    
    if (token) {
      console.log('✅ JWT token generated successfully!');
      console.log('Token length:', token.length);
      console.log('Token preview:', token.substring(0, 50) + '...');
      
      // Decode the JWT to see the payload
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('JWT Payload:', payload);
      } catch (e) {
        console.log('Could not decode JWT payload');
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
export function testJWT() {
  testJWTToken().then(token => {
    if (token) {
      console.log('🎉 JWT token is working!');
    } else {
      console.log('💥 JWT token generation failed!');
    }
  });
}
