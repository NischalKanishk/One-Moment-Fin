-- Safe RLS Policies Fix for Clerk Authentication - NEW SCHEMA VERSION
-- This script handles existing objects gracefully and won't fail on "already exists" errors
-- Run this script in your Supabase SQL Editor

-- 1. Create function to extract Clerk user ID from JWT (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_clerk_user_id') THEN
        CREATE FUNCTION get_clerk_user_id()
        RETURNS TEXT AS $$
        BEGIN
          -- Extract the 'sub' field from the JWT token
          -- This is the Clerk user ID
          RETURN current_setting('request.jwt.claims', true)::json->>'sub';
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        RAISE NOTICE 'Created function get_clerk_user_id()';
    ELSE
        RAISE NOTICE 'Function get_clerk_user_id() already exists, skipping...';
    END IF;
END $$;

-- 2. Create function to get user_id from clerk_id (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_id_from_clerk') THEN
        CREATE FUNCTION get_user_id_from_clerk()
        RETURNS UUID AS $$
        BEGIN
          -- Get the user_id from users table based on clerk_id from JWT
          RETURN (
            SELECT id FROM users 
            WHERE clerk_id = get_clerk_user_id()
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        RAISE NOTICE 'Created function get_user_id_from_clerk()';
    ELSE
        RAISE NOTICE 'Function get_user_id_from_clerk() already exists, skipping...';
    END IF;
END $$;

-- 3. Drop existing RLS policies safely (only if they exist)
DO $$ 
BEGIN
    -- Users table policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view own data') THEN
        DROP POLICY "Users can view own data" ON users;
        RAISE NOTICE 'Dropped existing policy: Users can view own data';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own data') THEN
        DROP POLICY "Users can insert own data" ON users;
        RAISE NOTICE 'Dropped existing policy: Users can insert own data';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own data') THEN
        DROP POLICY "Users can update own data" ON users;
        RAISE NOTICE 'Dropped existing policy: Users can update own data';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Service role can manage all users') THEN
        DROP POLICY "Service role can manage all users" ON users;
        RAISE NOTICE 'Dropped existing policy: Service role can manage all users';
    END IF;

    -- Leads table policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can view own leads') THEN
        DROP POLICY "Users can view own leads" ON leads;
        RAISE NOTICE 'Dropped existing policy: Users can view own leads';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can insert own leads') THEN
        DROP POLICY "Users can insert own leads" ON leads;
        RAISE NOTICE 'Dropped existing policy: Users can insert own leads';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can update own leads') THEN
        DROP POLICY "Users can update own leads" ON leads;
        RAISE NOTICE 'Dropped existing policy: Users can update own leads';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can delete own leads') THEN
        DROP POLICY "Users can delete own leads" ON leads;
        RAISE NOTICE 'Dropped existing policy: Users can delete own leads';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Service role can manage all leads') THEN
        DROP POLICY "Service role can manage all leads" ON leads;
        RAISE NOTICE 'Dropped existing policy: Service role can manage all leads';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Allow all operations temporarily') THEN
        DROP POLICY "Allow all operations temporarily" ON leads;
        RAISE NOTICE 'Dropped existing policy: Allow all operations temporarily';
    END IF;

    RAISE NOTICE 'Finished dropping existing policies';
END $$;

-- 4. Create new RLS policies safely
DO $$ 
BEGIN
    -- Users table policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view own data') THEN
        CREATE POLICY "Users can view own data" ON users
            FOR SELECT USING (clerk_id = get_clerk_user_id());
        RAISE NOTICE 'Created policy: Users can view own data';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own data') THEN
        CREATE POLICY "Users can insert own data" ON users
            FOR INSERT WITH CHECK (clerk_id = get_clerk_user_id());
        RAISE NOTICE 'Created policy: Users can insert own data';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own data') THEN
        CREATE POLICY "Users can update own data" ON users
            FOR UPDATE USING (clerk_id = get_clerk_user_id());
        RAISE NOTICE 'Created policy: Users can update own data';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Service role can manage all users') THEN
        CREATE POLICY "Service role can manage all users" ON users
            FOR ALL USING (auth.role() = 'service_role');
        RAISE NOTICE 'Created policy: Service role can manage all users';
    END IF;

    -- Leads table policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can view own leads') THEN
        CREATE POLICY "Users can view own leads" ON leads
            FOR SELECT USING (user_id = get_user_id_from_clerk());
        RAISE NOTICE 'Created policy: Users can view own leads';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can insert own leads') THEN
        CREATE POLICY "Users can insert own leads" ON leads
            FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());
        RAISE NOTICE 'Created policy: Users can insert own leads';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can update own leads') THEN
        CREATE POLICY "Users can update own leads" ON leads
            FOR UPDATE USING (user_id = get_user_id_from_clerk());
        RAISE NOTICE 'Created policy: Users can update own leads';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can delete own leads') THEN
        CREATE POLICY "Users can delete own leads" ON leads
            FOR DELETE USING (user_id = get_user_id_from_clerk());
        RAISE NOTICE 'Created policy: Users can delete own leads';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Service role can manage all leads') THEN
        CREATE POLICY "Service role can manage all leads" ON leads
            FOR ALL USING (auth.role() = 'service_role');
        RAISE NOTICE 'Created policy: Service role can manage all leads';
    END IF;

    RAISE NOTICE 'Finished creating users and leads policies';
END $$;

-- 5. Create policies for new schema tables (only if they exist)
DO $$ 
BEGIN
    -- Assessment Forms table policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_forms') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_forms' AND policyname = 'Users can view own assessment forms') THEN
            CREATE POLICY "Users can view own assessment forms" ON assessment_forms
                FOR SELECT USING (user_id = get_user_id_from_clerk());
            RAISE NOTICE 'Created policy: Users can view own assessment forms';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_forms' AND policyname = 'Users can insert own assessment forms') THEN
            CREATE POLICY "Users can insert own assessment forms" ON assessment_forms
                FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());
            RAISE NOTICE 'Created policy: Users can insert own assessment forms';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_forms' AND policyname = 'Users can update own assessment forms') THEN
            CREATE POLICY "Users can update own assessment forms" ON assessment_forms
                FOR UPDATE USING (user_id = get_user_id_from_clerk());
            RAISE NOTICE 'Created policy: Users can update own assessment forms';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_forms' AND policyname = 'Users can delete own assessment forms') THEN
            CREATE POLICY "Users can delete own assessment forms" ON assessment_forms
                FOR DELETE USING (user_id = get_user_id_from_clerk());
            RAISE NOTICE 'Created policy: Users can delete own assessment forms';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_forms' AND policyname = 'Service role can manage all assessment forms') THEN
            CREATE POLICY "Service role can manage all assessment forms" ON assessment_forms
                FOR ALL USING (auth.role() = 'service_role');
            RAISE NOTICE 'Created policy: Service role can manage all assessment forms';
        END IF;
    ELSE
        RAISE NOTICE 'Table assessment_forms does not exist, skipping policies';
    END IF;

    -- Assessment Submissions table policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_submissions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_submissions' AND policyname = 'Users can view own assessment submissions') THEN
            CREATE POLICY "Users can view own assessment submissions" ON assessment_submissions
                FOR SELECT USING (user_id = get_user_id_from_clerk());
            RAISE NOTICE 'Created policy: Users can view own assessment submissions';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_submissions' AND policyname = 'Users can insert own assessment submissions') THEN
            CREATE POLICY "Users can insert own assessment submissions" ON assessment_submissions
                FOR INSERT WITH CHECK (user_id = get_user_id_from_clerk());
            RAISE NOTICE 'Created policy: Users can insert own assessment submissions';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_submissions' AND policyname = 'Users can update own assessment submissions') THEN
            CREATE POLICY "Users can update own assessment submissions" ON assessment_submissions
                FOR UPDATE USING (user_id = get_user_id_from_clerk());
            RAISE NOTICE 'Created policy: Users can update own assessment submissions';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_submissions' AND policyname = 'Users can delete own assessment submissions') THEN
            CREATE POLICY "Users can delete own assessment submissions" ON assessment_submissions
                FOR DELETE USING (user_id = get_user_id_from_clerk());
            RAISE NOTICE 'Created policy: Users can delete own assessment submissions';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_submissions' AND policyname = 'Service role can manage all assessment submissions') THEN
            CREATE POLICY "Service role can manage all assessment submissions" ON assessment_submissions
                FOR ALL USING (auth.role() = 'service_role');
            RAISE NOTICE 'Created policy: Service role can manage all assessment submissions';
        END IF;
    ELSE
        RAISE NOTICE 'Table assessment_submissions does not exist, skipping policies';
    END IF;

    RAISE NOTICE 'Finished creating new schema table policies';
END $$;

-- 6. Enable RLS on tables (only if not already enabled)
DO $$ 
BEGIN
    -- Users table
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND rowsecurity = true) THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on users table';
    ELSE
        RAISE NOTICE 'RLS already enabled on users table';
    END IF;
    
    -- Leads table
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'leads' AND rowsecurity = true) THEN
        ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on leads table';
    ELSE
        RAISE NOTICE 'RLS already enabled on leads table';
    END IF;
    
    RAISE NOTICE 'Finished enabling RLS';
END $$;

-- 7. Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'leads')
ORDER BY tablename, policyname;

-- 8. Show summary
SELECT 
    'Summary' as info,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN tablename = 'users' THEN 1 END) as users_policies,
    COUNT(CASE WHEN tablename = 'leads' THEN 1 END) as leads_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'leads');
