# Framework Questions System Setup

## Overview

The Assessment Questions section now displays questions from the selected framework instead of hardcoded questions. This system uses a sophisticated question bank with multiple risk assessment frameworks.

## Database Structure

The system consists of several interconnected tables:

1. **`question_bank`** - Contains all available questions with their types and options
2. **`risk_frameworks`** - Different assessment frameworks (e.g., CFA Three Pillar)
3. **`risk_framework_versions`** - Specific versions of frameworks with scoring configurations
4. **`framework_question_map`** - Maps which questions belong to which framework version

## Setup Steps

### 1. Check Current Database State

Run the database check script to see if the migration has been applied:

```bash
node check-db-migration.mjs
```

### 2. Apply Database Migration (if needed)

If the tables don't exist, run the migration script in your Supabase SQL Editor:

```sql
-- Run the contents of risk-assessment-system-migration-supabase.sql
```

### 3. Seed Sample Data (if needed)

If the tables are empty, run the seed script:

```sql
-- Run the contents of seed-risk-assessment-data.sql
```

## How It Works

### Frontend Changes

1. **Framework Selection**: Users can now select from available risk assessment frameworks
2. **Dynamic Questions**: Questions are loaded based on the selected framework
3. **Enhanced UI**: Questions display with proper categorization, types, and requirements

### Backend Changes

1. **New Endpoint**: `/api/assessments/frameworks/:frameworkId/questions`
2. **Framework Integration**: Questions are fetched from the question bank via framework mappings
3. **Data Transformation**: Raw database data is transformed into frontend-friendly format

## Available Frameworks

The system comes with several pre-configured frameworks:

- **CFA Three Pillar v1** - Three-pillar approach: capacity, tolerance, and need
- **DSP Style 10-Question v1** - India-style 10-question framework
- **Nippon Style v1** - Minimalist framework focusing on key risk factors

## Question Types

Questions support various types:

- **Single Choice** - Radio button selection
- **Multiple Choice** - Checkbox selection
- **Rating Scale** - Numeric scale (e.g., 1-5)
- **Number Input** - Numeric input
- **Percentage** - Percentage input
- **Text Input** - Free text input

## Benefits

1. **Standardization** - Use industry-standard risk assessment frameworks
2. **Flexibility** - Switch between different frameworks as needed
3. **Maintainability** - Questions are centrally managed in the question bank
4. **Scalability** - Easy to add new frameworks and questions
5. **Consistency** - All users see the same questions for a given framework

## Troubleshooting

### No Questions Displayed

1. Check if a framework is selected
2. Verify the database migration has been applied
3. Check browser console for API errors
4. Ensure the backend endpoint is working

### Framework Selection Not Working

1. Check if frameworks are loaded from the API
2. Verify the `/api/assessments/frameworks` endpoint returns data
3. Check browser console for errors

### Database Connection Issues

1. Verify Supabase credentials in environment variables
2. Check if the database is accessible
3. Run the database check script to identify issues

## Next Steps

1. **Test the System**: Navigate to `/app/assessments` and select different frameworks
2. **Customize Questions**: Modify the question bank or add new frameworks
3. **Integrate with Assessments**: Link frameworks to actual assessment forms
4. **Add Scoring Logic**: Implement the scoring engines for each framework

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Run the database check script
3. Verify all migration scripts have been applied
4. Check the backend logs for API errors
