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

async function testAssessmentsEndpoint() {
  console.log('🧪 Testing Assessments Endpoint Logic...\n');

  try {
    // Get a test user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, clerk_id')
      .limit(1);

    if (usersError || !users.length) {
      console.error('❌ No users found');
      return;
    }

    const testUser = users[0];
    console.log(`👤 Using test user: ${testUser.full_name} (${testUser.id})`);

    // Test the exact query from getUserAssessments
    console.log('\n📋 Testing getUserAssessments query...');
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', testUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error in getUserAssessments query:', error);
        return;
      }

      console.log(`✅ getUserAssessments query successful`);
      console.log(`   Found ${data.length} assessments:`);
      data.forEach(assessment => {
        console.log(`   - ${assessment.title} (${assessment.slug}) - Default: ${assessment.is_default}`);
      });
    } catch (error) {
      console.error('❌ Exception in getUserAssessments query:', error);
      return;
    }

    // Test the exact query from getFrameworks
    console.log('\n📋 Testing getFrameworks query...');
    try {
      const { data, error } = await supabase
        .from('risk_frameworks')
        .select(`
          *,
          risk_framework_versions (
            id,
            version,
            is_default,
            created_at
          )
        `)
        .order('name');

      if (error) {
        console.error('❌ Error in getFrameworks query:', error);
        return;
      }

      console.log(`✅ getFrameworks query successful`);
      console.log(`   Found ${data.length} frameworks:`);
      data.forEach(framework => {
        console.log(`   - ${framework.name} (${framework.engine})`);
        framework.risk_framework_versions.forEach(version => {
          console.log(`     v${version.version} (default: ${version.is_default})`);
        });
      });
    } catch (error) {
      console.error('❌ Exception in getFrameworks query:', error);
      return;
    }

    // Test the exact query from getFrameworkQuestions
    console.log('\n📋 Testing getFrameworkQuestions query...');
    try {
      // Get a framework version ID
      const { data: frameworkVersions, error: fvError } = await supabase
        .from('risk_framework_versions')
        .select('id')
        .limit(1);

      if (fvError || !frameworkVersions.length) {
        console.error('❌ No framework versions found');
        return;
      }

      const frameworkVersionId = frameworkVersions[0].id;
      console.log(`   Using framework version: ${frameworkVersionId}`);

      const { data, error } = await supabase
        .from('framework_question_map')
        .select(`
          *,
          question_bank (*)
        `)
        .eq('framework_version_id', frameworkVersionId)
        .order('order_index');

      if (error) {
        console.error('❌ Error in getFrameworkQuestions query:', error);
        return;
      }

      console.log(`✅ getFrameworkQuestions query successful`);
      console.log(`   Found ${data.length} questions:`);
      data.forEach(q => {
        console.log(`   - ${q.qkey}: ${q.question_bank?.label || 'No label'}`);
      });
    } catch (error) {
      console.error('❌ Exception in getFrameworkQuestions query:', error);
      return;
    }

    console.log('\n✅ All queries successful! The API should work correctly.');
    console.log('\n📋 If you\'re still getting 500 errors, check:');
    console.log('1. Backend server logs for specific error messages');
    console.log('2. Authentication middleware for user ID extraction issues');
    console.log('3. Database connection and permissions');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAssessmentsEndpoint();
