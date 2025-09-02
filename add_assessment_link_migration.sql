-- Migration to add assessment_link column to users table
-- Run this in your Supabase SQL editor

-- Add the assessment_link column
ALTER TABLE users ADD COLUMN IF NOT EXISTS assessment_link TEXT UNIQUE;

-- Update existing users with assessment_link if they don't have one
UPDATE users 
SET assessment_link = CONCAT('16849', clerk_id, 'FQZNZ')
WHERE assessment_link IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_assessment_link ON users(assessment_link);
