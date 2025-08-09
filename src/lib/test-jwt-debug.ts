import { useAuth } from '@clerk/clerk-react';

/**
 * Debug function to test JWT token generation
 * This helps identify issues with Clerk JWT templates
 */
export async function debugJWTTokenGeneration() {
  try {
    console.log('🔍 Starting JWT token debug...');
    
    // Get the auth hook (this should be called from a component)
    const { getToken } = useAuth();
    
    if (!getToken) {
      console.error('❌ getToken function not available');
      return;
    }
    
    // Test different token approaches
    console.log('🔍 Testing default token...');
    try {
      const defaultToken = await getToken();
      console.log('✅ Default token obtained:', {
        length: defaultToken?.length || 0,
        preview: defaultToken?.substring(0, 50) + '...'
      });
      
      if (defaultToken) {
        // Decode the token
        const parts = defaultToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('🔍 Default token payload:', payload);
          console.log('🔍 Has sub field:', !!payload.sub);
          console.log('🔍 Sub value:', payload.sub);
        }
      }
    } catch (error) {
      console.error('❌ Default token failed:', error);
    }
    
    // Test supabase template (if available)
    console.log('🔍 Testing supabase template...');
    try {
      const supabaseToken = await getToken({ template: 'supabase' });
      console.log('✅ Supabase template token obtained:', {
        length: supabaseToken?.length || 0,
        preview: supabaseToken?.substring(0, 50) + '...'
      });
      
      if (supabaseToken) {
        // Decode the token
        const parts = supabaseToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('🔍 Supabase token payload:', payload);
          console.log('🔍 Has sub field:', !!payload.sub);
          console.log('🔍 Sub value:', payload.sub);
        }
      }
    } catch (error) {
      console.error('❌ Supabase template failed:', error);
      console.log('💡 This is expected if the supabase JWT template is not configured in Clerk');
    }
    
    console.log('🔍 JWT token debug completed');
    
  } catch (error) {
    console.error('❌ JWT debug error:', error);
  }
}

/**
 * Test function that can be called from components
 */
export function useJWTDebug() {
  const { getToken } = useAuth();
  
  const testTokens = async () => {
    try {
      console.log('🔍 Testing JWT tokens...');
      
      // Test default token
      const defaultToken = await getToken();
      console.log('✅ Default token:', defaultToken ? 'SUCCESS' : 'FAILED');
      
      if (defaultToken) {
        const parts = defaultToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('🔍 Default token payload:', payload);
        }
      }
      
      // Test supabase template
      try {
        const supabaseToken = await getToken({ template: 'supabase' });
        console.log('✅ Supabase template:', supabaseToken ? 'SUCCESS' : 'FAILED');
        
        if (supabaseToken) {
          const parts = supabaseToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('🔍 Supabase token payload:', payload);
          }
        }
      } catch (error) {
        console.log('❌ Supabase template not available:', error.message);
      }
      
    } catch (error) {
      console.error('❌ Token test failed:', error);
    }
  };
  
  return { testTokens };
}
