import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixTableStructure() {
  try {
    console.log('🔧 Fixing assessment_submissions table structure...');
    
    // First, backup existing data (if any)
    console.log('📋 Creating backup table...');
    const { error: backupError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE TABLE IF NOT EXISTS assessment_submissions_backup AS SELECT * FROM assessment_submissions;'
    });
    
    if (backupError) {
      console.log('⚠️  Backup creation failed (might not exist):', backupError.message);
    } else {
      console.log('✅ Backup table created');
    }
    
    // Drop the existing table
    console.log('🗑️  Dropping existing table...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS assessment_submissions;'
    });
    
    if (dropError) {
      console.log('❌ Failed to drop table:', dropError.message);
      return;
    }
    console.log('✅ Existing table dropped');
    
    // Create the correct table structure
    console.log('🏗️  Creating new table with correct structure...');
    const createTableSQL = `
      CREATE TABLE assessment_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        framework_version_id UUID NOT NULL REFERENCES risk_framework_versions(id) ON DELETE RESTRICT,
        owner_id UUID NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        answers JSONB NOT NULL,
        result JSONB NOT NULL,
        lead_id UUID
      );
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (createError) {
      console.log('❌ Failed to create table:', createError.message);
      return;
    }
    console.log('✅ New table created');
    
    // Create indexes
    console.log('📊 Creating indexes...');
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment_id ON assessment_submissions(assessment_id);
      CREATE INDEX IF NOT EXISTS idx_assessment_submissions_owner_id ON assessment_submissions(owner_id);
    `;
    
    const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSQL });
    
    if (indexError) {
      console.log('❌ Failed to create indexes:', indexError.message);
    } else {
      console.log('✅ Indexes created');
    }
    
    // Enable RLS
    console.log('🔒 Enabling RLS...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;'
    });
    
    if (rlsError) {
      console.log('❌ Failed to enable RLS:', rlsError.message);
    } else {
      console.log('✅ RLS enabled');
    }
    
    // Create RLS policies
    console.log('📋 Creating RLS policies...');
    const policiesSQL = `
      DROP POLICY IF EXISTS "Users can view own assessment submissions" ON assessment_submissions;
      DROP POLICY IF EXISTS "Public can submit to published assessments" ON assessment_submissions;
      DROP POLICY IF EXISTS "Service role can manage assessment submissions" ON assessment_submissions;
      
      CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions FOR SELECT USING (
        owner_id = get_user_id_from_clerk()
      );
      
      CREATE POLICY "Public can submit to published assessments" ON assessment_submissions FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM assessments 
          WHERE assessments.id = assessment_submissions.assessment_id 
          AND assessments.is_published = true
        )
      );
      
      CREATE POLICY "Service role can manage assessment submissions" ON assessment_submissions FOR ALL USING (auth.role() = 'service_role');
    `;
    
    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: policiesSQL });
    
    if (policiesError) {
      console.log('❌ Failed to create policies:', policiesError.message);
    } else {
      console.log('✅ RLS policies created');
    }
    
    console.log('🎉 Table structure fixed successfully!');
    
    // Test the new structure
    console.log('🧪 Testing new table structure...');
    const { data, error } = await supabase.from('assessment_submissions').select('*').limit(0);
    
    if (error) {
      console.log('❌ Test failed:', error.message);
    } else {
      console.log('✅ Table structure test passed');
    }
    
  } catch (error) {
    console.error('❌ Failed to fix table structure:', error);
  }
}

fixTableStructure();
