# Testing Vercel Deployment Issues

## Current Problem
The assessments page is getting errors:
- `invalid input syntax for type uuid: "forms"` 
- This suggests the API is working but there's a database connection issue

## What to Check

### 1. Vercel Environment Variables
Go to your Vercel dashboard and check if these environment variables are set:

```
SUPABASE_URL=https://zldljufeyskfzvzftjos.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
```

### 2. Test the API Endpoints
Try these URLs in your browser to see what errors you get:

- `https://one-moment-fin.vercel.app/api/assessments/test`
- `https://one-moment-fin.vercel.app/api/assessments/forms`
- `https://one-moment-fin.vercel.app/api/assessments/cfa/questions`

### 3. Check Vercel Function Logs
In your Vercel dashboard:
1. Go to Functions tab
2. Look for the `assessments` function
3. Check the logs for any errors

### 4. Database Connection Test
The `/api/assessments/test` endpoint should show:
- Database connection status
- User authentication status
- Framework availability

## Quick Fix Steps

1. **Set Environment Variables in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add the three variables above

2. **Redeploy:**
   - Push any changes to git
   - Vercel will auto-deploy

3. **Test Again:**
   - Check the assessments page
   - Look at browser console for errors

## Expected Behavior
After fixing environment variables:
- `/api/assessments/forms` should return assessment forms
- `/api/assessments/cfa/questions` should return CFA questions
- No more UUID parsing errors

## If Still Not Working
Check the Vercel function logs for specific database connection errors.
