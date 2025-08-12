-- Safe Fix for Duplicate Assessment Forms Issue
-- This migration safely handles foreign key constraints when cleaning up duplicates

-- 1. First, identify duplicate assessment forms and create temporary tables
-- Keep the oldest one for each user/name combination
CREATE TEMP TABLE duplicate_forms_to_keep AS
SELECT id, user_id, name FROM (
  SELECT id,
         user_id,
         name,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, name 
           ORDER BY created_at ASC
         ) as rn
  FROM assessment_forms
) ranked WHERE rn = 1;

CREATE TEMP TABLE duplicate_forms_to_remove AS
SELECT id, user_id, name FROM (
  SELECT id,
         user_id,
         name,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, name 
           ORDER BY created_at ASC
         ) as rn
  FROM assessment_forms
) ranked WHERE rn > 1;

-- 2. Update all references to point to the forms we're keeping
UPDATE assessment_submissions 
SET form_id = (
  SELECT k.id 
  FROM duplicate_forms_to_keep k 
  WHERE k.user_id = assessment_submissions.user_id 
  AND k.name = (
    SELECT name FROM assessment_forms WHERE id = assessment_submissions.form_id
  )
)
WHERE form_id IN (SELECT id FROM duplicate_forms_to_remove);

-- Update lead assessment assignments
UPDATE lead_assessment_assignments 
SET form_id = (
  SELECT k.id 
  FROM duplicate_forms_to_keep k 
  WHERE k.user_id = lead_assessment_assignments.user_id 
  AND k.name = (
    SELECT name FROM assessment_forms WHERE id = lead_assessment_assignments.form_id
  )
)
WHERE form_id IN (SELECT id FROM duplicate_forms_to_remove);

-- Update assessment links
UPDATE assessment_links 
SET form_id = (
  SELECT k.id 
  FROM duplicate_forms_to_keep k 
  WHERE k.user_id = assessment_links.user_id 
  AND k.name = (
    SELECT name FROM assessment_forms WHERE id = assessment_links.form_id
  )
)
WHERE form_id IN (SELECT id FROM duplicate_forms_to_remove);

-- Update users default_assessment_form_id if it points to a form being removed
UPDATE users 
SET default_assessment_form_id = (
  SELECT k.id 
  FROM duplicate_forms_to_keep k 
  WHERE k.user_id = users.id 
  AND k.name = (
    SELECT name FROM assessment_forms WHERE id = users.default_assessment_form_id
  )
)
WHERE default_assessment_form_id IN (SELECT id FROM duplicate_forms_to_remove);

-- 3. Now we can safely delete the duplicate forms
DELETE FROM assessment_forms 
WHERE id IN (SELECT id FROM duplicate_forms_to_remove);

-- 4. Clean up temporary tables
DROP TABLE duplicate_forms_to_keep;
DROP TABLE duplicate_forms_to_remove;

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE assessment_forms 
ADD CONSTRAINT unique_user_assessment_name 
UNIQUE (user_id, name);

-- 3. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_forms_user_name 
ON assessment_forms(user_id, name);

-- 4. Add updated_at column if it doesn't exist
ALTER TABLE assessment_forms 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_assessment_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_update_assessment_forms_updated_at ON assessment_forms;

-- 7. Create the trigger
CREATE TRIGGER trigger_update_assessment_forms_updated_at
  BEFORE UPDATE ON assessment_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_forms_updated_at();
