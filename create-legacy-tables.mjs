import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createLegacyTables() {
  try {
    console.log('🔨 Creating missing legacy tables for submitAssessment method...');
    
    // Create risk_assessments table
    console.log('\n1️⃣ Creating risk_assessments table...');
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS risk_assessments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
            risk_score INTEGER NOT NULL,
            risk_category TEXT NOT NULL CHECK (risk_category IN ('low', 'medium', 'high')),
            lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create indexes for better performance
          CREATE INDEX IF NOT EXISTS idx_risk_assessments_user_id ON risk_assessments(user_id);
          CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessment_id ON risk_assessments(assessment_id);
          CREATE INDEX IF NOT EXISTS idx_risk_assessments_lead_id ON risk_assessments(lead_id);
          
          -- Add RLS policies
          ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
          
          -- Policy: Users can view their own risk assessments
          CREATE POLICY "Users can view own risk assessments" ON risk_assessments
            FOR SELECT USING (auth.uid()::text = user_id::text);
          
          -- Policy: Users can insert their own risk assessments
          CREATE POLICY "Users can insert own risk assessments" ON risk_assessments
            FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
          
          -- Policy: Users can update their own risk assessments
          CREATE POLICY "Users can update own risk assessments" ON risk_assessments
            FOR UPDATE USING (auth.uid()::text = user_id::text);
        `
      });
      
      if (error) {
        console.log('❌ Error creating risk_assessments table:', error.message);
        console.log('Error details:', error);
      } else {
        console.log('✅ risk_assessments table created successfully!');
      }
    } catch (e) {
      console.log('❌ Exception creating risk_assessments table:', e.message);
    }
    
    // Create risk_assessment_answers table
    console.log('\n2️⃣ Creating risk_assessment_answers table...');
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS risk_assessment_answers (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            risk_assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
            question_id TEXT NOT NULL,
            answer_value TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create indexes for better performance
          CREATE INDEX IF NOT EXISTS idx_risk_assessment_answers_risk_assessment_id ON risk_assessment_answers(risk_assessment_id);
          CREATE INDEX IF NOT EXISTS idx_risk_assessment_answers_question_id ON risk_assessment_answers(question_id);
          
          -- Add RLS policies
          ALTER TABLE risk_assessment_answers ENABLE ROW LEVEL SECURITY;
          
          -- Policy: Users can view answers for their own risk assessments
          CREATE POLICY "Users can view own risk assessment answers" ON risk_assessment_answers
            FOR SELECT USING (
              EXISTS (
                SELECT 1 FROM risk_assessments 
                WHERE risk_assessments.id = risk_assessment_answers.risk_assessment_id 
                AND auth.uid()::text = risk_assessments.user_id::text
              )
            );
          
          -- Policy: Users can insert answers for their own risk assessments
          CREATE POLICY "Users can insert own risk assessment answers" ON risk_assessment_answers
            FOR INSERT WITH CHECK (
              EXISTS (
                SELECT 1 FROM risk_assessments 
                WHERE risk_assessments.id = risk_assessment_answers.risk_assessment_id 
                AND auth.uid()::text = risk_assessments.user_id::text
              )
            );
        `
      });
      
      if (error) {
        console.log('❌ Error creating risk_assessment_answers table:', error.message);
        console.log('Error details:', error);
      } else {
        console.log('✅ risk_assessment_answers table created successfully!');
      }
    } catch (e) {
      console.log('❌ Exception creating risk_assessment_answers table:', e.message);
    }
    
    console.log('\n🎯 Legacy tables creation complete!');
    console.log('Now the submitAssessment method should work properly.');
    
  } catch (error) {
    console.error('❌ Creation failed:', error);
  }
}

createLegacyTables();
