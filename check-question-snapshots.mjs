#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkQuestionSnapshots() {
  try {
    console.log('🔍 Checking assessment question snapshots...');
    
    // Get the assessment ID
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('id, title, framework_version_id')
      .eq('user_id', 'aab37e75-52da-41ae-9c7d-b0c6e10b1b06')
      .single();
    
    if (assessmentError) {
      console.log('❌ Assessment error:', assessmentError);
      return;
    }
    
    console.log('✅ Assessment:', assessment.title);
    console.log('  ID:', assessment.id);
    console.log('  Framework Version ID:', assessment.framework_version_id);
    
    // Check for question snapshots
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('assessment_question_snapshots')
      .select('*')
      .eq('assessment_id', assessment.id);
    
    if (snapshotsError) {
      console.log('❌ Snapshots error:', snapshotsError);
    } else {
      console.log('✅ Snapshots found:', snapshots?.length || 0);
      if (snapshots && snapshots.length > 0) {
        snapshots.forEach(snapshot => {
          console.log('  -', snapshot.label, '(', snapshot.qtype, ')');
        });
      }
    }
    
    // Check if we can get questions from the framework
    if (assessment.framework_version_id) {
      console.log('\n🔍 Checking framework questions...');
      
      const { data: frameworkQuestions, error: frameworkError } = await supabase
        .from('framework_question_map')
        .select(`
          id,
          qkey,
          required,
          order_index,
          alias,
          transform,
          options_override,
          question_bank!inner (
            label,
            qtype,
            options,
            module
          )
        `)
        .eq('framework_version_id', assessment.framework_version_id)
        .order('order_index', { ascending: true });
      
      if (frameworkError) {
        console.log('❌ Framework questions error:', frameworkError);
      } else {
        console.log('✅ Framework questions found:', frameworkQuestions?.length || 0);
        if (frameworkQuestions && frameworkQuestions.length > 0) {
          frameworkQuestions.forEach(q => {
            console.log('  -', q.question_bank?.label, '(', q.question_bank?.qtype, ')');
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkQuestionSnapshots();
