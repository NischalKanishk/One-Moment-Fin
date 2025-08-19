-- Fix assessment_id NOT NULL constraint issue
-- This migration makes assessment_id nullable as intended in the original schema

-- Make assessment_id nullable (remove NOT NULL constraint)
ALTER TABLE assessment_submissions 
ALTER COLUMN assessment_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN assessment_submissions.assessment_id IS 'ID of the assessment form (nullable for public submissions)';
