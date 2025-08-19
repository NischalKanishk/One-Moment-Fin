// Simple database connection test
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://zldljufeyskfzvzftjos.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing database connection...');
console.log('🔍 URL:', supabaseUrl);
console.log('🔍 Service Key:', supabaseServiceKey ? 'Present' : 'Missing');

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  try {
    console.log('\n🔍 Testing basic connection...');
    
    // Test 1: Basic connection
    const { data: testData, error: testError } = await supabase
      .from('assessments')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Basic connection failed:', testError);
    } else {
      console.log('✅ Basic connection successful');
    }

    // Test 2: Check if risk_frameworks table exists
    console.log('\n🔍 Checking risk_frameworks table...');
    const { data: frameworks, error: frameworksError } = await supabase
      .from('risk_frameworks')
      .select('*')
      .limit(5);
    
    if (frameworksError) {
      console.error('❌ risk_frameworks table error:', frameworksError);
    } else {
      console.log(`✅ risk_frameworks table accessible, found ${frameworks?.length || 0} records`);
      if (frameworks && frameworks.length > 0) {
        console.log('📋 Sample framework:', frameworks[0]);
      }
    }

    // Test 3: Check if question_bank table exists
    console.log('\n🔍 Checking question_bank table...');
    const { data: questions, error: questionsError } = await supabase
      .from('question_bank')
      .select('*')
      .limit(5);
    
    if (questionsError) {
      console.error('❌ question_bank table error:', questionsError);
    } else {
      console.log(`✅ question_bank table accessible, found ${questions?.length || 0} records`);
      if (questions && questions.length > 0) {
        console.log('📋 Sample question:', questions[0]);
      }
    }

    // Test 4: Check if framework_question_map table exists
    console.log('\n🔍 Checking framework_question_map table...');
    const { data: mappings, error: mappingsError } = await supabase
      .from('framework_question_map')
      .select('*')
      .limit(5);
    
    if (mappingsError) {
      console.error('❌ framework_question_map table error:', mappingsError);
    } else {
      console.log(`✅ framework_question_map table accessible, found ${mappings?.length || 0} records`);
      if (mappings && mappings.length > 0) {
        console.log('📋 Sample mapping:', mappings[0]);
      }
    }

    // Test 5: Check if assessment_forms table exists
    console.log('\n🔍 Checking assessment_forms table...');
    const { data: forms, error: formsError } = await supabase
      .from('assessment_forms')
      .select('*')
      .limit(5);
    
    if (formsError) {
      console.error('❌ assessment_forms table error:', formsError);
    } else {
      console.log(`✅ assessment_forms table accessible, found ${forms?.length || 0} records`);
      if (forms && forms.length > 0) {
        console.log('📋 Sample form:', forms[0]);
      }
    }

    // Test 6: Check if assessments table exists
    console.log('\n🔍 Checking assessments table...');
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .limit(5);
    
    if (assessmentsError) {
      console.error('❌ assessments table error:', assessmentsError);
    } else {
      console.log(`✅ assessments table accessible, found ${assessments?.length || 0} records`);
      if (assessments && assessments.length > 0) {
        console.log('📋 Sample assessment:', assessments[0]);
      }
    }

    console.log('\n🔍 Database connection test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testConnection();
