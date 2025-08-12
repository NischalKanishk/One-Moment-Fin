#!/usr/bin/env node

/**
 * Test script for user deletion via API endpoint
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

async function testUserDeletionAPI() {
  console.log('🧪 Testing User Deletion via API\n');

  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Step 1: Create a test user
    console.log('1️⃣ Creating test user...');
    const testUserData = {
      clerk_id: 'test_user_deletion_api_' + Date.now(),
      full_name: 'Test User for API Deletion',
      email: `test.api.deletion.${Date.now()}@example.com`,
      phone: `+9198765432${Date.now().toString().slice(-4)}`,
      auth_provider: 'clerk',
      role: 'mfd'
    };

    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert(testUserData)
      .select()
      .single();

    if (createError || !createdUser) {
      throw new Error(`Failed to create test user: ${createError?.message || 'Unknown error'}`);
    }

    console.log(`✅ Test user created: ${createdUser.id} (${createdUser.email})\n`);

    // Step 2: Create some test data for the user
    console.log('2️⃣ Creating test data for user...');
    
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

    // Create test meetings
    const { data: testMeetings, error: meetingsError } = await supabase
      .from('meetings')
      .insert([
        {
          user_id: createdUser.id,
          lead_id: testLeads?.[0]?.id || null,
          title: 'Test Meeting 1',
          description: 'Test meeting for API deletion',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          status: 'scheduled'
        }
      ])
      .select();

    if (meetingsError) {
      console.log(`⚠️ Warning: Could not create test meetings: ${meetingsError.message}`);
    } else {
      console.log(`✅ Created ${testMeetings.length} test meetings`);
    }

    console.log('');

    // Step 3: Test the migration function directly
    console.log('3️⃣ Testing migration function directly...');
    
    try {
      const { data: migrationResult, error: migrationError } = await supabase
        .rpc('migrate_user_to_deprecated_simple', {
          user_uuid: createdUser.id,
          deletion_reason: 'test_api_deletion'
        });

      if (migrationError) {
        console.log(`❌ Migration function failed: ${migrationError.message}`);
        
        // If migration fails, let's try to understand why
        console.log('\n🔍 Debugging migration failure...');
        
        // Check if the function exists and what it's trying to do
        const { data: funcInfo, error: funcError } = await supabase
          .rpc('migrate_user_to_deprecated_simple', {
            user_uuid: createdUser.id,
            deletion_reason: 'test'
          });
        
        console.log('Function debug result:', { funcInfo, funcError });
        
      } else {
        console.log('✅ Migration function executed successfully');
        console.log('Migration result:', migrationResult);
      }
    } catch (migrationException) {
      console.log(`❌ Migration function exception: ${migrationException.message}`);
    }

    console.log('');

    // Step 4: Test user deletion from database directly
    console.log('4️⃣ Testing direct user deletion from database...');
    
    try {
      // First, check if the user exists in deprecated_users
      const { data: deprecatedUser, error: deprecatedError } = await supabase
        .from('deprecated_users')
        .select('*')
        .eq('original_user_id', createdUser.id)
        .single();

      if (deprecatedError && deprecatedError.code === 'PGRST116') {
        console.log('ℹ️ User not yet migrated to deprecated_users table');
      } else if (deprecatedUser) {
        console.log('✅ User data migrated to deprecated_users table');
        console.log(`   - Deprecated user ID: ${deprecatedUser.id}`);
        console.log(`   - Migration status: ${deprecatedUser.data_migration_status}`);
      } else {
        console.log('⚠️ Unexpected result from deprecated_users query:', { deprecatedUser, deprecatedError });
      }

      // Try to delete the user directly
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', createdUser.id);

      if (deleteError) {
        console.log(`❌ Direct deletion failed: ${deleteError.message}`);
      } else {
        console.log('✅ User deleted directly from database');
      }

    } catch (deleteException) {
      console.log(`❌ Deletion exception: ${deleteException.message}`);
    }

    console.log('\n✨ User deletion API test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUserDeletionAPI();
