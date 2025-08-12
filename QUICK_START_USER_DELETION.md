# 🚀 Quick Start: User Deletion Implementation

## ⚡ Get Up and Running in 5 Minutes

This guide will get your user deletion functionality working immediately.

## 📋 Prerequisites

- ✅ OneMFin backend running
- ✅ Supabase database access
- ✅ Clerk account configured
- ✅ Node.js and npm installed

## 🎯 Quick Implementation Steps

### 1. Run the Setup Script

```bash
./setup-user-deletion.sh
```

This will check your environment and guide you through the setup.

### 2. Create Database Tables

**Option A: Supabase Dashboard (Recommended)**
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy the contents of `create-deprecated-users-database.sql`
4. Paste and execute

**Option B: Command Line**
```bash
psql -h YOUR_SUPABASE_HOST -U YOUR_USERNAME -d YOUR_DATABASE \
  -f create-deprecated-users-database.sql
```

### 3. Configure Environment

Add to your `backend/.env`:
```bash
CLERK_WEBHOOK_SECRET=your_webhook_secret_here
```

### 4. Configure Clerk Webhook

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks**
3. Create new endpoint:
   - **URL**: `https://your-domain.com/webhooks/clerk`
   - **Events**: `user.deleted`, `user.updated`, `user.created`
4. Copy the webhook secret to your `.env`

### 5. Test the Implementation

```bash
cd backend
node test-user-deletion.mjs
```

## 🔍 Verify Everything Works

### Check Webhook Endpoint
```bash
curl http://localhost:3001/webhooks/clerk/health
```
Expected: `{"status":"OK","endpoint":"clerk-webhooks"}`

### Check Admin Endpoint
```bash
curl http://localhost:3001/api/admin/health
```
Expected: `{"status":"OK","endpoint":"admin"}`

### Test User Deletion
1. Create a test user in Clerk
2. Delete the user in Clerk
3. Check your backend logs for webhook processing
4. Verify data appears in `deprecated_users` table

## 🚨 Common Issues & Quick Fixes

### Issue: "Webhook not received"
**Fix**: Check Clerk webhook URL and ensure your backend is accessible

### Issue: "Database migration failed"
**Fix**: Verify you have `SUPABASE_SERVICE_ROLE_KEY` in your `.env`

### Issue: "User not found for deletion"
**Fix**: Ensure `clerk_id` is properly set in your `users` table

### Issue: "Permission denied"
**Fix**: Check that your database user has execute permissions on functions

## 📊 What Happens When a User is Deleted

1. **Clerk sends webhook** → `user.deleted` event
2. **Backend processes webhook** → Finds user by `clerk_id`
3. **Data migration** → All user data copied to `deprecated_*` tables
4. **User deletion** → User removed from active tables
5. **Data preservation** → All data safely stored in deprecated tables

## 🎉 You're Done!

Your user deletion system is now:
- ✅ **Automatically triggered** when users delete accounts in Clerk
- ✅ **Data-preserving** - nothing is lost
- ✅ **Compliant** - maintains audit trails
- ✅ **Admin-managed** - full oversight capabilities
- ✅ **Production-ready** - secure and scalable

## 🔗 Next Steps

- Read the full [Implementation Guide](USER_DELETION_IMPLEMENTATION.md)
- Test with real users
- Monitor webhook delivery rates
- Set up admin monitoring

## 🆘 Need Help?

- Check the [troubleshooting section](USER_DELETION_IMPLEMENTATION.md#troubleshooting)
- Run the setup script again: `./setup-user-deletion.sh`
- Verify all environment variables are set
- Check backend logs for detailed error messages

---

**🎯 Goal Achieved**: Users can now delete their accounts from Clerk, and all their data will be automatically preserved in deprecated tables while being removed from the active system.
