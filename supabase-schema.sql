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
    mfd_registration_number TEXT, -- MFD registration number from SEBI
    auth_provider TEXT NOT NULL DEFAULT 'clerk',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    referral_link TEXT UNIQUE,
    profile_image_url TEXT,

    role TEXT DEFAULT 'mfd' CHECK (role IN ('mfd', 'admin'))
);



-- Enable Row Level Security
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY; -- Temporarily disabled for development

-- Function to extract Clerk user ID from JWT token
CREATE OR REPLACE FUNCTION get_clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Extract the 'sub' claim from the JWT token
  -- This is the Clerk user ID
  RETURN current_setting('request.jwt.claims', true)::json->>'sub';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for users table
-- Updated for Clerk authentication instead of Supabase Auth
-- Allow users to read their own data (by clerk_id)
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (clerk_id = get_clerk_user_id());

-- Allow users to insert their own data (by clerk_id)
CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (clerk_id = get_clerk_user_id());

-- Allow users to update their own data (by clerk_id)
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (clerk_id = get_clerk_user_id());

-- Allow service role to manage all users (for backend operations)
CREATE POLICY "Service role can manage all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Enable RLS for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    age INTEGER,
    source_link TEXT DEFAULT 'Manually Added',
    status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'assessment_done', 'meeting_scheduled', 'converted', 'dropped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    meeting_id UUID,
    risk_profile_id UUID
);

-- Enable RLS for leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads table
-- Updated for Clerk authentication instead of Supabase Auth
-- Function to get user_id from clerk_id
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

-- Users can view their own leads
CREATE POLICY "Users can view own leads" ON leads
    FOR SELECT USING (user_id = get_user_id_from_clerk());

-- Users can insert leads for themselves
CREATE POLICY "Users can insert own leads" ON leads
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

-- Users can update their own leads
CREATE POLICY "Users can update own leads" ON leads
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

-- Users can delete their own leads
CREATE POLICY "Users can delete own leads" ON leads
    FOR DELETE USING (user_id = get_user_id_from_clerk());

-- Service role can manage all leads (for backend operations)
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
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own assessments" ON assessments
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own assessments" ON assessments
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own assessments" ON assessments
    FOR DELETE USING (user_id = get_user_id_from_clerk());

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
            AND assessments.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Users can insert assessment questions" ON assessment_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessments 
            WHERE assessments.id = assessment_questions.assessment_id 
            AND assessments.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Users can update assessment questions" ON assessment_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM assessments 
            WHERE assessments.id = assessment_questions.assessment_id 
            AND assessments.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Users can delete assessment questions" ON assessment_questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM assessments 
            WHERE assessments.id = assessment_questions.assessment_id 
            AND assessments.user_id = get_user_id_from_clerk()
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
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own risk assessments" ON risk_assessments
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own risk assessments" ON risk_assessments
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own risk assessments" ON risk_assessments
    FOR DELETE USING (user_id = get_user_id_from_clerk());

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
            AND risk_assessments.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Users can insert risk assessment answers" ON risk_assessment_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM risk_assessments 
            WHERE risk_assessments.id = risk_assessment_answers.risk_assessment_id 
            AND risk_assessments.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Users can update risk assessment answers" ON risk_assessment_answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM risk_assessments 
            WHERE risk_assessments.id = risk_assessment_answers.risk_assessment_id 
            AND risk_assessments.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Users can delete risk assessment answers" ON risk_assessment_answers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM risk_assessments 
            WHERE risk_assessments.id = risk_assessment_answers.risk_assessment_id 
            AND risk_assessments.user_id = get_user_id_from_clerk()
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
    FOR SELECT USING (user_id = get_user_id_from_clerk() OR visibility = 'public');

CREATE POLICY "Users can insert own products" ON product_recommendations
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own products" ON product_recommendations
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own products" ON product_recommendations
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all products" ON product_recommendations
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Meetings table
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    external_event_id TEXT,
    platform TEXT CHECK (platform IN ('google')),
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
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own meetings" ON meetings
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own meetings" ON meetings
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own meetings" ON meetings
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all meetings" ON meetings
    FOR ALL USING (auth.role() = 'service_role');

-- 9. Subscription Plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price_per_month DECIMAL(10,2),
    lead_limit INTEGER,
    ai_enabled BOOLEAN DEFAULT false,
    custom_form_enabled BOOLEAN DEFAULT false,
    product_edit_enabled BOOLEAN DEFAULT false,
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

-- 10. User Subscriptions table
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
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own user subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own user subscriptions" ON user_subscriptions
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all user subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- 11. AI Feedback table
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
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own ai feedback" ON ai_feedback
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own ai feedback" ON ai_feedback
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all ai feedback" ON ai_feedback
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessment_questions_assessment_id ON assessment_questions(assessment_id);
CREATE INDEX idx_risk_assessments_lead_id ON risk_assessments(lead_id);
CREATE INDEX idx_risk_assessment_answers_assessment_id ON risk_assessment_answers(assessment_id);
CREATE INDEX idx_product_recommendations_user_id ON product_recommendations(user_id);
CREATE INDEX idx_product_recommendations_risk_category ON product_recommendations(risk_category);
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_lead_id ON meetings(lead_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_ai_feedback_user_id ON ai_feedback(user_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_per_month, lead_limit, ai_enabled, custom_form_enabled, product_edit_enabled, meeting_limit) VALUES
('Free', 0, 10, false, false, false, 5),
('Starter', 999, 100, true, false, false, 50),
('Pro', 1999, 500, true, true, true, 200);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- ------------------------------------------------------------------
-- Risk Assessment Framework Tables
-- ------------------------------------------------------------------

-- 12. Risk Frameworks table
CREATE TABLE risk_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- e.g., 'cfa_three_pillar', 'weighted_sum'
    name TEXT NOT NULL,
    description TEXT,
    engine TEXT NOT NULL CHECK (engine IN ('three_pillar', 'weighted_sum')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for risk_frameworks
ALTER TABLE risk_frameworks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for risk_frameworks table
-- Frameworks are public readable; writes restricted to service role
CREATE POLICY "Anyone can view frameworks" ON risk_frameworks
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all frameworks" ON risk_frameworks
    FOR ALL USING (auth.role() = 'service_role');

-- 13. Risk Framework Versions table
CREATE TABLE risk_framework_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID REFERENCES risk_frameworks(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    config JSONB NOT NULL, -- Framework configuration (scoring rules, weights, etc.)
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(framework_id, version)
);

-- Enable RLS for risk_framework_versions
ALTER TABLE risk_framework_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for risk_framework_versions table
-- Framework versions are public readable; writes restricted to service role
CREATE POLICY "Anyone can view framework versions" ON risk_framework_versions
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all framework versions" ON risk_framework_versions
    FOR ALL USING (auth.role() = 'service_role');

-- 14. Question Bank table
CREATE TABLE question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qkey TEXT UNIQUE NOT NULL, -- Unique question identifier
    label TEXT NOT NULL, -- Question text
    qtype TEXT NOT NULL CHECK (qtype IN ('single', 'multi', 'scale', 'number', 'percent', 'text')),
    options JSONB, -- Question options (for choice questions) or configuration (for scales)
    module TEXT, -- Which module/pillar this question belongs to (e.g., 'capacity', 'tolerance', 'need')
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for question_bank
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_bank table
-- Question bank is public readable; writes restricted to service role
CREATE POLICY "Anyone can view question bank" ON question_bank
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all question bank" ON question_bank
    FOR ALL USING (auth.role() = 'service_role');

-- 15. Framework Question Map table
CREATE TABLE framework_question_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_version_id UUID REFERENCES risk_framework_versions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES question_bank(id) ON DELETE CASCADE,
    qkey TEXT NOT NULL, -- Question key for this framework
    required BOOLEAN DEFAULT true,
    order_index INTEGER NOT NULL,
    alias TEXT, -- Alternative question key
    transform TEXT, -- Transformation rule (e.g., '100 - value')
    options_override JSONB, -- Override question options for this framework
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(framework_version_id, qkey)
);

-- Enable RLS for framework_question_map
ALTER TABLE framework_question_map ENABLE ROW LEVEL SECURITY;

-- RLS Policies for framework_question_map table
-- Framework question maps are public readable; writes restricted to service role
CREATE POLICY "Anyone can view framework question maps" ON framework_question_map
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all framework question maps" ON framework_question_map
    FOR ALL USING (auth.role() = 'service_role');

-- 16. Assessment Question Snapshots table (for storing framework questions at assessment creation time)
CREATE TABLE assessment_question_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    qkey TEXT NOT NULL,
    label TEXT NOT NULL,
    qtype TEXT NOT NULL,
    options JSONB,
    required BOOLEAN DEFAULT true,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for assessment_question_snapshots
ALTER TABLE assessment_question_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_question_snapshots table
CREATE POLICY "Users can view own assessment snapshots" ON assessment_question_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessments 
            WHERE assessments.id = assessment_question_snapshots.assessment_id 
            AND assessments.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Service role can manage all assessment snapshots" ON assessment_question_snapshots
    FOR ALL USING (auth.role() = 'service_role');

-- 17. Assessment Submissions table (for storing assessment responses)
CREATE TABLE assessment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    framework_version_id UUID REFERENCES risk_framework_versions(id),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answers JSONB NOT NULL, -- User responses
    result JSONB, -- Scoring result
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
    review_reason TEXT
);

-- Enable RLS for assessment_submissions
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_submissions table
CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions
    FOR SELECT USING (owner_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own assessment submissions" ON assessment_submissions
    FOR INSERT WITH CHECK (owner_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own assessment submissions" ON assessment_submissions
    FOR UPDATE USING (owner_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all assessment submissions" ON assessment_submissions
    FOR ALL USING (auth.role() = 'service_role');

-- 18. Assessment Forms table (for the new form-based system)
CREATE TABLE assessment_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for assessment_forms
ALTER TABLE assessment_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_forms table
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

-- 19. Assessment Form Versions table
CREATE TABLE assessment_form_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES assessment_forms(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    schema JSONB NOT NULL, -- Form schema (questions, validation rules)
    ui JSONB, -- UI configuration
    scoring JSONB, -- Scoring configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(form_id, version)
);

-- Enable RLS for assessment_form_versions
ALTER TABLE assessment_form_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_form_versions table
CREATE POLICY "Users can view own assessment form versions" ON assessment_form_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessment_forms 
            WHERE assessment_forms.id = assessment_form_versions.form_id 
            AND assessment_forms.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Service role can manage all assessment form versions" ON assessment_form_versions
    FOR ALL USING (auth.role() = 'service_role');

-- 20. Assessment Links table (for creating shareable assessment links)
CREATE TABLE assessment_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    form_id UUID REFERENCES assessment_forms(id) ON DELETE CASCADE,
    version_id UUID REFERENCES assessment_form_versions(id),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for assessment_links
ALTER TABLE assessment_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_links table
CREATE POLICY "Users can view own assessment links" ON assessment_links
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own assessment links" ON assessment_links
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own assessment links" ON assessment_links
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all assessment links" ON assessment_links
    FOR ALL USING (auth.role() = 'service_role');

-- Add indexes for better performance
CREATE INDEX idx_risk_frameworks_code ON risk_frameworks(code);
CREATE INDEX idx_risk_framework_versions_framework_id ON risk_framework_versions(framework_id);
CREATE INDEX idx_risk_framework_versions_is_default ON risk_framework_versions(is_default);
CREATE INDEX idx_question_bank_qkey ON question_bank(qkey);
CREATE INDEX idx_question_bank_module ON question_bank(module);
CREATE INDEX idx_framework_question_map_framework_version_id ON framework_question_map(framework_version_id);
CREATE INDEX idx_framework_question_map_order_index ON framework_question_map(order_index);
CREATE INDEX idx_assessment_question_snapshots_assessment_id ON assessment_question_snapshots(assessment_id);
CREATE INDEX idx_assessment_submissions_assessment_id ON assessment_submissions(assessment_id);
CREATE INDEX idx_assessment_submissions_owner_id ON assessment_submissions(owner_id);
CREATE INDEX idx_assessment_submissions_lead_id ON assessment_submissions(lead_id);
CREATE INDEX idx_assessment_forms_user_id ON assessment_forms(user_id);
CREATE INDEX idx_assessment_form_versions_form_id ON assessment_form_versions(form_id);
CREATE INDEX idx_assessment_links_token ON assessment_links(token);
CREATE INDEX idx_assessment_links_user_id ON assessment_links(user_id);

-- Add trigger for updated_at columns
CREATE TRIGGER update_risk_frameworks_updated_at BEFORE UPDATE ON risk_frameworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_framework_versions_updated_at BEFORE UPDATE ON risk_framework_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON question_bank
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_forms_updated_at BEFORE UPDATE ON assessment_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
