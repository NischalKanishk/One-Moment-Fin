# Assessment Link Implementation

## Overview

This implementation adds assessment link functionality to the OneMFin application. When users sign up, they automatically get a unique assessment link that follows the format: **5 random digits + userid + 5 random letters**.

## Features

- ✅ **Automatic Generation**: Assessment links are generated automatically during user signup
- ✅ **Unique Format**: Each link follows the pattern: `12345useridABCDE`
- ✅ **Multiple Access Points**: "View Form" buttons are available in multiple locations
- ✅ **Database Migration**: Includes migration script for existing users
- ✅ **Backward Compatible**: Doesn't affect existing functionality

## Implementation Details

### 1. Database Schema

The `users` table now includes an `assessment_link` field:
- **Type**: `TEXT UNIQUE NOT NULL`
- **Index**: `idx_users_assessment_link` for fast lookups
- **Format**: `12345useridABCDE` (5 digits + userid + 5 letters)

### 2. Frontend Components

#### Assessments Page (`/app/assessments`)
- **Header Button**: "View Form" button in the top-right header
- **Card Actions**: "View Form" button on each assessment card
- **Empty State**: "View Form" button when no assessments exist
- **Detail Panel**: "View Form" button in the assessment details sidebar

#### Navigation
- Clicking "View Form" redirects to `/a/{assessment_link}`
- Uses the existing route that goes to `PublicAssessment` component

### 3. Backend Services

#### User Creation (`ClerkSupabaseSync`)
- Automatically generates assessment links for new users
- Uses the `generateAssessmentLinkLocally` function
- Ensures uniqueness through the database constraint

#### User Updates
- Existing users without assessment links get them automatically
- Non-destructive updates preserve existing data

## Usage

### For Users

1. **Sign Up**: Assessment link is automatically generated
2. **Access Form**: Click "View Form" from any location in the Assessments page
3. **Share Link**: The generated link can be shared with clients

### For Developers

#### Running the Migration

```bash
# Make sure you have the required environment variables
cp env.example .env.local
# Fill in your Supabase credentials

# Run the migration script
node apply-assessment-link-migration.mjs
```

#### Environment Variables Required

```bash
VITE_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## File Changes

### New Files
- `apply-assessment-link-migration.mjs` - Database migration script
- `ASSESSMENT_LINK_IMPLEMENTATION.md` - This documentation

### Modified Files
- `src/lib/utils.ts` - Added `generateAssessmentLink` utility function
- `src/lib/clerk-supabase-sync.ts` - Added assessment link generation to user creation
- `src/pages/app/Assessments.tsx` - Added "View Form" buttons throughout the page
- `add-assessment-link-field.sql` - Updated SQL migration with new format

## Technical Notes

### Link Generation Algorithm

```typescript
function generateAssessmentLink(userId: string): string {
  // 5 random digits (00000-99999)
  const randomDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  // 5 random uppercase letters (A-Z)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetters = Array.from({ length: 5 }, () => 
    letters.charAt(Math.floor(Math.random() * letters.length))
  .join('');
  
  // Format: 5 digits + userid + 5 letters
  return `${randomDigits}${userId}${randomLetters}`;
}
```

### Example Links
- `12345abc123defABCDE`
- `98765xyz789ghiVWXYZ`
- `00001user456jklMNOPQ`

### Database Migration

The migration script:
1. Adds the `assessment_link` column if it doesn't exist
2. Creates an index for performance
3. Populates existing users with unique links
4. Makes the column NOT NULL

## Security Considerations

- Assessment links are unique per user
- Links are generated server-side during user creation
- No sensitive information is exposed in the link format
- Existing RLS policies protect user data

## Future Enhancements

- **Link Expiration**: Add expiration dates to assessment links
- **Link Analytics**: Track link usage and form submissions
- **Custom Domains**: Allow custom subdomain for assessment links
- **Link Management**: Allow users to regenerate or manage their links

## Testing

1. **New User Signup**: Verify assessment link is generated
2. **Existing Users**: Run migration and verify links are added
3. **View Form Button**: Test all locations where the button appears
4. **Navigation**: Verify redirects to `/a/{assessment_link}` work correctly
5. **Uniqueness**: Ensure no duplicate assessment links are generated

## Troubleshooting

### Common Issues

1. **Migration Fails**: Check environment variables and database permissions
2. **Links Not Generated**: Verify the `ClerkSupabaseSync` service is working
3. **Button Not Working**: Check browser console for JavaScript errors
4. **Navigation Issues**: Verify the route `/a/:slug` exists and works

### Debug Steps

1. Check browser console for errors
2. Verify user object has `assessment_link` property
3. Test database connection and permissions
4. Check if the migration script ran successfully
