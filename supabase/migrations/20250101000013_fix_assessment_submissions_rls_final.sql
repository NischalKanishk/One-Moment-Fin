-- Fix RLS policy for assessment_submissions to ensure users can see their own submissions
-- This fixes the issue where assessment submissions exist but are not visible due to RLS restrictions

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own assessment submissions" ON assessment_submissions;

-- Create new policy that allows users to see submissions they own OR submissions for leads they own
CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions
    FOR SELECT USING (
        owner_id = get_user_id_from_clerk() OR 
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = assessment_submissions.lead_id 
            AND leads.user_id = get_user_id_from_clerk()
        ) OR
        -- Allow viewing submissions created by the current user (for public assessments)
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND users.id = assessment_submissions.owner_id
        )
    );

-- Log the policy update
DO $$
BEGIN
    RAISE NOTICE 'Updated RLS policy for assessment_submissions to ensure proper visibility';
END $$;
