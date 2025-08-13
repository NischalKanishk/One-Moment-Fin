-- Add assessment_link field to users table
-- This will store the unique assessment link for each user

ALTER TABLE users ADD COLUMN assessment_link TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_users_assessment_link ON users(assessment_link);

-- Update existing users to have assessment links
-- Format: /assessment/{user_id_slice}
UPDATE users 
SET assessment_link = CONCAT('/assessment/', SUBSTRING(id::text, 1, 8))
WHERE assessment_link IS NULL;

-- Make the field NOT NULL after setting default values
ALTER TABLE users ALTER COLUMN assessment_link SET NOT NULL;
