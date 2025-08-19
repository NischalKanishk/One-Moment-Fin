-- Fix RLS policies properly for public assessment submissions
-- This migration allows public users to submit assessments through assessment links

-- First, re-enable RLS
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own assessment submissions" ON assessment_submissions;
DROP POLICY IF EXISTS "Users can insert own assessment submissions" ON assessment_submissions;
DROP POLICY IF EXISTS "Users can update own assessment submissions" ON assessment_submissions;
DROP POLICY IF EXISTS "Public can insert assessment submissions" ON assessment_submissions;
DROP POLICY IF EXISTS "Service role can manage all assessment submissions" ON assessment_submissions;

DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
DROP POLICY IF EXISTS "Public can update leads" ON leads;
DROP POLICY IF EXISTS "Service role can manage all leads" ON leads;

-- Create new policies for assessment_submissions
-- Allow public insertion (for assessment submissions)
CREATE POLICY "Public can insert assessment submissions" ON assessment_submissions
    FOR INSERT WITH CHECK (true); -- Allow all inserts for now

-- Allow users to view their own submissions
CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions
    FOR SELECT USING (
        owner_id = get_user_id_from_clerk() OR 
        auth.role() = 'service_role'
    );

-- Allow users to update their own submissions
CREATE POLICY "Users can update own assessment submissions" ON assessment_submissions
    FOR UPDATE USING (
        owner_id = get_user_id_from_clerk() OR 
        auth.role() = 'service_role'
    );

-- Service role can do everything
CREATE POLICY "Service role can manage all assessment submissions" ON assessment_submissions
    FOR ALL USING (auth.role() = 'service_role');

-- Create new policies for leads
-- Allow public insertion (for leads created through assessments)
CREATE POLICY "Public can insert leads" ON leads
    FOR INSERT WITH CHECK (true); -- Allow all inserts for now

-- Allow users to view their own leads
CREATE POLICY "Users can view own leads" ON leads
    FOR SELECT USING (
        user_id = get_user_id_from_clerk() OR 
        auth.role() = 'service_role'
    );

-- Allow public updates (for risk profile updates)
CREATE POLICY "Public can update leads" ON leads
    FOR UPDATE USING (true); -- Allow all updates for now

-- Allow users to delete their own leads
CREATE POLICY "Users can delete own leads" ON leads
    FOR DELETE USING (
        user_id = get_user_id_from_clerk() OR 
        auth.role() = 'service_role'
    );

-- Service role can do everything
CREATE POLICY "Service role can manage all leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

-- Add comments
COMMENT ON TABLE assessment_submissions IS 'Assessment submissions with RLS policies allowing public submissions through assessment links';
COMMENT ON TABLE leads IS 'Leads with RLS policies allowing public creation and updates through assessment links';
