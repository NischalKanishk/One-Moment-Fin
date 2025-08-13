-- Fix assessment_submissions table structure to match expected schema
-- This migration converts the table from the fix-question-types.sql structure
-- to the risk-assessment-system-migration.sql structure

-- First, backup existing data (if any)
CREATE TABLE IF NOT EXISTS assessment_submissions_backup AS 
SELECT * FROM assessment_submissions;

-- Drop the existing table
DROP TABLE IF EXISTS assessment_submissions;

-- Create the correct table structure
CREATE TABLE assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  framework_version_id UUID NOT NULL REFERENCES risk_framework_versions(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL,                    -- assessment owner (MFD)
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answers JSONB NOT NULL,                    -- { qkey: value }
  result JSONB NOT NULL,                     -- { score, bucket, rubric:{ capacity, tolerance, need, warnings[] } }
  lead_id UUID
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment_id ON assessment_submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_owner_id ON assessment_submissions(owner_id);

-- Enable RLS
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_submissions
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

-- Note: If you had data in the old table, you would need to migrate it here
-- For now, the table is empty so we can safely recreate it
