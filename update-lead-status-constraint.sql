-- Update lead status constraint to include new status values
-- This allows leads to have status: 'lead', 'assessment_done', 'meeting_scheduled', 'converted', 'dropped', 'halted', 'rejected'

-- First, drop the existing constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add the new constraint with updated status values
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('lead', 'assessment_done', 'meeting_scheduled', 'converted', 'dropped', 'halted', 'rejected'));

-- Update any existing leads with 'assessment_done' status to ensure consistency
-- (This is optional but recommended for data consistency)
UPDATE leads SET status = 'assessment_done' WHERE status = 'assessment_done';

-- Verify the constraint is working
SELECT status, COUNT(*) FROM leads GROUP BY status;
