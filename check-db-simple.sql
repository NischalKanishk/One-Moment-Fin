-- Simple database check script
-- Run this in Supabase SQL Editor

-- 1. Check if risk_frameworks table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'risk_frameworks'
ORDER BY ordinal_position;

-- 2. Check if any frameworks exist
SELECT COUNT(*) as framework_count FROM risk_frameworks;

-- 3. Check if question_bank table exists
SELECT COUNT(*) as question_count FROM question_bank;

-- 4. Check if framework_question_map exists
SELECT COUNT(*) as mapping_count FROM framework_question_map;

-- 5. Check if assessment_forms table exists
SELECT COUNT(*) as forms_count FROM assessment_forms;

-- 6. Check if assessments table exists and has data
SELECT COUNT(*) as assessments_count FROM assessments;
