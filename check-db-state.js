// Check Database State
// This script checks the current state of the database tables to diagnose the issue

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseState() {
  try {
    console.log('🔍 Checking database state...\n');
    
    // Check risk_frameworks table
    console.log('📊 Checking risk_frameworks table...');
    const { data: frameworks, error: frameworksError } = await supabase
      .from('risk_frameworks')
      .select('*');
    
    if (frameworksError) {
      console.error('❌ Error reading risk_frameworks:', frameworksError.message);
    } else {
      console.log(`✅ Found ${frameworks?.length || 0} frameworks:`);
      frameworks?.forEach(f => {
        console.log(`   - ${f.code}: ${f.name} (${f.is_active ? 'active' : 'inactive'})`);
      });
    }
    
    // Check risk_framework_versions table
    console.log('\n📊 Checking risk_framework_versions table...');
    const { data: versions, error: versionsError } = await supabase
      .from('risk_framework_versions')
      .select('*');
    
    if (versionsError) {
      console.error('❌ Error reading risk_framework_versions:', versionsError.message);
    } else {
      console.log(`✅ Found ${versions?.length || 0} framework versions:`);
      versions?.forEach(v => {
        console.log(`   - Version ${v.version} for framework ${v.framework_id} (${v.is_default ? 'default' : 'not default'})`);
      });
    }
    
    // Check question_bank table
    console.log('\n📊 Checking question_bank table...');
    const { data: questions, error: questionsError } = await supabase
      .from('question_bank')
      .select('*');
    
    if (questionsError) {
      console.error('❌ Error reading question_bank:', questionsError.message);
    } else {
      console.log(`✅ Found ${questions?.length || 0} questions in question bank:`);
      if (questions?.length > 0) {
        const moduleCounts = questions.reduce((acc, q) => {
          acc[q.module] = (acc[q.module] || 0) + 1;
          return acc;
        }, {});
        Object.entries(moduleCounts).forEach(([module, count]) => {
          console.log(`   - ${module}: ${count} questions`);
        });
      }
    }
    
    // Check framework_question_map table
    console.log('\n📊 Checking framework_question_map table...');
    const { data: mappings, error: mappingsError } = await supabase
      .from('framework_question_map')
      .select('*');
    
    if (mappingsError) {
      console.error('❌ Error reading framework_question_map:', mappingsError.message);
    } else {
      console.log(`✅ Found ${mappings?.length || 0} question mappings:`);
      if (mappings?.length > 0) {
        mappings.slice(0, 5).forEach(m => {
          console.log(`   - ${m.qkey} (order: ${m.order_index}, required: ${m.required})`);
        });
        if (mappings.length > 5) {
          console.log(`   ... and ${mappings.length - 5} more`);
        }
      }
    }
    
    // Check if the specific CFA framework exists and has questions
    console.log('\n🔍 Checking CFA framework specifically...');
    const { data: cfaFramework } = await supabase
      .from('risk_frameworks')
      .select('*')
      .eq('code', 'cfa_three_pillar')
      .single();
    
    if (cfaFramework) {
      console.log(`✅ CFA framework found: ${cfaFramework.name}`);
      
      const { data: cfaVersion } = await supabase
        .from('risk_framework_versions')
        .select('*')
        .eq('framework_id', cfaFramework.id)
        .eq('is_default', true)
        .single();
      
      if (cfaVersion) {
        console.log(`✅ CFA framework version found: v${cfaVersion.version}`);
        
        const { data: cfaMappings } = await supabase
          .from('framework_question_map')
          .select(`
            *,
            question:question_bank(*)
          `)
          .eq('framework_version_id', cfaVersion.id)
          .order('order_index', { ascending: true });
        
        if (cfaMappings && cfaMappings.length > 0) {
          console.log(`✅ CFA framework has ${cfaMappings.length} questions mapped`);
          console.log('📝 First few questions:');
          cfaMappings.slice(0, 3).forEach(m => {
            console.log(`   - ${m.qkey}: ${m.question?.label || 'No label'}`);
          });
        } else {
          console.log('❌ CFA framework has no questions mapped');
        }
      } else {
        console.log('❌ CFA framework version not found');
      }
    } else {
      console.log('❌ CFA framework not found');
    }
    
    console.log('\n📋 Summary:');
    console.log(`   - Frameworks: ${frameworks?.length || 0}`);
    console.log(`   - Framework versions: ${versions?.length || 0}`);
    console.log(`   - Questions in bank: ${questions?.length || 0}`);
    console.log(`   - Question mappings: ${mappings?.length || 0}`);
    
    if ((frameworks?.length || 0) === 0) {
      console.log('\n💡 Recommendation: Run the seed script to populate the database');
    } else if ((mappings?.length || 0) === 0) {
      console.log('\n💡 Recommendation: Questions exist but are not mapped to frameworks');
    } else {
      console.log('\n✅ Database appears to be properly populated');
    }
    
  } catch (error) {
    console.error('❌ Error checking database state:', error);
  }
}

// Run the check
checkDatabaseState()
  .then(() => {
    console.log('\n🔍 Database state check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database state check failed:', error);
    process.exit(1);
  });
