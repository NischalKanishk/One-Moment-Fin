-- Step-by-Step Fix for Duplicate Assessment Forms Issue
-- This migration handles foreign key constraints safely by updating references step by step

-- Step 1: Create a mapping table of duplicate forms to their keepers
CREATE TEMP TABLE form_mapping AS
SELECT 
  d.id as duplicate_id,
  k.id as keeper_id,
  d.user_id,
  d.name
FROM (
  SELECT id, user_id, name,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, name 
           ORDER BY created_at ASC
         ) as rn
  FROM assessment_forms
) d
JOIN (
  SELECT id, user_id, name
  FROM (
    SELECT id, user_id, name,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, name 
             ORDER BY created_at ASC
           ) as rn
    FROM assessment_forms
  ) ranked 
  WHERE rn = 1
) k ON d.user_id = k.user_id AND d.name = k.name
WHERE d.rn > 1;

-- Step 2: Update assessment_submissions to point to keeper forms
UPDATE assessment_submissions 
SET form_id = (
  SELECT keeper_id 
  FROM form_mapping 
  WHERE duplicate_id = assessment_submissions.form_id
)
WHERE form_id IN (SELECT duplicate_id FROM form_mapping);

-- Step 3: Update lead_assessment_assignments to point to keeper forms
UPDATE lead_assessment_assignments 
SET form_id = (
  SELECT keeper_id 
  FROM form_mapping 
  WHERE duplicate_id = lead_assessment_assignments.form_id
)
WHERE form_id IN (SELECT duplicate_id FROM form_mapping);

-- Step 4: Update assessment_links to point to keeper forms
UPDATE assessment_links 
SET form_id = (
  SELECT keeper_id 
  FROM form_mapping 
  WHERE duplicate_id = assessment_links.form_id
)
WHERE form_id IN (SELECT duplicate_id FROM form_mapping);

-- Step 5: Update users default_assessment_form_id to point to keeper forms
UPDATE users 
SET default_assessment_form_id = (
  SELECT keeper_id 
  FROM form_mapping 
  WHERE duplicate_id = users.default_assessment_form_id
)
WHERE default_assessment_form_id IN (SELECT duplicate_id FROM form_mapping);

-- Step 6: Now safely delete the duplicate forms
DELETE FROM assessment_forms 
WHERE id IN (SELECT duplicate_id FROM form_mapping);

-- Step 7: Clean up temporary table
DROP TABLE form_mapping;

-- Step 8: Add unique constraint to prevent future duplicates
ALTER TABLE assessment_forms 
ADD CONSTRAINT unique_user_assessment_name 
UNIQUE (user_id, name);

-- Step 9: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_forms_user_name 
ON assessment_forms(user_id, name);

-- Step 10: Add updated_at column if it doesn't exist
ALTER TABLE assessment_forms 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 11: Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_assessment_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_update_assessment_forms_updated_at ON assessment_forms;

-- Step 13: Create the trigger
CREATE TRIGGER trigger_update_assessment_forms_updated_at
  BEFORE UPDATE ON assessment_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_forms_updated_at();
