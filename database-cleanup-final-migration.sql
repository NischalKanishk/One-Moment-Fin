-- OneMFin Database Final Cleanup Migration
-- This script removes ALL unused tables and fields
-- Run this script on your Supabase database to clean up unused schema elements

-- ==============================================
-- STEP 1: Remove unused fields from existing tables
-- ==============================================

-- Remove unused fields from users table
ALTER TABLE users DROP COLUMN IF EXISTS assessment_link;

-- Remove unused fields from leads table  
ALTER TABLE leads DROP COLUMN IF EXISTS meeting_id;
ALTER TABLE leads DROP COLUMN IF EXISTS risk_profile_id;

-- ==============================================
-- STEP 2: Drop ALL unused tables (in dependency order)
-- ==============================================

-- Drop unused tables that have no dependencies
DROP TABLE IF EXISTS ai_feedback CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS product_recommendations CASCADE;

-- Drop legacy assessment system tables
DROP TABLE IF EXISTS risk_assessment_answers CASCADE;
DROP TABLE IF EXISTS risk_assessments CASCADE;
DROP TABLE IF EXISTS assessment_questions CASCADE;

-- Drop unused new assessment system tables
DROP TABLE IF EXISTS assessment_links CASCADE;
DROP TABLE IF EXISTS assessment_question_snapshots CASCADE;
DROP TABLE IF EXISTS assessment_form_versions CASCADE;
DROP TABLE IF EXISTS assessment_forms CASCADE;
DROP TABLE IF EXISTS framework_question_map CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS question_bank CASCADE;

-- ==============================================
-- STEP 3: Clean up any orphaned indexes
-- ==============================================

-- Drop indexes that were related to removed tables/fields
DROP INDEX IF EXISTS idx_product_recommendations_user_id;
DROP INDEX IF EXISTS idx_product_recommendations_risk_category;
DROP INDEX IF EXISTS idx_user_subscriptions_user_id;
DROP INDEX IF EXISTS idx_ai_feedback_user_id;
DROP INDEX IF EXISTS idx_risk_assessment_answers_assessment_id;
DROP INDEX IF EXISTS idx_risk_assessments_lead_id;
DROP INDEX IF EXISTS idx_assessment_questions_assessment_id;
DROP INDEX IF EXISTS idx_assessment_links_token;
DROP INDEX IF EXISTS idx_assessment_links_user_id;
DROP INDEX IF EXISTS idx_assessment_question_snapshots_assessment_id;
DROP INDEX IF EXISTS idx_assessment_form_versions_form_id;
DROP INDEX IF EXISTS idx_assessment_forms_user_id;
DROP INDEX IF EXISTS idx_framework_question_map_framework_version_id;
DROP INDEX IF EXISTS idx_framework_question_map_order_index;
DROP INDEX IF EXISTS idx_assessments_user_id;
DROP INDEX IF EXISTS idx_question_bank_qkey;
DROP INDEX IF EXISTS idx_question_bank_module;

-- ==============================================
-- STEP 4: Create the optimized user customizations table
-- ==============================================

-- Create the optimized user customizations table
CREATE TABLE IF NOT EXISTS user_assessment_customizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customizations JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS for user_assessment_customizations
ALTER TABLE user_assessment_customizations ENABLE ROW LEVEL SECURITY;

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

-- ==============================================
-- STEP 5: Create optimized indexes
-- ==============================================

-- User customization indexes
CREATE INDEX IF NOT EXISTS idx_user_customizations_gin ON user_assessment_customizations USING GIN (customizations);
CREATE INDEX IF NOT EXISTS idx_user_customizations_user_id ON user_assessment_customizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_customizations_active ON user_assessment_customizations(user_id) 
WHERE customizations != '{}';

-- ==============================================
-- STEP 6: Create helper functions
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

-- ==============================================
-- STEP 7: Add trigger for updated_at
-- ==============================================

CREATE TRIGGER update_user_customizations_updated_at BEFORE UPDATE ON user_assessment_customizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- STEP 8: Verify cleanup was successful
-- ==============================================

-- List remaining tables to verify cleanup
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Should show only 7 tables:
-- 1. users
-- 2. leads
-- 3. meetings
-- 4. risk_frameworks
-- 5. risk_framework_versions
-- 6. assessment_submissions
-- 7. user_assessment_customizations

-- List remaining columns in users table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- List remaining columns in leads table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Count remaining tables
SELECT COUNT(*) as remaining_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
