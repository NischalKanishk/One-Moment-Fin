#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTablesDirectly() {
  console.log('🚀 Creating Risk Assessment Tables Directly...\n');

  try {
    // Step 1: Create question_bank table
    console.log('📋 Step 1: Creating question_bank table...');
    try {
      const { error } = await supabase
        .from('question_bank')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') { // Table doesn't exist
        console.log('   Creating question_bank table...');
        // We'll create it by inserting a dummy record and then dropping it
        // This is a workaround since we can't use CREATE TABLE directly
        console.log('   ⚠️  Cannot create table directly with Supabase client');
        console.log('   Please run the SQL migration manually in your database');
      } else {
        console.log('✅ question_bank table already exists');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking question_bank table:', error.message);
    }

    // Step 2: Create framework_question_map table
    console.log('📋 Step 2: Creating framework_question_map table...');
    try {
      const { error } = await supabase
        .from('framework_question_map')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') { // Table doesn't exist
        console.log('   ⚠️  framework_question_map table does not exist');
        console.log('   Please run the SQL migration manually in your database');
      } else {
        console.log('✅ framework_question_map table already exists');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking framework_question_map table:', error.message);
    }

    // Step 3: Create assessment_question_snapshots table
    console.log('📋 Step 3: Creating assessment_question_snapshots table...');
    try {
      const { error } = await supabase
        .from('assessment_question_snapshots')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') { // Table doesn't exist
        console.log('   ⚠️  assessment_question_snapshots table does not exist');
        console.log('   Please run the SQL migration manually in your database');
      } else {
        console.log('✅ assessment_question_snapshots table already exists');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking assessment_question_snapshots table:', error.message);
    }

    // Step 4: Create assessment_submissions table
    console.log('📋 Step 4: Creating assessment_submissions table...');
    try {
      const { error } = await supabase
        .from('assessment_submissions')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') { // Table doesn't exist
        console.log('   ⚠️  assessment_submissions table does not exist');
        console.log('   Please run the SQL migration manually in your database');
      } else {
        console.log('✅ assessment_submissions table already exists');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking assessment_submissions table:', error.message);
    }

    console.log('\n📋 Manual Steps Required:');
    console.log('Since the Supabase client cannot create tables directly, you need to:');
    console.log('');
    console.log('1. Run the SQL migration in your database:');
    console.log('   psql -h your-host -U your-user -d your-database -f risk-assessment-system-migration-supabase.sql');
    console.log('');
    console.log('2. Or run the SQL manually in your Supabase dashboard:');
    console.log('   - Go to SQL Editor in Supabase');
    console.log('   - Copy and paste the contents of risk-assessment-system-migration-supabase.sql');
    console.log('   - Execute the SQL');
    console.log('');
    console.log('3. After creating tables, run the seed data:');
    console.log('   psql -h your-host -U your-user -d your-database -f seed-risk-assessment-data.sql');
    console.log('');
    console.log('4. Restart your backend server');
    console.log('5. Try accessing the assessments page again');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTablesDirectly();
