-- OneMFin Clerk Authentication RLS Policies
-- This file contains the proper Row Level Security policies for Clerk authentication

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current user's clerk_id from JWT claims
CREATE OR REPLACE FUNCTION get_current_user_clerk_id()
RETURNS TEXT AS $$
BEGIN
  -- Extract clerk_id from JWT claims
  -- Clerk automatically sends the user ID in the 'sub' claim
  -- We don't need to add a custom user_id claim
  RETURN current_setting('request.jwt.claims', true)::json->>'sub';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (clerk_id = get_current_user_clerk_id());

DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (clerk_id = get_current_user_clerk_id());

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (clerk_id = get_current_user_clerk_id());

-- Allow users to delete their own data (optional, consider if needed)
-- DROP POLICY IF EXISTS "Users can delete own data" ON users;
-- CREATE POLICY "Users can delete own data" ON users
--     FOR DELETE USING (clerk_id = get_current_user_clerk_id());

-- Leads table policies
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
CREATE POLICY "Users can view own leads" ON leads
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
CREATE POLICY "Users can insert own leads" ON leads
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can update own leads" ON leads;
CREATE POLICY "Users can update own leads" ON leads
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can delete own leads" ON leads;
CREATE POLICY "Users can delete own leads" ON leads
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

-- Assessments table policies
DROP POLICY IF EXISTS "Users can view own assessments" ON assessments;
CREATE POLICY "Users can view own assessments" ON assessments
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can insert own assessments" ON assessments;
CREATE POLICY "Users can insert own assessments" ON assessments
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can update own assessments" ON assessments;
CREATE POLICY "Users can update own assessments" ON assessments
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can delete own assessments" ON assessments;
CREATE POLICY "Users can delete own assessments" ON assessments
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

-- Assessment questions policies
DROP POLICY IF EXISTS "Users can view own assessment questions" ON assessment_questions;
CREATE POLICY "Users can view own assessment questions" ON assessment_questions
    FOR SELECT USING (
        assessment_id IN (
            SELECT id FROM assessments WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert own assessment questions" ON assessment_questions;
CREATE POLICY "Users can insert own assessment questions" ON assessment_questions
    FOR INSERT WITH CHECK (
        assessment_id IN (
            SELECT id FROM assessments WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update own assessment questions" ON assessment_questions;
CREATE POLICY "Users can update own assessment questions" ON assessment_questions
    FOR UPDATE USING (
        assessment_id IN (
            SELECT id FROM assessments WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete own assessment questions" ON assessment_questions;
CREATE POLICY "Users can delete own assessment questions" ON assessment_questions
    FOR DELETE USING (
        assessment_id IN (
            SELECT id FROM assessments WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
            )
        )
    );

-- Risk assessments policies
DROP POLICY IF EXISTS "Users can view own risk assessments" ON risk_assessments;
CREATE POLICY "Users can view own risk assessments" ON risk_assessments
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can insert own risk assessments" ON risk_assessments;
CREATE POLICY "Users can insert own risk assessments" ON risk_assessments
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can update own risk assessments" ON risk_assessments;
CREATE POLICY "Users can update own risk assessments" ON risk_assessments
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can delete own risk assessments" ON risk_assessments;
CREATE POLICY "Users can delete own risk assessments" ON risk_assessments
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

-- Risk assessment answers policies
DROP POLICY IF EXISTS "Users can view own risk assessment answers" ON risk_assessment_answers;
CREATE POLICY "Users can view own risk assessment answers" ON risk_assessment_answers
    FOR SELECT USING (
        risk_assessment_id IN (
            SELECT id FROM risk_assessments WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert own risk assessment answers" ON risk_assessment_answers;
CREATE POLICY "Users can insert own risk assessment answers" ON risk_assessment_answers
    FOR INSERT WITH CHECK (
        risk_assessment_id IN (
            SELECT id FROM risk_assessments WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update own risk assessment answers" ON risk_assessment_answers;
CREATE POLICY "Users can update own risk assessment answers" ON risk_assessment_answers
    FOR UPDATE USING (
        risk_assessment_id IN (
            SELECT id FROM risk_assessments WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete own risk assessment answers" ON risk_assessment_answers;
CREATE POLICY "Users can delete own risk assessment answers" ON risk_assessment_answers
    FOR DELETE USING (
        risk_assessment_id IN (
            SELECT id FROM risk_assessments WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
            )
        )
    );

-- Product recommendations policies
DROP POLICY IF EXISTS "Users can view own product recommendations" ON product_recommendations;
CREATE POLICY "Users can view own product recommendations" ON product_recommendations
    FOR SELECT USING (
        user_id IS NULL OR user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can insert own product recommendations" ON product_recommendations;
CREATE POLICY "Users can insert own product recommendations" ON product_recommendations
    FOR INSERT WITH CHECK (
        user_id IS NULL OR user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can update own product recommendations" ON product_recommendations;
CREATE POLICY "Users can update own product recommendations" ON product_recommendations
    FOR UPDATE USING (
        user_id IS NULL OR user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can delete own product recommendations" ON product_recommendations;
CREATE POLICY "Users can delete own product recommendations" ON product_recommendations
    FOR DELETE USING (
        user_id IS NULL OR user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

-- Meetings policies
DROP POLICY IF EXISTS "Users can view own meetings" ON meetings;
CREATE POLICY "Users can view own meetings" ON meetings
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can insert own meetings" ON meetings;
CREATE POLICY "Users can insert own meetings" ON meetings
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can update own meetings" ON meetings;
CREATE POLICY "Users can update own meetings" ON meetings
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can delete own meetings" ON meetings;
CREATE POLICY "Users can delete own meetings" ON meetings
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

-- KYC status policies
DROP POLICY IF EXISTS "Users can view own KYC status" ON kyc_status;
CREATE POLICY "Users can view own KYC status" ON kyc_status
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can insert own KYC status" ON kyc_status;
CREATE POLICY "Users can insert own KYC status" ON kyc_status
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can update own KYC status" ON kyc_status;
CREATE POLICY "Users can update own KYC status" ON kyc_status
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can delete own KYC status" ON kyc_status;
CREATE POLICY "Users can delete own KYC status" ON kyc_status
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

-- User subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can delete own subscriptions" ON user_subscriptions
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

-- AI feedback policies
DROP POLICY IF EXISTS "Users can view own AI feedback" ON ai_feedback;
CREATE POLICY "Users can view own AI feedback" ON ai_feedback
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can insert own AI feedback" ON ai_feedback;
CREATE POLICY "Users can insert own AI feedback" ON ai_feedback
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can update own AI feedback" ON ai_feedback;
CREATE POLICY "Users can update own AI feedback" ON ai_feedback
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

DROP POLICY IF EXISTS "Users can delete own AI feedback" ON ai_feedback;
CREATE POLICY "Users can delete own AI feedback" ON ai_feedback
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = get_current_user_clerk_id()
        )
    );

-- Service role policies (for backend operations)
-- These allow the service role to bypass RLS for administrative operations
CREATE POLICY "Service role can manage all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all assessments" ON assessments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all assessment questions" ON assessment_questions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all risk assessments" ON risk_assessments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all risk assessment answers" ON risk_assessment_answers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all product recommendations" ON product_recommendations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all meetings" ON meetings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all KYC status" ON kyc_status
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all user subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all AI feedback" ON ai_feedback
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Note: In production, you should be more restrictive with permissions
-- This setup allows Clerk users to access their own data through the JWT token
