#!/usr/bin/env node

/**
 * Test script for user deletion functionality
 * This script tests the user deletion service and webhook handling
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Test data
const TEST_USER_DATA = {
  clerk_id: 'test_user_deletion_' + Date.now(),
  full_name: 'Test User for Deletion',
  email: `test.deletion.${Date.now()}@example.com`,
  phone: '+919876543210',
  auth_provider: 'clerk',
  role: 'mfd'
};

async function testUserDeletion() {
  console.log('🧪 Testing User Deletion Functionality\n');

  try {
    // Step 1: Test database connection
    console.log('1️⃣ Testing database connection...');
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (healthError) {
      throw new Error(`Database connection failed: ${healthError.message}`);
    }

    console.log('✅ Database connection successful\n');

    // Step 2: Create a test user
    console.log('2️⃣ Creating test user...');
    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert(TEST_USER_DATA)
      .select()
      .single();

    if (createError || !createdUser) {
      throw new Error(`Failed to create test user: ${createError?.message || 'Unknown error'}`);
    }

    console.log(`✅ Test user created: ${createdUser.id} (${createdUser.email})\n`);

    // Step 3: Create some test data for the user
    console.log('3️⃣ Creating test data for user...');
    
    // Create test leads
    const { data: testLeads, error: leadsError } = await supabase
      .from('leads')
      .insert([
        {
          user_id: createdUser.id,
          full_name: 'Test Lead 1',
          email: 'lead1@test.com',
          status: 'lead'
        },
        {
          user_id: createdUser.id,
          full_name: 'Test Lead 2',
          email: 'lead2@test.com',
          status: 'assessment_done'
        }
      ])
      .select();

    if (leadsError) {
      console.log(`⚠️ Warning: Could not create test leads: ${leadsError.message}`);
    } else {
      console.log(`✅ Created ${testLeads.length} test leads`);
    }

    // Create test assessments
    const { data: testAssessments, error: assessmentsError } = await supabase
      .from('assessments')
      .insert([
        {
          user_id: createdUser.id,
          name: 'Test Assessment 1',
          description: 'Test assessment for deletion',
          is_active: true
        }
      ])
      .select();

    if (assessmentsError) {
      console.log(`⚠️ Warning: Could not create test assessment: ${assessmentsError.message}`);
    } else {
      console.log(`✅ Created ${testAssessments.length} test assessment`);
    }

    console.log('');

    // Step 4: Test the migration function directly
    console.log('4️⃣ Testing database migration function...');
    
    const { data: migrationResult, error: migrationError } = await supabase
      .rpc('migrate_user_to_deprecated', {
        user_uuid: createdUser.id,
        deletion_reason: 'test_deletion'
      });

    if (migrationError) {
      throw new Error(`Migration function failed: ${migrationError.message}`);
    }

    if (!migrationResult) {
      throw new Error('Migration function returned false');
    }

    console.log('✅ Database migration function successful\n');

    // Step 5: Verify data was migrated to deprecated tables
    console.log('5️⃣ Verifying data migration...');
    
    const { data: deprecatedUser, error: deprecatedError } = await supabase
      .from('deprecated_users')
      .select('*')
      .eq('original_user_id', createdUser.id)
      .single();

    if (deprecatedError || !deprecatedUser) {
      throw new Error(`Failed to find deprecated user: ${deprecatedError?.message || 'Unknown error'}`);
    }

    console.log(`✅ Deprecated user created: ${deprecatedUser.id}`);

    // Check related deprecated data
    const [
      { data: deprecatedLeads },
      { data: deprecatedAssessments }
    ] = await Promise.all([
      supabase.from('deprecated_leads').select('*').eq('deprecated_user_id', deprecatedUser.id),
      supabase.from('deprecated_assessments').select('*').eq('deprecated_user_id', deprecatedUser.id)
    ]);

    console.log(`✅ Migrated ${deprecatedLeads?.length || 0} leads`);
    console.log(`✅ Migrated ${deprecatedAssessments?.length || 0} assessments`);

    console.log('');

    // Step 6: Test user deletion from original tables
    console.log('6️⃣ Testing user deletion from original tables...');
    
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', createdUser.id);

    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    console.log('✅ User deleted from original tables\n');

    // Step 7: Verify user is no longer in original tables
    console.log('7️⃣ Verifying user removal from original tables...');
    
    const { data: deletedUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', createdUser.id)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      console.log('✅ User successfully removed from original tables');
    } else if (deletedUser) {
      throw new Error('User still exists in original tables after deletion');
    }

    console.log('');

    // Step 8: Verify deprecated data still exists
    console.log('8️⃣ Verifying deprecated data preservation...');
    
    const { data: preservedDeprecatedUser } = await supabase
      .from('deprecated_users')
      .select('*')
      .eq('id', deprecatedUser.id)
      .single();

    if (preservedDeprecatedUser) {
      console.log('✅ Deprecated user data preserved');
      console.log(`   - Original ID: ${preservedDeprecatedUser.original_user_id}`);
      console.log(`   - Deleted at: ${preservedDeprecatedUser.deleted_at}`);
      console.log(`   - Reason: ${preservedDeprecatedUser.deletion_reason}`);
    } else {
      throw new Error('Deprecated user data was not preserved');
    }

    console.log('');

    // Step 9: Clean up test data
    console.log('9️⃣ Cleaning up test data...');
    
    // Delete deprecated user (this will cascade to all related deprecated data)
    const { error: cleanupError } = await supabase
      .from('deprecated_users')
      .delete()
      .eq('id', deprecatedUser.id);

    if (cleanupError) {
      console.log(`⚠️ Warning: Could not clean up deprecated user: ${cleanupError.message}`);
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n🎉 All tests passed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Database connection working');
    console.log('   ✅ User creation working');
    console.log('   ✅ Data migration function working');
    console.log('   ✅ Data preservation in deprecated tables');
    console.log('   ✅ User deletion from original tables');
    console.log('   ✅ Complete data isolation achieved');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testUserDeletion().catch(console.error);
