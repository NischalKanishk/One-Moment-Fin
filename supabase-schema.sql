-- OneMFin Database Schema
-- Based on Documentation/2 Database Designs.md

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table (MFDs)
-- Switched to application-managed UUIDs and added Clerk linkage
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE, -- Stores Clerk user ID (e.g., 'user_...')
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT, -- Unique constraint handled via partial index to allow NULL values
    auth_provider TEXT NOT NULL DEFAULT 'clerk',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    referral_link TEXT UNIQUE,
    profile_image_url TEXT,
    settings JSONB DEFAULT '{}',
    role TEXT DEFAULT 'mfd' CHECK (role IN ('mfd', 'admin'))
);

-- Enable Row Level Security
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY; -- Temporarily disabled for development

-- RLS Policies for users table
-- Updated for Clerk authentication instead of Supabase Auth
-- Allow users to read their own data (by clerk_id)
-- CREATE POLICY "Users can view own data" ON users
--     FOR SELECT USING (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow users to insert their own data (by clerk_id)
-- CREATE POLICY "Users can insert own data" ON users
--     FOR INSERT WITH CHECK (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow users to update their own data (by clerk_id)
-- CREATE POLICY "Users can update own data" ON users
--     FOR UPDATE USING (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow service role to manage all users (for backend operations)
-- CREATE POLICY "Service role can manage all users" ON users
--     FOR ALL USING (auth.role() = 'service_role');

-- TEMPORARY: Allow all operations for development (remove in production)
-- This bypasses RLS temporarily to allow Clerk users to be created
-- CREATE POLICY "Allow all operations temporarily" ON users
--     FOR ALL USING (true);

-- 2. Leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    age INTEGER,
    source_link TEXT,
    status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'assessment_done', 'meeting_scheduled', 'converted', 'dropped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    meeting_id UUID,
    risk_profile_id UUID,
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'incomplete', 'completed'))
);

-- Enable RLS for leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads table
CREATE POLICY "Users can view own leads" ON leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON leads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads" ON leads
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

-- 3. Assessments table
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessments table
CREATE POLICY "Users can view own assessments" ON assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments" ON assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments" ON assessments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assessments" ON assessments
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all assessments" ON assessments
    FOR ALL USING (auth.role() = 'service_role');

-- 4. Assessment Questions table
CREATE TABLE assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('mcq', 'scale', 'text')),
    options JSONB,
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for assessment_questions
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_questions table
CREATE POLICY "Users can view assessment questions" ON assessment_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessments 
            WHERE assessments.id = assessment_questions.assessment_id 
            AND assessments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert assessment questions" ON assessment_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessments 
            WHERE assessments.id = assessment_questions.assessment_id 
            AND assessments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update assessment questions" ON assessment_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM assessments 
            WHERE assessments.id = assessment_questions.assessment_id 
            AND assessments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete assessment questions" ON assessment_questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM assessments 
            WHERE assessments.id = assessment_questions.assessment_id 
            AND assessments.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all assessment questions" ON assessment_questions
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Risk Assessments table
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    risk_score INTEGER,
    risk_category TEXT CHECK (risk_category IN ('low', 'medium', 'high')),
    ai_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for risk_assessments
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for risk_assessments table
CREATE POLICY "Users can view own risk assessments" ON risk_assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk assessments" ON risk_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own risk assessments" ON risk_assessments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own risk assessments" ON risk_assessments
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all risk assessments" ON risk_assessments
    FOR ALL USING (auth.role() = 'service_role');

-- 6. Risk Assessment Answers table
CREATE TABLE risk_assessment_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_assessment_id UUID REFERENCES risk_assessments(id) ON DELETE CASCADE,
    question_id UUID REFERENCES assessment_questions(id) ON DELETE CASCADE,
    answer_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for risk_assessment_answers
ALTER TABLE risk_assessment_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for risk_assessment_answers table
CREATE POLICY "Users can view risk assessment answers" ON risk_assessment_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM risk_assessments 
            WHERE risk_assessments.id = risk_assessment_answers.risk_assessment_id 
            AND risk_assessments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert risk assessment answers" ON risk_assessment_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM risk_assessments 
            WHERE risk_assessments.id = risk_assessment_answers.risk_assessment_id 
            AND risk_assessments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update risk assessment answers" ON risk_assessment_answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM risk_assessments 
            WHERE risk_assessments.id = risk_assessment_answers.risk_assessment_id 
            AND risk_assessments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete risk assessment answers" ON risk_assessment_answers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM risk_assessments 
            WHERE risk_assessments.id = risk_assessment_answers.risk_assessment_id 
            AND risk_assessments.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all risk assessment answers" ON risk_assessment_answers
    FOR ALL USING (auth.role() = 'service_role');

-- 7. Product Recommendations table
CREATE TABLE product_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    risk_category TEXT NOT NULL CHECK (risk_category IN ('low', 'medium', 'high')),
    title TEXT NOT NULL,
    description TEXT,
    amc_name TEXT,
    product_type TEXT CHECK (product_type IN ('equity', 'debt', 'hybrid', 'balanced')),
    is_ai_generated BOOLEAN DEFAULT false,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for product_recommendations
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_recommendations table
CREATE POLICY "Users can view own products" ON product_recommendations
    FOR SELECT USING (auth.uid() = user_id OR visibility = 'public');

CREATE POLICY "Users can insert own products" ON product_recommendations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON product_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON product_recommendations
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all products" ON product_recommendations
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Meetings table
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    external_event_id TEXT,
    platform TEXT CHECK (platform IN ('google', 'calendly')),
    meeting_link TEXT,
    title TEXT,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    is_synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for meetings
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meetings table
CREATE POLICY "Users can view own meetings" ON meetings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meetings" ON meetings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings" ON meetings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings" ON meetings
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all meetings" ON meetings
    FOR ALL USING (auth.role() = 'service_role');

-- 9. KYC Status table
CREATE TABLE kyc_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    kyc_method TEXT CHECK (kyc_method IN ('manual_entry', 'file_upload', 'third_party_api')),
    kyc_file_url TEXT,
    form_data JSONB,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'verified', 'rejected')),
    verified_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for kyc_status
ALTER TABLE kyc_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_status table
CREATE POLICY "Users can view own kyc" ON kyc_status
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kyc" ON kyc_status
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kyc" ON kyc_status
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all kyc" ON kyc_status
    FOR ALL USING (auth.role() = 'service_role');

-- 10. Subscription Plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price_per_month DECIMAL(10,2),
    lead_limit INTEGER,
    ai_enabled BOOLEAN DEFAULT false,
    custom_form_enabled BOOLEAN DEFAULT false,
    product_edit_enabled BOOLEAN DEFAULT false,
    kyc_enabled BOOLEAN DEFAULT false,
    meeting_limit INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans table
-- Plans are public readable; writes restricted to service role
CREATE POLICY "Anyone can view plans" ON subscription_plans
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all subscription plans" ON subscription_plans
    FOR ALL USING (auth.role() = 'service_role');

-- 11. User Subscriptions table
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_plan_id UUID REFERENCES subscription_plans(id),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    payment_status TEXT DEFAULT 'active' CHECK (payment_status IN ('active', 'trial', 'failed')),
    payment_provider TEXT,
    payment_ref_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions table
CREATE POLICY "Users can view own user subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all user subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- 12. AI Feedback table
CREATE TABLE ai_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    risk_assessment_id UUID REFERENCES risk_assessments(id) ON DELETE CASCADE,
    product_ids JSONB,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for ai_feedback
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_feedback table
CREATE POLICY "Users can view own ai feedback" ON ai_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai feedback" ON ai_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai feedback" ON ai_feedback
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all ai feedback" ON ai_feedback
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessment_questions_assessment_id ON assessment_questions(assessment_id);
CREATE INDEX idx_risk_assessments_lead_id ON risk_assessments(lead_id);
CREATE INDEX idx_risk_assessment_answers_assessment_id ON risk_assessment_answers(risk_assessment_id);
CREATE INDEX idx_product_recommendations_user_id ON product_recommendations(user_id);
CREATE INDEX idx_product_recommendations_risk_category ON product_recommendations(risk_category);
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_lead_id ON meetings(lead_id);
CREATE INDEX idx_kyc_status_lead_id ON kyc_status(lead_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_ai_feedback_user_id ON ai_feedback(user_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_per_month, lead_limit, ai_enabled, custom_form_enabled, product_edit_enabled, kyc_enabled, meeting_limit) VALUES
('Free', 0, 10, false, false, false, false, 5),
('Starter', 999, 100, true, false, false, true, 50),
('Pro', 1999, 500, true, true, true, true, 200);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for kyc_status table
CREATE TRIGGER update_kyc_status_updated_at BEFORE UPDATE ON kyc_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------
-- Backfill foreign key relationships added after table creation
-- ------------------------------------------------------------------

-- Link leads.meeting_id to meetings.id (nullable)
ALTER TABLE leads
    ADD CONSTRAINT fk_leads_meeting
    FOREIGN KEY (meeting_id)
    REFERENCES meetings(id)
    ON DELETE SET NULL;

-- Link leads.risk_profile_id to risk_assessments.id (nullable)
ALTER TABLE leads
    ADD CONSTRAINT fk_leads_risk_profile
    FOREIGN KEY (risk_profile_id)
    REFERENCES risk_assessments(id)
    ON DELETE SET NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- ------------------------------------------------------------------
-- Phone constraint handling
-- ------------------------------------------------------------------
-- Note: Phone uniqueness is handled via a partial unique index that only applies to non-NULL values
-- This allows multiple users to have NULL phone values while maintaining uniqueness for actual phone numbers
-- The constraint is created in the migration script: fix-phone-constraint.sql
