# OneMFin Complete Setup Guide

## 🎯 Current Status: 90% Complete

The authentication system is working for basic functionality, but **2 critical steps remain** to complete the security setup:

1. ✅ **Clerk Integration** - Working
2. ✅ **Supabase Sync** - Working  
3. ✅ **Profile Updates** - Working (Fixed!)
4. ❌ **JWT Template** - Needs configuration
5. ❌ **RLS Policies** - Needs application

## 🚨 Critical Missing Steps

### Step 1: Configure Clerk JWT Template

**This is REQUIRED for the system to work properly!**

1. Go to [Clerk Dashboard](https://clerk.com)
2. Select your OneMFin application
3. Navigate to **JWT Templates**
4. Click **"Create template"**
5. Configure as follows:

```json
{
  "aud": "authenticated",
  "role": "authenticated"
}
```

**Template Settings:**
- **Name**: `supabase`
- **Algorithm**: `RS256`
- **Token lifetime**: `1 hour`

**Why This Matters:**
- Without this template, `getToken({ template: 'supabase' })` will fail
- Profile updates and data sync will break
- Users won't be able to access their data

### Step 2: Apply RLS Policies

**This enables database-level security!**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your OneMFin project
3. Go to **SQL Editor**
4. Copy and paste the contents of `clerk-rls-policies.sql`
5. Click **Run**

**What This Does:**
- Enables Row Level Security on all tables
- Users can only access their own data
- Prevents unauthorized data access
- Enables proper JWT-based authentication

## 🔧 Environment Configuration

### Frontend (.env.local)
```bash
# Copy from env.local.example
cp env.local.example .env.local

# Required variables:
VITE_CLERK_PUBLISHABLE_KEY=pk_test_cHJvdWQtbGFyay0zMy5jbGVyay5hY2NvdW50cy5kZXYk
VITE_SUPABASE_URL=https://lmuvvdadkpfmunjbsloq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:3001
```

### Backend (.env)
```bash
# Copy from env.example
cp env.example .env

# Required variables:
SUPABASE_URL=https://lmuvvdadkpfmunjbsloq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
```

## 🧪 Testing the Complete System

### 1. Start Both Services
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
npm run dev
```

### 2. Test Authentication Flow
1. Go to `http://localhost:8080`
2. Sign up with a new account
3. Verify user data syncs to Supabase
4. Go to Settings → Profile
5. Update profile information
6. Verify changes persist in database

### 3. Test Data Isolation
1. Create a lead or assessment
2. Sign in with different account
3. Verify you can't see other user's data
4. Check browser console for JWT token logs

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. "Failed to get Clerk JWT token"
**Cause**: JWT template not configured
**Solution**: Create the `supabase` JWT template in Clerk

#### 2. "User not found in database"
**Cause**: RLS policies blocking access
**Solution**: Apply RLS policies from `clerk-rls-policies.sql`

#### 3. "Authentication failed"
**Cause**: Environment variables not set
**Solution**: Check `.env.local` and backend `.env` files

#### 4. "CORS error"
**Cause**: Backend not running or wrong port
**Solution**: Ensure backend is running on port 3001

#### 5. "Database connection failed"
**Cause**: Supabase credentials incorrect
**Solution**: Verify Supabase URL and keys

### Debug Mode
Enable debug logging in `.env.local`:
```bash
VITE_ENABLE_DEBUG_MODE=true
```

## 📊 System Architecture

```
Frontend (React) → Clerk Auth → JWT Token → Supabase (with RLS)
     ↓                ↓           ↓              ↓
  Settings UI → Profile Update → JWT Validation → Database Access
```

## 🔒 Security Features

### What's Working
- ✅ Clerk authentication
- ✅ JWT token generation
- ✅ Protected routes
- ✅ User data sync

### What's Pending
- ❌ Database-level access control (RLS)
- ❌ JWT template configuration

## 🎯 Next Actions

### Immediate (Required)
1. **Configure Clerk JWT Template** - This will fix profile updates
2. **Apply RLS Policies** - This will enable data security

### After Setup
1. Test complete authentication flow
2. Verify data isolation works
3. Test profile updates
4. Monitor for any errors

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify JWT template is configured in Clerk
3. Ensure RLS policies are applied in Supabase
4. Check environment variables are set correctly
5. Verify both frontend and backend are running

## 🎉 Success Criteria

The system is fully working when:
- ✅ Users can sign up/sign in
- ✅ Profile updates work and persist
- ✅ User data is properly isolated
- ✅ No authentication errors in console
- ✅ JWT tokens are being generated and used

---

**⚠️ IMPORTANT**: The JWT template configuration is the most critical missing piece. Without it, the authentication system will not work properly.

**Next Action**: Configure the `supabase` JWT template in Clerk Dashboard.
