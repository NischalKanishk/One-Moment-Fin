# Calendly Integration Setup Guide

## Overview

This guide explains how to set up and use the Calendly integration in OneMFin. The integration allows users to configure their own Calendly account settings and schedule meetings directly from the application.

## Features

- **User-specific Calendly configuration**: Each user can set their own Calendly URL and API key
- **Automatic meeting creation**: When a lead schedules a meeting via Calendly, it's automatically added to the system
- **Lead status updates**: Meeting scheduling automatically updates lead status
- **Secure API key storage**: API keys are stored securely in the database with user isolation

## Setup Instructions

### 1. Database Setup

Run the SQL migration in your Supabase SQL editor:

```sql
-- Copy and paste the contents of create-user-settings-table.sql
```

### 2. Backend Setup

The backend routes are already configured. Make sure the `settings` route is registered in `backend/src/index.ts`.

### 3. Frontend Setup

The frontend components are already updated to use the new settings system.

## How to Use

### For Users (MFDs)

1. **Navigate to Settings**: Go to `/app/settings` and click on the "Calendly" tab
2. **Configure Calendly**:
   - Enter your Calendly scheduling page URL (e.g., `https://calendly.com/your-username`)
   - Enter your Calendly API key (starts with `cal_`)
   - Click "Save Calendly Settings"
3. **Start Scheduling**: Once configured, you can schedule meetings from the Meetings page

### For Developers

#### API Endpoints

- `GET /api/settings` - Get user settings
- `POST /api/settings` - Create/update user settings
- `DELETE /api/settings/calendly` - Remove Calendly configuration

#### Frontend Hooks

```typescript
import { useSettings } from '@/hooks/use-settings';

const { 
  settings, 
  isLoading, 
  saveSettings, 
  removeCalendlySettings, 
  hasCalendlyConfig 
} = useSettings();
```

#### Database Schema

```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    calendly_url TEXT,
    calendly_api_key TEXT,
    google_calendar_id TEXT,
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

## Security Features

- **Row Level Security (RLS)**: Users can only access their own settings
- **API Key Validation**: Calendly API keys are validated before saving
- **User Isolation**: Each user's settings are completely isolated
- **Secure Storage**: API keys are stored in the database, not in environment variables

## Error Handling

The system provides clear error messages for common issues:

- **Missing Configuration**: Users see a warning when Calendly is not configured
- **Invalid API Key**: Clear error message when API key validation fails
- **Network Issues**: Helpful error messages for connectivity problems

## Troubleshooting

### Common Issues

1. **"Calendly integration not configured"**
   - Solution: Configure Calendly settings in the Settings page

2. **"Invalid Calendly API key"**
   - Solution: Check your API key in Calendly dashboard and ensure it starts with `cal_`

3. **"Failed to validate Calendly API key"**
   - Solution: Check your internet connection and try again

### Getting Calendly API Key

1. Log in to your Calendly account
2. Go to "Integrations" → "API & Webhooks"
3. Click "Generate New API Key"
4. Copy the key (starts with `cal_`)

## Future Enhancements

- Google Calendar integration
- Meeting templates
- Automated follow-ups
- Calendar sync
- Meeting analytics

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Calendly API key is correct
3. Ensure your Calendly URL is accessible
4. Check the backend logs for detailed error information
