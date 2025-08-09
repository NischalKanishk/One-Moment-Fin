import { SupabaseClient } from '@supabase/supabase-js'
import { generateUniqueReferralLink } from './utils'

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
      console.log('🔄 Starting Clerk user sync to Supabase...')
      console.log('📋 Clerk user data:', {
        id: clerkUserData.id,
        email: clerkUserData.emailAddresses?.[0]?.emailAddress,
        name: `${clerkUserData.firstName} ${clerkUserData.lastName}`,
        phone: clerkUserData.phoneNumbers?.[0]?.phoneNumber
      })

      // Test Supabase connection first
      console.log('🔌 Testing Supabase connection...')
      const { data: testData, error: testError } = await supabaseClient
        .from('users')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.error('❌ Supabase connection test failed:', testError)
        return null
      }
      console.log('✅ Supabase connection successful')

      // First, check if user already exists
      console.log('🔍 Checking if user exists in Supabase...')
      const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('clerk_id', clerkUserData.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching existing user:', fetchError)
      }

      if (existingUser) {
        console.log('✅ User already exists in Supabase, updating...')
        return await this.updateUserInSupabase(clerkUserData, existingUser.id, supabaseClient)
      } else {
        console.log('🆕 Creating new user in Supabase...')
        return await this.createUserInSupabase(clerkUserData, supabaseClient)
      }
    } catch (error) {
      console.error('❌ Error syncing user to Supabase:', error)
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

      console.log('📝 Preparing user data for Supabase:', {
        clerk_id: clerkUserData.id,
        full_name: fullName,
        email: email,
        phone: phone,
        auth_provider: 'clerk',
        role: 'mfd'
      })

      // Generate unique referral link
      const referralLink = await generateUniqueReferralLink(
        clerkUserData.firstName || 'user',
        supabaseClient
      );

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

      console.log('🚀 Inserting user into Supabase...')
      const { data: newUser, error } = await supabaseClient
        .from('users')
        .insert(newUserData)
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating user in Supabase:', error)
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        return null
      }

      console.log('✅ User created successfully in Supabase:', {
        supabaseId: newUser.id,
        clerkId: clerkUserData.id,
        email: newUser.email
      })
      return newUser
    } catch (error) {
      console.error('❌ Error in createUserInSupabase:', error)
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
        console.error('❌ Error updating user in Supabase:', error)
        return null
      }

      console.log('✅ User updated successfully in Supabase:', updatedUser.id)
      return updatedUser
    } catch (error) {
      console.error('❌ Error in updateUserInSupabase:', error)
      return null
    }
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
        console.error('❌ Error fetching user from Supabase:', error)
        return null
      }

      return user
    } catch (error) {
      console.error('❌ Error in getUserByClerkId:', error)
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
        console.error('❌ Error deleting user from Supabase:', error)
        return false
      }

      console.log('✅ User deleted successfully from Supabase')
      return true
    } catch (error) {
      console.error('❌ Error in deleteUserFromSupabase:', error)
      return false
    }
  }

}
