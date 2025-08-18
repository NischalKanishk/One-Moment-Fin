// Simple script to seed framework data
// Run this with: node seed-framework-data.js

import { createClient } from '@supabase/supabase-js';

// You'll need to set these environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedFrameworkData() {
  try {
    console.log('🌱 Seeding CFA Three Pillar framework...');

    // 1. Create or get the CFA framework
    let cfaFramework;
    const { data: existingFramework, error: frameworkCheckError } = await supabase
      .from('risk_frameworks')
      .select('*')
      .eq('code', 'cfa_three_pillar_v1')
      .single();

    if (existingFramework) {
      cfaFramework = existingFramework;
      console.log('✅ CFA framework already exists:', existingFramework.id);
    } else {
      const { data: newFramework, error: createFrameworkError } = await supabase
        .from('risk_frameworks')
        .insert({
          code: 'cfa_three_pillar_v1',
          name: 'CFA Three Pillar v1',
          description: 'Three-pillar approach: capacity, tolerance, and need',
          engine: 'three_pillar',
          is_active: true
        })
        .select()
        .single();

      if (createFrameworkError) {
        throw new Error(`Failed to create CFA framework: ${createFrameworkError.message}`);
      }

      cfaFramework = newFramework;
      console.log('✅ Created CFA framework:', newFramework.id);
    }

    // 2. Create or get the framework version
    let frameworkVersion;
    const { data: existingVersion, error: versionCheckError } = await supabase
      .from('risk_framework_versions')
      .select('*')
      .eq('framework_id', cfaFramework.id)
      .eq('version', 1)
      .single();

    if (existingVersion) {
      frameworkVersion = existingVersion;
      console.log('✅ CFA framework version already exists:', existingVersion.id);
    } else {
      const { data: newVersion, error: createVersionError } = await supabase
        .from('risk_framework_versions')
        .insert({
          framework_id: cfaFramework.id,
          version: 1,
          config: {
            engine: 'three_pillar',
            capacity: {
              inputs: [
                { qkey: 'age', type: 'number', transform: '100 - value' },
                { qkey: 'income_stability', type: 'single' },
                { qkey: 'employment_type', type: 'single' },
                { qkey: 'financial_reserves', type: 'single' }
              ],
              weights: {
                age: 0.3,
                income_stability: 0.3,
                employment_type: 0.2,
                financial_reserves: 0.2
              }
            },
            tolerance: {
              inputs: [
                { qkey: 'investment_experience', type: 'single' },
                { qkey: 'risk_attitude', type: 'single' },
                { qkey: 'market_volatility_comfort', type: 'single' }
              ],
              weights: {
                investment_experience: 0.4,
                risk_attitude: 0.4,
                market_volatility_comfort: 0.2
              }
            },
            need: {
              inputs: [
                { qkey: 'investment_horizon', type: 'single' },
                { qkey: 'liquidity_needs', type: 'single' },
                { qkey: 'return_objectives', type: 'single' }
              ],
              weights: {
                investment_horizon: 0.4,
                liquidity_needs: 0.3,
                return_objectives: 0.3
              }
            },
            decision: {
              formula: 'min(capacity, tolerance)',
              warnings: [
                { if: 'need > capacity + 10', message: 'Investment needs exceed capacity. Consider conservative approach.' }
              ],
              bucket_bands: [
                { min: 0, max: 30, bucket: 'low' },
                { min: 31, max: 70, bucket: 'medium' },
                { min: 71, max: 100, bucket: 'high' }
              ]
            }
          },
          is_default: true,
          is_active: true
        })
        .select()
        .single();

      if (createVersionError) {
        throw new Error(`Failed to create framework version: ${createVersionError.message}`);
      }

      frameworkVersion = newVersion;
      console.log('✅ Created CFA framework version:', newVersion.id);
    }

    // 3. Create questions in the question bank
    const questions = [
      // Capacity Questions
      {
        qkey: 'age',
        label: 'What is your age?',
        qtype: 'number',
        options: { min: 18, max: 100 },
        module: 'capacity'
      },
      {
        qkey: 'income_stability',
        label: 'How stable is your income?',
        qtype: 'single',
        options: ['Very Stable', 'Stable', 'Moderate', 'Unstable', 'Very Unstable'],
        module: 'capacity'
      },
      {
        qkey: 'employment_type',
        label: 'What is your employment type?',
        qtype: 'single',
        options: ['Government Employee', 'Private Sector - Large Company', 'Private Sector - Small Company', 'Self-Employed', 'Business Owner', 'Retired'],
        module: 'capacity'
      },
      {
        qkey: 'financial_reserves',
        label: 'How many months of expenses can you cover with your savings?',
        qtype: 'single',
        options: ['Less than 3 months', '3-6 months', '6-12 months', '12-24 months', 'More than 24 months'],
        module: 'capacity'
      },
      
      // Tolerance Questions
      {
        qkey: 'investment_experience',
        label: 'What is your investment experience?',
        qtype: 'single',
        options: ['No experience', 'Beginner (1-2 years)', 'Intermediate (3-5 years)', 'Advanced (5-10 years)', 'Expert (10+ years)'],
        module: 'tolerance'
      },
      {
        qkey: 'risk_attitude',
        label: 'How would you describe your attitude toward risk?',
        qtype: 'single',
        options: ['Very Conservative', 'Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'],
        module: 'tolerance'
      },
      {
        qkey: 'market_volatility_comfort',
        label: 'How comfortable are you with market volatility?',
        qtype: 'single',
        options: ['Very Uncomfortable', 'Uncomfortable', 'Neutral', 'Comfortable', 'Very Comfortable'],
        module: 'tolerance'
      },
      
      // Need Questions
      {
        qkey: 'investment_horizon',
        label: 'What is your investment time horizon?',
        qtype: 'single',
        options: ['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', 'More than 10 years'],
        module: 'need'
      },
      {
        qkey: 'liquidity_needs',
        label: 'How quickly might you need to access your investments?',
        qtype: 'single',
        options: ['Immediately (within days)', 'Within weeks', 'Within months', 'Within a year', 'No immediate need'],
        module: 'need'
      },
      {
        qkey: 'return_objectives',
        label: 'What are your primary return objectives?',
        qtype: 'single',
        options: ['Capital Preservation', 'Income Generation', 'Moderate Growth', 'Growth', 'Maximum Growth'],
        module: 'need'
      }
    ];

    const createdQuestions = [];
    for (const question of questions) {
      const { data: existingQuestion, error: questionCheckError } = await supabase
        .from('question_bank')
        .select('*')
        .eq('qkey', question.qkey)
        .single();

      if (existingQuestion) {
        createdQuestions.push(existingQuestion);
        console.log(`✅ Question already exists: ${question.qkey}`);
      } else {
        const { data: newQuestion, error: createQuestionError } = await supabase
          .from('question_bank')
          .insert(question)
          .select()
          .single();

        if (createQuestionError) {
          console.warn(`⚠️ Failed to create question ${question.qkey}:`, createQuestionError.message);
        } else {
          createdQuestions.push(newQuestion);
          console.log(`✅ Created question: ${question.qkey}`);
        }
      }
    }

    // 4. Create framework question mappings
    const questionMappings = createdQuestions.map((question, index) => ({
      framework_version_id: frameworkVersion.id,
      question_id: question.id,
      qkey: question.qkey,
      required: true,
      order_index: index + 1
    }));

    // Clear existing mappings for this framework version
    await supabase
      .from('framework_question_map')
      .delete()
      .eq('framework_version_id', frameworkVersion.id);

    // Create new mappings
    const { error: mappingError } = await supabase
      .from('framework_question_map')
      .insert(questionMappings);

    if (mappingError) {
      throw new Error(`Failed to create question mappings: ${mappingError.message}`);
    }

    console.log(`✅ Created ${questionMappings.length} question mappings`);
    console.log('🎉 CFA Three Pillar framework seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding framework data:', error);
    process.exit(1);
  }
}

// Run the seeding
seedFrameworkData();
