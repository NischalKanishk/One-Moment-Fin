// Simple database connection test
// Run this with: node test-db-connection.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? 'Set' : 'NOT SET');

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabase() {
  try {
    console.log('\n📊 Testing database connectivity...');
    
    // Test 1: Check if leads table exists and has data
    console.log('\n🔍 Test 1: Checking leads table...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, full_name, email, created_at')
      .limit(5);
    
    if (leadsError) {
      console.error('❌ Leads table error:', leadsError);
    } else {
      console.log('✅ Leads table accessible:', leads?.length || 0, 'leads found');
      if (leads && leads.length > 0) {
        console.log('Sample lead:', leads[0]);
      }
    }
    
    // Test 2: Check if new schema tables exist
    console.log('\n🔍 Test 2: Checking new schema tables...');
    
    const newTables = [
      'assessment_forms',
      'assessment_form_versions', 
      'assessment_submissions',
      'lead_assessment_assignments',
      'assessment_links'
    ];
    
    for (const tableName of newTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: Table exists`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }
    
    // Test 3: Check users table
    console.log('\n🔍 Test 3: Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, clerk_id, full_name')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError);
    } else {
      console.log('✅ Users table accessible:', users?.length || 0, 'users found');
      if (users && users.length > 0) {
        console.log('Sample user:', users[0]);
      }
    }
    
    // Test 4: Check RLS status
    console.log('\n🔍 Test 4: Checking RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('get_rls_status', { table_name: 'leads' })
      .catch(() => ({ data: null, error: 'Function not available' }));
    
    if (rlsError) {
      console.log('ℹ️ RLS status check failed (normal):', rlsError);
    } else {
      console.log('✅ RLS status:', rlsStatus);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDatabase();
