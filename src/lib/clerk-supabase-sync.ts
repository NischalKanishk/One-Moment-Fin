import { SupabaseClient } from '@supabase/supabase-js'

export interface ClerkUserData {
  id: string
  emailAddresses: any[]
  phoneNumbers: any[]
  firstName?: string
  lastName?: string
  imageUrl?: string
  createdAt: Date
}

export class ClerkSupabaseSync {
  /**
   * Sync Clerk user data to Supabase
   * This method will either create a new user or update existing one
   */
  static async syncUserToSupabase(clerkUserData: ClerkUserData, supabaseClient: SupabaseClient) {
    try {
      // Test Supabase connection first
      const { data: testData, error: testError } = await supabaseClient
        .from('users')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.error('Supabase connection test failed:', testError)
        return null
      }

      // First, check if user already exists
      const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('clerk_id', clerkUserData.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing user:', fetchError)
      }

      if (existingUser) {
        return await this.updateUserInSupabase(clerkUserData, existingUser.id, supabaseClient)
      } else {
        return await this.createUserInSupabase(clerkUserData, supabaseClient)
      }
    } catch (error) {
      console.error('Error syncing user to Supabase:', error)
      return null
    }
  }

  /**
   * Create a new user in Supabase
   */
  private static async createUserInSupabase(clerkUserData: ClerkUserData, supabaseClient: SupabaseClient) {
    try {
      const email = clerkUserData.emailAddresses?.[0]?.emailAddress || ''
      const phone = clerkUserData.phoneNumbers?.[0]?.phoneNumber || ''
      const fullName = [clerkUserData.firstName, clerkUserData.lastName]
        .filter(Boolean)
        .join(' ') || 'User'

      // Generate unique referral link locally to avoid frontend database calls
      const referralLink = this.generateReferralLinkLocally(clerkUserData.firstName || 'user', clerkUserData.id)

      const newUserData = {
        clerk_id: clerkUserData.id,
        full_name: fullName,
        email: email,
        phone: phone,
        auth_provider: 'clerk',
        profile_image_url: clerkUserData.imageUrl || '',
        referral_link: referralLink,
        role: 'mfd' as const
      }

      const { data: newUser, error } = await supabaseClient
        .from('users')
        .insert(newUserData)
        .select()
        .single()

      if (error) {
        console.error('Error creating user in Supabase:', error)
        return null
      }

      return newUser
    } catch (error) {
      console.error('Error in createUserInSupabase:', error)
      return null
    }
  }

  /**
   * Update existing user in Supabase
   */
  private static async updateUserInSupabase(clerkUserData: ClerkUserData, supabaseUserId: string, supabaseClient: SupabaseClient) {
    try {
      const email = clerkUserData.emailAddresses?.[0]?.emailAddress || ''
      const phone = clerkUserData.phoneNumbers?.[0]?.phoneNumber || ''
      const fullName = [clerkUserData.firstName, clerkUserData.lastName]
        .filter(Boolean)
        .join(' ') || 'User'

      const updateData = {
        full_name: fullName,
        email: email,
        phone: phone,
        profile_image_url: clerkUserData.imageUrl || '',
        updated_at: new Date().toISOString()
      }

      const { data: updatedUser, error } = await supabaseClient
        .from('users')
        .update(updateData)
        .eq('id', supabaseUserId)
        .select()
        .single()

      if (error) {
        console.error('Error updating user in Supabase:', error)
        return null
      }

      return updatedUser
    } catch (error) {
      console.error('Error in updateUserInSupabase:', error)
      return null
    }
  }

  /**
   * Generate referral link locally without database calls
   * This prevents frontend from making direct Supabase calls
   */
  private static generateReferralLinkLocally(firstName: string, userId: string): string {
    if (!firstName || firstName.trim() === '') {
      firstName = 'user';
    }
    
    // Clean the first name (remove special characters, convert to lowercase)
    const cleanName = firstName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10); // Limit length
    
    // Use last 6 characters of userId for uniqueness
    const uniqueId = userId.slice(-6);
    
    return `/${cleanName}${uniqueId}`;
  }

  /**
   * Get user from Supabase by Clerk ID
   */
  static async getUserByClerkId(clerkId: string, supabaseClient: SupabaseClient) {
    try {
      const { data: user, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('clerk_id', clerkId)
        .single()

      if (error) {
        console.error('Error fetching user from Supabase:', error)
        return null
      }

      return user
    } catch (error) {
      console.error('Error in getUserByClerkId:', error)
      return null
    }
  }

  /**
   * Delete user from Supabase
   */
  static async deleteUserFromSupabase(clerkId: string, supabaseClient: SupabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('users')
        .delete()
        .eq('clerk_id', clerkId)

      if (error) {
        console.error('Error deleting user from Supabase:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteUserFromSupabase:', error)
      return false
    }
  }

}
