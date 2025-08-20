-- Add missing google_calendar_connected column to user_settings table
-- This column is required by the MeetingService.checkGoogleCalendarConnection method

-- Add the missing column
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT FALSE;

-- Update existing records to set the default value
UPDATE user_settings 
SET google_calendar_connected = FALSE 
WHERE google_calendar_connected IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE user_settings 
ALTER COLUMN google_calendar_connected SET NOT NULL;

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Added google_calendar_connected column to user_settings table';
END $$;
