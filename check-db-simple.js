// Simple database check script
// This script checks the current state of key tables

import { createClient } from '@supabase/supabase-js';

// Use the URL from the .env file
const supabaseUrl = 'https://zldljufeyskfzvzftjos.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGxqdWZleXNrZnp2emZ0am9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczOTQ5OSwiZXhwIjoyMDcwMzE1NDk5fQ.esryGKwYPX4gXsFG8697lzCAUqBAnGVbs6rWUnr5cPA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseState() {
  try {
    console.log('🔍 Checking database state...\n');
    
    // First, let's see what tables actually exist
    console.log('📊 Checking what tables exist...');
    try {
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_tables');
      
      if (tablesError) {
        console.log('❌ Could not get tables list:', tablesError.message);
        // Try a different approach - check specific tables
        console.log('🔍 Checking specific tables manually...');
      } else {
        console.log('✅ Available tables:', tables);
      }
    } catch (e) {
      console.log('⚠️ Could not list tables, checking manually...');
    }
    
    // Check question_bank table
    console.log('\n📊 Checking question_bank table...');
    try {
      const { data: questions, error: questionsError } = await supabase
        .from('question_bank')
        .select('*')
        .eq('is_active', true);
      
      if (questionsError) {
        console.log('❌ question_bank table error:', questionsError.message);
      } else {
        console.log(`✅ question_bank table has ${questions?.length || 0} active questions`);
        if (questions && questions.length > 0) {
          console.log('Sample questions:');
          questions.slice(0, 5).forEach(q => {
            console.log(`   - ${q.qkey}: ${q.label} (${q.qtype})`);
          });
        }
      }
    } catch (e) {
      console.log('❌ question_bank table does not exist');
    }
    
    // Check risk_frameworks table
    console.log('\n📊 Checking risk_frameworks table...');
    try {
      const { data: frameworks, error: frameworksError } = await supabase
        .from('risk_frameworks')
        .select('*');
      
      if (frameworksError) {
        console.log('❌ risk_frameworks table error:', frameworksError.message);
      } else {
        console.log(`✅ risk_frameworks table has ${frameworks?.length || 0} frameworks`);
        if (frameworks && frameworks.length > 0) {
          frameworks.forEach(f => {
            console.log(`   - ${f.code}: ${f.name} (${f.engine})`);
          });
        }
      }
    } catch (e) {
      console.log('❌ risk_frameworks table does not exist');
    }
    
    // Check framework_questions table (from migration)
    console.log('\n📊 Checking framework_questions table...');
    try {
      const { data: frameworkQuestions, error: frameworkQuestionsError } = await supabase
        .from('framework_questions')
        .select('*')
        .limit(5);
      
      if (frameworkQuestionsError) {
        console.log('❌ framework_questions table error:', frameworkQuestionsError.message);
        console.log('🔍 This table might not exist yet - checking if we need to create it');
      } else {
        console.log(`✅ framework_questions table has questions`);
        if (frameworkQuestions && frameworkQuestions.length > 0) {
          console.log('Sample framework questions:');
          frameworkQuestions.forEach(q => {
            console.log(`   - ${q.qkey}: ${q.label} (${q.module})`);
          });
        }
      }
    } catch (e) {
      console.log('❌ framework_questions table does not exist');
    }
    
    // Check if framework_question_map table exists with a different approach
    console.log('\n📊 Checking framework_question_map table...');
    try {
      const { data: mappings, error: mappingsError } = await supabase
        .from('framework_question_map')
        .select('*')
        .limit(1);
      
      if (mappingsError) {
        console.log('❌ framework_question_map table error:', mappingsError.message);
        console.log('🔍 This table might not exist yet - checking if we need to create it');
      } else {
        console.log(`✅ framework_question_map table has ${mappings?.length || 0} mappings`);
        if (mappings && mappings.length > 0) {
          console.log('Sample mappings:');
          mappings.slice(0, 5).forEach(m => {
            console.log(`   - ${m.qkey} (order: ${m.order_index}, required: ${m.required})`);
          });
        }
      }
    } catch (e) {
      console.log('❌ framework_question_map table does not exist');
    }
    
    // Check assessment_submissions table
    console.log('\n📊 Checking assessment_submissions table...');
    try {
      const { data: submissions, error: submissionsError } = await supabase
        .from('assessment_submissions')
        .select('*');
      
      if (submissionsError) {
        console.log('❌ assessment_submissions table error:', submissionsError.message);
      } else {
        console.log(`✅ assessment_submissions table has ${submissions?.length || 0} submissions`);
      }
    } catch (e) {
      console.log('❌ assessment_submissions table does not exist');
    }
    
    // Check leads table
    console.log('\n📊 Checking leads table...');
    try {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*');
      
      if (leadsError) {
        console.log('❌ leads table error:', leadsError.message);
      } else {
        console.log(`✅ leads table has ${leads?.length || 0} leads`);
      }
    } catch (e) {
      console.log('❌ leads table does not exist');
    }
    
    // Check assessment_links table
    console.log('\n📊 Checking assessment_links table...');
    try {
      const { data: links, error: linksError } = await supabase
        .from('assessment_links')
        .select('*');
      
      if (linksError) {
        console.log('❌ assessment_links table error:', linksError.message);
      } else {
        console.log(`✅ assessment_links table has ${links?.length || 0} links`);
        if (links && links.length > 0) {
          console.log('Sample links:');
          links.slice(0, 3).forEach(l => {
            console.log(`   - ${l.token} (status: ${l.status})`);
          });
        }
      }
    } catch (e) {
      console.log('❌ assessment_links table does not exist');
    }
    
    // Check if we have the basic assessment_questions table (legacy)
    console.log('\n📊 Checking legacy assessment_questions table...');
    try {
      const { data: legacyQuestions, error: legacyError } = await supabase
        .from('assessment_questions')
        .select('*')
        .limit(1);
      
      if (legacyError) {
        console.log('❌ assessment_questions table error:', legacyError.message);
      } else {
        console.log(`✅ assessment_questions table exists`);
      }
    } catch (e) {
      console.log('❌ assessment_questions table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabaseState();
