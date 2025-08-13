import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAuth() {
  try {
    console.log('🔍 Testing authentication flow...\n');
    
    // Get a user from the database
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    const user = users[0];
    console.log(`📋 User found: ${user.full_name} (${user.clerk_id})`);
    
    // Check if user has assessments
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', user.id);
    
    if (assessmentsError) {
      console.error('❌ Error fetching assessments:', assessmentsError.message);
      return;
    }
    
    console.log(`📊 User has ${assessments?.length || 0} assessment(s):`);
    if (assessments && assessments.length > 0) {
      assessments.forEach(assessment => {
        console.log(`  - ${assessment.title} (${assessment.id}) - Default: ${assessment.is_default}`);
      });
    }
    
    // Check if user has framework versions
    const { data: frameworks, error: frameworksError } = await supabase
      .from('risk_frameworks')
      .select('*');
    
    if (frameworksError) {
      console.error('❌ Error fetching frameworks:', frameworksError.message);
      return;
    }
    
    console.log(`\n📊 Found ${frameworks?.length || 0} frameworks:`);
    if (frameworks && frameworks.length > 0) {
      frameworks.forEach(framework => {
        console.log(`  - ${framework.name} (${framework.code}) - ${framework.engine}`);
      });
    }
    
    // Check framework versions
    const { data: versions, error: versionsError } = await supabase
      .from('risk_framework_versions')
      .select('*');
    
    if (versionsError) {
      console.error('❌ Error fetching versions:', versionsError.message);
      return;
    }
    
    console.log(`\n📊 Found ${versions?.length || 0} framework versions:`);
    if (versions && versions.length > 0) {
      versions.forEach(version => {
        console.log(`  - Version ${version.version} (${version.id}) - Default: ${version.is_default}`);
      });
    }
    
    console.log('\n✅ Database structure and data look good!');
    console.log('The issue might be in the frontend authentication or API calls.');
    
  } catch (error) {
    console.error('Error testing auth:', error);
  }
}

testAuth();
