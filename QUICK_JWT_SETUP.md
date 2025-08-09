# Quick Clerk JWT Template Setup (Fixed Version)

## 🚨 **FIXED: Common Clerk Errors**

This guide addresses the specific errors you encountered:
- ❌ "You can't use the reserved claim: sub"
- ❌ "Bigger JSON objects increase the network overhead"

## ✅ **Correct JWT Template Configuration**

### Step 1: Create JWT Template in Clerk
1. Go to [Clerk Dashboard](https://clerk.com)
2. Select your OneMFin application
3. Navigate to **JWT Templates**
4. Click **"Create template"**

### Step 2: Basic Settings
- **Template name**: `supabase`
- **Algorithm**: `RS256` (recommended)
- **Token lifetime**: `1 hour`

### Step 3: Claims Configuration (Minimal & Correct)
```json
{
  "aud": "authenticated",
  "role": "authenticated"
}
```

**✅ This is the CORRECT configuration that will work!**

## 🔍 **Why This Fixes Your Errors**

### Error 1: "You can't use the reserved claim: sub"
- **Problem**: Clerk reserves `sub`, `iat`, `exp` claims
- **Solution**: Don't add these claims manually
- **Result**: Clerk automatically provides them

### Error 2: "Bigger JSON objects increase the network overhead"
- **Problem**: Too many custom claims
- **Solution**: Use minimal claims (only 2 essential ones)
- **Result**: Smaller JWT tokens, better performance

## 🎯 **What Clerk Automatically Provides**

```json
{
  "sub": "user_123...",           // ← Automatically added
  "iat": 1234567890,              // ← Automatically added  
  "exp": 1234567890,              // ← Automatically added
  "aud": "authenticated",         // ← You add this
  "role": "authenticated"         // ← You add this
}
```

## 🚀 **Next Steps**

1. **Create the JWT template** with the minimal configuration above
2. **Apply RLS policies** using `apply-rls-policies.md`
3. **Test authentication** - the system should now work properly

## ❌ **Don't Use This (Will Cause Errors)**

```json
{
  "sub": "{{user.id}}",           // ❌ Reserved claim
  "iat": "{{token.issued_at}}",   // ❌ Reserved claim
  "exp": "{{token.expires_at}}",  // ❌ Reserved claim
  "email": "{{user.email}}",      // ❌ Unnecessary for basic RLS
  "phone": "{{user.phone}}",      // ❌ Unnecessary for basic RLS
  "name": "{{user.name}}",        // ❌ Unnecessary for basic RLS
  "aud": "authenticated",         // ✅ Required
  "role": "authenticated"         // ✅ Required
}
```

## 🔧 **If You Need More Claims Later**

Only add additional claims if your RLS policies specifically require them:

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "email": "{{user.primary_email_address.email_address}}"  // Only if RLS needs email
}
```

---

**🎉 This minimal configuration will work perfectly with your OneMFin authentication system!**
