# Lead Status Management System

## Overview
The lead status management system automatically updates lead statuses based on business logic, ensuring consistent status progression throughout the lead lifecycle.

## Status Flow

### 1. Lead Creation
- **Default Status**: `"lead"`
- **Trigger**: When a lead is created (either manually or via link submission)
- **Implementation**: Set in `backend/src/routes/leads.ts` during lead creation

### 2. Risk Analysis
- **Status**: `"assessment_done"` (Risk analyzed)
- **Trigger**: When assessment form is submitted
- **Implementation**: `LeadStatusService.updateStatusToRiskAnalyzed()` called from `backend/src/routes/assessments.ts`

### 3. Meeting Scheduling
- **Status**: `"meeting_scheduled"`
- **Trigger**: When at least 1 meeting is created for the lead
- **Implementation**: `LeadStatusService.checkAndUpdateMeetingStatus()` called from `backend/src/routes/meetings.ts`

### 4. Manual Status Updates
After "Meeting scheduled" status, users can manually update to:
- **`"converted"`** - Lead successfully converted
- **`"halted"`** - Lead process halted
- **`"rejected"`** - Lead rejected
- **`"dropped"** - Lead dropped

## Implementation Details

### LeadStatusService
Located at `backend/src/services/leadStatusService.ts`

#### Key Methods:
- `updateStatusToRiskAnalyzed(leadId)` - Updates status to "assessment_done"
- `updateStatusToMeetingScheduled(leadId)` - Updates status to "meeting_scheduled"
- `checkAndUpdateMeetingStatus(leadId)` - Checks meetings and updates status accordingly
- `getLeadStatus(leadId)` - Retrieves current lead status

#### Business Logic:
- Status updates only progress forward (no downgrading)
- Meeting status only updates if current status is "lead" or "assessment_done"
- Prevents status updates for leads already in final states

### Integration Points

#### Assessments Route
- **File**: `backend/src/routes/assessments.ts`
- **Trigger**: Assessment form submission
- **Action**: Calls `LeadStatusService.updateStatusToRiskAnalyzed()`

#### Meetings Route
- **File**: `backend/src/routes/meetings.ts`
- **Trigger**: Meeting creation
- **Action**: Calls `LeadStatusService.checkAndUpdateMeetingStatus()`

#### Leads Route
- **File**: `backend/src/routes/leads.ts`
- **Features**: 
  - Status validation for new status values
  - Statistics include new status counts
  - Manual status updates via PATCH endpoint

## Database Schema Updates

### New Status Values
The database constraint has been updated to include:
```sql
CHECK (status IN ('lead', 'assessment_done', 'meeting_scheduled', 'converted', 'dropped', 'halted', 'rejected'))
```

### Migration Script
Run `update-lead-status-constraint.sql` to update existing databases.

## Testing

### Unit Tests
- **File**: `backend/src/services/__tests__/leadStatusService.test.ts`
- **Coverage**: All service methods with various scenarios
- **Mocking**: Supabase client mocked for isolated testing

### Test Scenarios
- Status progression validation
- Business logic enforcement
- Error handling
- Edge cases (existing statuses, no meetings, etc.)

## Status Validation

### API Endpoints
- **GET** `/api/leads` - Status filtering supports all new values
- **PATCH** `/api/leads/:id/status` - Status updates validated against new values
- **GET** `/api/leads/stats` - Statistics include all status counts

### Frontend Integration
- Status dropdowns updated to include new values
- Dashboard statistics reflect new status categories
- Lead management UI supports all status transitions

## Error Handling

### Graceful Degradation
- Meeting creation doesn't fail if status update fails
- Assessment submission continues even if status update fails
- Logs errors for debugging without breaking user experience

### Logging
- All status update attempts logged
- Error details captured for troubleshooting
- Non-critical failures don't interrupt main operations

## Future Enhancements

### Potential Additions
- Status change audit trail
- Automated notifications on status changes
- Status-based workflow triggers
- Status change approval workflows

### Monitoring
- Status transition metrics
- Failed status update alerts
- Performance monitoring for status operations
