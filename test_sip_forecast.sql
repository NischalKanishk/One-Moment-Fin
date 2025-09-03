-- Test script to verify SIP forecast functionality
-- Run this on your Supabase database to test the new column

-- 1. Check if the column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'sip_forecast';

-- 2. Test inserting a sample SIP forecast
-- First, get a sample lead ID (replace with an actual lead ID from your database)
-- SELECT id FROM leads LIMIT 1;

-- 3. Test updating a lead with SIP forecast (uncomment and modify as needed)
-- UPDATE leads 
-- SET sip_forecast = '{
--   "monthly_investment": 10000,
--   "years": 15,
--   "expected_return_pct": 12,
--   "inflation_pct": 6,
--   "saved_at": "2024-01-01T00:00:00.000Z"
-- }'::jsonb
-- WHERE id = 'your-lead-id-here';

-- 4. Verify the update worked
-- SELECT id, sip_forecast FROM leads WHERE id = 'your-lead-id-here';

-- 5. Check the index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'leads' AND indexname = 'idx_leads_sip_forecast';
