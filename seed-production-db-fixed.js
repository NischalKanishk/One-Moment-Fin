// Seed Production Database with CFA Framework (Fixed for actual schema)
// This script populates the production Supabase database with the CFA framework structure

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zldljufeyskfzvzftjos.supabase.co';
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
    
    // 1. Update existing CFA Framework (since it already exists)
    console.log('📝 Step 1: Updating existing CFA framework...');
    const { data: cfaFramework, error: frameworkError } = await supabase
      .from('risk_frameworks')
      .update({
        name: 'CFA Three Pillar Framework',
        engine: 'three_pillar',
        config: {
          scoring_method: 'weighted_sum',
          risk_categories: ['low', 'medium', 'high'],
          weights: { capacity: 0.4, tolerance: 0.3, need: 0.3 }
        }
      })
      .eq('code', 'cfa_three_pillar_v1')
      .select()
      .single();

    if (frameworkError) {
      throw frameworkError;
    }

    console.log('✅ CFA framework updated:', cfaFramework.id);

    // 2. Create the missing tables if they don't exist
    console.log('📝 Step 2: Creating missing tables...');
    
    // Create risk_framework_versions table
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS risk_framework_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            framework_id UUID REFERENCES risk_frameworks(id) ON DELETE CASCADE,
            version INTEGER NOT NULL,
            config JSONB NOT NULL,
            is_default BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(framework_id, version)
          );
        `
      });
      console.log('✅ risk_framework_versions table created/verified');
    } catch (error) {
      console.log('ℹ️ risk_framework_versions table already exists or error:', error.message);
    }

    // Create framework_question_map table
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS framework_question_map (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            framework_version_id UUID REFERENCES risk_framework_versions(id) ON DELETE CASCADE,
            question_id UUID REFERENCES question_bank(id) ON DELETE CASCADE,
            qkey TEXT NOT NULL,
            required BOOLEAN DEFAULT true,
            order_index INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(framework_version_id, qkey)
          );
        `
      });
      console.log('✅ framework_question_map table created/verified');
    } catch (error) {
      console.log('ℹ️ framework_question_map table already exists or error:', error.message);
    }

    // 3. Insert Framework Version
    console.log('📝 Step 3: Creating framework version...');
    const { data: frameworkVersion, error: versionError } = await supabase
      .from('risk_framework_versions')
      .upsert({
        framework_id: cfaFramework.id,
        version: 1,
        config: {
          scoring_method: 'weighted_sum',
          risk_categories: ['low', 'medium', 'high'],
          weights: { capacity: 0.4, tolerance: 0.3, need: 0.3 }
        },
        is_default: true,
        is_active: true
      }, { onConflict: 'framework_id,version' })
      .select()
      .single();

    if (versionError) {
      throw versionError;
    }

    console.log('✅ Framework version created/updated:', frameworkVersion.id);

    // 4. Map existing questions to framework
    console.log('📝 Step 4: Mapping questions to framework...');
    
    // Get questions that should be mapped to CFA framework
    const { data: questions, error: questionsError } = await supabase
      .from('question_bank')
      .select('*')
      .in('module', ['capacity', 'tolerance', 'need', 'profile', 'knowledge', 'behavior'])
      .order('id');

    if (questionsError) {
      throw questionsError;
    }

    console.log(`✅ Found ${questions.length} questions to map`);

    // Create mappings for CFA questions
    const questionMappings = questions.map((q, index) => ({
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
