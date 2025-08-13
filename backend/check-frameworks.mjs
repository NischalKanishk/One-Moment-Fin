import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFrameworks() {
  try {
    console.log('🔍 Checking risk frameworks data...\n');
    
    // Check risk_frameworks table
    const { data: frameworks, error: frameworksError } = await supabase
      .from('risk_frameworks')
      .select('*');
    
    if (frameworksError) {
      console.log('❌ Error fetching frameworks:', frameworksError.message);
      return;
    }
    
    console.log(`📊 Found ${frameworks?.length || 0} frameworks:`);
    if (frameworks && frameworks.length > 0) {
      frameworks.forEach(framework => {
        console.log(`  - ${framework.name} (${framework.code}) - ${framework.engine}`);
      });
    } else {
      console.log('  No frameworks found');
    }
    
    // Check risk_framework_versions table
    const { data: versions, error: versionsError } = await supabase
      .from('risk_framework_versions')
      .select('*');
    
    if (versionsError) {
      console.log('❌ Error fetching versions:', versionsError.message);
      return;
    }
    
    console.log(`\n📊 Found ${versions?.length || 0} framework versions:`);
    if (versions && versions.length > 0) {
      versions.forEach(version => {
        console.log(`  - Version ${version.version} (${version.id}) - Default: ${version.is_default}`);
      });
    } else {
      console.log('  No versions found');
    }
    
    // Check assessments table
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*');
    
    if (assessmentsError) {
      console.log('❌ Error fetching assessments:', assessmentsError.message);
      return;
    }
    
    console.log(`\n📊 Found ${assessments?.length || 0} assessments:`);
    if (assessments && assessments.length > 0) {
      assessments.forEach(assessment => {
        console.log(`  - ${assessment.title} (${assessment.id}) - Default: ${assessment.is_default}`);
      });
    } else {
      console.log('  No assessments found');
    }
    
  } catch (error) {
    console.error('Error checking frameworks:', error);
  }
}

checkFrameworks();
