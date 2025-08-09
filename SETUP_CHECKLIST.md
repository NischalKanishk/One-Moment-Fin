# OneMFin Setup Checklist

## 🎯 Complete These Steps to Finish Setup

### ✅ Already Done
- [x] Clerk integration configured
- [x] Supabase connection working
- [x] Profile update fixes implemented
- [x] Frontend and backend code ready

### ❌ Still Needed (Critical!)

#### 1. Configure Clerk JWT Template
- [ ] Go to [Clerk Dashboard](https://clerk.com)
- [ ] Select OneMFin application
- [ ] Go to **JWT Templates**
- [ ] Click **"Create template"**
- [ ] Set name: `supabase`
- [ ] Set algorithm: `RS256`
- [ ] Set lifetime: `1 hour`
- [ ] Add claims:
  ```json
  {
    "aud": "authenticated",
    "role": "authenticated"
  }
  ```
- [ ] Save template

#### 2. Apply RLS Policies
- [ ] Go to [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Select OneMFin project
- [ ] Go to **SQL Editor**
- [ ] Copy contents of `clerk-rls-policies.sql`
- [ ] Paste and click **Run**

#### 3. Test the System
- [ ] Start backend: `cd backend && npm run dev`
- [ ] Start frontend: `npm run dev`
- [ ] Sign up with new account
- [ ] Go to Settings → Profile
- [ ] Update profile information
- [ ] Verify changes save successfully
- [ ] Check browser console for JWT logs

## 🚨 Why These Steps Matter

### JWT Template
- **Without it**: Profile updates will fail
- **With it**: Full authentication works

### RLS Policies  
- **Without them**: No data security
- **With them**: Users can only access their own data

## 🔧 Quick Commands

```bash
# Start backend
cd backend && npm run dev

# Start frontend (new terminal)
npm run dev

# Check environment
cat .env.local | grep VITE_CLERK
cat backend/.env | grep SUPABASE
```

## 📞 Need Help?

1. Check browser console for errors
2. Verify JWT template exists in Clerk
3. Ensure RLS policies are applied in Supabase
4. Check environment variables are set

---

**🎯 Goal**: Get profile updates working and data properly secured!
