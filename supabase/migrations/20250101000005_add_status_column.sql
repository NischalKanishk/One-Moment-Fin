-- Add missing status column to assessment_submissions table
-- This migration adds the status column that was missing from the actual table

-- Add the status column
ALTER TABLE assessment_submissions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected'));

-- Add the review_reason column if it doesn't exist
ALTER TABLE assessment_submissions 
ADD COLUMN IF NOT EXISTS review_reason TEXT;

-- Update any existing rows to have the default status
UPDATE assessment_submissions 
SET status = 'submitted' 
WHERE status IS NULL;

-- Add comment
COMMENT ON COLUMN assessment_submissions.status IS 'Status of the assessment submission: submitted, approved, or rejected';
COMMENT ON COLUMN assessment_submissions.review_reason IS 'Reason for approval or rejection if status is not submitted';
