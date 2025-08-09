import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

/**
 * Create an authenticated Supabase client using Clerk session token
 * This follows the official Supabase-Clerk integration pattern
 */
export function createAuthenticatedSupabaseClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

/**
 * Get Clerk session token for Supabase authentication
 * This should be called from your Clerk session
 */
export async function getClerkTokenForSupabase(session: any): Promise<string | null> {
  try {
    // Get the JWT token that Clerk generates for Supabase
    const token = await session?.getToken({
      template: 'supabase' // This should match your Clerk JWT template
    })
    return token
  } catch (error) {
    console.error('Error getting Clerk token for Supabase:', error)
    return null
  }
}
