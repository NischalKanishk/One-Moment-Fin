# Clerk JWT Template Setup for Supabase RLS

## 🎯 Overview

To enable proper Row Level Security (RLS) in Supabase with Clerk authentication, you need to configure a JWT template in Clerk that generates tokens compatible with Supabase's RLS policies.

## 🔧 Step-by-Step Setup

### 1. Access Clerk Dashboard

1. Go to [clerk.com](https://clerk.com) and sign in
2. Select your OneMFin application
3. Navigate to **JWT Templates** in the left sidebar

### 2. Create JWT Template

1. Click **"Create template"**
2. Set the following configuration:

#### Basic Settings
- **Template name**: `supabase`
- **Algorithm**: `RS256` (recommended) or `HS256`
- **Token lifetime**: `1 hour` (or your preferred duration)

#### Claims Configuration (Minimal Version)
```json
{
  "aud": "authenticated",
  "role": "authenticated"
}
```

**Why This Minimal Version Works:**
- **`sub` claim**: Automatically provided by Clerk (user ID)
- **`iat` and `exp`**: Automatically provided by Clerk (token timestamps)
- **`aud`**: Required for Supabase authentication
- **`role`**: Helps with role-based access control
- **No custom claims**: Reduces network overhead and complexity

#### Alternative: Extended Version (If you need more data)
```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "email": "{{user.primary_email_address.email_address}}"
}
```

**Choose the minimal version unless you specifically need email in your RLS policies.**

**Important Notes:**
- **Don't use `sub`**: Clerk automatically adds the `sub` claim with the user ID
- **Keep it minimal**: Only include essential claims to reduce network overhead
- **Required claims**: `user_id` and `aud` are essential for Supabase RLS

### 3. Configure Supabase RLS Policies

After setting up the JWT template, apply the RLS policies to your Supabase database:

```bash
# Connect to your Supabase project and run:
psql -h zldljufeyskfzvzftjos.supabase.co -U postgres -d postgres -f clerk-rls-policies.sql
```

### 4. Test the Setup

1. Sign in to your application
2. Check the browser console for JWT token logs
3. Verify that the token is being used for Supabase requests
4. Test that RLS policies are working correctly

## 🚨 Troubleshooting

### Common Issues

#### 1. "You can't use the reserved claim: sub" Error
- **Cause**: Clerk reserves `sub`, `iat`, `exp` claims automatically
- **Solution**: Remove `sub`, `iat`, `exp` from your custom claims
- **Use**: Clerk automatically provides these essential claims

#### 2. "Bigger JSON objects increase the network overhead" Warning
- **Cause**: Too many custom claims in JWT template
- **Solution**: Use minimal claims - only include what's absolutely necessary
- **Recommended**: Start with just `aud` and `role` claims

#### 3. "Supabase JWT template not found" Warning
- **Cause**: JWT template not created or named incorrectly
- **Solution**: Ensure the template is named exactly `supabase`

#### 4. RLS Policies Not Working
- **Cause**: JWT token claims don't match RLS policy expectations
- **Solution**: Verify JWT template claims match your RLS policies

### Debug Steps

1. **Check JWT Token Structure**:
   ```javascript
   // In browser console
   const token = await window.Clerk.session?.getToken({ template: 'supabase' })
   console.log('JWT Token:', token)
   ```

2. **Verify Claims**:
   - Decode the JWT token at [jwt.io](https://jwt.io)
   - Check that all required claims are present

3. **Test Supabase Connection**:
   - Use the test connection function in your Dashboard
   - Check browser console for connection logs

## 📋 Required Claims for RLS

Your JWT template must include these claims for RLS to work:

- **`aud`**: Audience (should be "authenticated") - **Required**
- **`role`**: User role (should be "authenticated") - **Required**

**Claims Automatically Provided by Clerk:**
- **`sub`**: User ID (automatically included, don't add manually)
- **`iat`**: Issued at timestamp (automatically included)
- **`exp`**: Expiration timestamp (automatically included)

**Optional Claims (only if needed for RLS policies):**
- **`email`**: User's email address (only if your RLS policies check email)
- **`phone_number`**: User's phone number (only if your RLS policies check phone)

## 🔄 Alternative Setup

If you prefer not to use JWT templates, you can:

1. Use the default Clerk JWT token
2. Modify your RLS policies to work with the default claims
3. Update the `clerk-rls-policies.sql` file accordingly

## 📚 Additional Resources

- [Clerk JWT Templates Documentation](https://clerk.com/docs/backend-requests/jwt-templates)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [JWT.io](https://jwt.io) - JWT token debugging tool

## ✅ Verification Checklist

- [ ] JWT template created with name `supabase`
- [ ] Template includes all required claims
- [ ] RLS policies applied to database
- [ ] Authentication flow working
- [ ] RLS policies enforcing access control
- [ ] No console errors related to JWT tokens

---

**Note**: After setting up the JWT template, restart your development server to ensure the changes take effect.
