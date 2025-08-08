# 🔧 Fix Authentication Users Issue - End-to-End Solution

## **Problem**
Users appear in Supabase Auth (Authentication → Users) but no row is created in `public.users` table. This causes users to be treated as "mock users" instead of real users.

## **Root Cause**
1. **Database Schema Issue**: The `users` table has `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()` which conflicts with Supabase Auth user IDs
2. **RLS Policies**: Missing or incorrect Row Level Security policies
3. **Service Role Key**: Backend might not have proper permissions to insert into users table

## **Solution Steps**

### **Step 1: Update Database Schema**

Run the following SQL in your Supabase SQL Editor:

```sql
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
```

### **Step 2: Verify Environment Variables**

Make sure your `.env` file has the correct Supabase configuration:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important**: The `SUPABASE_SERVICE_ROLE_KEY` is crucial for backend operations.

### **Step 3: Test the Fix**

1. **Restart your backend server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Try signing up a new user**:
   ```bash
   curl -X POST http://localhost:3001/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123",
       "full_name": "Test User"
     }'
   ```

3. **Check both tables**:
   - Go to Supabase Dashboard → Authentication → Users (should see the user)
   - Go to Supabase Dashboard → Table Editor → users (should see the user)

### **Step 4: Migrate Existing Users**

If you have existing users in Auth but not in the users table, use the migration endpoints:

1. **List orphaned users**:
   ```bash
   curl -X GET http://localhost:3001/api/auth/orphaned-users \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

2. **Migrate a specific user**:
   ```bash
   curl -X POST http://localhost:3001/api/auth/migrate-user \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "auth_user_id": "user-uuid-from-auth",
       "full_name": "User Name",
       "email": "user@example.com",
       "role": "mfd"
     }'
   ```

3. **Bulk migrate all orphaned users**:
   ```bash
   curl -X POST http://localhost:3001/api/auth/bulk-migrate \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

### **Step 5: Verify the Fix**

1. **Check user creation flow**:
   - Sign up a new user
   - Verify user appears in both Auth and users table
   - Verify user can log in and access protected endpoints

2. **Check login flow**:
   - Log in with existing user
   - Verify user data is retrieved from users table (not mock user)

3. **Check database queries**:
   ```sql
   -- Should return user data
   SELECT * FROM users WHERE email = 'user@example.com';
   
   -- Should show RLS policies
   SELECT policyname, permissive, roles, cmd, qual 
   FROM pg_policies WHERE tablename = 'users';
   ```

## **Troubleshooting**

### **Issue 1: "new row violates row-level security policy"**
**Solution**: Make sure you're using the service role key in your backend:
```typescript
// In backend/src/config/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

### **Issue 2: "duplicate key value violates unique constraint"**
**Solution**: The user already exists. Use the migration service to handle existing users.

### **Issue 3: "invalid input syntax for type uuid"**
**Solution**: Make sure the Auth user ID is a valid UUID format.

### **Issue 4: Mock user still being created**
**Solution**: Check server logs for specific error messages. The issue might be:
- Missing service role key
- Incorrect RLS policies
- Database connection issues

## **Monitoring**

Add these logs to your backend to monitor the user creation process:

```typescript
// In signup route
console.log('Auth user created:', data.user.id);
console.log('Attempting to create user in database...');
console.log('Database insert result:', userError || 'Success');
```

## **Expected Outcome**

After implementing this fix:
1. ✅ New users are created in both Auth and users table
2. ✅ Existing users can be migrated from Auth to users table
3. ✅ Login retrieves real user data (not mock users)
4. ✅ All protected endpoints work with real user data
5. ✅ RLS policies properly secure user data

## **Testing Checklist**

- [ ] New user signup creates record in both tables
- [ ] User login retrieves data from users table
- [ ] Protected endpoints work with real user data
- [ ] RLS policies prevent unauthorized access
- [ ] Migration endpoints work for existing users
- [ ] No more "mock user" fallbacks in normal operation
