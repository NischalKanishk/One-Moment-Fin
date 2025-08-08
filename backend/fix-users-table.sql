-- Fix Users Table for Supabase Auth Integration
-- Run this in your Supabase SQL Editor

-- 1. First, let's check if we need to migrate existing data
-- Create a backup of existing users (if any)
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- 2. Drop existing users table constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_referral_link_key;

-- 3. Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

-- 4. Recreate users table with proper structure
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY, -- No DEFAULT to allow Auth user IDs
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

-- 5. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
-- Allow users to read their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own data (for signup)
CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow service role to manage all users (for backend operations)
CREATE POLICY "Service role can manage all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 8. Migrate existing data (if any)
-- This will migrate users from the backup table to the new structure
-- You'll need to manually map auth user IDs to existing user records
INSERT INTO users (id, full_name, email, phone, auth_provider, created_at, referral_link, profile_image_url, settings, role)
SELECT 
    id, -- This should be the Supabase Auth user ID
    full_name,
    email,
    phone,
    auth_provider,
    created_at,
    referral_link,
    profile_image_url,
    settings,
    role
FROM users_backup
ON CONFLICT (id) DO NOTHING;

-- 9. Clean up backup table (optional - keep for safety)
-- DROP TABLE users_backup;

-- 10. Verify the setup
SELECT 
    'Users table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 
    'RLS Policies:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users';

-- 11. Test the setup with a sample query
-- This should work with proper authentication
-- SELECT * FROM users WHERE auth.uid() = id;
