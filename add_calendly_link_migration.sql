-- Migration: Add Calendly Link Support and Remove Google Calendar Integration
-- Date: 2025-01-27
-- Description: Replace Google Meeting functionality with Calendly integration

-- Add calendly_link column to meetings table
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS calendly_link TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN meetings.calendly_link IS 'Calendly scheduling link for the meeting';

-- Update existing meetings to set default platform if it was google_meet
UPDATE meetings 
SET platform = 'manual' 
WHERE platform = 'google_meet';

-- Remove any Google Calendar related columns if they exist
-- Note: These columns may not exist in all environments, so we use IF EXISTS
DO $$ 
BEGIN
    -- Remove external_event_id column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'meetings' AND column_name = 'external_event_id') THEN
        ALTER TABLE meetings DROP COLUMN external_event_id;
    END IF;
    
    -- Remove any other Google Calendar related columns that might exist
    -- Add more columns here if needed in the future
END $$;

-- Update the platform check constraint to only allow valid platforms
-- First drop the existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'meetings_platform_check') THEN
        ALTER TABLE meetings DROP CONSTRAINT meetings_platform_check;
    END IF;
END $$;

-- Add new constraint for valid platforms
ALTER TABLE meetings 
ADD CONSTRAINT meetings_platform_check 
CHECK (platform IN ('calendly', 'zoom', 'manual'));

-- Create index on calendly_link for better query performance
CREATE INDEX IF NOT EXISTS idx_meetings_calendly_link ON meetings(calendly_link);

-- Update any existing meetings that might have invalid platform values
UPDATE meetings 
SET platform = 'manual' 
WHERE platform NOT IN ('calendly', 'zoom', 'manual');

-- Add comment to the meetings table
COMMENT ON TABLE meetings IS 'Meetings table with Calendly integration support';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'meetings' 
ORDER BY ordinal_position;
