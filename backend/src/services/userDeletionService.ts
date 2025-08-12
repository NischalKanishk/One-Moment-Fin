import { supabase } from '../config/supabase';
import { logger } from './logger';

export interface UserDeletionResult {
  success: boolean;
  message: string;
  deprecatedUserId?: string;
  migratedDataCount?: {
    leads: number;
    assessments: number;
    meetings: number;
    subscriptions: number;
    products: number;
    feedback: number;
  };
}

export interface DeprecatedUserData {
  id: string;
  original_user_id: string;
  clerk_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  deleted_at: string;
  deletion_reason: string;
  data_migration_status: string;
}

export class UserDeletionService {
  /**
   * Migrate user data to deprecated tables and then delete from original tables
   * @param userId - The UUID of the user to delete
   * @param deletionReason - Reason for deletion (default: 'user_requested')
   * @returns Promise<UserDeletionResult>
   */
  static async deleteUser(userId: string, deletionReason: string = 'user_requested'): Promise<UserDeletionResult> {
    try {
      logger.info('Starting user deletion process', { userId, deletionReason });

      // Step 1: Verify user exists and get basic info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        logger.error('User not found for deletion', { userId, error: userError });
        return {
          success: false,
          message: 'User not found'
        };
      }

      logger.info('User found, starting data migration', { userId, userEmail: user.email });

      // Step 2: Use the database function to migrate all user data to deprecated tables
      const { data: migrationResult, error: migrationError } = await supabase
        .rpc('migrate_user_to_deprecated', {
          user_uuid: userId,
          deletion_reason: deletionReason
        });

      if (migrationError) {
        logger.error('Data migration failed', { userId, error: migrationError });
        return {
          success: false,
          message: `Data migration failed: ${migrationError.message}`
        };
      }

      if (!migrationResult) {
        logger.error('Data migration returned false', { userId });
        return {
          success: false,
          message: 'Data migration failed - no result returned'
        };
      }

      logger.info('Data migration completed successfully', { userId });

      // Step 3: Get the deprecated user ID for reference
      const { data: deprecatedUser, error: deprecatedUserError } = await supabase
        .from('deprecated_users')
        .select('id')
        .eq('original_user_id', userId)
        .single();

      if (deprecatedUserError || !deprecatedUser) {
        logger.error('Failed to retrieve deprecated user ID', { userId, error: deprecatedUserError });
        return {
          success: false,
          message: 'Failed to retrieve deprecated user reference'
        };
      }

      // Step 4: Get counts of migrated data for reporting
      const migratedDataCount = await this.getMigratedDataCount(deprecatedUser.id);

      // Step 5: Delete user data from original tables (cascade will handle related data)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        logger.error('Failed to delete user from original table', { userId, error: deleteError });
        return {
          success: false,
          message: `Failed to delete user: ${deleteError.message}`
        };
      }

      logger.info('User deletion completed successfully', { 
        userId, 
        deprecatedUserId: deprecatedUser.id,
        migratedDataCount 
      });

      return {
        success: true,
        message: 'User deleted successfully with all data migrated to deprecated tables',
        deprecatedUserId: deprecatedUser.id,
        migratedDataCount
      };

    } catch (error) {
      logger.error('Unexpected error during user deletion', { userId, error });
      return {
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get count of migrated data for a deprecated user
   * @param deprecatedUserId - The ID of the deprecated user
   * @returns Promise with counts of migrated data
   */
  private static async getMigratedDataCount(deprecatedUserId: string) {
    try {
      const [
        { count: leadsCount },
        { count: assessmentsCount },
        { count: meetingsCount },
        { count: subscriptionsCount },
        { count: productsCount },
        { count: feedbackCount }
      ] = await Promise.all([
        supabase.from('deprecated_leads').select('*', { count: 'exact', head: true }).eq('deprecated_user_id', deprecatedUserId),
        supabase.from('deprecated_assessments').select('*', { count: 'exact', head: true }).eq('deprecated_user_id', deprecatedUserId),
        supabase.from('deprecated_meetings').select('*', { count: 'exact', head: true }).eq('deprecated_user_id', deprecatedUserId),
        supabase.from('deprecated_user_subscriptions').select('*', { count: 'exact', head: true }).eq('deprecated_user_id', deprecatedUserId),
        supabase.from('deprecated_product_recommendations').select('*', { count: 'exact', head: true }).eq('deprecated_user_id', deprecatedUserId),
        supabase.from('deprecated_ai_feedback').select('*', { count: 'exact', head: true }).eq('deprecated_user_id', deprecatedUserId)
      ]);

      return {
        leads: leadsCount || 0,
        assessments: assessmentsCount || 0,
        meetings: meetingsCount || 0,
        subscriptions: subscriptionsCount || 0,
        products: productsCount || 0,
        feedback: feedbackCount || 0
      };
    } catch (error) {
      logger.error('Error getting migrated data count', { deprecatedUserId, error });
      return {
        leads: 0,
        assessments: 0,
        meetings: 0,
        subscriptions: 0,
        products: 0,
        feedback: 0
      };
    }
  }

  /**
   * Get deprecated user data by original user ID
   * @param originalUserId - The original user ID
   * @returns Promise<DeprecatedUserData | null>
   */
  static async getDeprecatedUserData(originalUserId: string): Promise<DeprecatedUserData | null> {
    try {
      const { data, error } = await supabase
        .from('deprecated_users')
        .select('*')
        .eq('original_user_id', originalUserId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as DeprecatedUserData;
    } catch (error) {
      logger.error('Error retrieving deprecated user data', { originalUserId, error });
      return null;
    }
  }

  /**
   * Get deprecated user data by Clerk ID
   * @param clerkId - The Clerk user ID
   * @returns Promise<DeprecatedUserData | null>
   */
  static async getDeprecatedUserDataByClerkId(clerkId: string): Promise<DeprecatedUserData | null> {
    try {
      const { data, error } = await supabase
        .from('deprecated_users')
        .select('*')
        .eq('clerk_id', clerkId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as DeprecatedUserData;
    } catch (error) {
      logger.error('Error retrieving deprecated user data by Clerk ID', { clerkId, error });
      return null;
    }
  }

  /**
   * Get summary of all deprecated users
   * @returns Promise<DeprecatedUserData[]>
   */
  static async getAllDeprecatedUsers(): Promise<DeprecatedUserData[]> {
    try {
      const { data, error } = await supabase
        .from('deprecated_user_summary')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) {
        logger.error('Error retrieving deprecated users summary', { error });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error retrieving deprecated users summary', { error });
      return [];
    }
  }

  /**
   * Restore a deprecated user (for admin purposes)
   * @param deprecatedUserId - The ID of the deprecated user to restore
   * @returns Promise<UserDeletionResult>
   */
  static async restoreDeprecatedUser(deprecatedUserId: string): Promise<UserDeletionResult> {
    try {
      logger.info('Starting user restoration process', { deprecatedUserId });

      // This is a complex operation that would require reversing the migration
      // For now, we'll just mark it as restorable
      const { error } = await supabase
        .from('deprecated_users')
        .update({ 
          data_migration_status: 'restorable',
          deletion_reason: 'restoration_requested'
        })
        .eq('id', deprecatedUserId);

      if (error) {
        logger.error('Failed to mark user as restorable', { deprecatedUserId, error });
        return {
          success: false,
          message: `Failed to mark user as restorable: ${error.message}`
        };
      }

      logger.info('User marked as restorable', { deprecatedUserId });

      return {
        success: true,
        message: 'User marked as restorable. Manual restoration process required.'
      };

    } catch (error) {
      logger.error('Unexpected error during user restoration marking', { deprecatedUserId, error });
      return {
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
