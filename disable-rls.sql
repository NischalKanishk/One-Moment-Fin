-- Temporary fix for development: Disable RLS on users table
-- Run this in your Supabase SQL Editor

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Note: This is a temporary fix for development
-- In production, you should implement proper RLS policies for Clerk authentication
