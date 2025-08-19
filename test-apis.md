# API Testing Guide

## **Database Setup Required**

Before testing, you need to seed the database with the CFA framework:

1. **Run the seed script** in your Supabase SQL Editor:
   ```sql
   -- Copy and paste the contents of seed-cfa-framework.sql
   ```

2. **Verify the setup** by checking:
   - `risk_frameworks` table has CFA framework
   - `question_bank` table has 12 questions
   - `framework_question_map` links questions to framework

## **Test All API Endpoints**

After setting the environment variables in Vercel and seeding the database, test these endpoints:

### **1. Health Check**
```bash
GET https://your-domain.vercel.app/api/health
```
**Expected**: `200 OK` with status message

### **2. Assessments API Tests**
```bash
# Test database connection
GET https://your-domain.vercel.app/api/assessments/test

# Get assessment forms (what frontend expects)
GET https://your-domain.vercel.app/api/assessments/forms

# Get CFA questions (what frontend expects)
GET https://your-domain.vercel.app/api/assessments/cfa/questions

# Get risk frameworks
GET https://your-domain.vercel.app/api/assessments/frameworks

# Get framework questions by ID
GET https://your-domain.vercel.app/api/assessments/frameworks/{framework_version_id}/questions

# Get user's assessment submissions
GET https://your-domain.vercel.app/api/assessments/submissions

# List all assessments
GET https://your-domain.vercel.app/api/assessments
```

### **3. Leads API Tests**
```bash
# Test database connection
GET https://your-domain.vercel.app/api/leads/test

# List all leads
GET https://your-domain.vercel.app/api/leads

# Get lead statistics
GET https://your-domain.vercel.app/api/leads/stats
```

### **4. Auth API Tests**
```bash
# Test endpoint
GET https://your-domain.vercel.app/api/auth/test

# Health check
GET https://your-domain.vercel.app/api/auth/health

# Get user profile (requires authentication)
GET https://your-domain.vercel.app/api/auth/me
```

### **5. Meetings API Tests**
```bash
# List meetings (requires authentication)
GET https://your-domain.vercel.app/api/meetings

# Check Google Calendar status
GET https://your-domain.vercel.app/api/meetings/google-status
```

## **Expected Results**

✅ **All endpoints should return 200 OK** (except auth endpoints that require authentication)
✅ **No more 404 or 500 errors** on assessments page
✅ **Database queries should work** with service role key
✅ **CFA questions should load** from the database framework
✅ **Assessment forms should work** with fallback to assessments table
✅ **Detailed error messages** if something goes wrong

## **Database Structure**

The assessments system now uses:

- **`risk_frameworks`** - Defines assessment frameworks (e.g., CFA Three Pillar)
- **`risk_framework_versions`** - Version control for frameworks
- **`question_bank`** - Central repository of all questions
- **`framework_question_map`** - Links questions to frameworks
- **`assessment_submissions`** - Stores user responses (existing data)
- **`assessment_forms`** - New form-based system (fallback to assessments)

## **Common Issues & Solutions**

### **Issue: Still getting 404/500 errors**
**Solution**: Check that environment variables are set in Vercel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

### **Issue: CFA questions not loading**
**Solution**: Run the seed script in Supabase SQL Editor to populate the framework

### **Issue: Authentication errors**
**Solution**: Ensure Clerk integration is working and JWT tokens are valid

### **Issue: Database connection errors**
**Solution**: Verify Supabase service role key has proper permissions

## **Frontend Integration**

Once all APIs are working:
1. **Assessments page** should load without errors
2. **CFA questions** should load from database framework
3. **Assessment forms** should work with existing data
4. **Leads page** should display leads properly
5. **Auth flows** should work seamlessly
6. **Meetings** should integrate with Google Calendar

## **Monitoring**

Check Vercel function logs for:
- 🔍 API request logs
- ✅ Success messages
- ❌ Error details
- 📊 Database query results
- 🗂️ Framework question loading
- 📝 Assessment form processing
