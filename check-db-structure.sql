-- Check database structure and existing data
-- Run this in Supabase SQL Editor to see what's already there

-- 1. Check risk_frameworks table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'risk_frameworks'
ORDER BY ordinal_position;

-- 2. Check if any frameworks already exist
SELECT * FROM risk_frameworks LIMIT 5;

-- 3. Check risk_framework_versions
SELECT * FROM risk_framework_versions LIMIT 5;

-- 4. Check question_bank
SELECT * FROM question_bank LIMIT 5;

-- 5. Check framework_question_map
SELECT * FROM framework_question_map LIMIT 5;

-- 6. Check if CFA framework exists
SELECT * FROM risk_frameworks WHERE code = 'cfa_three_pillar';
