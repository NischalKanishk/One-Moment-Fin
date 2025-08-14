# Meeting Feature Setup Guide

## Overview

This guide will help you set up the comprehensive Meeting feature in OneMFin that integrates with Google Meet and provides a seamless user experience. **Each user connects their own Google Calendar account and sends meeting invitations from their own email address.**

## Features Included

✅ **User-Specific Google Meet Integration** - Each user connects their own Google Calendar  
✅ **Personal Email Notifications** - Meeting invitations sent from user's own Gmail  
✅ **Meeting Management** - Create, edit, cancel, and reschedule meetings  
✅ **Dashboard Integration** - Upcoming meetings visible on main dashboard  
✅ **Lead Profile Integration** - Meeting history and scheduling from lead details  
✅ **Multi-platform Support** - Google Meet, Zoom, and manual meetings  
✅ **Status Tracking** - Scheduled, completed, and cancelled meeting states  

## Prerequisites

1. **Google Cloud Console Account** - For Google Calendar API
2. **Individual User Gmail Accounts** - Each user connects their own account
3. **Supabase Project** - Database setup
4. **Clerk Authentication** - User management

## Step 1: Google Cloud Console Setup

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API

### 1.2 Configure OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3001/api/meetings/google-callback` (development)
   - `https://yourdomain.com/api/meetings/google-callback` (production)
5. Note down your Client ID and Client Secret

### 1.3 Enable Required APIs
1. Go to "APIs & Services" > "Library"
2. Enable these APIs:
   - **Google Calendar API** - For calendar event management
   - **Gmail API** - For sending emails from user accounts
   - **Google+ API** - For user profile information

## Step 2: Backend Environment Configuration

### 2.1 Install Dependencies
```bash
cd backend
npm install googleapis nodemailer
```

### 2.2 Environment Variables
Copy `env.example` to `.env` and configure:

```bash
# Google Calendar Integration (Global for your app)
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/api/meetings/google-callback

# Note: No global email configuration needed
# Each user will connect their own Gmail account
```

## Step 3: Database Schema Updates

The meetings table is already included in your schema, but ensure these fields exist:

```sql
-- Verify meetings table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'meetings';

-- Expected columns:
-- id, user_id, lead_id, external_event_id, platform, meeting_link
-- title, description, start_time, end_time, status, is_synced, created_at

-- Verify user_settings table has Google Calendar fields
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name LIKE 'google_%';

-- Expected columns:
-- google_access_token, google_refresh_token, google_email, google_name, google_calendar_connected
```

## Step 4: Frontend Integration

### 4.1 Components Added
- `MeetingModal.tsx` - Meeting creation/editing form with Google connection status
- Enhanced `Meetings.tsx` - Comprehensive meeting management with connection prompts
- Dashboard integration - Upcoming meetings display
- Lead detail integration - Meeting history and scheduling

### 4.2 API Endpoints Available
```
GET    /api/meetings              - Get all meetings for user
GET    /api/meetings/lead/:id     - Get meetings for specific lead
GET    /api/meetings/google-status - Check user's Google Calendar connection
POST   /api/meetings              - Create new meeting
PUT    /api/meetings/:id          - Update existing meeting
POST   /api/meetings/:id/cancel   - Cancel meeting
PATCH  /api/meetings/:id/status   - Update meeting status
POST   /api/meetings/google-auth  - Get Google auth URL
POST   /api/meetings/google-callback - Handle Google OAuth callback
```

## Step 5: User Experience Flow

### 5.1 First-Time User Experience
1. User visits `/app/meetings`
2. Sees prominent "Connect Your Google Calendar" banner
3. Clicks connect button and completes OAuth flow
4. Returns to app with Google Calendar connected
5. Can now create Google Meet meetings and send invitations

### 5.2 Meeting Creation Flow
1. User clicks "Schedule Meeting"
2. Selects "Google Meet" as platform
3. If connected: Meeting created in their Google Calendar + invitation sent from their email
4. If not connected: Prompt to connect Google Calendar first

### 5.3 Email Invitations
- **From:** User's own Gmail address (e.g., "john@company.com")
- **Subject:** "Meeting Invitation: [Meeting Title]"
- **Content:** Professional HTML template with meeting details and Google Meet link
- **Recipients:** Lead email + any additional attendees

## Step 6: Testing the Integration

### 6.1 Test User Google Connection
1. Start your backend server: `npm run dev`
2. Navigate to `/app/meetings` in your frontend
3. Click "Connect Google Calendar"
4. Complete OAuth flow in popup window
5. Verify connection status shows as connected

### 6.2 Test Meeting Creation
1. Click "Schedule Meeting"
2. Fill in meeting details and select "Google Meet"
3. Verify Google Calendar event is created
4. Check if invitation email is sent from user's Gmail

### 6.3 Test Email Notifications
1. Create meeting with attendee email
2. Check if invitation email is sent from user's Gmail
3. Verify email contains meeting link and details
4. Check Google Calendar for the new event

## Step 7: Production Deployment

### 7.1 Update Redirect URIs
- Change `GOOGLE_CALENDAR_REDIRECT_URI` to production domain
- Update Google Cloud Console OAuth settings

### 7.2 Environment Variables
- Set production values for all environment variables
- Ensure proper CORS settings for production domain

### 7.3 SSL Requirements
- Google OAuth requires HTTPS in production
- Ensure your domain has valid SSL certificate

## Troubleshooting

### Common Issues

#### 1. User Google Calendar Connection Fails
**Symptoms:** "Google Calendar not connected" error
**Solutions:**
- Verify OAuth credentials in Google Cloud Console
- Check redirect URI matches exactly
- Ensure required APIs are enabled (Calendar, Gmail, Google+)

#### 2. Email Notifications Not Sent
**Symptoms:** Meetings created but no emails sent
**Solutions:**
- Verify user has completed Google OAuth flow
- Check if Gmail API is enabled
- Ensure user has granted necessary permissions

#### 3. Meeting Links Not Generated
**Symptoms:** Google Meet links missing
**Solutions:**
- Verify user has connected Google Calendar
- Check Google Calendar API permissions
- Review meeting creation logs

#### 4. OAuth Popup Issues
**Symptoms:** Popup blocked or doesn't work
**Solutions:**
- Ensure popup blockers are disabled
- Check browser console for errors
- Verify OAuth flow completion

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

## Security Considerations

### 1. OAuth Security
- Each user's tokens stored separately in database
- Refresh tokens handled securely
- Use HTTPS in production

### 2. Email Security
- Users send emails from their own Gmail accounts
- No shared email credentials
- OAuth-based authentication

### 3. Data Privacy
- Meeting data is user-scoped (RLS enabled)
- External event IDs stored for sync
- No sensitive data in meeting descriptions

## Performance Optimization

### 1. Token Management
- Store and refresh user tokens efficiently
- Implement token expiration handling
- Cache connection status

### 2. Background Jobs
- Email sending can be queued
- Calendar sync can be batched
- Meeting reminders can be scheduled

## Monitoring and Analytics

### 1. Key Metrics
- User Google Calendar connection rate
- Meeting creation success rate
- Email delivery success rate
- Meeting completion rates

### 2. Logging
- All meeting operations logged
- Google API errors tracked
- Email delivery status logged

## Support and Maintenance

### 1. Regular Tasks
- Monitor Google API quotas
- Check user connection success rates
- Review meeting completion rates
- Update OAuth credentials if needed

### 2. Updates
- Keep Google APIs library updated
- Monitor for breaking changes
- Test OAuth flow after updates

## User Onboarding

### 1. Connection Guide
- Clear instructions for Google Calendar connection
- Benefits of connecting (automatic links, email invitations)
- Troubleshooting common connection issues

### 2. Feature Discovery
- Highlight Google Meet integration benefits
- Show professional email templates
- Demonstrate calendar sync capabilities

## Conclusion

The Meeting feature now provides a **user-specific Google Calendar integration** where each user connects their own account and sends meeting invitations from their own email. This approach is more secure, professional, and gives users full control over their meeting communications.

**Key Benefits:**
- **Personal Branding** - Emails come from user's own Gmail address
- **Better Deliverability** - Using user's own email account
- **Professional Appearance** - No generic "noreply" addresses
- **User Control** - Each user manages their own calendar and contacts

For additional support, refer to:
- Google Calendar API documentation
- Gmail API documentation
- OneMFin backend logs
- Frontend console errors

---

**Note:** This feature requires each user to have their own Google account and complete the OAuth flow. Users will see clear prompts to connect their Google Calendar when needed.
