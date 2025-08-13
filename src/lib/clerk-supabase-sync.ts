import { SupabaseClient } from '@supabase/supabase-js'

export interface ClerkUserData {
  id: string
  emailAddresses?: any[]
  phoneNumbers?: any[]
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
  phone?: string
  imageUrl?: string
  createdAt: Date
}

export class ClerkSupabaseSync {
  // Global flag to disable sync operations
  private static syncDisabled = false;

  static disableSync() {
    console.log('🔍 ClerkSupabaseSync: Sync disabled globally');
    this.syncDisabled = true;
  }

  static enableSync() {
    console.log('🔍 ClerkSupabaseSync: Sync enabled globally');
    this.syncDisabled = false;
  }

  /**
   * Sync Clerk user data to Supabase
   * This method will either create a new user or update existing one
   */
  static async syncUserToSupabase(clerkUserData: ClerkUserData, supabaseClient: SupabaseClient) {
    // Check if sync is disabled
    if (this.syncDisabled) {
      console.log('🔍 ClerkSupabaseSync: Sync is disabled, returning null');
      return null;
    }
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
      // More flexible data extraction
      const email = clerkUserData.emailAddresses?.[0]?.emailAddress || 
                   clerkUserData.email || 
                   '';
      
      const phone = clerkUserData.phoneNumbers?.[0]?.phoneNumber || 
                   clerkUserData.phone || 
                   null;
      
      const fullName = [clerkUserData.firstName, clerkUserData.lastName]
        .filter(Boolean)
        .join(' ') || 
        clerkUserData.fullName || 
        'User';

      console.log('🔍 ClerkSupabaseSync: Creating user with data:', {
        email,
        phone,
        fullName,
        firstName: clerkUserData.firstName,
        lastName: clerkUserData.lastName,
        fullNameFromData: clerkUserData.fullName
      });

      // Generate unique referral link locally to avoid frontend database calls
      const referralLink = this.generateReferralLinkLocally(clerkUserData.firstName || 'user', clerkUserData.id)
      
      // Generate unique assessment link in the format: 5 random digits + userid + 5 random letters
      const assessmentLink = this.generateAssessmentLinkLocally(clerkUserData.id)

      const newUserData = {
        clerk_id: clerkUserData.id,
        full_name: fullName,
        email: email,
        phone: phone,
        mfd_registration_number: null, // Will be updated later if provided
        auth_provider: 'clerk',
        referral_link: referralLink,
        assessment_link: assessmentLink,
        profile_image_url: clerkUserData.imageUrl || '',

        role: 'mfd' as const
      }

      const { data: newUser, error } = await supabaseClient
        .from('users')
        .insert(newUserData)
        .select()
        .single()

      if (error || !newUser) {
        throw new Error(error?.message || 'Failed to create user');
      }



      return newUser
    } catch (error) {
      console.error('Error creating user in Supabase:', error)
      console.error('Error details:', error)
      console.error('User data being inserted:', clerkUserData)
      return null
    }
  }

  /**
   * Update existing user in Supabase
   * COMPLETELY NON-DESTRUCTIVE - Only updates missing fields, never overwrites existing data
   */
  private static async updateUserInSupabase(clerkUserData: ClerkUserData, supabaseUserId: string, supabaseClient: SupabaseClient) {
    try {
      // Get the existing user data first
      const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', supabaseUserId)
        .single()

      if (fetchError) {
        console.error('Error fetching existing user:', fetchError)
        return null
      }

      console.log('🔍 ClerkSupabaseSync: Existing user data:', existingUser);

      // Build update data - ONLY update fields that are completely missing (null/undefined/empty)
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Only update full_name if it's completely missing
      if (!existingUser.full_name || existingUser.full_name.trim() === '') {
        const fullName = [clerkUserData.firstName, clerkUserData.lastName]
          .filter(Boolean)
          .join(' ') || 
          clerkUserData.fullName || 
          'User'
        if (fullName && fullName !== 'User') {
          updateData.full_name = fullName
          console.log('🔍 ClerkSupabaseSync: Updating missing full_name:', fullName)
        }
      }

      // Only update email if it's completely missing
      if (!existingUser.email || existingUser.email.trim() === '') {
        const email = clerkUserData.emailAddresses?.[0]?.emailAddress || 
                     clerkUserData.email || 
                     ''
        if (email) {
          updateData.email = email
          console.log('🔍 ClerkSupabaseSync: Updating missing email:', email)
        }
      }

      // Only update phone if it's completely missing
      if (!existingUser.phone || existingUser.phone.trim() === '') {
        const phone = clerkUserData.phoneNumbers?.[0]?.phoneNumber || 
                     clerkUserData.phone || 
                     null
        if (phone) {
          updateData.phone = phone
          console.log('🔍 ClerkSupabaseSync: Updating missing phone:', phone)
        }
      }

      // Only update profile_image_url if it's completely missing
      if (!existingUser.profile_image_url || existingUser.profile_image_url.trim() === '') {
        if (clerkUserData.imageUrl) {
          updateData.profile_image_url = clerkUserData.imageUrl
          console.log('🔍 ClerkSupabaseSync: Updating missing profile_image_url:', clerkUserData.imageUrl)
        }
      }

      // Only update assessment_link if it's completely missing
      if (!existingUser.assessment_link || existingUser.assessment_link.trim() === '') {
        const assessmentLink = this.generateAssessmentLinkLocally(clerkUserData.id)
        updateData.assessment_link = assessmentLink
        console.log('🔍 ClerkSupabaseSync: Updating missing assessment_link:', assessmentLink)
      }

      // If no fields to update, just return the existing user
      if (Object.keys(updateData).length === 1) { // Only has updated_at
        console.log('🔍 ClerkSupabaseSync: No fields to update, returning existing user unchanged')
        return existingUser
      }

      console.log('🔍 ClerkSupabaseSync: Updating fields:', updateData);

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

      console.log('🔍 ClerkSupabaseSync: Update successful, returning updated user');
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
    
    return `/r/${cleanName}${uniqueId}`;
  }

  /**
   * Generate assessment link locally in the format: 5 random digits + userid + 5 random letters
   * This prevents frontend from making direct Supabase calls
   */
  private static generateAssessmentLinkLocally(userId: string): string {
    // Generate 5 random digits
    const randomDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    
    // Generate 5 random letters
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetters = Array.from({ length: 5 }, () => 
      letters.charAt(Math.floor(Math.random() * letters.length))
    ).join('');
    
    // Combine: 5 digits + userid + 5 letters
    return `${randomDigits}${userId}${randomLetters}`;
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
