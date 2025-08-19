-- Fix RLS policies for assessment_submissions and leads tables to allow public submissions
-- This migration allows assessment submissions and leads to be created by public users through assessment links

-- ============================================================================
-- ASSESSMENT SUBMISSIONS TABLE RLS FIXES
-- ============================================================================

-- Drop the restrictive RLS policies
DROP POLICY IF EXISTS "Users can view own assessment submissions" ON assessment_submissions;
DROP POLICY IF EXISTS "Users can insert own assessment submissions" ON assessment_submissions;
DROP POLICY IF EXISTS "Users can update own assessment submissions" ON assessment_submissions;

-- Create new policies that allow public submissions
-- Users can view assessment submissions they own
CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions
    FOR SELECT USING (owner_id = get_user_id_from_clerk());

-- Allow public users to insert assessment submissions (for assessment links)
-- This policy allows insertion when the owner_id exists in the users table
CREATE POLICY "Public can insert assessment submissions" ON assessment_submissions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = assessment_submissions.owner_id
        )
    );

-- Users can update their own assessment submissions
CREATE POLICY "Users can update own assessment submissions" ON assessment_submissions
    FOR UPDATE USING (owner_id = get_user_id_from_clerk());

-- Service role can manage all assessment submissions
CREATE POLICY "Service role can manage all assessment submissions" ON assessment_submissions
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- LEADS TABLE RLS FIXES
-- ============================================================================

-- Drop the restrictive RLS policies
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;

-- Create new policies that allow public lead creation
-- Users can view their own leads
-- (Keep existing: Users can view own leads)

-- Allow public users to insert leads (for assessment submissions)
-- This policy allows insertion when the user_id exists in the users table
CREATE POLICY "Public can insert leads" ON leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = leads.user_id
        )
    );

-- Allow public users to update leads (for risk profile updates)
-- This policy allows updates when the user_id exists in the users table
CREATE POLICY "Public can update leads" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = leads.user_id
        )
    );

-- Users can delete their own leads
-- (Keep existing: Users can delete own leads)

-- Service role can manage all leads (for backend operations)
-- (Keep existing: Service role can manage all leads)

-- Add comments explaining the changes
COMMENT ON TABLE assessment_submissions IS 'Assessment submissions with RLS policies allowing public submissions through assessment links';
COMMENT ON TABLE leads IS 'Leads with RLS policies allowing public creation and updates through assessment links';
