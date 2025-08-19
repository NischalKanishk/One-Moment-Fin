// Run SQL Seed File
// This script executes the SQL seed file to populate the database

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://zldljufeyskfzvzftjos.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQLSeed() {
  try {
    console.log('🌱 Running SQL seed file...');
    
    // Read the SQL file
    const sqlFile = path.join(process.cwd(), 'seed-cfa-framework-fixed.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📝 SQL file loaded, executing...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      // If exec_sql doesn't exist, try to run it in parts
      console.log('ℹ️ exec_sql RPC not available, trying alternative approach...');
      await runSQLInParts(sqlContent);
    } else {
      console.log('✅ SQL executed successfully:', data);
    }
    
  } catch (error) {
    console.error('❌ Error running SQL seed:', error);
    // Try alternative approach
    await runSQLInParts();
  }
}

async function runSQLInParts() {
  try {
    console.log('🔄 Running SQL in parts...');
    
    // Part 1: Create risk_framework_versions table
    console.log('📝 Creating risk_framework_versions table...');
    try {
      const { error } = await supabase.rpc('exec_sql', {
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
      if (!error) console.log('✅ risk_framework_versions table created');
    } catch (e) {
      console.log('ℹ️ Table creation error (might already exist):', e.message);
    }
    
    // Part 2: Create framework_question_map table
    console.log('📝 Creating framework_question_map table...');
    try {
      const { error } = await supabase.rpc('exec_sql', {
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
      if (!error) console.log('✅ framework_question_map table created');
    } catch (e) {
      console.log('ℹ️ Table creation error (might already exist):', e.message);
    }
    
    // Part 3: Insert framework version
    console.log('📝 Inserting framework version...');
    const { data: cfaFramework } = await supabase
      .from('risk_frameworks')
      .select('id')
      .eq('code', 'cfa_three_pillar_v1')
      .single();
    
    if (cfaFramework) {
      const { data: version, error: versionError } = await supabase
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
        console.log('ℹ️ Version creation error:', versionError.message);
      } else {
        console.log('✅ Framework version created:', version.id);
        
        // Part 4: Map questions
        console.log('📝 Mapping questions to framework...');
        const { data: questions } = await supabase
          .from('question_bank')
          .select('*')
          .in('module', ['capacity', 'tolerance', 'need', 'profile', 'knowledge', 'behavior']);
        
        if (questions && questions.length > 0) {
          const mappings = questions.map((q, index) => ({
            framework_version_id: version.id,
            question_id: q.id,
            qkey: q.qkey,
            required: true,
            order_index: index + 1
          }));
          
          const { error: mappingError } = await supabase
            .from('framework_question_map')
            .upsert(mappings, { onConflict: 'framework_version_id,qkey' });
          
          if (mappingError) {
            console.log('ℹ️ Mapping error:', mappingError.message);
          } else {
            console.log(`✅ Mapped ${mappings.length} questions to framework`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error running SQL in parts:', error);
  }
}

// Run the seeding
runSQLSeed()
  .then(() => {
    console.log('🎉 SQL seed execution completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 SQL seed execution failed:', error);
    process.exit(1);
  });
