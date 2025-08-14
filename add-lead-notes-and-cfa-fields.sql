-- Add notes and CFA framework fields to leads table
-- This migration adds fields for storing lead notes and CFA framework specific information

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS cfa_goals TEXT,
ADD COLUMN IF NOT EXISTS cfa_min_investment VARCHAR(100),
ADD COLUMN IF NOT EXISTS cfa_investment_horizon VARCHAR(50);

-- Add comments to document the new fields
COMMENT ON COLUMN leads.notes IS 'General notes about the lead, preferences, and important information (max 500 characters)';
COMMENT ON COLUMN leads.cfa_goals IS 'Financial goals as identified through CFA framework assessment';
COMMENT ON COLUMN leads.cfa_min_investment IS 'Minimum investment amount the lead is willing to commit';
COMMENT ON COLUMN leads.cfa_investment_horizon IS 'Investment time horizon (short_term, medium_term, long_term)';

-- Create an index on notes for better search performance
CREATE INDEX IF NOT EXISTS idx_leads_notes ON leads USING gin(to_tsvector('english', notes));

-- Update existing leads to have empty strings instead of NULL for better UX
UPDATE leads 
SET notes = COALESCE(notes, ''),
    cfa_goals = COALESCE(cfa_goals, ''),
    cfa_min_investment = COALESCE(cfa_min_investment, ''),
    cfa_investment_horizon = COALESCE(cfa_investment_horizon, '')
WHERE notes IS NULL 
   OR cfa_goals IS NULL 
   OR cfa_min_investment IS NULL 
   OR cfa_investment_horizon IS NULL;
