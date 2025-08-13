# 🚀 Legacy Tables Setup Guide

## 🎯 **What This Fixes**
The assessment submission is failing because the backend code expects these tables to exist:
- ❌ `risk_assessments` - **Missing**
- ❌ `risk_assessment_answers` - **Missing**

## 📋 **Step-by-Step Instructions**

### **Step 1: Open Supabase Dashboard**
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your OneMFin project

### **Step 2: Open SQL Editor**
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** to create a new SQL script

### **Step 3: Copy and Paste the SQL**
1. Copy the entire contents of `create-legacy-tables.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** to execute the script

### **Step 4: Verify Tables Were Created**
1. In the left sidebar, click **"Table Editor"**
2. You should see two new tables:
   - ✅ `risk_assessments`
   - ✅ `risk_assessment_answers`

### **Step 5: Restart Your Backend**
1. Stop your backend server (Ctrl+C)
2. Start it again: `npm run dev`

### **Step 6: Test Assessment Submission**
1. Go to your assessment form
2. Fill it out and submit
3. It should now work without the 500 error! 🎉

## 🔍 **What the SQL Script Does**

1. **Creates `risk_assessments` table** - Stores assessment results and risk scores
2. **Creates `risk_assessment_answers` table** - Stores individual question answers
3. **Adds proper indexes** - For better performance
4. **Enables Row Level Security (RLS)** - For data security
5. **Creates RLS policies** - Users can only access their own data

## 🚨 **If You Get Errors**

- **"Table already exists"** - This is fine, the script uses `IF NOT EXISTS`
- **"Permission denied"** - Make sure you're using the service role key
- **"Function not found"** - This script uses standard SQL, not custom functions

## 🎉 **Expected Result**

After running this script:
- ✅ Assessment submission will work
- ✅ No more 500 Internal Server Error
- ✅ Leads will be created properly
- ✅ Risk scores will be calculated and stored

## 📞 **Need Help?**

If you encounter any issues:
1. Check the error message in Supabase
2. Make sure you're in the right project
3. Try running the verification queries at the bottom of the SQL script

---

**Ready to fix your assessment submission? Let's go! 🚀**
