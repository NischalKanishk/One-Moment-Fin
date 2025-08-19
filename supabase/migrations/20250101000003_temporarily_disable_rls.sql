-- TEMPORARY: Disable RLS for assessment_submissions table to test data insertion
-- This is for debugging purposes only - DO NOT use in production

-- Disable RLS temporarily
ALTER TABLE assessment_submissions DISABLE ROW LEVEL SECURITY;

-- Add a comment to remind us this is temporary
COMMENT ON TABLE assessment_submissions IS 'TEMPORARILY DISABLED RLS FOR TESTING - RE-ENABLE AFTER FIXING POLICIES';

-- Also disable RLS for leads table temporarily
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE leads IS 'TEMPORARILY DISABLED RLS FOR TESTING - RE-ENABLE AFTER FIXING POLICIES';
