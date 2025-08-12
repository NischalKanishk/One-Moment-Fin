# OneMFin Onboarding Flow Implementation

This document outlines the complete implementation of the onboarding flow for OneMFin using Clerk authentication and Supabase database.

## 🎯 Overview

The onboarding flow ensures that new users complete their profile setup before accessing the main application. It collects essential information including:

1. **Phone Number** (Optional)
2. **MFD Registration Number** (Optional) 
3. **Calendly Integration** (Required: URL, Optional: API Key)

## 🏗️ Architecture

### Frontend Components
- **Onboarding Page** (`src/pages/Onboarding.tsx`) - Multi-step form interface
- **Protected Route** (`src/components/ProtectedRoute.tsx`) - Route protection with onboarding checks
- **Profile Page** (`src/pages/app/Profile.tsx`) - Display and edit MFD registration number
- **Custom Hooks** (`src/hooks/use-onboarding.ts`) - Onboarding status management

### Backend API
- **Onboarding Routes** (`backend/src/routes/onboarding.ts`) - Handle onboarding completion
- **Auth Routes** (`backend/src/routes/auth.ts`) - Profile updates including MFD registration
- **Database Schema** - Updated users table with MFD registration field

### Clerk Integration
- **Custom Session Claims** - Store onboarding status in user metadata
- **Redirect URLs** - Force new users to onboarding after signup
- **JWT Templates** - Supabase integration for database access

## 🚀 Implementation Steps

### 1. Database Schema Updates

```sql
-- Add MFD registration number to users table
ALTER TABLE users ADD COLUMN mfd_registration_number TEXT;

-- Update user_settings table for Calendly integration
-- (Already exists in current schema)
```

**Migration Script**: `add-mfd-registration-column.sql`

### 2. Clerk Configuration

#### Environment Variables
```bash
VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app/dashboard
VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/onboarding
```

#### Custom Session Claims
```typescript
// src/types/globals.d.ts
interface CustomJwtSessionClaims {
  metadata: {
    onboardingComplete?: boolean
    phoneNumber?: string
    mfdRegistrationNumber?: string
    calendlyUrl?: string
    calendlyApiKey?: string
  }
}
```

### 3. Backend API Implementation

#### Onboarding Completion Endpoint
```typescript
POST /api/onboarding/complete
{
  "phoneNumber": "string",
  "mfdRegistrationNumber": "string", 
  "calendlyUrl": "string",
  "calendlyApiKey": "string"
}
```

#### Profile Update Endpoint
```typescript
PUT /api/auth/profile
{
  "full_name": "string",
  "phone": "string",
  "mfd_registration_number": "string"
}
```

### 4. Frontend Implementation

#### Multi-Step Onboarding Form
- **Step 1**: Basic Information (Phone Number)
- **Step 2**: MFD Registration Number
- **Step 3**: Calendly Integration
- **Step 4**: Review & Complete

#### Route Protection
- New users are redirected to `/onboarding` after signup
- Users cannot access protected routes until onboarding is complete
- Onboarding status is checked on every protected route access

## 🔐 Security Features

### Row Level Security (RLS)
- Users can only access their own data
- MFD registration numbers are isolated per user
- Calendly API keys are encrypted and stored securely

### Input Validation
- Phone number format validation (10-15 characters)
- MFD registration number length limit (50 characters)
- Calendly URL format validation
- Required field enforcement

### Authentication Flow
- JWT token validation on every request
- Clerk session management
- Automatic token refresh

## 📱 User Experience

### Progressive Disclosure
- Only required fields are mandatory
- Optional fields provide additional functionality
- Clear progress indicators throughout the flow

### Error Handling
- Comprehensive validation messages
- Network error recovery
- User-friendly error descriptions

### Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Consistent with OneMFin design system

## 🔄 Data Flow

### 1. User Signup
```
User Signs Up → Clerk Creates Account → Redirect to /onboarding
```

### 2. Onboarding Process
```
User Fills Form → Frontend Validates → Backend Updates → Clerk Metadata + Supabase
```

### 3. Profile Updates
```
User Edits Profile → Frontend Sends Update → Backend Updates Database → Sync with Clerk
```

### 4. Route Access
```
User Requests Route → Check Auth → Check Onboarding → Allow/Redirect
```

## 🧪 Testing

### Frontend Testing
- Form validation
- Step navigation
- Error handling
- Responsive behavior

### Backend Testing
- API endpoint validation
- Database operations
- Authentication middleware
- Error scenarios

### Integration Testing
- End-to-end onboarding flow
- Clerk integration
- Supabase synchronization
- Route protection

## 🚀 Deployment

### Prerequisites
1. Clerk account with JWT templates configured
2. Supabase project with updated schema
3. Environment variables configured
4. Database migration applied

### Steps
1. Run database migration script
2. Update environment variables
3. Deploy backend with new routes
4. Deploy frontend with onboarding components
5. Test complete flow

## 🔧 Configuration

### Clerk Dashboard
- Configure JWT templates for Supabase
- Set redirect URLs for signup/signin
- Enable custom user metadata

### Supabase
- Apply database schema changes
- Configure RLS policies
- Set up API endpoints

### Environment Variables
```bash
# Required
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Onboarding
VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app/dashboard
VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/onboarding
```

## 📊 Monitoring & Analytics

### Success Metrics
- Onboarding completion rate
- Time to complete onboarding
- Field completion rates
- Error frequency

### Logging
- User onboarding progress
- API call success/failure
- Validation errors
- Performance metrics

## 🐛 Troubleshooting

### Common Issues
1. **Onboarding loop**: Check Clerk metadata sync
2. **Route access denied**: Verify onboarding completion
3. **Database errors**: Check schema migration
4. **Authentication failures**: Verify JWT templates

### Debug Steps
1. Check browser console for errors
2. Verify Clerk user metadata
3. Check Supabase database state
4. Review backend logs

## 🔮 Future Enhancements

### Planned Features
- Multi-step onboarding with progress saving
- Conditional field requirements
- Integration with external verification services
- Advanced validation rules

### Scalability
- Support for different user types
- Custom onboarding flows
- A/B testing capabilities
- Analytics integration

## 📚 Resources

### Documentation
- [Clerk Onboarding Guide](https://clerk.com/docs/references/nextjs/add-onboarding-flow)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [OneMFin Product Overview](docs/Product_Overview.md)

### Code Examples
- Onboarding component implementation
- API endpoint definitions
- Database schema updates
- Route protection logic

---

## 🎉 Summary

The OneMFin onboarding flow provides a secure, user-friendly experience that ensures new users are properly configured before accessing the platform. The implementation follows modern best practices for authentication, data validation, and user experience while maintaining the security and scalability requirements of a financial services platform.

**Key Benefits:**
- ✅ Secure user onboarding with Clerk authentication
- ✅ Comprehensive data collection for MFD compliance
- ✅ Seamless Calendly integration setup
- ✅ Robust route protection and validation
- ✅ Scalable architecture for future enhancements
