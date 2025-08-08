# OneMFin Database Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Choose a project name (e.g., "onemfin")
4. Set a database password (save this!)
5. Choose a region close to your users
6. Wait for the project to be created

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to Settings → API
2. Copy the following values:
   - Project URL
   - Anon (public) key

## Step 3: Set Up Environment Variables

1. Copy `env.example` to `.env.local`
2. Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

## Step 4: Run the Database Schema

1. In your Supabase dashboard, go to SQL Editor
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the SQL script
4. This will create all tables, indexes, and policies

## Step 5: Verify Setup

The schema creates the following tables:
- ✅ users (MFDs)
- ✅ leads (prospects)
- ✅ assessments (risk forms)
- ✅ assessment_questions (form questions)
- ✅ risk_assessments (completed assessments)
- ✅ risk_assessment_answers (individual answers)
- ✅ product_recommendations (mutual fund products)
- ✅ meetings (scheduled meetings)
- ✅ kyc_status (KYC tracking)
- ✅ subscription_plans (pricing plans)
- ✅ user_subscriptions (user plans)
- ✅ ai_feedback (AI feedback)

## Step 6: Test Connection

Run the development server:
```bash
npm run dev
```

The app should now connect to Supabase successfully.

## Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**
   - Check that your `.env.local` file exists and has the correct values
   - Restart your dev server after adding environment variables

2. **"Permission denied" errors**
   - Make sure Row Level Security (RLS) policies are set up correctly
   - Check that the user is authenticated before accessing data

3. **"Table doesn't exist"**
   - Run the SQL schema script again
   - Check that all tables were created successfully

### Next Steps:

After database setup is complete, we'll:
1. Set up the Node.js backend
2. Implement authentication
3. Connect the frontend to the backend APIs
4. Add AI integration for risk assessment

## Database Schema Overview

The database follows these relationships:
- Users (MFDs) have many Leads
- Users have many Assessments (risk forms)
- Assessments have many Questions
- Leads have one RiskAssessment
- RiskAssessments have many Answers
- Users have many ProductRecommendations
- Leads have one Meeting
- Leads have one KYCStatus
- Users have one UserSubscription

All tables have proper foreign key constraints and indexes for performance.
