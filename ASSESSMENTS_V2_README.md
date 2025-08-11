# Assessments v2 (Versioned JSON)

## Overview

The assessment system has been completely refactored to use a modern, versioned JSON schema approach instead of the legacy question-based system. This provides:

- **Version Control**: Each assessment form can have multiple versions with full history
- **JSON Schema**: Flexible form definitions using standard JSON Schema format
- **Scoring Engine**: Configurable scoring rules and risk categorization
- **Better Performance**: No more complex joins across multiple tables
- **Easier Maintenance**: Single schema definition per version

## New Database Schema

### Core Tables

1. **`assessment_forms`** - Form metadata
   - `id`, `user_id`, `name`, `description`, `is_active`, `created_at`

2. **`assessment_form_versions`** - Versioned form definitions
   - `id`, `form_id`, `version`, `schema`, `ui`, `scoring`, `created_at`

3. **`lead_assessment_assignments`** - Per-lead form assignments
   - `id`, `user_id`, `lead_id`, `form_id`, `version_id`, `created_at`

4. **`assessment_submissions`** - Completed assessments
   - `id`, `user_id`, `lead_id`, `form_id`, `version_id`, `filled_by`, `answers`, `score`, `risk_category`, `status`, `review_reason`, `created_at`

5. **`assessment_links`** - Expiring assessment links
   - `id`, `token`, `user_id`, `lead_id`, `form_id`, `version_id`, `status`, `expires_at`, `submitted_at`, `created_at`

### User Defaults
- `users.default_assessment_form_id` - Points to user's default form

## API Endpoints

### Authenticated (MFD Dashboard)
- `POST /api/assessments/forms` - Create new form
- `POST /api/assessments/forms/:formId/versions` - Create new version
- `GET /api/assessments/forms` - List user forms
- `POST /api/assessments/users/default` - Set default form
- `POST /api/assessments/assign` - Assign form to lead
- `POST /api/assessments/links` - Create expiring link
- `POST /api/assessments/manual-submit` - Manual submission
- `GET /api/assessments/submissions/:leadId` - Get lead submissions
- `PATCH /api/assessments/submissions/:id/status` - Review submission

### Public (No Authentication)
- `GET /api/assessments/public/:referralCode` - Get form by referral
- `GET /api/assessments/token/:token` - Get form by token
- `POST /api/assessments/token/:token/submit` - Submit via token

## Frontend Components

### Updated Components
- **`Assessments.tsx`** - Lists forms with latest versions
- **`AssessmentForms.tsx`** - JSON schema editor and form builder
- **`LeadDetail.tsx`** - Shows assessment submissions instead of risk_assessments
- **`Leads.tsx`** - Filters by assessment submission data
- **`PublicAssessment.tsx`** - Renders JSON schema forms dynamically

### Key Features
- **Schema Editor**: Direct JSON editing with validation
- **Scoring Configuration**: Define weights, scoring rules, and thresholds
- **Form Preview**: Live preview of rendered forms
- **Version Management**: Automatic versioning on save

## Usage Examples

### Creating a New Assessment Form

1. Navigate to `/app/assessment-forms`
2. Fill in form name and description
3. Edit the JSON schema to define your form structure
4. Configure scoring rules and thresholds
5. Save to create a new version

### Sample JSON Schema

```json
{
  "type": "object",
  "properties": {
    "investment_experience": {
      "type": "string",
      "title": "What is your investment experience?",
      "enum": ["None", "Beginner", "Intermediate", "Advanced"],
      "default": "None"
    },
    "risk_tolerance": {
      "type": "string",
      "title": "How would you describe your risk tolerance?",
      "enum": ["Conservative", "Moderate", "Aggressive"],
      "default": "Moderate"
    }
  },
  "required": ["investment_experience", "risk_tolerance"]
}
```

### Sample Scoring Configuration

```json
{
  "weights": {
    "investment_experience": 0.6,
    "risk_tolerance": 0.4
  },
  "scoring": {
    "investment_experience": {
      "None": 1, "Beginner": 2, "Intermediate": 3, "Advanced": 4
    },
    "risk_tolerance": {
      "Conservative": 1, "Moderate": 2, "Aggressive": 3
    }
  },
  "thresholds": {
    "low": { "min": 0, "max": 2 },
    "medium": { "min": 3, "max": 4 },
    "high": { "min": 5, "max": 7 }
  }
}
```

## Migration from Legacy System

### What Changed
- ❌ `assessments` table → ✅ `assessment_forms`
- ❌ `assessment_questions` table → ✅ `assessment_form_versions.schema`
- ❌ `risk_assessments` table → ✅ `assessment_submissions`
- ❌ `risk_assessment_answers` table → ✅ `assessment_submissions.answers`

### What's New
- **Version Control**: Every save creates a new version
- **JSON Schema**: Flexible form definitions
- **Better Scoring**: Configurable weights and thresholds
- **Improved Performance**: Single table queries instead of complex joins

## Setup Instructions

### 1. Run Database Migration
```bash
# Apply the new schema
psql -d your_database -f fix-question-types.sql
```

### 2. Seed Initial Data
```bash
# Create default forms and sample data
cd backend
node seed-assessment-v2.mjs
```

### 3. Test the System
```bash
# Run smoke tests
cd backend
node smoke-test-assessments.mjs
```

### 4. Update Frontend
The frontend components have been updated to work with the new system. No additional configuration needed.

## Development

### Adding New Field Types
To support new field types in the form renderer, update the `renderField` function in `PublicAssessment.tsx`:

```typescript
case 'new_type':
  return (
    <YourCustomComponent
      value={value}
      onChange={(val) => handleResponseChange(fieldKey, val)}
    />
  );
```

### Custom Scoring Logic
The scoring engine in `backend/src/lib/forms/score.ts` can be extended to support more complex scoring algorithms.

### Validation
Form validation uses JSON Schema validation. Add custom validation rules in the schema definition.

## Troubleshooting

### Common Issues

1. **"Form not found" errors**
   - Ensure the user has a default assessment form set
   - Check that the form is active

2. **Schema validation failures**
   - Verify JSON syntax in the schema editor
   - Check that required fields are properly defined

3. **Scoring not working**
   - Ensure scoring configuration matches schema field names
   - Verify threshold ranges are correct

### Debug Mode
Enable debug logging by setting `DEBUG_ASSESSMENTS=true` in your environment variables.

## Performance Considerations

- **Indexes**: All necessary database indexes are created automatically
- **Caching**: Consider caching frequently accessed form schemas
- **Pagination**: Large numbers of submissions are paginated automatically

## Security

- **Row Level Security**: All tables have RLS policies enabled
- **User Isolation**: Users can only access their own forms and submissions
- **Input Validation**: All form inputs are validated against JSON Schema
- **Token Expiry**: Assessment links expire automatically

## Future Enhancements

- **Form Templates**: Pre-built assessment templates
- **Advanced Scoring**: Machine learning-based scoring
- **Form Analytics**: Usage statistics and completion rates
- **Multi-language Support**: Internationalized form labels
- **Conditional Logic**: Show/hide fields based on previous answers

---

For technical support or questions about the new assessment system, please refer to the backend logs or contact the development team.
