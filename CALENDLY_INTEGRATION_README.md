# Calendly Integration for OneMFin

## Overview

This document describes the Calendly integration that has replaced the Google Meeting functionality in OneMFin. The integration allows users to easily schedule meetings with leads using their Calendly scheduling links.

## What Was Removed

### Google Meeting Functionality
- Google Calendar OAuth integration
- Google Meet automatic link generation
- Google Calendar event creation/updating
- Email invitations via Gmail
- Google Calendar sync

### Dependencies Removed
- `googleapis` package
- `nodemailer` package
- Google OAuth endpoints
- Google Calendar service

## What Was Added

### Calendly Integration
- Calendly link input field in meeting creation
- Calendly platform option in meeting types
- Calendly link storage in database
- Calendly link sharing with leads

### New Database Schema
- `calendly_link` column in `meetings` table
- Updated platform constraints (calendly, zoom, manual)
- Removed `external_event_id` column

## How to Use

### 1. Setting Up Calendly

1. **Create a Calendly Account**
   - Sign up at [calendly.com](https://calendly.com)
   - Set up your availability and scheduling preferences
   - Create event types for different meeting durations

2. **Get Your Calendly Link**
   - Copy your personal Calendly link (e.g., `https://calendly.com/yourname`)
   - Or create specific event type links for different meeting types

### 2. Creating Meetings with Calendly

1. **Navigate to Meetings**
   - Go to `/app/meetings` in the application
   - Click "Schedule Meeting"

2. **Select Calendly Platform**
   - Choose "Calendly" as the meeting platform
   - Enter your Calendly link in the required field
   - Fill in other meeting details (title, time, lead, etc.)

3. **Save the Meeting**
   - The Calendly link will be stored with the meeting
   - Leads can access the link to schedule appointments

### 3. Sharing with Leads

- **Direct Link Sharing**: Share the Calendly link directly with leads
- **Meeting Details**: The link is stored with meeting information
- **Easy Scheduling**: Leads can book time slots that fit their schedule

## Benefits of Calendly Integration

### For Users
- **No Complex Setup**: No OAuth configuration required
- **Professional Scheduling**: Professional booking experience
- **Flexible Availability**: Easy to manage availability and time slots
- **No Email Configuration**: No need to set up email services

### For Leads
- **Self-Service**: Can book meetings at their convenience
- **24/7 Availability**: Access to scheduling anytime
- **Professional Interface**: Clean, professional booking experience
- **Automatic Confirmations**: Receive confirmation emails automatically

## Technical Implementation

### Frontend Changes
- Updated `MeetingModal.tsx` to include Calendly link input
- Modified `Meetings.tsx` to display Calendly information
- Removed Google Calendar connection UI
- Added Calendly platform icons and buttons

### Backend Changes
- Updated `MeetingService` to handle Calendly links
- Modified `meetings.ts` routes to validate Calendly links
- Removed Google Calendar service and dependencies
- Updated database schema with migration

### Database Changes
```sql
-- Add calendly_link column
ALTER TABLE meetings ADD COLUMN calendly_link TEXT;

-- Update platform constraints
ALTER TABLE meetings ADD CONSTRAINT meetings_platform_check 
CHECK (platform IN ('calendly', 'zoom', 'manual'));

-- Remove Google Calendar columns
ALTER TABLE meetings DROP COLUMN IF EXISTS external_event_id;
```

## Migration Steps

### 1. Run Database Migration
```bash
# Execute the migration SQL file
psql -d your_database -f add_calendly_link_migration.sql
```

### 2. Update Dependencies
```bash
# Remove Google Calendar dependencies
npm uninstall googleapis nodemailer
npm uninstall @types/nodemailer

# Install any new dependencies if needed
npm install
```

### 3. Restart Services
```bash
# Restart backend service
npm run build
npm start

# Restart frontend if needed
npm run dev
```

## Configuration

### Environment Variables
No new environment variables are required for Calendly integration. The following were removed:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

### Calendly Settings
- Users manage their Calendly settings through the Calendly platform
- No application-level configuration required
- Each user can have their own Calendly account and settings

## Troubleshooting

### Common Issues

1. **Calendly Link Not Working**
   - Verify the link is correct and accessible
   - Check if the Calendly account is active
   - Ensure the link is publicly accessible

2. **Meeting Creation Fails**
   - Verify all required fields are filled
   - Check that the Calendly link is a valid URL
   - Ensure the platform is set to 'calendly'

3. **Database Errors**
   - Run the migration script to add the `calendly_link` column
   - Check database constraints and permissions
   - Verify the meetings table structure

### Support
- For Calendly-specific issues: [Calendly Support](https://help.calendly.com/)
- For application issues: Check application logs and error messages
- For database issues: Verify migration execution and table structure

## Future Enhancements

### Potential Improvements
- **Calendly API Integration**: Direct API integration for advanced features
- **Meeting Sync**: Automatic sync of scheduled meetings from Calendly
- **Analytics**: Track meeting booking patterns and success rates
- **Custom Branding**: Integrate Calendly with custom branding

### Considerations
- **API Limits**: Be aware of Calendly API rate limits if implementing direct integration
- **Data Privacy**: Ensure compliance with data protection regulations
- **User Experience**: Maintain simplicity while adding advanced features

## Conclusion

The Calendly integration provides a simpler, more professional alternative to Google Meeting functionality. It eliminates the complexity of OAuth setup while providing a better user experience for both meeting organizers and attendees.

The integration is designed to be:
- **Simple to use**: No complex configuration required
- **Professional**: Clean, branded scheduling experience
- **Reliable**: No dependency on external OAuth services
- **Scalable**: Easy to manage multiple users and meeting types
