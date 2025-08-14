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

async function fixFinalOrder() {
  console.log('🔧 Fixing final question order...\n');

  try {
    const frameworkVersionId = '18ba02ab-f245-4367-b1d9-0fcc75ba5bc1';
    
    // Get all questions for this framework version
    const { data: questions, error: questionsError } = await supabase
      .from('framework_question_map')
      .select('id, qkey, order_index')
      .eq('framework_version_id', frameworkVersionId)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('❌ Error fetching questions:', questionsError.message);
      return;
    }

    console.log('📋 Current questions:');
    questions?.forEach(q => console.log(`   ${q.order_index}. ${q.qkey}`));

    // Fix the order: compulsory questions first, then existing questions
    const compulsoryQkeys = ['investment_goals', 'investment_horizon', 'monthly_investment'];
    
    console.log('\n🔧 Setting correct order_index values...');

    // Set compulsory questions to order 1, 2, 3
    for (let i = 0; i < compulsoryQkeys.length; i++) {
      const qkey = compulsoryQkeys[i];
      const question = questions?.find(q => q.qkey === qkey);
      
      if (question) {
        const { error: updateError } = await supabase
          .from('framework_question_map')
          .update({ order_index: i + 1 })
          .eq('id', question.id);

        if (updateError) {
          console.error(`❌ Failed to update ${qkey}:`, updateError.message);
        } else {
          console.log(`✅ Set ${qkey} to order ${i + 1}`);
        }
      }
    }

    // Set existing questions to order 4, 5, 6, etc.
    const existingQuestions = questions?.filter(q => !compulsoryQkeys.includes(q.qkey)) || [];
    
    for (let i = 0; i < existingQuestions.length; i++) {
      const question = existingQuestions[i];
      const newOrderIndex = i + 4; // Start from 4
      
      const { error: updateError } = await supabase
        .from('framework_question_map')
        .update({ order_index: newOrderIndex })
        .eq('id', question.id);

      if (updateError) {
        console.error(`❌ Failed to update ${question.qkey}:`, updateError.message);
      } else {
        console.log(`✅ Set ${question.qkey} to order ${newOrderIndex}`);
      }
    }

    console.log('\n🎉 Order fixed! New order should be:');
    console.log('   1. investment_goals');
    console.log('   2. investment_horizon');
    console.log('   3. monthly_investment');
    console.log('   4. emi_ratio');
    console.log('   5. goal_required_return');
    console.log('   6. liquidity_withdrawal_2y');
    console.log('   7. age');
    console.log('   8. drawdown_reaction');
    console.log('   9. market_knowledge');
    console.log('   10. gain_loss_tradeoff');
    console.log('   11. income_security');

  } catch (error) {
    console.error('❌ Failed to fix question order:', error.message);
    process.exit(1);
  }
}

fixFinalOrder();
