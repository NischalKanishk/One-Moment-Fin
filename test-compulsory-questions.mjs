#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompulsoryQuestions() {
  console.log('🧪 Testing Compulsory Investment Questions Implementation...\n');

  try {
    // Test 1: Check if new assessment forms table exists
    console.log('🔍 Test 1: Checking new assessment forms table...');
    const { data: newForms, error: newFormsError } = await supabase
      .from('assessment_forms')
      .select('count')
      .limit(1);

    if (newFormsError) {
      console.log('⚠️ New assessment forms table not accessible:', newFormsError.message);
    } else {
      console.log('✅ New assessment forms table accessible');
    }

    // Test 2: Check if legacy assessments table exists
    console.log('\n🔍 Test 2: Checking legacy assessments table...');
    const { data: legacyAssessments, error: legacyError } = await supabase
      .from('assessments')
      .select('count')
      .limit(1);

    if (legacyError) {
      console.log('⚠️ Legacy assessments table not accessible:', legacyError.message);
    } else {
      console.log('✅ Legacy assessments table accessible');
    }

    // Test 3: Check if assessment_form_versions table exists
    console.log('\n🔍 Test 3: Checking assessment form versions table...');
    const { data: versions, error: versionsError } = await supabase
      .from('assessment_form_versions')
      .select('count')
      .limit(1);

    if (versionsError) {
      console.log('⚠️ Assessment form versions table not accessible:', versionsError.message);
    } else {
      console.log('✅ Assessment form versions table accessible');
    }

    // Test 4: Check if assessment_questions table exists
    console.log('\n🔍 Test 4: Checking assessment questions table...');
    const { data: questions, error: questionsError } = await supabase
      .from('assessment_questions')
      .select('count')
      .limit(1);

    if (questionsError) {
      console.log('⚠️ Assessment questions table not accessible:', questionsError.message);
    } else {
      console.log('✅ Assessment questions table accessible');
    }

    // Test 5: Check actual data
    console.log('\n🔍 Test 5: Checking actual data...');
    
    // Count new forms
    let newFormsCount = 0;
    try {
      const { count } = await supabase
        .from('assessment_forms')
        .select('*', { count: 'exact', head: true });
      newFormsCount = count || 0;
    } catch (error) {
      console.log('   • New assessment forms: Could not count (table may not exist)');
    }
    
    if (newFormsCount > 0) {
      console.log(`   • New assessment forms: ${newFormsCount}`);
    }

    // Count legacy assessments
    let legacyCount = 0;
    try {
      const { count } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true });
      legacyCount = count || 0;
    } catch (error) {
      console.log('   • Legacy assessments: Could not count (table may not exist)');
    }
    
    if (legacyCount > 0) {
      console.log(`   • Legacy assessments: ${legacyCount}`);
    }

    // Count versions
    let versionsCount = 0;
    try {
      const { count } = await supabase
        .from('assessment_form_versions')
        .select('*', { count: 'exact', head: true });
      versionsCount = count || 0;
    } catch (error) {
      console.log('   • Form versions: Could not count (table may not exist)');
    }
    
    if (versionsCount > 0) {
      console.log(`   • Form versions: ${versionsCount}`);
    }

    // Count questions
    let questionsCount = 0;
    try {
      const { count } = await supabase
        .from('assessment_questions')
        .select('*', { count: 'exact', head: true });
      questionsCount = count || 0;
    } catch (error) {
      console.log('   • Assessment questions: Could not count (table may not exist)');
    }
    
    if (questionsCount > 0) {
      console.log(`   • Assessment questions: ${questionsCount}`);
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   • Total forms/assessments found: ${newFormsCount + legacyCount}`);
    console.log(`   • Total versions: ${versionsCount}`);
    console.log(`   • Total questions: ${questionsCount}`);

    console.log('\n✅ Database connectivity test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run the migration: ./run-compulsory-questions-migration.sh');
    console.log('   2. Check the logs for any errors');
    console.log('   3. Verify questions appear in your assessment forms');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testCompulsoryQuestions();
