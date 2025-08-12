# Duplicate Assessment Forms Issue - Fix Implementation

## Problem Description

The `/app/assessments` page was showing two default Risk Assessment forms instead of one. This happened because:

1. **Missing Database Constraint**: No unique constraint on `(user_id, name)` in the `assessment_forms` table
2. **Multiple Seeding Calls**: The seeding service was called multiple times during user setup
3. **No Duplicate Prevention**: The service didn't check for existing forms before creating new ones

## Root Causes

### 1. Database Schema Issue
- `assessment_forms` table lacked a unique constraint on `(user_id, name)`
- No `updated_at` column for tracking modifications
- Foreign key constraints in related tables prevent direct deletion of duplicate forms

### 2. Seeding Service Logic
- `SeedAssessmentDataService.createDefaultAssessmentForUser()` was called multiple times
- No check for existing forms before creation
- Fallback logic in migration could create duplicates

### 3. Form Creation Service
- `AssessmentFormService.createForm()` always created new forms
- No logic to update existing forms with same name

### 4. Foreign Key Constraints
- `assessment_submissions`, `lead_assessment_assignments`, `assessment_links` tables reference `assessment_forms`
- Direct deletion of duplicate forms violates foreign key constraints
- Need to update references before deletion

## Solution Implemented

### 1. Database Schema Fixes

#### SQL Migration: `fix-duplicate-assessments-step-by-step.sql` (Most Reliable)
```sql
-- Step-by-step approach using temporary mapping table
CREATE TEMP TABLE form_mapping AS
SELECT 
  d.id as duplicate_id,
  k.id as keeper_id,
  d.user_id,
  d.name
FROM (
  SELECT id, user_id, name,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, name 
           ORDER BY created_at ASC
         ) as rn
  FROM assessment_forms
) d
JOIN (
  SELECT id, user_id, name
  FROM (
    SELECT id, user_id, name,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, name 
             ORDER BY created_at ASC
           ) as rn
    FROM assessment_forms
  ) ranked 
  WHERE rn = 1
) k ON d.user_id = k.user_id AND d.name = k.name
WHERE d.rn > 1;

-- Update references step by step, then delete duplicates
UPDATE assessment_submissions SET form_id = (SELECT keeper_id FROM form_mapping WHERE duplicate_id = assessment_submissions.form_id) WHERE form_id IN (SELECT duplicate_id FROM form_mapping);
-- ... similar updates for other tables
DELETE FROM assessment_forms WHERE id IN (SELECT duplicate_id FROM form_mapping);
```

#### SQL Migration: `fix-duplicate-assessments-safe.sql` (Alternative)
```sql
-- Safely handle foreign key constraints by updating references first
WITH duplicates AS (
  SELECT id, user_id, name,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, name 
           ORDER BY created_at ASC
         ) as rn
  FROM assessment_forms
),
forms_to_keep AS (SELECT id, user_id, name FROM duplicates WHERE rn = 1),
forms_to_remove AS (SELECT id, user_id, name FROM duplicates WHERE rn > 1)

-- Update all references to point to forms we're keeping
UPDATE assessment_submissions SET form_id = (SELECT k.id FROM forms_to_keep k WHERE k.user_id = assessment_submissions.user_id AND k.name = (SELECT name FROM assessment_forms WHERE id = assessment_submissions.form_id)) WHERE form_id IN (SELECT id FROM forms_to_remove);

-- Update other tables similarly...

-- Now safely delete duplicates
DELETE FROM assessment_forms WHERE id IN (SELECT id FROM forms_to_remove);

-- Add unique constraint and other improvements
ALTER TABLE assessment_forms ADD CONSTRAINT unique_user_assessment_name UNIQUE (user_id, name);
```

#### SQL Migration: `fix-duplicate-assessments.sql` (Basic)
```sql
-- Remove existing duplicates (keep oldest)
DELETE FROM assessment_forms 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY user_id, name 
      ORDER BY created_at ASC
    ) as rn FROM assessment_forms
  ) ranked WHERE rn > 1
);

-- Add unique constraint
ALTER TABLE assessment_forms 
ADD CONSTRAINT unique_user_assessment_name 
UNIQUE (user_id, name);

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_assessment_forms_user_name 
ON assessment_forms(user_id, name);
```

#### SQL Migration: `add-updated-at-column.sql`
```sql
-- Add updated_at column
ALTER TABLE assessment_forms 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create auto-update trigger
CREATE TRIGGER trigger_update_assessment_forms_updated_at
  BEFORE UPDATE ON assessment_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_forms_updated_at();
```

### 2. Service Layer Fixes

#### AssessmentFormService.createForm()
- **Before**: Always created new forms
- **After**: Checks for existing forms with same name and updates them instead

```typescript
// Check if form with same name already exists
const existingForm = await supabase
  .from('assessment_forms')
  .select('*')
  .eq('user_id', userId)
  .eq('name', data.name)
  .single();

if (existingForm) {
  // Update existing form instead of creating new one
  return await updateExistingForm(existingForm.id, data);
}
```

#### SeedAssessmentDataService.createDefaultAssessmentForUser()
- **Before**: Always created new default forms
- **After**: Checks for existing default forms first

```typescript
// Check if default form already exists
const existingForm = await supabase
  .from('assessment_forms')
  .select('*')
  .eq('user_id', userId)
  .eq('name', 'Default Risk Assessment')
  .single();

if (existingForm) {
  return { form: existingForm, version: latestVersion };
}
```

### 3. Duplicate Cleanup Service

#### AssessmentFormService.cleanupDuplicateForms()
New method to clean up existing duplicates:

```typescript
static async cleanupDuplicateForms(userId: string): Promise<{ removed: number }> {
  // Find duplicates grouped by name
  // Keep oldest form for each name
  // Delete duplicates
  // Return count of removed forms
}
```

### 4. API Endpoint

#### POST `/api/assessments/cleanup-duplicates`
New endpoint for manual cleanup:

```typescript
router.post('/cleanup-duplicates', authenticateUser, async (req, res) => {
  const result = await AssessmentFormService.cleanupDuplicateForms(userId);
  return res.json({ 
    message: `Cleanup completed. Removed ${result.removed} duplicate forms.`,
    removed: result.removed
  });
});
```

### 5. Frontend Integration

#### Cleanup Button
Added cleanup button to assessments page:

```typescript
const handleCleanupDuplicates = async () => {
  const response = await api.post('/api/assessments/cleanup-duplicates');
  if (response.data.removed > 0) {
    toast.success(`Removed ${response.data.removed} duplicate forms`);
    loadAssessments(); // Refresh list
  }
};
```

## How to Apply the Fix

### 1. Run Database Migrations
```bash
# Execute the step-by-step migration file (RECOMMENDED):
psql $DATABASE_URL -f fix-duplicate-assessments-step-by-step.sql

# OR the safe migration file:
psql $DATABASE_URL -f fix-duplicate-assessments-safe.sql

# OR if you prefer to run them separately (less safe):
psql $DATABASE_URL -f fix-duplicate-assessments.sql
psql $DATABASE_URL -f add-updated-at-column.sql
```

**⚠️ Important**: Use `fix-duplicate-assessments-step-by-step.sql` for production environments as it's the most reliable approach and properly handles foreign key constraints.

### 2. Restart Backend Service
The backend changes will take effect after restart.

### 3. Use Cleanup Button
Users can click "Cleanup Duplicates" button to remove existing duplicates.

## Prevention Measures

### 1. Database Constraints
- Unique constraint on `(user_id, name)` prevents future duplicates
- Database-level enforcement is reliable

### 2. Service Layer Logic
- Check for existing forms before creation
- Update existing forms instead of creating duplicates

### 3. Seeding Service
- Check for existing default forms before seeding
- Return existing forms if found

## Expected Behavior After Fix

1. **Single Form**: Users will see only one "Default Risk Assessment" form
2. **Form Updates**: Modifying the form updates the existing one instead of creating new ones
3. **No Duplicates**: Future form creation prevents duplicates at database level
4. **Cleanup Available**: Users can manually cleanup any existing duplicates

## Testing

### 1. Verify Single Form Display
- Navigate to `/app/assessments`
- Should see only one "Default Risk Assessment" form

### 2. Test Form Updates
- Edit the form and save
- Should update existing form, not create new one

### 3. Test Duplicate Prevention
- Try to create another form with same name
- Should update existing form instead

### 4. Test Cleanup Function
- Click "Cleanup Duplicates" button
- Should remove any remaining duplicates

## Files Modified

### Backend
- `backend/src/services/assessmentFormService.ts` - Added duplicate prevention and cleanup
- `backend/src/services/seedAssessmentData.ts` - Added existing form check
- `backend/src/routes/assessments.ts` - Added cleanup endpoint

### Frontend
- `src/pages/app/Assessments.tsx` - Added cleanup button and handler

### Database
- `fix-duplicate-assessments.sql` - Remove duplicates and add constraints
- `add-updated-at-column.sql` - Add updated_at column and trigger

## Summary

This fix addresses the duplicate assessment forms issue by:
1. **Preventing** future duplicates through database constraints and service logic
2. **Cleaning up** existing duplicates through automated and manual cleanup
3. **Maintaining** data integrity while preserving user experience
4. **Providing** tools for users to manage their forms effectively

The solution ensures that users always have exactly one default assessment form that gets updated rather than duplicated when modified.
