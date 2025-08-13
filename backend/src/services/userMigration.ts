import { supabase } from '../config/supabase';

export class UserMigrationService {
  /**
   * Migrate a user from Supabase Auth to the users table
   * This is useful for users who exist in auth but not in the users table
   */
  static async migrateAuthUser(authUserId: string, userData: {
    full_name: string;
    email: string;
    phone?: string;
    role?: 'mfd' | 'admin';
  }) {
    try {
      // Check if user already exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUserId)
        .single();

      if (existingUser) {
        console.log('User already exists in users table:', authUserId);
        return { success: true, message: 'User already exists' };
      }

      // Create user in users table
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          full_name: userData.full_name,
          email: userData.email,
          phone: userData.phone,
          auth_provider: 'email',
          role: userData.role || 'mfd',
          referral_link: `r/${authUserId.slice(0, 8)}`,
          assessment_link: `/assessment/${authUserId.slice(0, 8)}`,
          settings: {}
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to migrate user:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log('Successfully migrated user:', authUserId);
      return { success: true, user: newUser };
    } catch (error) {
      console.error('User migration error:', error);
      return { success: false, error: 'Migration failed' };
    }
  }

  /**
   * Get all auth users that don't exist in the users table
   */
  static async getOrphanedAuthUsers() {
    try {
      // Get all auth users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Failed to get auth users:', authError);
        return { success: false, error: authError.message };
      }

      // Get all users from users table
      const { data: dbUsers, error: dbError } = await supabase
        .from('users')
        .select('id');

      if (dbError) {
        console.error('Failed to get users from database:', dbError);
        return { success: false, error: dbError.message };
      }

      const dbUserIds = new Set(dbUsers?.map(u => u.id) || []);
      const orphanedUsers = authUsers?.users?.filter(authUser => !dbUserIds.has(authUser.id)) || [];

      return { success: true, orphanedUsers };
    } catch (error) {
      console.error('Get orphaned users error:', error);
      return { success: false, error: 'Failed to get orphaned users' };
    }
  }

  /**
   * Bulk migrate orphaned auth users
   */
  static async bulkMigrateOrphanedUsers() {
    try {
      const { success, orphanedUsers, error } = await this.getOrphanedAuthUsers();
      
      if (!success) {
        return { success: false, error };
      }

      // Handle case where orphanedUsers might be undefined
      if (!orphanedUsers || orphanedUsers.length === 0) {
        return { success: true, results: [], message: 'No orphaned users found' };
      }

      const results = [];
      for (const authUser of orphanedUsers) {
        const result = await this.migrateAuthUser(authUser.id, {
          full_name: authUser.user_metadata?.full_name || 'Unknown User',
          email: authUser.email || '',
          role: 'mfd'
        });
        results.push({ userId: authUser.id, ...result });
      }

      return { success: true, results };
    } catch (error) {
      console.error('Bulk migration error:', error);
      return { success: false, error: 'Bulk migration failed' };
    }
  }
}
