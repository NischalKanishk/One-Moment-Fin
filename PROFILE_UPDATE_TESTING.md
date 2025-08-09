# Profile Update Testing Guide

## 🎯 **Current Status**
- ✅ Backend is running and working correctly
- ✅ Authentication middleware is functioning
- ✅ Profile update endpoint is properly implemented
- ✅ Frontend has been updated to use default Clerk JWT token
- ❓ Need to test if JWT token generation is working

## 🧪 **Testing Steps**

### 1. **Open Browser Console**
1. Go to `http://localhost:8080` (frontend)
2. Sign in to your account
3. Open Developer Tools (F12)
4. Go to Console tab

### 2. **Test JWT Token Generation**
1. Navigate to Profile page (`/app/profile`)
2. Click the "Debug JWT Token" button
3. Check console for output like:
   ```
   🔍 Testing JWT tokens...
   ✅ Default token: SUCCESS
   🔍 Default token payload: { sub: "user_...", ... }
   ❌ Supabase template not available: ...
   ```

### 3. **Test Profile Update**
1. Make a change to your name or phone number
2. Click "Save Changes"
3. Check console for detailed logs:
   ```
   🔍 Starting profile update...
   ✅ Got default Clerk token
   ✅ JWT token obtained, length: XXX
   🚀 Calling API with token and data: ...
   ✅ Profile update API call successful: ...
   ```

### 4. **Expected Results**
- ✅ JWT token should be generated successfully
- ✅ Profile update should work and save to database
- ✅ Success toast should appear
- ✅ Form should show "no unsaved changes"

## 🐛 **Troubleshooting**

### **Issue: "Failed to generate authentication token"**
**Cause**: Clerk JWT token generation is failing
**Solution**: 
1. Check if you're signed in to Clerk
2. Try signing out and signing back in
3. Check browser console for detailed error messages

### **Issue: "Authentication failed"**
**Cause**: Backend can't validate the JWT token
**Solution**:
1. Check if backend is running on port 3001
2. Verify JWT token is being sent in Authorization header
3. Check backend console for authentication logs

### **Issue: "Profile update failed"**
**Cause**: Database update is failing
**Solution**:
1. Check backend console for database error logs
2. Verify Supabase connection is working
3. Check if user exists in database

## 🔍 **Debug Information**

### **Frontend Console Logs**
- JWT token generation attempts
- API call details
- Response handling

### **Backend Console Logs**
- Authentication middleware logs
- Profile update request details
- Database operation results

### **Network Tab**
- Check if API calls are being made
- Verify request headers include Authorization
- Check response status codes

## 📋 **Test Checklist**

- [ ] Frontend loads without errors
- [ ] User can sign in successfully
- [ ] Profile page loads with user data
- [ ] JWT token generation works (check console)
- [ ] Profile update saves successfully
- [ ] Database reflects the changes
- [ ] No authentication errors in console

## 🚀 **Next Steps After Testing**

1. **If everything works**: The issue was the missing Clerk JWT template
2. **If JWT generation fails**: Need to configure Clerk JWT template
3. **If authentication fails**: Check backend logs for specific errors
4. **If database update fails**: Check Supabase connection and RLS policies

## 💡 **Quick Fix for JWT Template**

If you need to configure the Clerk JWT template:

1. Go to [Clerk Dashboard](https://clerk.com)
2. Select your OneMFin application
3. Navigate to **JWT Templates**
4. Create template named `supabase`
5. Use minimal claims: `{"aud": "authenticated", "role": "authenticated"}`

---

**Run the tests and let me know what you see in the console!**
