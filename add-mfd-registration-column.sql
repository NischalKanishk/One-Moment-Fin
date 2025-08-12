-- Add MFD Registration Number column to users table
-- This script adds the mfd_registration_number field to existing databases

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'mfd_registration_number'
    ) THEN
        ALTER TABLE users ADD COLUMN mfd_registration_number TEXT;
        RAISE NOTICE 'Added mfd_registration_number column to users table';
    ELSE
        RAISE NOTICE 'Column mfd_registration_number already exists in users table';
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN users.mfd_registration_number IS 'SEBI MFD registration number for compliance and verification';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'mfd_registration_number';
