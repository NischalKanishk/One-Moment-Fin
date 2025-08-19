# Assessment Questions Issue - Root Cause & Fix

## 🚨 **Problem Description**

The `/app/assessments` page is not displaying questions from the `framework_question` database table. Instead, it's showing hardcoded fallback questions.

## 🔍 **Root Cause Analysis**

### **Database Schema Mismatch**
There are **two different database schemas** being used:

1. **Frontend API** (`api/assessments.js`) - Deployed on Vercel
   - Expects: `framework_question_map` + `question_bank` tables
   - Uses: Old schema structure

2. **Backend API** (`backend/src/routes/assessments.ts`) - Not deployed
   - Expects: `framework_questions` table
   - Uses: New schema structure

### **The Real Issue**
The **database tables are empty** because the seed script (`seed-cfa-framework.sql`) has never been run on the production Supabase database.

## 📊 **Current State**

- ✅ **Frontend API**: Working correctly, trying to fetch from database
- ✅ **Database Schema**: Tables exist but are empty
- ❌ **Database Data**: No CFA framework questions populated
- ✅ **Fallback Logic**: API falls back to hardcoded questions when database is empty

## 🛠️ **Solution**

### **Option 1: Run Seed Script (Recommended)**

1. **Check current database state:**
   ```bash
   node check-db-state.js
   ```

2. **Seed the production database:**
   ```bash
   node seed-production-db.js
   ```

3. **Verify the fix:**
   ```bash
   node check-db-state.js
   ```

### **Option 2: Manual Database Population**

Run the SQL script directly in Supabase:

```sql
-- Copy and paste the contents of seed-cfa-framework.sql
-- into your Supabase SQL editor
```

### **Option 3: Fix API to Use Correct Tables**

Update the frontend API to use the new schema structure (more complex, not recommended).

## 🔧 **Required Environment Variables**

Make sure these are set in your `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📋 **What the Seed Script Does**

1. **Creates CFA Framework**: `risk_frameworks` table
2. **Creates Framework Version**: `risk_framework_versions` table  
3. **Populates Question Bank**: `question_bank` table with 12 CFA questions
4. **Maps Questions to Framework**: `framework_question_map` table
5. **Verifies Setup**: Confirms all data is properly linked

## 🧪 **Testing the Fix**

After running the seed script:

1. **Refresh the assessments page**
2. **Check browser console** for API calls
3. **Verify questions are loaded** from database instead of fallback
4. **Check network tab** to see if `/api/assessments/cfa/questions` returns database questions

## 🚀 **Deployment Notes**

- **Frontend**: Already deployed on Vercel ✅
- **Database**: Supabase production instance ✅
- **Seed Script**: Needs to be run once on production database
- **No Code Changes**: Required, just data population

## 🔍 **Debugging Commands**

### **Check API Response**
```bash
curl -X GET "https://one-moment-fin.vercel.app/api/assessments/cfa/questions" \
  -H "Content-Type: application/json"
```

### **Check Database Tables**
```bash
node check-db-state.js
```

### **Seed Database**
```bash
node seed-production-db.js
```

## 📝 **Expected Result**

After fixing:

- ✅ Questions load from `framework_question_map` + `question_bank` tables
- ✅ No more hardcoded fallback questions
- ✅ Dynamic question management through database
- ✅ Proper CFA framework structure maintained

## 🆘 **If Issues Persist**

1. **Check environment variables** are correct
2. **Verify Supabase permissions** for service role key
3. **Check RLS policies** on tables
4. **Review migration history** for any conflicts
5. **Contact support** with specific error messages

---

**Status**: 🔴 **CRITICAL** - Database seeding required  
**Priority**: **HIGH** - Core functionality affected  
**Effort**: **LOW** - One-time script execution
