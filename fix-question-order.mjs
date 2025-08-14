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

async function fixQuestionOrder() {
  console.log('🔧 Fixing Question Order in Assessment Form...\n');

  try {
    const formId = '08d5b7d5-0bff-4127-988e-c3bb09861a73';
    console.log('📝 Form ID:', formId);

    // Create the correct schema with compulsory questions FIRST
    const correctSchema = {
      type: 'object',
      properties: {
        // Compulsory Investment Questions FIRST
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
        },
        // THEN risk assessment questions
        investment_experience: {
          type: 'string',
          title: 'What is your investment experience?',
          enum: ['None', 'Beginner', 'Intermediate', 'Advanced'],
          default: 'None'
        },
        risk_tolerance: {
          type: 'string',
          title: 'How would you describe your risk tolerance?',
          enum: ['Conservative', 'Moderate', 'Aggressive'],
          default: 'Moderate'
        },
        investment_horizon_risk: {
          type: 'string',
          title: 'What is your investment time horizon?',
          enum: ['Less than 3 years', '3-5 years', '5-10 years', 'More than 10 years'],
          default: '5-10 years'
        },
        financial_goals: {
          type: 'string',
          title: 'What is your primary financial goal?',
          enum: ['Capital preservation', 'Income generation', 'Growth', 'Tax efficiency'],
          default: 'Growth'
        },
        emergency_fund: {
          type: 'string',
          title: 'Do you have an emergency fund?',
          enum: ['Yes, 6+ months', 'Yes, 3-6 months', 'Yes, less than 3 months', 'No'],
          default: 'Yes, 3-6 months'
        }
      },
      required: ['investment_goals', 'investment_horizon', 'monthly_investment', 'investment_experience', 'risk_tolerance', 'investment_horizon_risk', 'financial_goals', 'emergency_fund'],
      // Add explicit question order to enforce sequence
      questionOrder: [
        'investment_goals',
        'investment_horizon', 
        'monthly_investment',
        'investment_experience',
        'risk_tolerance',
        'investment_horizon_risk',
        'financial_goals',
        'emergency_fund'
      ]
    };

    console.log('🆕 Creating version 4 with correct question order...');
    
    const { data: version, error: versionError } = await supabase
      .from('assessment_form_versions')
      .insert({
        form_id: formId,
        version: 4,
        schema: correctSchema,
        ui: {
          layout: 'vertical',
          theme: 'default',
          showProgress: true,
          compulsoryQuestionsFirst: true
        },
        scoring: {
          weights: {
            investment_goals: 0.05,
            investment_horizon: 0.05,
            monthly_investment: 0.05,
            investment_experience: 0.2,
            risk_tolerance: 0.3,
            investment_horizon_risk: 0.25,
            financial_goals: 0.15,
            emergency_fund: 0.1
          },
          scoring: {
            investment_goals: { 'Buying a Home': 1, 'Retirement Planning': 1, 'Investment Growth': 1, 'Health and Wellness': 1, 'Building an Emergency Fund': 1 },
            investment_horizon: { 'Short term (0-1yr)': 1, 'Medium Term (2-5yr)': 2, 'Long term (5-10yr)': 3 },
            monthly_investment: { 'default': 1 },
            investment_experience: { 'None': 1, 'Beginner': 2, 'Intermediate': 3, 'Advanced': 4 },
            risk_tolerance: { 'Conservative': 1, 'Moderate': 2, 'Aggressive': 3 },
            investment_horizon_risk: { 'Less than 3 years': 1, '3-5 years': 2, '5-10 years': 3, 'More than 10 years': 4 },
            financial_goals: { 'Capital preservation': 1, 'Income generation': 2, 'Growth': 3, 'Tax efficiency': 2 },
            emergency_fund: { 'Yes, 6+ months': 3, 'Yes, 3-6 months': 2, 'Yes, less than 3 months': 1, 'No': 0 }
          },
          thresholds: {
            low: { min: 0, max: 8 },
            medium: { min: 9, max: 12 },
            high: { min: 13, max: 16 }
          }
        }
      })
      .select()
      .single();

    if (versionError) {
      throw new Error(`Failed to create version: ${versionError.message}`);
    }

    console.log('✅ Version 3 created successfully with correct order!');
    console.log('📋 Properties order:', Object.keys(correctSchema.properties));
    console.log('\n🎯 First 3 questions (Compulsory):');
    Object.keys(correctSchema.properties).slice(0, 3).forEach((key, index) => {
      const prop = correctSchema.properties[key];
      console.log(`   ${index + 1}. ${key}: ${prop.title}`);
    });

    console.log('\n🎯 Next 5 questions (Risk Assessment):');
    Object.keys(correctSchema.properties).slice(3).forEach((key, index) => {
      const prop = correctSchema.properties[key];
      console.log(`   ${index + 4}. ${key}: ${prop.title}`);
    });

  } catch (error) {
    console.error('❌ Failed to fix question order:', error.message);
    process.exit(1);
  }
}

// Run the script
fixQuestionOrder();
