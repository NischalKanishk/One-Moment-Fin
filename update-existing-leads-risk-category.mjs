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

async function updateExistingLeadsRiskCategory() {
  console.log('🔧 Updating existing leads with correct risk_category values...\n');
  
  try {
    // Get all leads that have risk_bucket but risk_category is "Not Assessed"
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, full_name, risk_category, risk_bucket')
      .eq('risk_category', 'Not Assessed')
      .not('risk_bucket', 'is', null);

    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError.message);
      return;
    }

    console.log(`📋 Found ${leads?.length || 0} leads to update`);

    if (!leads || leads.length === 0) {
      console.log('✅ No leads need updating');
      return;
    }

    // Update each lead
    let updatedCount = 0;
    for (const lead of leads) {
      if (lead.risk_bucket) {
        const { error: updateError } = await supabase
          .from('leads')
          .update({ risk_category: lead.risk_bucket })
          .eq('id', lead.id);

        if (updateError) {
          console.error(`❌ Failed to update ${lead.full_name}:`, updateError.message);
        } else {
          console.log(`✅ Updated ${lead.full_name}: ${lead.risk_bucket}`);
          updatedCount++;
        }
      }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} leads`);

    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const { data: updatedLeads, error: verifyError } = await supabase
      .from('leads')
      .select('full_name, risk_category, risk_bucket')
      .order('created_at', { ascending: false })
      .limit(10);

    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError.message);
    } else {
      console.log('📋 Sample updated leads:');
      updatedLeads?.forEach((lead, i) => {
        console.log(`${i + 1}. ${lead.full_name}: risk_category="${lead.risk_category}", risk_bucket="${lead.risk_bucket}"`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to update leads:', error.message);
    process.exit(1);
  }
}

updateExistingLeadsRiskCategory();
