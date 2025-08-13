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

async function checkFrameworkMappings() {
  console.log('🔍 Checking Framework Question Mappings...\n');

  try {
    // Get all framework versions
    const { data: frameworkVersions, error: fvError } = await supabase
      .from('risk_framework_versions')
      .select('id, version, is_default, framework_id')
      .order('is_default', { ascending: false });

    if (fvError) {
      console.error('❌ Error fetching framework versions:', fvError);
      return;
    }

    console.log(`📊 Found ${frameworkVersions.length} framework versions:`);
    
    for (const version of frameworkVersions) {
      console.log(`\n📋 Framework Version ${version.version} (${version.id})`);
      console.log(`   Default: ${version.is_default}`);
      
      // Get framework name
      const { data: framework, error: fError } = await supabase
        .from('risk_frameworks')
        .select('name, code, engine')
        .eq('id', version.framework_id)
        .single();
      
      if (framework) {
        console.log(`   Framework: ${framework.name} (${framework.code}) - ${framework.engine}`);
      }

      // Check question mappings
      const { data: mappings, error: mError } = await supabase
        .from('framework_question_map')
        .select('id, qkey, required, order_index')
        .eq('framework_version_id', version.id)
        .order('order_index');

      if (mError) {
        console.log(`   ❌ Error fetching mappings: ${mError.message}`);
      } else {
        console.log(`   📝 Question mappings: ${mappings.length}`);
        if (mappings.length > 0) {
          mappings.forEach(m => {
            console.log(`      - ${m.qkey} (required: ${m.required}, order: ${m.order_index})`);
          });
        } else {
          console.log(`      ⚠️  No question mappings found!`);
        }
      }

      // Check if this could cause issues
      if (mappings && mappings.length === 0) {
        console.log(`   🚨 WARNING: This framework version has no questions mapped!`);
        console.log(`      This could cause the 500 error when trying to generate snapshots.`);
      }
    }

    // Check which framework version is used by assessments
    console.log('\n📋 Checking Assessment Framework Usage...');
    const { data: assessments, error: aError } = await supabase
      .from('assessments')
      .select('id, title, framework_version_id, is_default')
      .order('is_default', { ascending: false });

    if (aError) {
      console.error('❌ Error fetching assessments:', aError);
    } else {
      console.log(`📊 Found ${assessments.length} assessments:`);
      assessments.forEach(assessment => {
        console.log(`   - ${assessment.title} (${assessment.is_default ? 'DEFAULT' : 'Custom'})`);
        console.log(`     Framework Version: ${assessment.framework_version_id}`);
        
        // Check if this framework version has questions
        const version = frameworkVersions.find(v => v.id === assessment.framework_version_id);
        if (version) {
          const { data: questionMappings } = await supabase
            .from('framework_question_map')
            .select('id')
            .eq('framework_version_id', assessment.framework_version_id);
          
          if (questionMappings && questionMappings.length === 0) {
            console.log(`     🚨 WARNING: This assessment uses a framework with no questions!`);
            console.log(`        This will cause errors when trying to generate snapshots.`);
          } else {
            console.log(`     ✅ Framework has ${questionMappings?.length || 0} questions`);
          }
        }
      });
    }

    console.log('\n📋 Summary:');
    console.log('If any framework versions have 0 question mappings, you need to:');
    console.log('1. Run the seed data script: seed-risk-assessment-data.sql');
    console.log('2. Or manually create framework_question_map entries');
    console.log('3. Restart your backend server');

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkFrameworkMappings();
