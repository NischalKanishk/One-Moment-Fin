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

async function fixMissingMappings() {
  console.log('🔧 Fixing Missing Framework Question Mappings...\n');

  try {
    // Get all framework versions
    const { data: frameworkVersions, error: fvError } = await supabase
      .from('risk_framework_versions')
      .select('id, version, framework_id')
      .order('version');

    if (fvError) {
      console.error('❌ Error fetching framework versions:', fvError);
      return;
    }

    // Get all frameworks
    const { data: frameworks, error: fError } = await supabase
      .from('risk_frameworks')
      .select('id, code, name')
      .order('code');

    if (fError) {
      console.error('❌ Error fetching frameworks:', fError);
      return;
    }

    console.log(`📊 Found ${frameworks.length} frameworks and ${frameworkVersions.length} versions`);

    // Define the mappings that should exist
    const requiredMappings = {
      'dsp_style_10q_v1': [
        { qkey: 'dependents', required: true, order_index: 1 },
        { qkey: 'income_bracket', required: true, order_index: 2 },
        { qkey: 'income_security', required: true, order_index: 3 },
        { qkey: 'market_knowledge', required: true, order_index: 4 },
        { qkey: 'emi_ratio', required: true, order_index: 5 },
        { qkey: 'gain_loss_tradeoff', required: true, order_index: 6 },
        { qkey: 'drawdown_reaction', required: true, order_index: 7 },
        { qkey: 'education', required: true, order_index: 8 },
        { qkey: 'age', required: true, order_index: 9 },
        { qkey: 'liquidity_withdrawal_2y', required: true, order_index: 10 }
      ],
      'nippon_style_v1': [
        { qkey: 'horizon', required: true, order_index: 1 },
        { qkey: 'age', required: true, order_index: 2 },
        { qkey: 'market_knowledge', required: true, order_index: 3 },
        { qkey: 'income_security', required: true, order_index: 4 }
      ]
    };

    // Check and fix each framework
    for (const framework of frameworks) {
      if (requiredMappings[framework.code]) {
        console.log(`\n📋 Checking ${framework.name} (${framework.code})...`);
        
        // Find the version for this framework
        const version = frameworkVersions.find(v => v.framework_id === framework.id);
        if (!version) {
          console.log(`   ⚠️  No version found for ${framework.name}`);
          continue;
        }

        // Check existing mappings
        const { data: existingMappings, error: mError } = await supabase
          .from('framework_question_map')
          .select('id, qkey')
          .eq('framework_version_id', version.id);

        if (mError) {
          console.log(`   ❌ Error checking mappings: ${mError.message}`);
          continue;
        }

        const existingQKeys = existingMappings.map(m => m.qkey);
        const requiredQKeys = requiredMappings[framework.code].map(m => m.qkey);
        const missingQKeys = requiredQKeys.filter(qkey => !existingQKeys.includes(qkey));

        if (missingQKeys.length === 0) {
          console.log(`   ✅ All ${existingMappings.length} mappings exist`);
        } else {
          console.log(`   ⚠️  Missing ${missingQKeys.length} mappings: ${missingQKeys.join(', ')}`);
          
          // Add missing mappings
          const mappingsToAdd = requiredMappings[framework.code]
            .filter(m => missingQKeys.includes(m.qkey))
            .map(m => ({
              framework_version_id: version.id,
              qkey: m.qkey,
              required: m.required,
              order_index: m.order_index
            }));

          console.log(`   🔧 Adding ${mappingsToAdd.length} missing mappings...`);
          
          const { error: insertError } = await supabase
            .from('framework_question_map')
            .insert(mappingsToAdd);

          if (insertError) {
            console.log(`   ❌ Error adding mappings: ${insertError.message}`);
          } else {
            console.log(`   ✅ Successfully added ${mappingsToAdd.length} mappings`);
          }
        }
      }
    }

    console.log('\n✅ Framework mappings check completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Try accessing the assessments page again');
    console.log('3. The 500 error should be resolved');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixMissingMappings();
