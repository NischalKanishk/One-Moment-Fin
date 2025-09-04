-- Migration: Add Calendly configuration to user_settings table
-- This migration adds Calendly username configuration for future Scheduling API integration
-- Date: 2025-01-XX
-- Description: Simplified Calendly integration - username only, no API key required

-- Add Calendly configuration columns to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS calendly_username TEXT,
ADD COLUMN IF NOT EXISTS calendly_organization_uri TEXT,
ADD COLUMN IF NOT EXISTS calendly_user_uri TEXT;

-- Add comments for the new columns
COMMENT ON COLUMN user_settings.calendly_username IS 'Calendly username for the user (e.g., "johnsmith")';
COMMENT ON COLUMN user_settings.calendly_organization_uri IS 'Calendly organization URI (for future Scheduling API)';
COMMENT ON COLUMN user_settings.calendly_user_uri IS 'Calendly user URI (for future Scheduling API)';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_calendly_username ON user_settings(calendly_username);
CREATE INDEX IF NOT EXISTS idx_user_settings_calendly_org_uri ON user_settings(calendly_organization_uri);
CREATE INDEX IF NOT EXISTS idx_user_settings_calendly_user_uri ON user_settings(calendly_user_uri);

-- Add constraint to ensure username is not empty if provided
ALTER TABLE user_settings 
ADD CONSTRAINT IF NOT EXISTS check_calendly_username_not_empty 
CHECK (calendly_username IS NULL OR calendly_username != '');

-- Add constraint to ensure username format is valid (alphanumeric, hyphens, underscores only)
ALTER TABLE user_settings 
ADD CONSTRAINT IF NOT EXISTS check_calendly_username_format 
CHECK (calendly_username IS NULL OR calendly_username ~ '^[a-zA-Z0-9_-]+$');

-- Update existing records if needed (optional)
-- This can be run if you want to migrate existing data
-- UPDATE user_settings SET calendly_username = LOWER(calendly_username) WHERE calendly_username IS NOT NULL;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name LIKE 'calendly_%'
ORDER BY column_name;
