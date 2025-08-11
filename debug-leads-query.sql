-- Debug script to test leads query and identify issues
-- Run this in Supabase SQL Editor

-- 1. Check if the new tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'leads', 
  'assessment_forms', 
  'assessment_form_versions', 
  'assessment_submissions', 
  'lead_assessment_assignments', 
  'assessment_links'
)
ORDER BY table_name;

-- 2. Check the structure of the leads table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if there are any leads in the database
SELECT COUNT(*) as total_leads FROM leads;

-- 4. Check if there are any users
SELECT COUNT(*) as total_users FROM users;

-- 5. Check if the foreign key relationships exist
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'leads';

-- 6. Test a simple leads query without joins
SELECT id, full_name, email, phone, age, status, source_link, created_at, kyc_status
FROM leads 
LIMIT 5;

-- 7. Check if RLS is enabled and policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'leads'
ORDER BY policyname;
