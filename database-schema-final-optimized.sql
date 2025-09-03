-- OneMFin Database Schema - Final Optimized Version
-- Removed ALL unused tables and fields while preserving only what's actually used

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- CORE TABLES (Actually Used)
-- ==============================================

-- 1. Users table (MFDs)
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
    assessment_link TEXT UNIQUE,
    profile_image_url TEXT,
    role TEXT DEFAULT 'mfd' CHECK (role IN ('mfd', 'admin'))
);

-- Function to extract Clerk user ID from JWT token
CREATE OR REPLACE FUNCTION get_clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'sub';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for users table
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (clerk_id = get_clerk_user_id());

CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (clerk_id = get_clerk_user_id());

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (clerk_id = get_clerk_user_id());

CREATE POLICY "Service role can manage all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

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
    sip_forecast JSONB DEFAULT NULL
);

-- Function to get user_id from clerk_id
CREATE OR REPLACE FUNCTION get_user_id_from_clerk()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM users 
    WHERE clerk_id = get_clerk_user_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for leads table
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

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create index on sip_forecast column for better query performance
CREATE INDEX idx_leads_sip_forecast ON leads USING GIN (sip_forecast);

-- 3. Meetings table
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

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- 4. Risk Frameworks table
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

-- RLS Policies for risk_frameworks table
CREATE POLICY "Anyone can view frameworks" ON risk_frameworks
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all frameworks" ON risk_frameworks
    FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE risk_frameworks ENABLE ROW LEVEL SECURITY;

-- 5. Risk Framework Versions table
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

-- RLS Policies for risk_framework_versions table
CREATE POLICY "Anyone can view framework versions" ON risk_framework_versions
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all framework versions" ON risk_framework_versions
    FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE risk_framework_versions ENABLE ROW LEVEL SECURITY;



-- 6. Assessment Submissions table (HEAVILY USED)
CREATE TABLE assessment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_version_id UUID REFERENCES risk_framework_versions(id),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answers JSONB NOT NULL, -- User responses
    result JSONB, -- Scoring result
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
    review_reason TEXT
);

-- RLS Policies for assessment_submissions table
CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions
    FOR SELECT USING (
        owner_id = get_user_id_from_clerk() OR 
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = assessment_submissions.lead_id 
            AND leads.user_id = get_user_id_from_clerk()
        )
    );

CREATE POLICY "Users can insert own assessment submissions" ON assessment_submissions
    FOR INSERT WITH CHECK (owner_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own assessment submissions" ON assessment_submissions
    FOR UPDATE USING (owner_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all assessment submissions" ON assessment_submissions
    FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- USER CUSTOMIZATION TABLE (JSONB Optimized)
-- ==============================================

-- 7. User Assessment Customizations table (JSONB approach)
CREATE TABLE user_assessment_customizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customizations JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- RLS Policies for user_assessment_customizations table
CREATE POLICY "Users can view own customizations" ON user_assessment_customizations
    FOR SELECT USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can insert own customizations" ON user_assessment_customizations
    FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can update own customizations" ON user_assessment_customizations
    FOR UPDATE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Users can delete own customizations" ON user_assessment_customizations
    FOR DELETE USING (user_id = get_user_id_from_clerk());

CREATE POLICY "Service role can manage all customizations" ON user_assessment_customizations
    FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE user_assessment_customizations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Core table indexes
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_lead_id ON meetings(lead_id);
CREATE INDEX idx_assessment_submissions_owner_id ON assessment_submissions(owner_id);
CREATE INDEX idx_assessment_submissions_lead_id ON assessment_submissions(lead_id);
CREATE INDEX idx_assessment_submissions_framework_version_id ON assessment_submissions(framework_version_id);

-- Framework table indexes
CREATE INDEX idx_risk_frameworks_code ON risk_frameworks(code);
CREATE INDEX idx_risk_framework_versions_framework_id ON risk_framework_versions(framework_id);
CREATE INDEX idx_risk_framework_versions_is_default ON risk_framework_versions(is_default);


-- User customization indexes
CREATE INDEX idx_user_customizations_gin ON user_assessment_customizations USING GIN (customizations);
CREATE INDEX idx_user_customizations_user_id ON user_assessment_customizations(user_id);
CREATE INDEX idx_user_customizations_active ON user_assessment_customizations(user_id) 
WHERE customizations != '{}';

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- ==============================================
-- TRIGGERS FOR UPDATED_AT
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_frameworks_updated_at BEFORE UPDATE ON risk_frameworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_framework_versions_updated_at BEFORE UPDATE ON risk_framework_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



CREATE TRIGGER update_user_customizations_updated_at BEFORE UPDATE ON user_assessment_customizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to get user's customized questions (optimized)
CREATE OR REPLACE FUNCTION get_user_questions_optimized(user_uuid UUID)
RETURNS TABLE (
    id TEXT,
    qkey TEXT,
    label TEXT,
    qtype TEXT,
    options JSONB,
    module TEXT,
    is_custom BOOLEAN,
    is_customized BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH user_customs AS (
        SELECT customizations
        FROM user_assessment_customizations
        WHERE user_id = user_uuid
    ),
    custom_questions AS (
        SELECT 
            (key || '_custom')::text as id,
            key as qkey,
            value->>'label' as label,
            value->>'qtype' as qtype,
            value->'options' as options,
            value->>'module' as module,
            true as is_custom,
            false as is_customized
        FROM user_customs uc,
        jsonb_each(uc.customizations->'custom_questions')
    )
    SELECT * FROM custom_questions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update specific customization (atomic update)
CREATE OR REPLACE FUNCTION update_user_customization(
    user_uuid UUID,
    customization_path TEXT,
    customization_value JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_assessment_customizations (user_id, customizations)
    VALUES (user_uuid, jsonb_build_object(customization_path, customization_value))
    ON CONFLICT (user_id)
    DO UPDATE SET 
        customizations = user_assessment_customizations.customizations || jsonb_build_object(customization_path, customization_value),
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
