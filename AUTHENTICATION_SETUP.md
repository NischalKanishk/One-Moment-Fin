# OneMFin Authentication Setup Guide

This guide will help you set up the complete authentication system for OneMFin using Clerk for authentication and Supabase for data storage.

## 🚀 Quick Start

### 1. Environment Variables

Copy `env.local.example` to `.env.local` and fill in your values:

```bash
cp env.local.example .env.local
```

**Required Environment Variables:**

```env
# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here

# Supabase Configuration  
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Clerk Setup

1. **Create a Clerk Account:**
   - Go to [clerk.com](https://clerk.com) and sign up
   - Create a new application

2. **Configure Authentication Methods:**
   - Enable Email/Password or Phone/OTP
   - Configure social providers if needed
   - Set up your domain in Clerk dashboard

3. **Get Your Publishable Key:**
   - Copy the publishable key from your Clerk dashboard
   - Add it to `.env.local`

### 3. Supabase Setup

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com) and create a project
   - Note your project URL and anon key

2. **Run the Database Schema:**
   ```bash
   # Connect to your Supabase project and run:
   psql -h your-project.supabase.co -U postgres -d postgres -f supabase-schema.sql
   ```

3. **Configure Environment Variables:**
   - Add your Supabase URL and anon key to `.env.local`

## 🔧 How It Works

### Authentication Flow

1. **User Signs Up/In:** Uses Clerk's authentication UI
2. **Clerk Authentication:** Handles OTP, social login, etc.
3. **Data Sync:** User data automatically syncs to Supabase
4. **Session Management:** Clerk manages sessions, Supabase stores user data

### Data Synchronization

The `ClerkSupabaseSync` service automatically:
- Creates new users in Supabase when they sign up via Clerk
- Updates existing users when their profile changes
- Maintains data consistency between both systems

### Protected Routes

- All `/app/*` routes are protected
- Unauthenticated users are redirected to `/auth`
- Loading states are handled gracefully

## 📁 File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Authentication context
├── lib/
│   ├── clerk-supabase-sync.ts   # Sync service
│   └── supabase.ts              # Supabase client
├── components/
│   └── ProtectedRoute.tsx       # Route protection
├── pages/
│   ├── Auth.tsx                 # Sign in page
│   └── Signup.tsx               # Sign up page
└── layouts/
    └── AppLayout.tsx            # Protected app layout
```

## 🎯 Key Features

### ✅ What's Implemented

- **Clerk Integration:** Complete authentication with Clerk
- **Supabase Sync:** Automatic user data synchronization
- **Protected Routes:** Secure access to app features
- **User Management:** Profile display and management
- **Session Handling:** Proper logout and session management

### 🔄 User Data Flow

```
Clerk Auth → AuthContext → ClerkSupabaseSync → Supabase Database
     ↓              ↓              ↓              ↓
  OTP/Login → User State → Data Sync → Persistent Storage
```

### 🛡️ Security Features

- **Row Level Security:** Database-level access control
- **JWT Tokens:** Secure session management
- **Protected Routes:** Client and server-side protection
- **Data Validation:** Input sanitization and validation

## 🚨 Troubleshooting

### Common Issues

1. **"Missing Clerk Publishable Key" Error:**
   - Ensure `.env.local` exists and has the correct key
   - Restart your development server

2. **Supabase Connection Issues:**
   - Check your Supabase URL and anon key
   - Verify your database schema is properly set up

3. **Authentication Not Working:**
   - Check Clerk dashboard for configuration issues
   - Verify domain settings in Clerk

### Debug Mode

Enable debug logging by setting:
```env
VITE_ENABLE_DEBUG_MODE=true
```

## 🔮 Future Enhancements

- **Multi-Factor Authentication:** TOTP support for admins
- **Role-Based Access Control:** Advanced permission system
- **Audit Logging:** Track authentication events
- **Social Login:** Google, GitHub, etc.
- **Password Reset:** Email-based password recovery

## 📚 Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Router Documentation](https://reactrouter.com/)

## 🆘 Support

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure database schema is properly applied
4. Check Clerk and Supabase dashboards for configuration issues

---

**Happy Coding! 🎉**
