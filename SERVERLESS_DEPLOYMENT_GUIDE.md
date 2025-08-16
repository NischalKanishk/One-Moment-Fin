# OneMFin Serverless Backend Deployment Guide

## 🎯 Overview

Your backend has been successfully converted from Express.js to Vercel serverless functions. This guide will help you deploy and test the new serverless architecture.

## 🏗️ Architecture Changes

### Before (Express.js)
- Single Express.js server
- All routes in one application
- Traditional server deployment

### After (Serverless)
- Individual API endpoints as serverless functions
- Each endpoint is a separate function
- Automatic scaling and deployment

## 📁 New API Structure

```
api/
├── lib/                          # Shared utilities
│   ├── supabase.js              # Database configuration
│   └── auth.js                  # Authentication middleware
├── assessments.js                # /api/assessments
├── leads.js                      # /api/leads
├── auth.js                       # /api/auth
├── meetings.js                   # /api/meetings
├── public-assessments.js         # /api/public-assessments
├── user-assessment-links.js      # /api/user-assessment-links
├── ai.js                         # /api/ai
├── health.js                     # /api/health
├── test-env.js                   # /api/test-env
└── [...path].js                  # Catch-all for legacy routes
```

## 🚀 Deployment Steps

### 1. Install Dependencies
```bash
cd api
npm install
```

### 2. Set Environment Variables in Vercel
Go to your Vercel dashboard and set these **REQUIRED** environment variables:

```bash
# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
JWT_SECRET=your_jwt_secret

# Application Configuration
FRONTEND_URL=https://one-moment-fin.vercel.app
NODE_ENV=production
VERCEL=true

# Optional (for AI features)
OPENAI_API_KEY=your_openai_api_key
```

### 3. Deploy to Vercel
```bash
# From project root
vercel --prod
```

## 🧪 Testing Your API

### Health Check
```bash
curl https://your-domain.vercel.app/api/health
```

### Environment Variables Test
```bash
curl https://your-domain.vercel.app/api/test-env
```

### Authentication Test
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-domain.vercel.app/api/auth/test
```

### Assessments API
```bash
# Get assessments
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-domain.vercel.app/api/assessments

# Get frameworks
curl https://your-domain.vercel.app/api/assessments/frameworks
```

### Leads API
```bash
# Get leads
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-domain.vercel.app/api/leads

# Search leads
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://your-domain.vercel.app/api/leads/search?search=john"
```

## 🔐 Authentication Flow

1. **Frontend** authenticates with Clerk
2. **Clerk** provides JWT token
3. **Frontend** sends token in Authorization header
4. **Serverless function** validates token and extracts user info
5. **Database operations** use user's Supabase user ID

## 📊 Database Schema Requirements

Ensure your Supabase database has these tables:

- `users` - User profiles
- `leads` - Lead management
- `assessments` - Assessment configurations
- `assessment_links` - Public assessment links
- `assessment_submissions` - Completed assessments
- `meetings` - Meeting scheduling
- `framework_questions` - Assessment questions
- `risk_frameworks` - Risk assessment frameworks
- `product_recommendations` - AI-generated recommendations

## 🚨 Common Issues & Solutions

### 1. Environment Variables Not Set
**Error**: `Missing Supabase environment variables`
**Solution**: Set all required environment variables in Vercel dashboard

### 2. Authentication Failing
**Error**: `User not properly authenticated`
**Solution**: Check JWT token format and Clerk configuration

### 3. Database Connection Issues
**Error**: `Database lookup failed`
**Solution**: Verify Supabase URL and service role key

### 4. CORS Issues
**Error**: CORS policy violations
**Solution**: CORS headers are already configured in each function

## 🔧 Development vs Production

### Development
- Uses development environment variables
- More verbose logging
- JWT validation is relaxed

### Production
- Uses production environment variables
- Minimal logging
- Strict JWT validation

## 📈 Performance Benefits

- **Automatic scaling** - Functions scale based on demand
- **Cold start optimization** - Vercel optimizes function startup
- **Global distribution** - Functions run close to users
- **Cost efficiency** - Pay only for actual usage

## 🔄 Migration from Express.js

Your existing frontend code should work without changes:

```javascript
// Before (Express.js)
const response = await fetch('http://localhost:3001/api/assessments');

// After (Serverless) - Same code!
const response = await fetch('https://your-domain.vercel.app/api/assessments');
```

## 📝 API Endpoints Summary

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/health` | GET | Health check | No |
| `/api/test-env` | GET | Environment test | No |
| `/api/auth/test` | GET | Auth test | Yes |
| `/api/auth/me` | GET | User profile | Yes |
| `/api/assessments` | GET/POST | Assessments CRUD | Yes |
| `/api/assessments/frameworks` | GET | Get frameworks | No |
| `/api/leads` | GET/POST | Leads CRUD | Yes |
| `/api/leads/search` | GET | Search leads | Yes |
| `/api/meetings` | GET/POST/PATCH/DELETE | Meetings CRUD | Yes |
| `/api/ai/analyze-assessment` | POST | AI analysis | Yes |
| `/api/ai/generate-recommendations` | POST | AI recommendations | Yes |

## 🎉 Next Steps

1. **Deploy** your serverless functions
2. **Test** all API endpoints
3. **Monitor** Vercel function logs
4. **Optimize** based on usage patterns
5. **Scale** as your user base grows

## 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify environment variables
3. Test endpoints individually
4. Check database connectivity
5. Review authentication flow

Your backend is now fully serverless and ready for production! 🚀
