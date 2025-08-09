import { useAuth } from '@clerk/clerk-react'
import { createClient } from '@supabase/supabase-js'

/**
 * Clerk JWT Configuration for Supabase
 * This file handles the JWT token configuration needed for Supabase RLS policies
 */

export interface ClerkJWTClaims {
  sub: string // Clerk user ID
  email?: string
  phone_number?: string
  name?: string
  picture?: string
  iat: number // Issued at
  exp: number // Expires at
}

/**
 * Get the JWT token from Clerk for Supabase authentication
 */
export async function getClerkJWTToken(): Promise<string | null> {
  try {
    // This function can be used in non-hook contexts
    // For now, we'll return null and handle this in the component
    return null
  } catch (error) {
    console.error('Error getting Clerk JWT token:', error)
    return null
  }
}

/**
 * Create a Supabase client with Clerk JWT authentication
 * This is used when you need to make authenticated requests to Supabase
 */
export function createAuthenticatedSupabaseClient(jwtToken: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwtToken}`
      }
    }
  })
}

/**
 * Hook to get authenticated Supabase client
 * Use this in components that need to make authenticated Supabase requests
 */
export function useAuthenticatedSupabase() {
  const { getToken } = useAuth()
  
  const getAuthenticatedClient = async () => {
    try {
      // First try to get the JWT token with the supabase template
      let token = await getToken({ template: 'supabase' })
      
      if (!token) {
        console.warn('Supabase JWT template not found, trying default token...')
        // Fallback to default token if supabase template is not available
        token = await getToken()
        if (!token) {
          throw new Error('No authentication token available')
        }
        console.log('Using default JWT token for Supabase')
      } else {
        console.log('Using Supabase JWT token template')
      }
      
      // Verify the token structure
      if (!verifyJWTStructure(token)) {
        console.warn('JWT token structure verification failed, but proceeding...')
      }
      
      return createAuthenticatedSupabaseClient(token)
    } catch (error) {
      console.error('Error creating authenticated Supabase client:', error)
      return null
    }
  }
  
  return { getAuthenticatedClient }
}

/**
 * Verify JWT token structure (for debugging)
 */
export function verifyJWTStructure(token: string): boolean {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }
    
    // Decode the payload (second part) - using a more robust approach
    let payload
    try {
      // Try using atob first (modern browsers)
      if (typeof atob !== 'undefined') {
        payload = JSON.parse(decodeURIComponent(escape(atob(parts[1]))))
      } else {
        // Fallback for environments without atob
        payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      }
    } catch (decodeError) {
      console.warn('Failed to decode JWT payload:', decodeError)
      return false
    }
    
    // Check for required claims
    if (!payload.sub || !payload.iat || !payload.exp) {
      return false
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error verifying JWT structure:', error)
    return false
  }
}

/**
 * Extract user ID from JWT token
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    let payload
    try {
      // Try using atob first (modern browsers)
      if (typeof atob !== 'undefined') {
        payload = JSON.parse(decodeURIComponent(escape(atob(parts[1]))))
      } else {
        // Fallback for environments without atob
        payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      }
    } catch (decodeError) {
      console.warn('Failed to decode JWT payload:', decodeError)
      return null
    }
    return payload.sub || null
  } catch (error) {
    console.error('Error extracting user ID from token:', error)
    return null
  }
}
