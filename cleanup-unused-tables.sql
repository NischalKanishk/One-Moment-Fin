-- Cleanup Unused Tables
-- This script removes tables that are no longer used in the current system
-- Run this AFTER verifying no important data exists in these tables

-- 1. Drop risk_assessment_answers table (replaced by assessment_submissions.answers)
-- First check if table exists and has data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_assessment_answers') THEN
        -- Check if table has data
        IF EXISTS (SELECT 1 FROM risk_assessment_answers LIMIT 1) THEN
            RAISE NOTICE 'Table risk_assessment_answers has data. Please backup before dropping.';
        ELSE
            DROP TABLE IF EXISTS risk_assessment_answers CASCADE;
            RAISE NOTICE 'Table risk_assessment_answers dropped successfully.';
        END IF;
    ELSE
        RAISE NOTICE 'Table risk_assessment_answers does not exist.';
    END IF;
END $$;

-- 2. Drop risk_assessments table (replaced by assessment_submissions)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_assessments') THEN
        -- Check if table has data
        IF EXISTS (SELECT 1 FROM risk_assessments LIMIT 1) THEN
            RAISE NOTICE 'Table risk_assessments has data. Please backup before dropping.';
        ELSE
            DROP TABLE IF EXISTS risk_assessments CASCADE;
            RAISE NOTICE 'Table risk_assessments dropped successfully.';
        END IF;
    ELSE
        RAISE NOTICE 'Table risk_assessments does not exist.';
    END IF;
END $$;

-- 3. Drop assessment_questions table (replaced by assessment_form_versions.schema)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_questions') THEN
        -- Check if table has data
        IF EXISTS (SELECT 1 FROM assessment_questions LIMIT 1) THEN
            RAISE NOTICE 'Table assessment_questions has data. Please backup before dropping.';
        ELSE
            DROP TABLE IF EXISTS assessment_questions CASCADE;
            RAISE NOTICE 'Table assessment_questions dropped successfully.';
        END IF;
    ELSE
        RAISE NOTICE 'Table assessment_questions does not exist.';
    END IF;
END $$;

-- 4. Drop assessments table (replaced by assessment_forms)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments') THEN
        -- Check if table has data
        IF EXISTS (SELECT 1 FROM assessments LIMIT 1) THEN
            RAISE NOTICE 'Table assessments has data. Please backup before dropping.';
        ELSE
            DROP TABLE IF EXISTS assessments CASCADE;
            RAISE NOTICE 'Table assessments dropped successfully.';
        END IF;
    ELSE
        RAISE NOTICE 'Table assessments does not exist.';
    END IF;
END $$;

-- 5. Clean up related indexes that are no longer needed
DROP INDEX IF EXISTS idx_assessment_questions_assessment_id;
DROP INDEX IF EXISTS idx_risk_assessments_lead_id;
DROP INDEX IF EXISTS idx_risk_assessment_answers_assessment_id;
DROP INDEX IF EXISTS idx_assessments_user_id;

-- 6. Clean up related functions that reference dropped tables
-- Note: These functions might need to be updated or dropped depending on usage

-- 7. Verify cleanup
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'user_settings', 'leads', 'assessment_forms', 
                           'assessment_form_versions', 'assessment_submissions', 
                           'product_recommendations', 'meetings', 'subscription_plans', 
                           'user_subscriptions', 'ai_feedback') 
        THEN 'KEEP - Active Table'
        ELSE 'DROP - Unused Table'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY status, table_name;

-- 8. Show remaining tables
SELECT 'Remaining tables after cleanup:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
