-- Fix RLS Policies for Clerk Authentication - NEW SCHEMA VERSION
-- Run this script in your Supabase SQL editor

-- 1. Create function to extract Clerk user ID from JWT
CREATE OR REPLACE FUNCTION get_clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Extract the 'sub' claim from the JWT token
  -- This is the Clerk user ID
  RETURN current_setting('request.jwt.claims', true)::json->>'sub';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to get user_id from clerk_id
CREATE OR REPLACE FUNCTION get_user_id_from_clerk()
RETURNS UUID AS $$
BEGIN
  -- Get the user_id from users table based on clerk_id from JWT
  RETURN (
    SELECT id FROM users 
    WHERE clerk_id = get_clerk_user_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop all existing RLS policies (if they exist)
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;
DROP POLICY IF EXISTS "Service role can manage all leads" ON leads;
DROP POLICY IF EXISTS "Allow all operations temporarily" ON leads;

-- Drop old table policies (these tables no longer exist in new schema)
-- DROP POLICY IF EXISTS "Users can view own assessments" ON assessments;
-- DROP POLICY IF EXISTS "Users can insert own assessments" ON assessments;
-- DROP POLICY IF EXISTS "Users can update own assessments" ON assessments;
-- DROP POLICY IF EXISTS "Users can delete own assessments" ON assessments;
-- DROP POLICY IF EXISTS "Service role can manage all assessments" ON assessments;

-- DROP POLICY IF EXISTS "Users can view assessment questions" ON assessment_questions;
-- DROP POLICY IF EXISTS "Users can insert assessment questions" ON assessment_questions;
-- DROP POLICY IF EXISTS "Users can update assessment questions" ON assessment_questions;
-- DROP POLICY IF EXISTS "Users can delete assessment questions" ON assessment_questions;
-- DROP POLICY IF EXISTS "Service role can manage assessment questions" ON assessment_questions;

-- DROP POLICY IF EXISTS "Users can view own risk assessments" ON risk_assessments;
-- DROP POLICY IF EXISTS "Users can insert own risk assessments" ON risk_assessments;
-- DROP POLICY IF EXISTS "Users can update own risk assessments" ON risk_assessments;
-- DROP POLICY IF EXISTS "Users can delete own risk assessments" ON risk_assessments;
-- DROP POLICY IF EXISTS "Service role can manage all risk assessments" ON risk_assessments;

-- DROP POLICY IF EXISTS "Users can view own risk assessment answers" ON risk_assessment_answers;
-- DROP POLICY IF EXISTS "Users can insert own risk assessment answers" ON risk_assessment_answers;
-- DROP POLICY IF EXISTS "Users can update own risk assessment answers" ON risk_assessment_answers;
-- DROP POLICY IF EXISTS "Users can delete own risk assessment answers" ON risk_assessment_answers;
-- DROP POLICY IF EXISTS "Service role can manage all risk assessment answers" ON risk_assessment_answers;

-- 4. Create new RLS policies for the NEW SCHEMA

-- Users table policies
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (clerk_id = get_clerk_user_id());

CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (clerk_id = get_clerk_user_id());

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (clerk_id = get_clerk_user_id());

CREATE POLICY "Service role can manage all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Leads table policies
CREATE POLICY "Users can view own leads" ON leads
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own leads" ON leads
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own leads" ON leads
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own leads" ON leads
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

-- NEW: Assessment Forms table policies
CREATE POLICY "Users can view own assessment forms" ON assessment_forms
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own assessment forms" ON assessment_forms
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own assessment forms" ON assessment_forms
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own assessment forms" ON assessment_forms
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all assessment forms" ON assessment_forms
    FOR ALL USING (auth.role() = 'service_role');

-- NEW: Assessment Form Versions table policies
CREATE POLICY "Users can view own assessment form versions" ON assessment_form_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessment_forms 
            WHERE assessment_forms.id = assessment_form_versions.form_id 
            AND assessment_forms.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Users can insert own assessment form versions" ON assessment_form_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessment_forms 
            WHERE assessment_forms.id = assessment_form_versions.form_id 
            AND assessment_forms.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Users can update own assessment form versions" ON assessment_form_versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM assessment_forms 
            WHERE assessment_forms.id = assessment_form_versions.form_id 
            AND assessment_forms.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Users can delete own assessment form versions" ON assessment_form_versions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM assessment_forms 
            WHERE assessment_forms.id = assessment_form_versions.form_id 
            AND assessment_forms.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Service role can manage all assessment form versions" ON assessment_form_versions
    FOR ALL USING (auth.role() = 'service_role');

-- NEW: Assessment Submissions table policies
CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own assessment submissions" ON assessment_submissions
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own assessment submissions" ON assessment_submissions
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own assessment submissions" ON assessment_submissions
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all assessment submissions" ON assessment_submissions
    FOR ALL USING (auth.role() = 'service_role');

-- NEW: Lead Assessment Assignments table policies
CREATE POLICY "Users can view own lead assessment assignments" ON lead_assessment_assignments
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own lead assessment assignments" ON lead_assessment_assignments
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own lead assessment assignments" ON lead_assessment_assignments
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own lead assessment assignments" ON lead_assessment_assignments
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all lead assessment assignments" ON lead_assessment_assignments
    FOR ALL USING (auth.role() = 'service_role');

-- NEW: Assessment Links table policies
CREATE POLICY "Users can view own assessment links" ON assessment_links
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own assessment links" ON assessment_links
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own assessment links" ON assessment_links
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own assessment links" ON assessment_links
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all assessment links" ON assessment_links
    FOR ALL USING (auth.role() = 'service_role');

-- Keep existing policies for other tables that still exist
-- Product recommendations table policies
CREATE POLICY "Users can view own product recommendations" ON product_recommendations
    FOR SELECT USING (user_id = get_user_id_from_clerk() OR visibility = 'public');

CREATE POLICY "Users can insert own product recommendations" ON product_recommendations
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own product recommendations" ON product_recommendations
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own product recommendations" ON product_recommendations
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all product recommendations" ON product_recommendations
    FOR ALL USING (auth.role() = 'service_role');

-- Meetings table policies
CREATE POLICY "Users can view own meetings" ON meetings
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own meetings" ON meetings
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own meetings" ON meetings
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own meetings" ON meetings
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all meetings" ON meetings
    FOR ALL USING (auth.role() = 'service_role');

-- KYC status table policies (if this table still exists)
CREATE POLICY "Users can view own kyc status" ON kyc_status
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own kyc status" ON kyc_status
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own kyc status" ON kyc_status
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own kyc status" ON kyc_status
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all kyc status" ON kyc_status
    FOR ALL USING (auth.role() = 'service_role');

-- KYC templates table policies
CREATE POLICY "Users can view own kyc templates" ON kyc_templates
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own kyc templates" ON kyc_templates
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own kyc templates" ON kyc_templates
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own kyc templates" ON kyc_templates
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all kyc templates" ON kyc_templates
    FOR ALL USING (auth.role() = 'service_role');

-- User subscriptions table policies
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own subscriptions" ON user_subscriptions
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- AI feedback table policies
CREATE POLICY "Users can view own ai feedback" ON ai_feedback
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own ai feedback" ON ai_feedback
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own ai feedback" ON ai_feedback
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own ai feedback" ON ai_feedback
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all ai feedback" ON ai_feedback
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assessment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- 6. Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
