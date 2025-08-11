import { supabase } from '../config/supabase';
import { DefaultAssessmentService } from './defaultAssessmentService';

export class MigrateExistingUsersService {
  /**
   * Migrate all existing users to have default assessments
   */
  static async migrateAllUsers(): Promise<{ success: boolean; migrated: number; errors: string[] }> {
    try {
      console.log('Starting migration of existing users to default assessments...');
      
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email');

      if (usersError) {
        console.error('Failed to fetch users:', usersError);
        throw new Error('Failed to fetch users');
      }

      if (!users || users.length === 0) {
        console.log('No users found to migrate');
        return { success: true, migrated: 0, errors: [] };
      }

      console.log(`Found ${users.length} users to check for migration`);

      let migrated = 0;
      const errors: string[] = [];

      for (const user of users) {
        try {
          // Check if user already has a default assessment
          const hasDefault = await DefaultAssessmentService.hasDefaultAssessment(user.id);
          
          if (!hasDefault) {
            console.log(`Creating default assessment for user: ${user.full_name} (${user.email})`);
            await DefaultAssessmentService.createDefaultAssessment(user.id);
            migrated++;
            console.log(`✓ Successfully created default assessment for user: ${user.full_name}`);
          } else {
            console.log(`User ${user.full_name} already has default assessment, skipping`);
          }
        } catch (error) {
          const errorMsg = `Failed to migrate user ${user.full_name} (${user.id}): ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`Migration completed. Migrated: ${migrated}, Errors: ${errors.length}`);
      
      return {
        success: errors.length === 0,
        migrated,
        errors
      };
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate a specific user
   */
  static async migrateUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return { success: false, message: 'User not found' };
      }

      // Check if user already has a default assessment
      const hasDefault = await DefaultAssessmentService.hasDefaultAssessment(userId);
      
      if (hasDefault) {
        return { success: true, message: 'User already has default assessment' };
      }

      // Create default assessment
      await DefaultAssessmentService.createDefaultAssessment(userId);
      
      return { 
        success: true, 
        message: `Successfully created default assessment for user: ${user.full_name}` 
      };
    } catch (error) {
      console.error(`Failed to migrate user ${userId}:`, error);
      return { 
        success: false, 
        message: `Failed to create default assessment: ${error}` 
      };
    }
  }

  /**
   * Get migration status for all users
   */
  static async getMigrationStatus(): Promise<{
    totalUsers: number;
    usersWithDefault: number;
    usersWithoutDefault: number;
    details: Array<{
      userId: string;
      fullName: string;
      email: string;
      hasDefault: boolean;
    }>;
  }> {
    try {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email');

      if (usersError) {
        throw new Error('Failed to fetch users');
      }

      if (!users || users.length === 0) {
        return {
          totalUsers: 0,
          usersWithDefault: 0,
          usersWithoutDefault: 0,
          details: []
        };
      }

      const details = [];
      let usersWithDefault = 0;
      let usersWithoutDefault = 0;

      for (const user of users) {
        const hasDefault = await DefaultAssessmentService.hasDefaultAssessment(user.id);
        
        if (hasDefault) {
          usersWithDefault++;
        } else {
          usersWithoutDefault++;
        }

        details.push({
          userId: user.id,
          fullName: user.full_name,
          email: user.email,
          hasDefault
        });
      }

      return {
        totalUsers: users.length,
        usersWithDefault,
        usersWithoutDefault,
        details
      };
    } catch (error) {
      console.error('Failed to get migration status:', error);
      throw error;
    }
  }
}
