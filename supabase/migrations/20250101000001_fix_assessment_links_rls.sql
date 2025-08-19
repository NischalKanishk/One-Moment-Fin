-- Fix RLS policies for assessment_links to allow public access
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own assessment links" ON assessment_links;

-- Create a new policy that allows users to view their own links
CREATE POLICY "Users can view own assessment links" ON assessment_links
    FOR SELECT USING (user_id = get_user_id_from_clerk());

-- Create a new policy that allows public access to active assessment links
CREATE POLICY "Public can view active assessment links" ON assessment_links
    FOR SELECT USING (status = 'active' AND expires_at > NOW());

-- Keep other policies unchanged
-- Users can insert own assessment links
-- Users can update own assessment links  
-- Service role can manage all assessment links
