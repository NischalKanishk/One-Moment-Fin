// Seed Production Database with CFA Framework
// This script populates the production Supabase database with the CFA framework structure

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedProductionDatabase() {
  try {
    console.log('🌱 Starting production database seeding...');
    
    // 1. Insert CFA Framework
    console.log('📝 Step 1: Creating CFA framework...');
    let { data: cfaFramework, error: frameworkError } = await supabase
      .from('risk_frameworks')
      .insert({
        code: 'cfa_three_pillar',
        name: 'CFA Three Pillar Framework',
        description: 'Comprehensive risk assessment framework based on CFA principles',
        engine: 'three_pillar',
        is_active: true
      })
      .select()
      .single();

    if (frameworkError) {
      if (frameworkError.code === '23505') { // Unique constraint violation
        console.log('ℹ️ CFA framework already exists, fetching existing...');
        const { data: existingFramework } = await supabase
          .from('risk_frameworks')
          .select('*')
          .eq('code', 'cfa_three_pillar')
          .single();
        cfaFramework = existingFramework;
      } else {
        throw frameworkError;
      }
    }

    console.log('✅ CFA framework created/found:', cfaFramework.id);

    // 2. Insert Framework Version
    console.log('📝 Step 2: Creating framework version...');
    let { data: frameworkVersion, error: versionError } = await supabase
      .from('risk_framework_versions')
      .insert({
        framework_id: cfaFramework.id,
        version: 1,
        config: {
          scoring_method: 'weighted_sum',
          risk_categories: ['low', 'medium', 'high'],
          weights: { capacity: 0.4, tolerance: 0.3, need: 0.3 }
        },
        is_default: true,
        is_active: true
      })
      .select()
      .single();

    if (versionError) {
      if (versionError.code === '23505') { // Unique constraint violation
        console.log('ℹ️ Framework version already exists, fetching existing...');
        const { data: existingVersion } = await supabase
          .from('risk_framework_versions')
          .select('*')
          .eq('framework_id', cfaFramework.id)
          .eq('is_default', true)
          .single();
        frameworkVersion = existingVersion;
      } else {
        throw versionError;
      }
    }

    console.log('✅ Framework version created/found:', frameworkVersion.id);

    // 3. Insert Questions into Question Bank
    console.log('📝 Step 3: Creating question bank...');
    const questions = [
      // Investment Capacity Questions
      { qkey: 'investment_horizon', label: 'What is your investment horizon?', qtype: 'single', options: ['Less than 1 year', '1-3 years', '3-5 years', 'More than 5 years'], module: 'capacity' },
      { qkey: 'investment_amount', label: 'What percentage of your total assets do you plan to invest?', qtype: 'single', options: ['Less than 10%', '10-25%', '25-50%', 'More than 50%'], module: 'capacity' },
      { qkey: 'income_stability', label: 'How stable is your current income?', qtype: 'single', options: ['Very unstable', 'Somewhat unstable', 'Stable', 'Very stable'], module: 'capacity' },
      { qkey: 'emergency_fund', label: 'Do you have an emergency fund covering 6+ months of expenses?', qtype: 'single', options: ['No', 'Less than 3 months', '3-6 months', 'More than 6 months'], module: 'capacity' },
      
      // Risk Tolerance Questions
      { qkey: 'risk_tolerance', label: 'How would you react to a 20% drop in your investment value?', qtype: 'single', options: ['Sell immediately', 'Sell some', 'Hold', 'Buy more'], module: 'tolerance' },
      { qkey: 'volatility_comfort', label: 'How comfortable are you with investment volatility?', qtype: 'single', options: ['Very uncomfortable', 'Somewhat uncomfortable', 'Comfortable', 'Very comfortable'], module: 'tolerance' },
      { qkey: 'loss_aversion', label: 'What is your maximum acceptable loss on investments?', qtype: 'single', options: ['0-5%', '5-15%', '15-25%', 'More than 25%'], module: 'tolerance' },
      { qkey: 'market_timing', label: 'Do you believe in timing the market?', qtype: 'single', options: ['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree'], module: 'tolerance' },
      
      // Investment Need Questions
      { qkey: 'investment_goals', label: 'What are your primary investment goals?', qtype: 'single', options: ['Capital preservation', 'Income generation', 'Growth', 'Tax efficiency'], module: 'need' },
      { qkey: 'investment_experience', label: 'How would you describe your investment experience?', qtype: 'single', options: ['Beginner', 'Some experience', 'Experienced', 'Very experienced'], module: 'need' },
      { qkey: 'financial_knowledge', label: 'How would you rate your financial knowledge?', qtype: 'single', options: ['Basic', 'Intermediate', 'Advanced', 'Expert'], module: 'need' },
      { qkey: 'professional_advice', label: 'Do you prefer professional financial advice?', qtype: 'single', options: ['Strongly prefer', 'Somewhat prefer', 'Neutral', 'Prefer self-directed'], module: 'need' }
    ];

    const { data: questionBank, error: questionError } = await supabase
      .from('question_bank')
      .upsert(questions.map(q => ({ ...q, is_active: true })), { onConflict: 'qkey' })
      .select();

    if (questionError) {
      throw questionError;
    }

    console.log(`✅ Question bank created with ${questionBank.length} questions`);

    // 4. Map Questions to Framework
    console.log('📝 Step 4: Mapping questions to framework...');
    const questionMappings = questionBank.map((q, index) => ({
      framework_version_id: frameworkVersion.id,
      question_id: q.id,
      qkey: q.qkey,
      required: true,
      order_index: index + 1
    }));

    const { data: frameworkMappings, error: mappingError } = await supabase
      .from('framework_question_map')
      .upsert(questionMappings, { onConflict: 'framework_version_id,qkey' })
      .select();

    if (mappingError) {
      throw mappingError;
    }

    console.log(`✅ Framework question mappings created: ${frameworkMappings.length} mappings`);

    // 5. Verify the setup
    console.log('📝 Step 5: Verifying setup...');
    const { data: verification, error: verifyError } = await supabase
      .from('framework_question_map')
      .select(`
        *,
        question:question_bank(*)
      `)
      .eq('framework_version_id', frameworkVersion.id)
      .order('order_index', { ascending: true });

    if (verifyError) {
      throw verifyError;
    }

    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Total questions mapped: ${verification.length}`);
    console.log(`📊 Questions by module:`);
    
    const moduleCounts = verification.reduce((acc, v) => {
      const module = v.question?.module || 'unknown';
      acc[module] = (acc[module] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(moduleCounts).forEach(([module, count]) => {
      console.log(`   ${module}: ${count} questions`);
    });

    return verification;

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Run the seeding
seedProductionDatabase()
  .then(() => {
    console.log('🎉 Production database seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Production database seeding failed:', error);
    process.exit(1);
  });
