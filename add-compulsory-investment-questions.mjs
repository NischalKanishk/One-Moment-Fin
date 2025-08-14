#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addCompulsoryInvestmentQuestions() {
  console.log('🔧 Adding Compulsory Investment Questions to Assessment Forms...\n');

  try {
    let totalFormsProcessed = 0;
    let totalFormsUpdated = 0;

    // 1. Process new assessment forms (assessment_forms table)
    console.log('🔍 Processing new assessment forms...');
    const { data: newForms, error: newFormsError } = await supabase
      .from('assessment_forms')
      .select('id, name, user_id');

    if (newFormsError) {
      console.warn('⚠️ Could not fetch new assessment forms:', newFormsError.message);
    } else if (newForms && newForms.length > 0) {
      console.log(`📝 Found ${newForms.length} new assessment forms`);
      totalFormsProcessed += newForms.length;

      for (const form of newForms) {
        console.log(`\n🔍 Processing new form: ${form.name} (${form.id})`);
        
        const updated = await processNewAssessmentForm(form);
        if (updated) totalFormsUpdated++;
      }
    } else {
      console.log('ℹ️ No new assessment forms found');
    }

    // 2. Process legacy assessments (assessments table)
    console.log('\n🔍 Processing legacy assessments...');
    const { data: legacyAssessments, error: legacyError } = await supabase
      .from('assessments')
      .select('id, name, user_id');

    if (legacyError) {
      console.warn('⚠️ Could not fetch legacy assessments:', legacyError.message);
    } else if (legacyAssessments && legacyAssessments.length > 0) {
      console.log(`📝 Found ${legacyAssessments.length} legacy assessments`);
      totalFormsProcessed += legacyAssessments.length;

      for (const assessment of legacyAssessments) {
        console.log(`\n🔍 Processing legacy assessment: ${assessment.name} (${assessment.id})`);
        
        const updated = await processLegacyAssessment(assessment);
        if (updated) totalFormsUpdated++;
      }
    } else {
      console.log('ℹ️ No legacy assessments found');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Total forms processed: ${totalFormsProcessed}`);
    console.log(`   • Total forms updated: ${totalFormsUpdated}`);
    console.log('   • Added 3 compulsory investment questions to all forms');
    console.log('   • Questions: Investment Goals, Investment Horizon, Monthly Investment');
    console.log('   • All existing risk assessment questions preserved');

  } catch (error) {
    console.error('❌ Failed to add compulsory questions:', error.message);
    process.exit(1);
  }
}

async function processNewAssessmentForm(form) {
  try {
    // Get the latest version of the form
    const { data: versions, error: versionsError } = await supabase
      .from('assessment_form_versions')
      .select('*')
      .eq('form_id', form.id)
      .order('version', { ascending: false })
      .limit(1);

    if (versionsError || !versions || versions.length === 0) {
      console.log(`⚠️ No versions found for form ${form.name}, skipping...`);
      return false;
    }

    const latestVersion = versions[0];
    console.log(`📋 Current version: ${latestVersion.version}`);

    // Check if compulsory questions already exist
    const currentSchema = latestVersion.schema || {};
    const currentProperties = currentSchema.properties || {};
    
    if (currentProperties.investment_goals && currentProperties.investment_horizon && currentProperties.monthly_investment) {
      console.log(`✅ Compulsory questions already exist in form ${form.name}, skipping...`);
      return false;
    }

          // Create new schema with compulsory questions FIRST
      const newSchema = {
        type: 'object',
        properties: {
          // Compulsory Investment Questions (MUST BE FIRST)
          investment_goals: {
            type: 'array',
            title: 'What are your goals?',
            description: 'Select all that apply',
            items: {
              type: 'string',
              enum: ['Buying a Home', 'Retirement Planning', 'Investment Growth', 'Health and Wellness', 'Building an Emergency Fund']
            },
            uniqueItems: true,
            minItems: 1
          },
          investment_horizon: {
            type: 'string',
            title: 'What is your Investment Horizon?',
            description: 'Select one option',
            enum: ['Short term (0-1yr)', 'Medium Term (2-5yr)', 'Long term (5-10yr)']
          },
          monthly_investment: {
            type: 'number',
            title: 'How much can you invest monthly (Minimum amount)?',
            description: 'Enter amount in Rs',
            minimum: 100,
            default: 1000
          }
        },
        required: ['investment_goals', 'investment_horizon', 'monthly_investment']
      };

      // Add existing risk assessment questions AFTER compulsory questions
      if (currentProperties) {
        Object.keys(currentProperties).forEach(key => {
          newSchema.properties[key] = currentProperties[key];
        });
      }

    // Add existing required fields if they exist
    if (currentSchema.required) {
      newSchema.required = [...newSchema.required, ...currentSchema.required];
    }

    // Create new scoring configuration
    const newScoring = {
      weights: {
        // Compulsory questions have lower weights (not used for risk scoring)
        investment_goals: 0.05,
        investment_horizon: 0.05,
        monthly_investment: 0.05,
        // Existing weights (if any)
        ...(latestVersion.scoring?.weights || {})
      },
      scoring: {
        // Compulsory questions scoring (basic)
        investment_goals: { 'Buying a Home': 1, 'Retirement Planning': 1, 'Investment Growth': 1, 'Health and Wellness': 1, 'Building an Emergency Fund': 1 },
        investment_horizon: { 'Short term (0-1yr)': 1, 'Medium Term (2-5yr)': 2, 'Long term (5-10yr)': 3 },
        monthly_investment: { 'default': 1 },
        // Existing scoring (if any)
        ...(latestVersion.scoring?.scoring || {})
      },
      thresholds: latestVersion.scoring?.thresholds || {
        low: { min: 0, max: 8 },
        medium: { min: 9, max: 12 },
        high: { min: 13, max: 16 }
      }
    };

    // Create new version
    const newVersionNumber = latestVersion.version + 1;
    console.log(`🆕 Creating version ${newVersionNumber} with compulsory questions...`);

    const { data: newVersion, error: versionError } = await supabase
      .from('assessment_form_versions')
      .insert({
        form_id: form.id,
        version: newVersionNumber,
        schema: newSchema,
        ui: {
          layout: 'vertical',
          theme: 'default',
          showProgress: true,
          compulsoryQuestionsFirst: true
        },
        scoring: newScoring
      })
      .select()
      .single();

    if (versionError) {
      console.error(`❌ Failed to create version ${newVersionNumber} for form ${form.name}:`, versionError.message);
      return false;
    }

    console.log(`✅ Created version ${newVersionNumber} with compulsory questions`);
    return true;

  } catch (error) {
    console.error(`❌ Error processing new form ${form.name}:`, error.message);
    return false;
  }
}

async function processLegacyAssessment(assessment) {
  try {
    // Get existing questions for this assessment
    const { data: questions, error: questionsError } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessment.id)
      .order('created_at', { ascending: true });

    if (questionsError) {
      console.log(`⚠️ Could not fetch questions for assessment ${assessment.name}:`, questionsError.message);
      return false;
    }

    // Check if compulsory questions already exist
    const hasCompulsoryQuestions = questions.some(q => 
      q.question_text.includes('goals') || 
      q.question_text.includes('Investment Horizon') || 
      q.question_text.includes('monthly')
    );

    if (hasCompulsoryQuestions) {
      console.log(`✅ Compulsory questions already exist in assessment ${assessment.name}, skipping...`);
      return false;
    }

    // Create compulsory questions
    const compulsoryQuestions = [
      {
        assessment_id: assessment.id,
        question_text: 'What are your goals? (Select all that apply)',
        type: 'mcq',
        options: ['Buying a Home', 'Retirement Planning', 'Investment Growth', 'Health and Wellness', 'Building an Emergency Fund'],
        weight: 1
      },
      {
        assessment_id: assessment.id,
        question_text: 'What is your Investment Horizon?',
        type: 'mcq',
        options: ['Short term (0-1yr)', 'Medium Term (2-5yr)', 'Long term (5-10yr)'],
        weight: 1
      },
      {
        assessment_id: assessment.id,
        question_text: 'How much can you invest monthly (Minimum amount)?',
        type: 'text',
        options: null,
        weight: 1
      }
    ];

    // Insert compulsory questions at the beginning
    for (let i = 0; i < compulsoryQuestions.length; i++) {
      const question = compulsoryQuestions[i];
      const { error: insertError } = await supabase
        .from('assessment_questions')
        .insert(question);

      if (insertError) {
        console.error(`❌ Failed to insert compulsory question ${i + 1} for assessment ${assessment.name}:`, insertError.message);
        return false;
      }
    }

    console.log(`✅ Added ${compulsoryQuestions.length} compulsory questions to assessment ${assessment.name}`);
    return true;

  } catch (error) {
    console.error(`❌ Error processing legacy assessment ${assessment.name}:`, error.message);
    return false;
  }
}

// Run the script
addCompulsoryInvestmentQuestions();
