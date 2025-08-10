-- Fix the circular reference between meetings and leads tables
-- The leads.meeting_id field is unnecessary since meetings.lead_id already establishes the relationship

-- First, let's check if there are any existing meetings that might be affected
-- SELECT COUNT(*) FROM leads WHERE meeting_id IS NOT NULL;

-- Remove the meeting_id column from leads table as it creates a circular reference
-- The relationship should only go from meetings to leads via meetings.lead_id
ALTER TABLE leads DROP COLUMN IF EXISTS meeting_id;

-- Add a comment to clarify the relationship
COMMENT ON TABLE meetings IS 'Meetings are linked to leads via lead_id. The leads table should not reference back to meetings to avoid circular references.';

-- Verify the fix by checking the table structure
-- \d+ leads
-- \d+ meetings
