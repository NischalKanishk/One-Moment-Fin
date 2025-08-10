-- Fix phone constraint to allow NULL values while maintaining uniqueness for non-NULL values
-- This resolves the issue where multiple users without phone numbers violate the unique constraint

-- First, drop the existing unique constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;

-- Add a new unique constraint that only applies to non-NULL phone values
-- This allows multiple users to have NULL phone values
CREATE UNIQUE INDEX users_phone_unique_idx ON users (phone) WHERE phone IS NOT NULL;

-- Update any existing empty string phone values to NULL
UPDATE users SET phone = NULL WHERE phone = '';

-- Add a check constraint to ensure phone is either NULL or a valid phone number
ALTER TABLE users ADD CONSTRAINT users_phone_check CHECK (phone IS NULL OR phone ~ '^[+]?[0-9\s\-\(\)]+$');
