# Compulsory Investment Questions Implementation

## Overview

This implementation adds three compulsory investment questions to all assessment forms **before** the risk assessment framework questions. The flow is now:

1. **Start Assessment** → Basic details (already built)
2. **Investment Questions** (NEW - Compulsory)
3. **Risk Assessment Form** (existing questions)

## Questions Added

### Q1. What are your goals?
- **Type**: Multi-select
- **Options**: 
  - Buying a Home
  - Retirement Planning
  - Investment Growth
  - Health and Wellness
  - Building an Emergency Fund
- **Validation**: At least 1 selection required

### Q2. What is your Investment Horizon?
- **Type**: Single select
- **Options**:
  - Short term (0-1yr)
  - Medium Term (2-5yr)
  - Long term (5-10yr)
- **Validation**: Required

### Q3. How much can you invest monthly (Minimum amount)?
- **Type**: Number input
- **Format**: Rs sign before input
- **Validation**: Minimum Rs 100
- **Default**: Rs 1000

## Implementation Details

### Database Schema Changes
- New questions are added to the `schema.properties` in `assessment_form_versions`
- Questions are positioned at the beginning of the properties object
- All existing risk assessment questions are preserved

### Scoring Configuration
- Compulsory questions have lower weights (0.05 each) to minimize impact on risk scoring
- Risk assessment questions maintain their original weights for proper risk evaluation
- New scoring rules are added for the compulsory questions

### Form Versioning
- New versions are created for existing forms
- Existing forms are not modified, preserving data integrity
- New forms automatically include these questions

## Files Modified

1. **`add-compulsory-investment-questions.mjs`** - Migration script for existing forms
2. **`backend/seed-assessment-v2.mjs`** - Updated seed script for new forms
3. **`run-compulsory-questions-migration.sh`** - Shell script to run migration

## How to Apply

### Option 1: Run Migration Script (Recommended)
```bash
./run-compulsory-questions-migration.sh
```

### Option 2: Manual Execution
```bash
node add-compulsory-investment-questions.mjs
```

### Prerequisites
- Node.js installed
- `.env` file with Supabase credentials:
  ```
  SUPABASE_URL=your_supabase_url
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```

## What Happens During Migration

1. **Scans** all existing assessment forms
2. **Checks** if compulsory questions already exist
3. **Creates** new versions with compulsory questions
4. **Preserves** all existing risk assessment questions
5. **Updates** scoring configuration
6. **Maintains** backward compatibility

## Frontend Display

The questions will automatically appear in the correct order:
1. Investment Goals (Multi-select)
2. Investment Horizon (Single select)  
3. Monthly Investment Amount (Number input)
4. [Existing Risk Assessment Questions...]

## Benefits

- **Better User Experience**: Investment goals are captured upfront
- **Improved Lead Qualification**: Monthly investment capacity is known early
- **Enhanced Risk Assessment**: More context for better risk evaluation
- **Data Consistency**: Standardized questions across all forms
- **No Data Loss**: Existing forms and data remain intact

## Troubleshooting

### Migration Fails
- Check `.env` file configuration
- Verify Supabase connection
- Ensure Node.js dependencies are installed

### Questions Not Appearing
- Check if form has been updated to latest version
- Verify the `compulsoryQuestionsFirst` flag in UI config
- Check browser console for any JavaScript errors

### Scoring Issues
- Compulsory questions have minimal impact on risk scoring
- Risk assessment questions maintain their original weights
- Check the scoring configuration in the form version

## Future Enhancements

- Customizable question options per user
- Conditional logic based on investment goals
- Integration with product recommendation engine
- Analytics on investment goal distribution
