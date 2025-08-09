import { supabase } from './supabase'
import { User } from './supabase'
import { createAuthenticatedSupabaseClient } from './clerk-jwt-config'

export interface ClerkUserData {
  id: string
  emailAddresses: Array<{ emailAddress: string }>
  phoneNumbers: Array<{ phoneNumber: string }>
  firstName?: string
  lastName?: string
  imageUrl?: string
  createdAt: Date
}

export class ClerkSupabaseSync {
  /**
   * Sync user data from Clerk to Supabase
   */
  public static async syncUserToSupabase(clerkUser: ClerkUserData, jwtToken?: string): Promise<User | null> {
    // Use authenticated client if JWT token is provided, otherwise fall back to anonymous client
    const client = jwtToken ? createAuthenticatedSupabaseClient(jwtToken) : supabase
    
    if (!client) {
      console.error('ClerkSupabaseSync: Supabase client not initialized')
      return null
    }

    try {
      const email = clerkUser.emailAddresses[0]?.emailAddress || null
      const phone = clerkUser.phoneNumbers[0]?.phoneNumber || null
      const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ')

      console.log('ClerkSupabaseSync: Attempting to sync user:', {
        clerkId: clerkUser.id,
        email,
        phone,
        fullName
      })

      // Test Supabase connection first
      console.log('ClerkSupabaseSync: Testing Supabase connection...')
      const { data: testData, error: testError } = await client
        .from('users')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.error('ClerkSupabaseSync: Supabase connection test failed:', testError)
        return null
      }
      
      console.log('ClerkSupabaseSync: Supabase connection test successful')

      // Check if user already exists in Supabase
      const { data: existingUser, error: fetchError } = await client
        .from('users')
        .select('*')
        .eq('clerk_id', clerkUser.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching existing user:', fetchError)
        // Continue with creation attempt even if fetch fails
      }

      if (existingUser) {
        console.log('ClerkSupabaseSync: Updating existing user:', existingUser.id)
        // Update existing user
        const { data: updatedUser, error: updateError } = await client
          .from('users')
          .update({
            full_name: fullName,
            email: email,
            phone: phone,
            profile_image_url: clerkUser.imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('clerk_id', clerkUser.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating user:', updateError)
          // Return existing user if update fails
          return existingUser
        }

        return updatedUser
      } else {
        console.log('ClerkSupabaseSync: Creating new user')
        // Create new user
        const { data: newUser, error: insertError } = await client
          .from('users')
          .insert({
            clerk_id: clerkUser.id,
            full_name: fullName,
            email: email,
            phone: phone,
            auth_provider: email ? 'email' : 'phone', // Basic logic, can be refined
            profile_image_url: clerkUser.imageUrl,
            referral_link: this.generateReferralLink(clerkUser.id),
            role: 'mfd' // Default role
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating user:', insertError)
          return null
        }

        return newUser
      }
    } catch (error) {
      console.error('Error syncing user to Supabase:', error)
      return null
    }
  }

  /**
   * Get user from Supabase by Clerk ID
   */
  static async getUserByClerkId(clerkId: string, jwtToken?: string): Promise<User | null> {
    const client = jwtToken ? createAuthenticatedSupabaseClient(jwtToken) : supabase
    
    if (!client) {
      console.error('Supabase client not initialized')
      return null
    }

    try {
      const { data: user, error } = await client
        .from('users')
        .select('*')
        .eq('clerk_id', clerkId)
        .single()

      if (error) {
        console.error('Error fetching user:', error)
        return null
      }

      return user
    } catch (error) {
      console.error('Error getting user by Clerk ID:', error)
      return null
    }
  }

  /**
   * Delete user from Supabase when deleted from Clerk
   */
  static async deleteUserFromSupabase(clerkId: string, jwtToken?: string): Promise<boolean> {
    const client = jwtToken ? createAuthenticatedSupabaseClient(jwtToken) : supabase
    
    if (!client) {
      console.error('Supabase client not initialized')
      return false
    }

    try {
      const { error } = await client
        .from('users')
        .delete()
        .eq('clerk_id', clerkId)

      if (error) {
        console.error('Error deleting user:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting user from Supabase:', error)
      return false
    }
  }

  /**
   * Generate a unique referral link for the user
   */
  private static generateReferralLink(clerkId: string): string {
    // Create a short, readable referral code
    const shortId = clerkId.substring(0, 8)
    const randomSuffix = Math.random().toString(36).substring(2, 6)
    return `${shortId}${randomSuffix}`
  }
}
