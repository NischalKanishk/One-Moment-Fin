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

async function addMissingQuestions() {
  console.log('🔧 Adding Missing Questions to Question Bank...\n');

  try {
    // Define the missing questions
    const missingQuestions = [
      {
        qkey: 'income_bracket',
        label: 'What is your annual income bracket?',
        qtype: 'single',
        options: ['<5L', '5-25L', '25-50L', '50L-1C', '1-3C', '>3C'],
        module: 'capacity'
      },
      {
        qkey: 'education',
        label: 'What is your highest level of education?',
        qtype: 'single',
        options: ['<12th', '12th', 'Bachelors', 'Postgrad+'],
        module: 'capacity'
      }
    ];

    console.log(`📝 Adding ${missingQuestions.length} missing questions...`);

    for (const question of missingQuestions) {
      console.log(`   Adding: ${question.qkey} - ${question.label}`);
      
      const { error } = await supabase
        .from('question_bank')
        .insert({
          qkey: question.qkey,
          label: question.label,
          qtype: question.qtype,
          options: question.options,
          module: question.module,
          version: 1,
          is_active: true
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`     ⚠️  Question ${question.qkey} already exists`);
        } else {
          console.log(`     ❌ Error adding ${question.qkey}: ${error.message}`);
        }
      } else {
        console.log(`     ✅ Successfully added ${question.qkey}`);
      }
    }

    console.log('\n✅ Missing questions added!');
    console.log('\n📋 Next steps:');
    console.log('1. Run the fix-missing-mappings script again');
    console.log('2. Restart your backend server');
    console.log('3. Try accessing the assessments page again');

  } catch (error) {
    console.error('❌ Add failed:', error);
  }
}

addMissingQuestions();
