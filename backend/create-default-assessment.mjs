import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createDefaultAssessment() {
  try {
    console.log('🔍 Creating default assessment for user...\n');
    
    // Get the first user (for testing purposes)
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
    
    // Check if user already has an assessment
    const { data: existingAssessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', user.id);
    
    if (assessmentsError) {
      console.error('❌ Error checking assessments:', assessmentsError.message);
      return;
    }
    
    if (existingAssessments && existingAssessments.length > 0) {
      console.log(`✅ User already has ${existingAssessments.length} assessment(s):`);
      existingAssessments.forEach(assessment => {
        console.log(`  - ${assessment.title} (${assessment.id}) - Default: ${assessment.is_default}`);
      });
      return;
    }
    
    // Get default framework version
    const { data: defaultFramework, error: frameworkError } = await supabase
      .from('risk_framework_versions')
      .select('*')
      .eq('is_default', true)
      .single();
    
    if (frameworkError) {
      console.error('❌ Error fetching default framework:', frameworkError.message);
      return;
    }
    
    if (!defaultFramework) {
      console.log('❌ No default framework found');
      return;
    }
    
    console.log(`📋 Using default framework: ${defaultFramework.id}`);
    
    // Create default assessment
    const { data: assessment, error: createError } = await supabase
      .from('assessments')
      .insert({
        user_id: user.id,
        title: 'Default Assessment',
        slug: `default-${user.id}-${Date.now()}`,
        framework_version_id: defaultFramework.id,
        is_default: true,
        is_published: true
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating assessment:', createError.message);
      return;
    }
    
    console.log(`✅ Default assessment created successfully: ${assessment.id}`);
    
    // Get framework details
    const { data: framework, error: frameworkDetailsError } = await supabase
      .from('risk_frameworks')
      .select('*')
      .eq('id', defaultFramework.framework_id)
      .single();
    
    if (frameworkDetailsError) {
      console.error('❌ Error fetching framework details:', frameworkDetailsError.message);
    } else {
      console.log(`📋 Framework: ${framework.name} (${framework.engine})`);
    }
    
  } catch (error) {
    console.error('Error creating default assessment:', error);
  }
}

createDefaultAssessment();
