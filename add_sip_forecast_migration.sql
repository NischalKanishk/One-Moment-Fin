-- Migration to add sip_forecast column to leads table
-- This fixes the 500 error when trying to save SIP forecast data

-- Add sip_forecast column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS sip_forecast JSONB DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN leads.sip_forecast IS 'Stores SIP forecast data including monthly investment, years, expected return, inflation rate, and saved timestamp';

-- Create an index on the sip_forecast column for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_sip_forecast ON leads USING GIN (sip_forecast);

-- Update the existing leads table to ensure the column is properly added
-- This is safe to run multiple times due to IF NOT EXISTS
