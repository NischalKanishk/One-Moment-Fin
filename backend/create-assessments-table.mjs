import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAssessmentsTable() {
  try {
    console.log('🔧 Creating assessments table using Supabase client...\n');

    // First, let's check if we can create a simple table structure
    // We'll use the Supabase client to create the table step by step
    
    console.log('📋 Step 1: Creating basic assessments table structure...');
    
    // Try to create a simple table first
    const { error: createError } = await supabase
      .from('assessments')
      .select('id')
      .limit(1);
    
    if (createError && createError.message.includes('relation "assessments" does not exist')) {
      console.log('❌ Assessments table does not exist - we need to create it manually');
      console.log('\n📋 Manual steps required:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the following SQL:');
      console.log('\n```sql');
      console.log('-- Create the assessments table');
      console.log('CREATE TABLE IF NOT EXISTS assessments (');
      console.log('  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,');
      console.log('  title TEXT NOT NULL,');
      console.log('  slug TEXT NOT NULL,');
      console.log('  framework_version_id UUID REFERENCES risk_framework_versions(id) ON DELETE RESTRICT,');
      console.log('  is_default BOOLEAN NOT NULL DEFAULT false,');
      console.log('  is_published BOOLEAN NOT NULL DEFAULT false,');
      console.log('  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),');
      console.log('  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()');
      console.log(');');
      console.log('');
      console.log('-- Add unique constraint');
      console.log('ALTER TABLE assessments ADD CONSTRAINT IF NOT EXISTS unique_owner_slug UNIQUE (user_id, slug);');
      console.log('');
      console.log('-- Create indexes');
      console.log('CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_assessments_framework_version_id ON assessments(framework_version_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_assessments_slug ON assessments(slug);');
      console.log('CREATE INDEX IF NOT EXISTS idx_assessments_is_default ON assessments(is_default);');
      console.log('');
      console.log('-- Enable RLS');
      console.log('ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('-- Create RLS policies');
      console.log('CREATE POLICY "Users can view own assessments" ON assessments FOR SELECT USING (');
      console.log('  user_id = get_user_id_from_clerk()');
      console.log(');');
      console.log('');
      console.log('CREATE POLICY "Users can insert own assessments" ON assessments FOR INSERT WITH CHECK (');
      console.log('  user_id = get_user_id_from_clerk()');
      console.log(');');
      console.log('');
      console.log('CREATE POLICY "Users can update own assessments" ON assessments FOR UPDATE USING (');
      console.log('  user_id = get_user_id_from_clerk()');
      console.log(');');
      console.log('');
      console.log('CREATE POLICY "Users can delete own assessments" ON assessments FOR DELETE USING (');
      console.log('  user_id = get_user_id_from_clerk()');
      console.log(');');
      console.log('');
      console.log('CREATE POLICY "Service role can manage all assessments" ON assessments FOR ALL USING (');
      console.log('  auth.role() = \'service_role\'');
      console.log(');');
      console.log('');
      console.log('-- Create default assessments for existing users');
      console.log('INSERT INTO assessments (user_id, title, slug, framework_version_id, is_default, is_published)');
      console.log('SELECT ');
      console.log('  u.id,');
      console.log('  \'Default Risk Assessment\',');
      console.log('  \'default-risk-assessment-\' || u.id::text,');
      console.log('  (SELECT id FROM risk_framework_versions WHERE is_default = true LIMIT 1),');
      console.log('  true,');
      console.log('  false');
      console.log('FROM users u');
      console.log('WHERE NOT EXISTS (');
      console.log('  SELECT 1 FROM assessments a WHERE a.user_id = u.id AND a.is_default = true');
      console.log(');');
      console.log('```');
      console.log('\n4. After running the SQL, restart your backend server');
      console.log('5. Try accessing the assessments page again');
      
    } else if (createError) {
      console.log('❌ Error checking assessments table:', createError.message);
    } else {
      console.log('✅ Assessments table already exists!');
      
      // Check the structure
      const { data: sample, error: sampleError } = await supabase
        .from('assessments')
        .select('*')
        .limit(1);
      
      if (sample && sample.length > 0) {
        console.log('📋 Table columns:', Object.keys(sample[0]));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAssessmentsTable();
