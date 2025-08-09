# Apply RLS Policies to OneMFin Database

## 🎯 Overview

This guide will help you apply the Row Level Security (RLS) policies to your OneMFin Supabase database to complete the authentication security setup.

## 🔧 Method 1: Supabase Dashboard (Recommended)

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with your account
3. Select your **OneMFin** project

### Step 2: Open SQL Editor
1. In the left sidebar, click **SQL Editor**
2. Click **New Query** to create a new SQL query

### Step 3: Apply RLS Policies
1. Copy the entire contents of `clerk-rls-policies.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the policies

### Step 4: Verify Policies Applied
Run this query to verify RLS is enabled:
```sql
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

You should see `t` (true) in the `rowsecurity` column for all tables.

## 🔧 Method 2: Supabase CLI

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Login to Supabase
```bash
supabase login
```

### Step 3: Apply Policies
```bash
# Navigate to your project directory
cd /path/to/OneMFin

# Apply the policies
supabase db push --db-url "postgresql://postgres:[YOUR_PASSWORD]@zldljufeyskfzvzftjos.supabase.co:5432/postgres"
```

## 🔧 Method 3: Direct Database Connection

If you have access to the database directly:

```bash
# Install PostgreSQL client
brew install postgresql

# Connect and apply policies
psql -h zldljufeyskfzvzftjos.supabase.co -U postgres -d postgres -f clerk-rls-policies.sql
```

## ✅ Verification Steps

After applying the policies:

### 1. Test RLS Enforcement
```bash
# This should work (with anon key)
curl "https://zldljufeyskfzvzftjos.supabase.co/rest/v1/users?select=count" \
  -H "apikey: YOUR_ANON_KEY"

# This should fail (no JWT token)
curl "https://zldljufeyskfzvzftjos.supabase.co/rest/v1/users?select=*" \
  -H "apikey: YOUR_ANON_KEY"
```



### 2. Check Browser Console
1. Open your app in the browser
2. Sign in with a user account
3. Check the console for JWT token logs
4. Verify that authenticated requests work

### 3. Test Data Isolation
1. Create a second user account
2. Verify that users can only see their own data
3. Check that cross-user access is blocked

## 🚨 Troubleshooting

### Common Issues

#### 1. "Permission Denied" Errors
- **Cause**: RLS policies are too restrictive
- **Solution**: Check that the `get_current_user_clerk_id()` function works correctly

#### 2. All Data Access Blocked
- **Cause**: JWT token not being sent correctly
- **Solution**: Verify JWT template configuration in Clerk

#### 3. Policies Not Applied
- **Cause**: SQL execution failed
- **Solution**: Check SQL Editor for error messages

### Debug Commands

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies on a specific table
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Test the JWT function
SELECT get_current_user_clerk_id();
```

## 📋 What the Policies Do

The RLS policies ensure:

1. **Users Table**: Users can only access their own profile data
2. **Leads Table**: Users can only access leads they created
3. **Assessments Table**: Users can only access their own assessments
4. **All Other Tables**: Proper user isolation based on user_id relationships

## 🔄 Next Steps After RLS

1. **Configure Clerk JWT Template** (see `CLERK_JWT_SETUP.md`)
2. **Test Complete Authentication Flow**
3. **Verify Data Isolation**
4. **Deploy to Production**

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Clerk JWT Templates](https://clerk.com/docs/backend-requests/jwt-templates)
- [OneMFin Authentication Setup](./AUTHENTICATION_SETUP_COMPLETE.md)

---

**⚠️ Important**: After applying RLS policies, restart your development server to ensure all changes take effect.

**Happy Securing! 🔒**
