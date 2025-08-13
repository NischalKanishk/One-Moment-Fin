-- ============================================================================
-- CREATE MISSING LEGACY TABLES FOR ASSESSMENT SUBMISSION
-- ============================================================================
-- This script creates the missing tables that the submitAssessment method needs
-- Run this in your Supabase Dashboard > SQL Editor

-- ============================================================================
-- 1. CREATE risk_assessments TABLE
-- ============================================================================
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

-- ============================================================================
-- 2. CREATE risk_assessment_answers TABLE
-- ============================================================================
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

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessment_answers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES FOR risk_assessments
-- ============================================================================
-- Policy: Users can view their own risk assessments
CREATE POLICY "Users can view own risk assessments" ON risk_assessments
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Policy: Users can insert their own risk assessments
CREATE POLICY "Users can insert own risk assessments" ON risk_assessments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can update their own risk assessments
CREATE POLICY "Users can update own risk assessments" ON risk_assessments
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- 5. CREATE RLS POLICIES FOR risk_assessment_answers
-- ============================================================================
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

-- ============================================================================
-- 6. VERIFICATION QUERIES (Optional - run these to confirm tables were created)
-- ============================================================================
-- Check if tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name IN ('risk_assessments', 'risk_assessment_answers')
AND table_schema = 'public';

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'risk_assessments'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'risk_assessment_answers'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- After running this script, you should see:
-- 1. Two new tables: risk_assessments and risk_assessment_answers
-- 2. Proper indexes for performance
-- 3. RLS policies for security
-- 4. The assessment submission should now work!
-- ============================================================================
