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

async function checkAllTables() {
  console.log('🔍 Checking All Risk Assessment Tables...\n');

  const requiredTables = [
    'users',
    'risk_frameworks',
    'risk_framework_versions',
    'assessments',
    'question_bank',
    'framework_question_map',
    'assessment_question_snapshots',
    'assessment_submissions'
  ];

  for (const tableName of requiredTables) {
    try {
      console.log(`📋 Checking ${tableName} table...`);
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`   ❌ ${tableName} table does NOT exist`);
        } else {
          console.log(`   ⚠️  ${tableName} table exists but has error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ ${tableName} table exists`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking ${tableName}: ${error.message}`);
    }
  }

  console.log('\n📋 Checking table data...');
  
  // Check if frameworks have data
  try {
    const { data: frameworks, error } = await supabase
      .from('risk_frameworks')
      .select('id, code, name')
      .limit(5);
    
    if (error) {
      console.log('   ❌ Error fetching frameworks:', error.message);
    } else {
      console.log(`   ✅ Found ${frameworks.length} frameworks`);
      frameworks.forEach(f => console.log(`      - ${f.name} (${f.code})`));
    }
  } catch (error) {
    console.log('   ❌ Error checking frameworks data:', error.message);
  }

  // Check if question_bank has data
  try {
    const { data: questions, error } = await supabase
      .from('question_bank')
      .select('id, qkey, label')
      .limit(5);
    
    if (error) {
      console.log('   ❌ Error fetching questions:', error.message);
    } else {
      console.log(`   ✅ Found ${questions.length} questions`);
      questions.forEach(q => console.log(`      - ${q.qkey}: ${q.label}`));
    }
  } catch (error) {
    console.log('   ❌ Error checking questions data:', error.message);
  }

  // Check if framework_question_map has data
  try {
    const { data: mappings, error } = await supabase
      .from('framework_question_map')
      .select('id, framework_version_id, qkey')
      .limit(5);
    
    if (error) {
      console.log('   ❌ Error fetching framework mappings:', error.message);
    } else {
      console.log(`   ✅ Found ${mappings.length} framework mappings`);
      mappings.forEach(m => console.log(`      - Framework ${m.framework_version_id} -> ${m.qkey}`));
    }
  } catch (error) {
    console.log('   ❌ Error checking framework mappings data:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('If any tables are missing or have no data, you need to:');
  console.log('1. Run the SQL migration: risk-assessment-system-migration-supabase.sql');
  console.log('2. Run the seed data: seed-risk-assessment-data.sql');
  console.log('3. Restart your backend server');
}

checkAllTables();
