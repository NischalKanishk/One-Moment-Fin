-- Fix RLS policy for assessment_submissions to allow users to see submissions for their leads
-- This fixes the issue where public assessment submissions (owner_id = null) were not visible

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own assessment submissions" ON assessment_submissions;

-- Create new policy that allows users to see submissions for leads they own
CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions
    FOR SELECT USING (
        owner_id = get_user_id_from_clerk() OR 
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = assessment_submissions.lead_id 
            AND leads.user_id = get_user_id_from_clerk()
        )
    );

-- Log the policy update
DO $$
BEGIN
    RAISE NOTICE 'Updated RLS policy for assessment_submissions to allow viewing submissions for owned leads';
END $$;
