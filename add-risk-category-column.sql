-- Add risk_category column to leads table
-- Run this SQL in your Supabase SQL editor

-- Add the new column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS risk_category TEXT DEFAULT 'Not Assessed';

-- Update existing records to have a default value
UPDATE leads SET risk_category = 'Not Assessed' WHERE risk_category IS NULL;

-- Add a comment to document the field
COMMENT ON COLUMN leads.risk_category IS 'Risk category from assessment (Conservative, Moderate, Growth, Aggressive)';

-- Verify the change
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'risk_category';
