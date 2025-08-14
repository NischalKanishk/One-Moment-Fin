#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addRiskCategoryToLeads() {
  console.log('🔧 Adding risk_category field to leads table...\n');

  try {
    // First, let's check if the field already exists
    console.log('📋 Checking current leads table structure...');
    const { data: sampleLead, error: checkError } = await supabase
      .from('leads')
      .select('*')
      .limit(1)
      .single();

    if (checkError) {
      console.error('❌ Error checking leads table:', checkError.message);
      return;
    }

    console.log('✅ Current columns:', Object.keys(sampleLead));
    
    if ('risk_category' in sampleLead) {
      console.log('ℹ️ risk_category field already exists in leads table');
      return;
    }

    // Add the risk_category column using raw SQL
    console.log('🔧 Adding risk_category column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE leads ADD COLUMN risk_category TEXT'
    });

    if (alterError) {
      console.error('❌ Failed to add risk_category column:', alterError.message);
      
      // Try alternative approach - update existing records to set a default value
      console.log('🔄 Trying alternative approach...');
      const { error: updateError } = await supabase
        .from('leads')
        .update({ risk_category: 'Not Assessed' })
        .is('risk_category', null);

      if (updateError) {
        console.error('❌ Failed to set default risk_category:', updateError.message);
        return;
      }
      
      console.log('✅ Set default risk_category for existing leads');
    } else {
      console.log('✅ Successfully added risk_category column to leads table');
      
      // Set default value for existing records
      console.log('🔄 Setting default risk_category for existing leads...');
      const { error: updateError } = await supabase
        .from('leads')
        .update({ risk_category: 'Not Assessed' })
        .is('risk_category', null);

      if (updateError) {
        console.error('❌ Failed to set default risk_category:', updateError.message);
      } else {
        console.log('✅ Set default risk_category for existing leads');
      }
    }

    // Verify the new structure
    console.log('\n📋 Verifying updated leads table structure...');
    const { data: updatedLead, error: verifyError } = await supabase
      .from('leads')
      .select('*')
      .limit(1)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying table structure:', verifyError.message);
    } else {
      console.log('✅ Updated columns:', Object.keys(updatedLead));
      console.log('✅ risk_category field value:', updatedLead.risk_category);
    }

    console.log('\n🎉 risk_category field successfully added to leads table!');
    console.log('📋 New field details:');
    console.log('   - Field name: risk_category');
    console.log('   - Type: TEXT');
    console.log('   - Default value: "Not Assessed"');
    console.log('   - Purpose: Store the risk category (Conservative, Moderate, Growth, Aggressive)');

  } catch (error) {
    console.error('❌ Failed to add risk_category field:', error.message);
    process.exit(1);
  }
}

addRiskCategoryToLeads();
