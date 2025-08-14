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

async function addCompulsoryQuestionsBack() {
  console.log('🔧 Adding Compulsory Investment Questions Back to Working System...\n');

  try {
    // Get the working framework version ID
    const frameworkVersionId = '18ba02ab-f245-4367-b1d9-0fcc75ba5bc1';
    console.log('📋 Framework version ID:', frameworkVersionId);

    // 1. Add the 3 compulsory questions to question_bank
    console.log('\n📝 Adding questions to question_bank...');
    
    const compulsoryQuestions = [
      {
        qkey: 'investment_goals',
        label: 'What are your goals?',
        qtype: 'multi',
        options: ['Buying a Home', 'Retirement Planning', 'Investment Growth', 'Health and Wellness', 'Building an Emergency Fund'],
        module: 'investment_goals'
      },
      {
        qkey: 'investment_horizon',
        label: 'What is your Investment Horizon?',
        qtype: 'single',
        options: ['Short term (0-1yr)', 'Medium Term (2-5yr)', 'Long term (5-10yr)'],
        module: 'investment_horizon'
      },
      {
        qkey: 'monthly_investment',
        label: 'How much can you invest monthly (Minimum amount)?',
        qtype: 'number',
        options: { minimum: 100, default: 1000, currency: 'Rs' },
        module: 'monthly_investment'
      }
    ];

    const questionBankIds = [];
    
    for (const question of compulsoryQuestions) {
      const { data: questionBank, error: questionError } = await supabase
        .from('question_bank')
        .insert({
          qkey: question.qkey,
          label: question.label,
          qtype: question.qtype,
          options: question.options,
          module: question.module
        })
        .select('id')
        .single();

      if (questionError) {
        console.error(`❌ Failed to add question "${question.label}":`, questionError.message);
        continue;
      }

      questionBankIds.push(questionBank.id);
      console.log(`✅ Added question: ${question.label} (ID: ${questionBank.id})`);
    }

    if (questionBankIds.length === 0) {
      throw new Error('No questions were added to question_bank');
    }

    // 2. Add the questions to framework_question_map with proper order
    console.log('\n🔗 Adding questions to framework_question_map...');
    
    // Insert compulsory questions at the beginning (order_index 1, 2, 3)
    for (let i = 0; i < questionBankIds.length; i++) {
      const orderIndex = i + 1; // Start from 1
      
      const { data: mapping, error: mappingError } = await supabase
        .from('framework_question_map')
        .insert({
          framework_version_id: frameworkVersionId,
          qkey: compulsoryQuestions[i].qkey,
          required: true,
          order_index: orderIndex
        })
        .select('id')
        .single();

      if (mappingError) {
        console.error(`❌ Failed to add mapping for question ${i + 1}:`, mappingError.message);
        continue;
      }

      console.log(`✅ Added mapping: ${compulsoryQuestions[i].label} (order: ${orderIndex})`);
    }

    // 3. Update existing questions order_index to make room for compulsory questions
    console.log('\n🔄 Updating existing questions order_index...');
    
    const { data: existingQuestions, error: existingError } = await supabase
      .from('framework_question_map')
      .select('id, qkey, order_index')
      .eq('framework_version_id', frameworkVersionId)
      .gte('order_index', 1)
      .order('order_index', { ascending: true });

    if (existingError) {
      console.error('❌ Failed to get existing questions:', existingError.message);
      return;
    }

    // Update order_index for existing questions (add 3 to make room for compulsory questions)
    for (const question of existingQuestions) {
      if (question.order_index <= 3) continue; // Skip compulsory questions
      
      const newOrderIndex = question.order_index + 3;
      
      const { error: updateError } = await supabase
        .from('framework_question_map')
        .update({ order_index: newOrderIndex })
        .eq('id', question.id);

      if (updateError) {
        console.error(`❌ Failed to update order_index for question ${question.id}:`, updateError.message);
      } else {
        console.log(`✅ Updated order_index: ${question.order_index} → ${newOrderIndex}`);
      }
    }

    console.log('\n🎉 Compulsory questions added successfully!');
    console.log('📋 New question order:');
    console.log('   1. What are your goals? (Multi-select)');
    console.log('   2. What is your Investment Horizon? (Single select)');
    console.log('   3. How much can you invest monthly? (Number input)');
    console.log('   4. What is your investment time horizon? (Existing)');
    console.log('   5. What is your age? (Existing)');
    console.log('   6. How would you rate your knowledge of financial markets? (Existing)');
    console.log('   7. How secure is your income? (Existing)');

  } catch (error) {
    console.error('❌ Failed to add compulsory questions:', error.message);
    process.exit(1);
  }
}

addCompulsoryQuestionsBack();
