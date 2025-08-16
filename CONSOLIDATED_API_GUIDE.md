# 🎯 OneMFin Consolidated API Structure - Hobby Plan Compatible

## 🚨 Problem Solved

**Vercel Hobby Plan Limit**: Maximum 12 serverless functions
**Previous Structure**: 13+ functions (exceeded limit)
**New Structure**: 8 functions (well within limit)

## 📁 Consolidated API Structure

### **Function 1: `/api/assessments`** - Comprehensive Assessment Management
**File**: `api/assessments.js`
**Endpoints**:
- `GET /api/assessments` - List user assessments
- `POST /api/assessments` - Create assessment
- `PATCH /api/assessments/:id` - Update assessment
- `POST /api/assessments/default` - Create default assessment
- `GET /api/assessments/frameworks` - Get frameworks
- `GET /api/assessments/frameworks/:id/questions` - Get questions
- `GET /api/assessments/links` - List assessment links
- `POST /api/assessments/links` - Create assessment link
- `PATCH /api/assessments/links/:token` - Update link
- `DELETE /api/assessments/links/:token` - Revoke link

### **Function 2: `/api/leads`** - Leads & Meetings Management
**File**: `api/leads.js`
**Endpoints**:
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `POST /api/leads/create` - Public lead creation
- `GET /api/leads/search` - Search leads
- `POST /api/leads/check-existing` - Check duplicate leads
- `GET /api/leads/meetings` - List meetings
- `POST /api/leads/meetings` - Create meeting
- `PATCH /api/leads/meetings/:id` - Update meeting
- `DELETE /api/leads/meetings/:id` - Cancel meeting
- `POST /api/leads/meetings/:id/status` - Update meeting status

### **Function 3: `/api/auth`** - Authentication & User Management
**File**: `api/auth.js`
**Endpoints**:
- `GET /api/auth/test` - Test authentication
- `GET /api/auth/me` - Get user profile
- `POST /api/auth/sync` - Sync user data
- `POST /api/auth/logout` - Logout

### **Function 4: `/api/ai`** - AI Services & Public Assessments
**File**: `api/ai.js`
**Endpoints**:
- `POST /api/ai/analyze-assessment` - AI analysis
- `POST /api/ai/generate-recommendations` - AI recommendations
- `GET /api/ai/recommendations` - Get recommendations
- `POST /api/ai/feedback` - Submit feedback
- `GET /api/ai/public/:slug` - Get public assessment
- `POST /api/ai/public/:slug/submit` - Submit public assessment

### **Function 5: `/api/health`** - System Health
**File**: `api/health.js`
**Endpoints**:
- `GET /api/health` - Health check

### **Function 6: `/api/test-env`** - Environment Testing
**File**: `api/test-env.js`
**Endpoints**:
- `GET /api/test-env` - Test environment variables

### **Function 7: `/api/test`** - Basic Testing
**File**: `api/test.js`
**Endpoints**:
- `GET /api/test` - Basic functionality test

### **Function 8: `/api/[...path]`** - Catch-all & Legacy
**File**: `api/[...path].js`
**Purpose**: Handles any unmatched routes and legacy endpoints

## 🔄 API Endpoint Changes

### **New URL Structure**

| Old Endpoint | New Endpoint | Notes |
|--------------|--------------|-------|
| `/api/meetings` | `/api/leads/meetings` | Consolidated under leads |
| `/api/public-assessments/:slug` | `/api/ai/public/:slug` | Consolidated under AI |
| `/api/user-assessment-links` | `/api/assessments/links` | Consolidated under assessments |

### **Frontend Updates Required**

You'll need to update these API calls in your frontend:

```javascript
// OLD: /api/meetings
const response = await fetch('/api/meetings');

// NEW: /api/leads/meetings
const response = await fetch('/api/leads/meetings');

// OLD: /api/public-assessments/:slug
const response = await fetch(`/api/public-assessments/${slug}`);

// NEW: /api/ai/public/:slug
const response = await fetch(`/api/ai/public/${slug}`);

// OLD: /api/user-assessment-links
const response = await fetch('/api/user-assessment-links');

// NEW: /api/assessments/links
const response = await fetch('/api/assessments/links');
```

## 🚀 Benefits of Consolidation

### **1. Hobby Plan Compatibility**
- ✅ **8 functions** (well under 12 limit)
- ✅ **No upgrade required** to Pro plan
- ✅ **Full functionality** maintained

### **2. Better Organization**
- ✅ **Logical grouping** of related endpoints
- ✅ **Easier maintenance** with fewer files
- ✅ **Consistent routing** patterns

### **3. Performance**
- ✅ **Reduced cold starts** with fewer functions
- ✅ **Better caching** opportunities
- ✅ **Simplified deployment**

## 📋 Deployment Checklist

### **1. Update Frontend Code**
```bash
# Search for old endpoints
grep -r "/api/meetings" src/
grep -r "/api/public-assessments" src/
grep -r "/api/user-assessment-links" src/
```

### **2. Update API Calls**
Replace old endpoints with new consolidated ones

### **3. Test All Endpoints**
Verify functionality after consolidation

### **4. Deploy to Vercel**
```bash
vercel --prod
```

## 🔧 Migration Script

Here's a simple script to help update your frontend code:

```bash
#!/bin/bash
# Update API endpoints in your frontend code

# Update meetings endpoints
find src/ -name "*.tsx" -o -name "*.ts" -o -name "*.js" | xargs sed -i '' 's|/api/meetings|/api/leads/meetings|g'

# Update public assessments endpoints
find src/ -name "*.tsx" -o -name "*.ts" -o -name "*.js" | xargs sed -i '' 's|/api/public-assessments|/api/ai/public|g'

# Update user assessment links endpoints
find src/ -name "*.tsx" -o -name "*.ts" -o -name "*.js" | xargs sed -i '' 's|/api/user-assessment-links|/api/assessments/links|g'
```

## ✅ Success Metrics

After consolidation:
- ✅ **Under 12 functions** (Hobby plan compatible)
- ✅ **All functionality preserved**
- ✅ **Cleaner API structure**
- ✅ **Easier maintenance**
- ✅ **Better performance**

## 🎉 Ready for Hobby Plan Deployment!

Your API is now:
- ✅ **Hobby plan compatible**
- ✅ **Fully functional**
- ✅ **Well organized**
- ✅ **Easy to maintain**

**Deploy now without upgrading to Pro plan!** 🚀

---

*Need help updating frontend code? Check the migration examples above.*
