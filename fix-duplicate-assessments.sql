-- Fix Duplicate Assessment Forms Issue
-- This migration adds a unique constraint to prevent duplicate forms and cleans up existing duplicates

-- 1. First, identify duplicate assessment forms
-- Keep the oldest one for each user/name combination
WITH duplicates AS (
  SELECT id,
         user_id,
         name,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, name 
           ORDER BY created_at ASC
         ) as rn
  FROM assessment_forms
),
forms_to_keep AS (
  SELECT id FROM duplicates WHERE rn = 1
),
forms_to_remove AS (
  SELECT id FROM duplicates WHERE rn > 1
)
-- Update all references to point to the forms we're keeping
UPDATE assessment_submissions 
SET form_id = (
  SELECT k.id 
  FROM forms_to_keep k 
  JOIN assessment_forms af ON af.id = k.id 
  WHERE af.user_id = assessment_submissions.user_id 
  AND af.name = (
    SELECT name FROM assessment_forms WHERE id = assessment_submissions.form_id
  )
)
WHERE form_id IN (SELECT id FROM forms_to_remove);

-- Update lead assessment assignments
UPDATE lead_assessment_assignments 
SET form_id = (
  SELECT k.id 
  FROM forms_to_keep k 
  JOIN assessment_forms af ON af.id = k.id 
  WHERE af.user_id = lead_assessment_assignments.user_id 
  AND af.name = (
    SELECT name FROM assessment_forms WHERE id = lead_assessment_assignments.form_id
  )
)
WHERE form_id IN (SELECT id FROM forms_to_remove);

-- Update assessment links
UPDATE assessment_links 
SET form_id = (
  SELECT k.id 
  FROM forms_to_keep k 
  JOIN assessment_forms af ON af.id = k.id 
  WHERE af.user_id = assessment_links.user_id 
  AND af.name = (
    SELECT name FROM assessment_forms WHERE id = assessment_links.form_id
  )
)
WHERE form_id IN (SELECT id FROM forms_to_remove);

-- Update users default_assessment_form_id if it points to a form being removed
UPDATE users 
SET default_assessment_form_id = (
  SELECT k.id 
  FROM forms_to_keep k 
  JOIN assessment_forms af ON af.id = k.id 
  WHERE af.user_id = users.id 
  AND af.name = (
    SELECT name FROM assessment_forms WHERE id = users.default_assessment_form_id
  )
)
WHERE default_assessment_form_id IN (SELECT id FROM forms_to_remove);

-- Now we can safely delete the duplicate forms
DELETE FROM assessment_forms 
WHERE id IN (SELECT id FROM forms_to_remove);

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE assessment_forms 
ADD CONSTRAINT unique_user_assessment_name 
UNIQUE (user_id, name);

-- 3. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_forms_user_name 
ON assessment_forms(user_id, name);

-- 4. Update the seeding logic to check for existing forms first
-- This will be handled in the application code
