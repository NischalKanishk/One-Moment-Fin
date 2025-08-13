import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...\n');
    
    // Check if risk_frameworks table exists
    try {
      const { data: frameworks, error: frameworksError } = await supabase
        .from('risk_frameworks')
        .select('count')
        .limit(1);
      
      if (frameworksError) {
        console.log('❌ risk_frameworks table does not exist');
        console.log('   Error:', frameworksError.message);
      } else {
        console.log('✅ risk_frameworks table exists');
      }
    } catch (error) {
      console.log('❌ risk_frameworks table does not exist');
    }
    
    // Check if risk_framework_versions table exists
    try {
      const { data: versions, error: versionsError } = await supabase
        .from('risk_framework_versions')
        .select('count')
        .limit(1);
      
      if (versionsError) {
        console.log('❌ risk_framework_versions table does not exist');
        console.log('   Error:', versionsError.message);
      } else {
        console.log('✅ risk_framework_versions table exists');
      }
    } catch (error) {
      console.log('❌ risk_framework_versions table does not exist');
    }
    
    // Check if assessments table exists
    try {
      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessments')
        .select('count')
        .limit(1);
      
      if (assessmentsError) {
        console.log('❌ assessments table does not exist');
        console.log('   Error:', assessmentsError.message);
      } else {
        console.log('✅ assessments table exists');
      }
    } catch (error) {
      console.log('❌ assessments table does not exist');
    }
    
    // Check if users table exists
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (usersError) {
        console.log('❌ users table does not exist');
        console.log('   Error:', usersError.message);
      } else {
        console.log('✅ users table exists');
      }
    } catch (error) {
      console.log('❌ users table does not exist');
    }
    
    console.log('\n📋 Summary:');
    console.log('The risk assessment system requires the following tables:');
    console.log('- risk_frameworks');
    console.log('- risk_framework_versions');
    console.log('- assessments');
    console.log('- users (already exists)');
    
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables();
