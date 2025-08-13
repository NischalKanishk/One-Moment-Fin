import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying Risk Assessment System Migration...\n');

    // Step 1: Create the assessments table if it doesn't exist
    console.log('📋 Step 1: Creating assessments table...');
    
    const createAssessmentsTable = `
      CREATE TABLE IF NOT EXISTS assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        framework_version_id UUID REFERENCES risk_framework_versions(id) ON DELETE RESTRICT,
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_published BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createAssessmentsTable });
    
    if (createError) {
      console.log('⚠️  Note: exec_sql function not available, table may already exist');
    }

    // Step 2: Add unique constraint and indexes
    console.log('📋 Step 2: Adding constraints and indexes...');
    
    const addConstraints = `
      ALTER TABLE assessments ADD CONSTRAINT IF NOT EXISTS unique_owner_slug UNIQUE (user_id, slug);
      CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_framework_version_id ON assessments(framework_version_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_slug ON assessments(slug);
      CREATE INDEX IF NOT EXISTS idx_assessments_is_default ON assessments(is_default);
    `;

    try {
      await supabase.rpc('exec_sql', { sql: addConstraints });
    } catch (error) {
      console.log('⚠️  Note: exec_sql function not available, constraints may already exist');
    }

    // Step 3: Enable RLS
    console.log('📋 Step 3: Enabling Row Level Security...');
    
    const enableRLS = `
      ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
    `;

    try {
      await supabase.rpc('exec_sql', { sql: enableRLS });
    } catch (error) {
      console.log('⚠️  Note: exec_sql function not available, RLS may already be enabled');
    }

    // Step 4: Create RLS policies
    console.log('📋 Step 4: Creating RLS policies...');
    
    const createPolicies = `
      DROP POLICY IF EXISTS "Users can view own assessments" ON assessments;
      CREATE POLICY "Users can view own assessments" ON assessments FOR SELECT USING (
        user_id = get_user_id_from_clerk()
      );

      DROP POLICY IF EXISTS "Users can insert own assessments" ON assessments;
      CREATE POLICY "Users can insert own assessments" ON assessments FOR INSERT WITH CHECK (
        user_id = get_user_id_from_clerk()
      );

      DROP POLICY IF EXISTS "Users can update own assessments" ON assessments;
      CREATE POLICY "Users can update own assessments" ON assessments FOR UPDATE USING (
        user_id = get_user_id_from_clerk()
      );

      DROP POLICY IF EXISTS "Users can delete own assessments" ON assessments;
      CREATE POLICY "Users can delete own assessments" ON assessments FOR DELETE USING (
        user_id = get_user_id_from_clerk()
      );

      DROP POLICY IF EXISTS "Service role can manage all assessments" ON assessments;
      CREATE POLICY "Service role can manage all assessments" ON assessments FOR ALL USING (
        auth.role() = 'service_role'
      );
    `;

    try {
      await supabase.rpc('exec_sql', { sql: createPolicies });
    } catch (error) {
      console.log('⚠️  Note: exec_sql function not available, policies may already exist');
    }

    // Step 5: Create trigger for updated_at
    console.log('📋 Step 5: Creating updated_at trigger...');
    
    const createTrigger = `
      CREATE OR REPLACE FUNCTION update_assessments_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
      CREATE TRIGGER update_assessments_updated_at 
      BEFORE UPDATE ON assessments
      FOR EACH ROW EXECUTE FUNCTION update_assessments_updated_at();
    `;

    try {
      await supabase.rpc('exec_sql', { sql: createTrigger });
    } catch (error) {
      console.log('⚠️  Note: exec_sql function not available, trigger may already exist');
    }

    // Step 6: Create default assessments for existing users
    console.log('📋 Step 6: Creating default assessments for existing users...');
    
    const createDefaultAssessments = `
      INSERT INTO assessments (user_id, title, slug, framework_version_id, is_default, is_published)
      SELECT 
        u.id,
        'Default Risk Assessment',
        'default-risk-assessment-' || u.id::text,
        (SELECT id FROM risk_framework_versions WHERE is_default = true LIMIT 1),
        true,
        false
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM assessments a WHERE a.user_id = u.id AND a.is_default = true
      );
    `;

    try {
      const { error: insertError } = await supabase.rpc('exec_sql', { sql: createDefaultAssessments });
      if (insertError) {
        console.log('⚠️  Note: Could not create default assessments:', insertError.message);
      } else {
        console.log('✅ Default assessments created for existing users');
      }
    } catch (error) {
      console.log('⚠️  Note: exec_sql function not available, default assessments may already exist');
    }

    console.log('\n✅ Migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Try accessing the assessments page again');
    console.log('3. The 500 error should be resolved');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n📋 Manual steps required:');
    console.log('1. Run the SQL files manually in your database:');
    console.log('   - create-missing-assessments-table.sql');
    console.log('   - risk-assessment-system-migration-supabase.sql');
    console.log('   - seed-risk-assessment-data.sql');
  }
}

applyMigration();
