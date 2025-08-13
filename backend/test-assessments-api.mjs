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

async function testAssessmentsAPI() {
  console.log('🧪 Testing Assessments API...\n');

  try {
    // 1. Check if users exist
    console.log('📋 Step 1: Checking users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, clerk_id, email')
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.full_name} (${user.clerk_id}) - ${user.email}`);
    });

    if (users.length === 0) {
      console.log('❌ No users found. Cannot test assessments API.');
      return;
    }

    const testUser = users[0];
    console.log(`\n👤 Using test user: ${testUser.full_name} (${testUser.id})`);

    // 2. Check if frameworks exist
    console.log('\n📋 Step 2: Checking frameworks...');
    const { data: frameworks, error: frameworksError } = await supabase
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

    if (frameworksError) {
      console.error('❌ Error fetching frameworks:', frameworksError);
      return;
    }

    console.log(`✅ Found ${frameworks.length} frameworks:`);
    frameworks.forEach(framework => {
      console.log(`   - ${framework.name} (${framework.engine})`);
      framework.risk_framework_versions.forEach(version => {
        console.log(`     v${version.version} (default: ${version.is_default})`);
      });
    });

    // 3. Check if assessments exist for the test user
    console.log('\n📋 Step 3: Checking assessments...');
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', testUser.id);

    if (assessmentsError) {
      console.error('❌ Error fetching assessments:', assessmentsError);
      return;
    }

    console.log(`✅ Found ${assessments.length} assessments for user:`);
    assessments.forEach(assessment => {
      console.log(`   - ${assessment.title} (${assessment.slug}) - Default: ${assessment.is_default}`);
    });

    // 4. Test the AssessmentService.getFrameworks method logic
    console.log('\n📋 Step 4: Testing framework query logic...');
    const { data: testFrameworks, error: testFrameworksError } = await supabase
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

    if (testFrameworksError) {
      console.error('❌ Error in framework query:', testFrameworksError);
      return;
    }

    console.log('✅ Framework query successful');
    console.log(`   Found ${testFrameworks.length} frameworks with versions`);

    // 5. Test the AssessmentService.getUserAssessments method logic
    console.log('\n📋 Step 5: Testing user assessments query logic...');
    const { data: testAssessments, error: testAssessmentsError } = await supabase
      .from('assessments')
      .select(`
        *,
        risk_framework_versions!inner (
          id,
          version,
          is_default
        )
      `)
      .eq('user_id', testUser.id);

    if (testAssessmentsError) {
      console.error('❌ Error in user assessments query:', testAssessmentsError);
      return;
    }

    console.log('✅ User assessments query successful');
    console.log(`   Found ${testAssessments.length} assessments with framework data`);

    console.log('\n✅ All tests passed! The API should work correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAssessmentsAPI();
