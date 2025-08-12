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
  user_data: any; // JSONB containing all user data
}

export class UserDeletionServiceSimple {
  /**
   * Migrate user data to single deprecated table and then delete from original tables
   * @param userId - The UUID of the user to delete
   * @param deletionReason - Reason for deletion (default: 'user_requested')
   * @returns Promise<UserDeletionResult>
   */
  static async deleteUser(userId: string, deletionReason: string = 'user_requested'): Promise<UserDeletionResult> {
    try {
      logger.info('Starting simplified user deletion process', { userId, deletionReason });

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

      logger.info('User found, starting simplified data migration', { userId, userEmail: user.email });

      // Step 2: Use the simplified database function to migrate all user data to single deprecated table
      const { data: migrationResult, error: migrationError } = await supabase
        .rpc('migrate_user_to_deprecated_simple', {
          user_uuid: userId,
          deletion_reason: deletionReason
        });

      if (migrationError) {
        logger.error('Simplified data migration failed', { userId, error: migrationError });
        return {
          success: false,
          message: `Data migration failed: ${migrationError.message}`
        };
      }

      if (!migrationResult) {
        logger.error('Simplified data migration returned false', { userId });
        return {
          success: false,
          message: 'Data migration failed - no result returned'
        };
      }

      logger.info('Simplified data migration completed successfully', { userId });

      // Step 3: Get the deprecated user ID for reference
      const { data: deprecatedUser, error: deprecatedUserError } = await supabase
        .from('deprecated_users')
        .select('id, user_data')
        .eq('original_user_id', userId)
        .single();

      if (deprecatedUserError || !deprecatedUser) {
        logger.error('Failed to retrieve deprecated user ID', { userId, error: deprecatedUserError });
        return {
          success: false,
          message: 'Failed to retrieve deprecated user reference'
        };
      }

      // Step 4: Extract counts from the JSON data for reporting
      const migratedDataCount = this.extractDataCounts(deprecatedUser.user_data);

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

      logger.info('User deletion completed successfully with simplified approach', { 
        userId, 
        deprecatedUserId: deprecatedUser.id,
        migratedDataCount 
      });

      return {
        success: true,
        message: 'User deleted successfully with all data migrated to single deprecated table',
        deprecatedUserId: deprecatedUser.id,
        migratedDataCount
      };

    } catch (error) {
      logger.error('Unexpected error during simplified user deletion', { userId, error });
      return {
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract data counts from the JSON user_data field
   * @param userData - The JSONB user_data from deprecated_users table
   * @returns Object with counts of migrated data
   */
  private static extractDataCounts(userData: any) {
    try {
      const metadata = userData?.migration_metadata || {};
      return {
        leads: parseInt(metadata.total_leads) || 0,
        assessments: parseInt(metadata.total_assessments) || 0,
        meetings: parseInt(metadata.total_meetings) || 0,
        subscriptions: parseInt(metadata.total_subscriptions) || 0,
        products: parseInt(metadata.total_products) || 0,
        feedback: parseInt(metadata.total_feedback) || 0
      };
    } catch (error) {
      logger.error('Error extracting data counts from user_data', { error });
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
   * Get summary of all deprecated users using the simplified view
   * @returns Promise<DeprecatedUserData[]>
   */
  static async getAllDeprecatedUsers(): Promise<DeprecatedUserData[]> {
    try {
      const { data, error } = await supabase
        .from('deprecated_user_summary_simple')
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
   * Get specific data from deprecated user (e.g., leads, assessments, etc.)
   * @param deprecatedUserId - The ID of the deprecated user
   * @param dataType - Type of data to retrieve ('leads', 'assessments', 'meetings', etc.)
   * @returns Promise<any> - The requested data
   */
  static async getDeprecatedUserDataByType(deprecatedUserId: string, dataType: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc(`get_deprecated_user_${dataType}`, { deprecated_user_uuid: deprecatedUserId });

      if (error) {
        logger.error(`Error retrieving deprecated user ${dataType}`, { deprecatedUserId, error });
        return null;
      }

      return data;
    } catch (error) {
      logger.error(`Error retrieving deprecated user ${dataType}`, { deprecatedUserId, dataType, error });
      return null;
    }
  }

  /**
   * Search deprecated users by data content
   * @param searchTerm - Term to search for in user data
   * @returns Promise<DeprecatedUserData[]>
   */
  static async searchDeprecatedUsers(searchTerm: string): Promise<DeprecatedUserData[]> {
    try {
      const { data, error } = await supabase
        .from('deprecated_users')
        .select('*')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,user_data::text.ilike.%${searchTerm}%`)
        .order('deleted_at', { ascending: false });

      if (error) {
        logger.error('Error searching deprecated users', { searchTerm, error });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error searching deprecated users', { searchTerm, error });
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

  /**
   * Get statistics about deprecated data
   * @returns Promise<object> - Statistics about deprecated users and data
   */
  static async getDeprecatedDataStats(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('deprecated_user_summary_simple')
        .select('*');

      if (error) {
        logger.error('Error retrieving deprecated data stats', { error });
        return null;
      }

      const stats: {
        totalDeprecatedUsers: number;
        totalLeads: number;
        totalAssessments: number;
        totalMeetings: number;
        totalSubscriptions: number;
        totalProducts: number;
        totalFeedback: number;
        deletionReasons: Record<string, number>;
        recentDeletions: Array<{
          id: string;
          full_name: string;
          deleted_at: string;
          reason: string;
        }>;
      } = {
        totalDeprecatedUsers: data?.length || 0,
        totalLeads: 0,
        totalAssessments: 0,
        totalMeetings: 0,
        totalSubscriptions: 0,
        totalProducts: 0,
        totalFeedback: 0,
        deletionReasons: {},
        recentDeletions: []
      };

      if (data) {
        data.forEach(user => {
          stats.totalLeads += parseInt(user.total_leads) || 0;
          stats.totalAssessments += parseInt(user.total_assessments) || 0;
          stats.totalMeetings += parseInt(user.total_meetings) || 0;
          stats.totalSubscriptions += parseInt(user.total_subscriptions) || 0;
          stats.totalProducts += parseInt(user.total_products) || 0;
          stats.totalFeedback += parseInt(user.total_feedback) || 0;

          // Count deletion reasons
          const reason = user.deletion_reason || 'unknown';
          stats.deletionReasons[reason] = (stats.deletionReasons[reason] || 0) + 1;

          // Track recent deletions
          if (new Date(user.deleted_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) { // Last 30 days
            stats.recentDeletions.push({
              id: user.id,
              full_name: user.full_name,
              deleted_at: user.deleted_at,
              reason: user.deletion_reason
            });
          }
        });
      }

      return stats;
    } catch (error) {
      logger.error('Error getting deprecated data stats', { error });
      return null;
    }
  }
}
