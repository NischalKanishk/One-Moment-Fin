-- OneMFin Database Schema
-- Based on Documentation/2 Database Designs.md

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table (MFDs)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    auth_provider TEXT NOT NULL DEFAULT 'email',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    referral_link TEXT UNIQUE,
    profile_image_url TEXT,
    settings JSONB DEFAULT '{}',
    role TEXT DEFAULT 'mfd' CHECK (role IN ('mfd', 'admin'))
);

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

-- 3. Assessments table
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- 6. Risk Assessment Answers table
CREATE TABLE risk_assessment_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_assessment_id UUID REFERENCES risk_assessments(id) ON DELETE CASCADE,
    question_id UUID REFERENCES assessment_questions(id) ON DELETE CASCADE,
    answer_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Enable Row Level Security (RLS)
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

-- Create RLS policies (basic ones - you'll customize these based on your auth logic)
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Leads policies
CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can insert own leads" ON leads FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Assessments policies
CREATE POLICY "Users can view own assessments" ON assessments FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can insert own assessments" ON assessments FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Users can update own assessments" ON assessments FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Product recommendations policies
CREATE POLICY "Users can view own products" ON product_recommendations FOR SELECT USING (user_id::text = auth.uid()::text OR visibility = 'public');
CREATE POLICY "Users can insert own products" ON product_recommendations FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Users can update own products" ON product_recommendations FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Meetings policies
CREATE POLICY "Users can view own meetings" ON meetings FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can insert own meetings" ON meetings FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Users can update own meetings" ON meetings FOR UPDATE USING (user_id::text = auth.uid()::text);

-- KYC policies
CREATE POLICY "Users can view own kyc" ON kyc_status FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can insert own kyc" ON kyc_status FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Users can update own kyc" ON kyc_status FOR UPDATE USING (user_id::text = auth.uid()::text);
