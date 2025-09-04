import { useAuth } from '@clerk/clerk-react';

export async function debugJWTToken() {
  try {
    const { getToken } = useAuth();
    
    // Try to get the token with supabase template, fallback to default
    let token;
    try {
      token = await getToken({ template: 'supabase' });
      } catch (templateError) {
      token = await getToken();
      }
    
    if (token) {
      + '...');
      
      // Decode the JWT to see the payload
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          ));
          
          // Check if the token has the expected fields
          if (payload.sub) {
            } else {
            }
          
          if (payload.aud) {
            } else {
            }
          
          if (payload.role) {
            } else {
            }
          
        } else {
          }
      } catch (e) {
        }
      
      return token;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

// Test function that can be called from browser console
export function debugJWT() {
  debugJWTToken().then(token => {
    if (token) {
      } else {
      }
  });
}

// Export for use in components
export default debugJWTToken;
