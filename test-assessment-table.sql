-- Test script to verify assessment_submissions table works correctly
-- Run this after applying the migration to test the setup

-- 1. Check if the table exists and has correct structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'assessment_submissions'
ORDER BY ordinal_position;

-- 2. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'assessment_submissions';

-- 3. Check permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'assessment_submissions';

-- 4. Test basic operations (this should work)
-- Note: You'll need to replace these UUIDs with actual values from your database
/*
-- Test insert (replace UUIDs with real values)
INSERT INTO assessment_submissions (
    assessment_id,
    owner_id,
    lead_id,
    answers,
    result
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- Replace with real assessment_forms.id
    '00000000-0000-0000-0000-000000000002', -- Replace with real users.id
    '00000000-0000-0000-0000-000000000003', -- Replace with real leads.id
    '{"test": "data"}'::jsonb,
    '{"bucket": "low", "score": 25}'::jsonb
);

-- Test select
SELECT * FROM assessment_submissions LIMIT 5;

-- Clean up test data
DELETE FROM assessment_submissions WHERE answers = '{"test": "data"}'::jsonb;
*/

-- 5. Check leads table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('risk_bucket', 'risk_score', 'risk_profile_id')
ORDER BY ordinal_position;

-- 6. Summary
SELECT 
    'Table Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_submissions') 
        THEN 'assessment_submissions table exists' 
        ELSE 'assessment_submissions table missing' 
    END as status
UNION ALL
SELECT 
    'RLS Status',
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'assessment_submissions' AND rowsecurity = true) 
        THEN 'RLS enabled' 
        ELSE 'RLS disabled' 
    END
UNION ALL
SELECT 
    'Permissions Status',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE table_name = 'assessment_submissions' AND grantee = 'anon') 
        THEN 'Public permissions granted' 
        ELSE 'Public permissions missing' 
    END;
