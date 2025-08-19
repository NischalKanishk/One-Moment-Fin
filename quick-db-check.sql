-- Quick database check - run this in Supabase SQL Editor
-- This will show you what data exists and what's missing

-- 1. Check if tables exist and have data
SELECT 
    'risk_frameworks' as table_name,
    COUNT(*) as record_count
FROM risk_frameworks
UNION ALL
SELECT 
    'question_bank' as table_name,
    COUNT(*) as record_count
FROM question_bank
UNION ALL
SELECT 
    'framework_question_map' as table_name,
    COUNT(*) as record_count
FROM framework_question_map
UNION ALL
SELECT 
    'assessment_forms' as table_name,
    COUNT(*) as record_count
FROM assessment_forms
UNION ALL
SELECT 
    'assessments' as table_name,
    COUNT(*) as record_count
FROM assessments;

-- 2. Check if CFA framework exists
SELECT 
    'CFA Framework Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM risk_frameworks WHERE code = 'cfa_three_pillar') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status
FROM (SELECT 1) as dummy;

-- 3. Check if any questions exist
SELECT 
    'Questions Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM question_bank LIMIT 1) 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status
FROM (SELECT 1) as dummy;

-- 4. Check if any framework mappings exist
SELECT 
    'Framework Mappings' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM framework_question_map LIMIT 1) 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status
FROM (SELECT 1) as dummy;
