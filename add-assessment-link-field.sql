-- Add assessment_link field to users table
-- This will store the unique assessment link for each user in format: 5 random digits + userid + 5 random letters

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'assessment_link') THEN
        ALTER TABLE users ADD COLUMN assessment_link TEXT UNIQUE;
    END IF;
END $$;

-- Create index for faster lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_assessment_link ON users(assessment_link);

-- Update existing users to have assessment links in the new format
-- Format: 5 random digits + userid + 5 random letters
UPDATE users 
SET assessment_link = (
    LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0') || 
    id::TEXT || 
    CHR(65 + FLOOR(RANDOM() * 26)::INTEGER) ||
    CHR(65 + FLOOR(RANDOM() * 26)::INTEGER) ||
    CHR(65 + FLOOR(RANDOM() * 26)::INTEGER) ||
    CHR(65 + FLOOR(RANDOM() * 26)::INTEGER) ||
    CHR(65 + FLOOR(RANDOM() * 26)::INTEGER)
)
WHERE assessment_link IS NULL;

-- Make the field NOT NULL after setting default values
ALTER TABLE users ALTER COLUMN assessment_link SET NOT NULL;
