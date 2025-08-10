import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { LeadStatusService } from '../services/leadStatusService';

const router = express.Router();

// GET /api/meetings
router.get('/', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    const { data: meetings, error } = await supabase
      .from('meetings')
      .select(`
        *,
        leads!meetings_lead_id_fkey (
          id,
          full_name,
          email,
          phone
        ),
        users!meetings_user_id_fkey (
          id,
          full_name
        )
      `)
      .eq('user_id', user_id)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Meetings fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch meetings' });
    }

    // Transform data to match frontend expectations
    const transformedMeetings = meetings?.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      description: meeting.description,
      meeting_link: meeting.meeting_link,
      platform: meeting.platform,
      status: meeting.status,
      lead_name: meeting.leads?.full_name,
      lead_email: meeting.leads?.email,
      created_by: meeting.users?.full_name,
      created_at: meeting.created_at
    })) || [];

    return res.json({ meetings: transformedMeetings });
  } catch (error) {
    console.error('Meetings fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// POST /api/meetings/manual
router.post('/manual', authenticateUser, [
  body('lead_id').notEmpty().withMessage('Lead ID is required'),
  body('title').notEmpty().withMessage('Meeting title is required'),
  body('start_time').isISO8601().withMessage('Valid start time required'),
  body('end_time').optional().isISO8601().withMessage('Valid end time required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('meeting_link').optional().isURL().withMessage('Valid meeting link required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lead_id, title, start_time, end_time, description, meeting_link } = req.body;
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    const { data, error } = await supabase
      .from('meetings')
      .insert({
        user_id,
        lead_id,
        title,
        start_time,
        end_time,
        description,
        meeting_link,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) {
      console.error('Meeting creation error:', error);
      return res.status(500).json({ error: 'Failed to create meeting' });
    }

    // Update lead status to "Meeting scheduled" when at least 1 meeting is created
    try {
      await LeadStatusService.checkAndUpdateMeetingStatus(lead_id);
    } catch (statusError) {
      console.error('Failed to update lead status after meeting creation:', statusError);
      // Don't fail the meeting creation if status update fails
    }

    return res.json({ meeting: data });
  } catch (error) {
    console.error('Meeting creation error:', error);
    return res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// PATCH /api/meetings/:id/status
router.patch('/:id/status', authenticateUser, [
  body('status').isIn(['scheduled', 'completed', 'cancelled']).withMessage('Valid status required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    const { data, error } = await supabase
      .from('meetings')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    return res.json({ meeting: data });
  } catch (error) {
    console.error('Meeting status update error:', error);
    return res.status(500).json({ error: 'Failed to update meeting status' });
  }
});

// POST /api/meetings/calendly-scheduled
router.post('/calendly-scheduled', authenticateUser, [
  body('eventUri').notEmpty().withMessage('Event URI is required'),
  body('inviteeUri').notEmpty().withMessage('Invitee URI is required'),
  body('leadId').notEmpty().withMessage('Lead ID is required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventUri, inviteeUri, leadId } = req.body;
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    // Verify the lead belongs to the current user
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('id, user_id, email')
      .eq('id', leadId)
      .eq('user_id', user_id)
      .single();

    if (leadError || !leadData) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    // Fetch Calendly event and invitee details
    const calendlyToken = process.env.CALENDLY_API_KEY;
    if (!calendlyToken) {
      console.error('CALENDLY_API_KEY not configured');
      return res.status(500).json({ error: 'Calendly integration not configured' });
    }

    try {
      // Fetch event details
      const eventResponse = await fetch(eventUri, {
        headers: {
          'Authorization': `Bearer ${calendlyToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!eventResponse.ok) {
        throw new Error(`Failed to fetch Calendly event: ${eventResponse.statusText}`);
      }

      const eventData = await eventResponse.json();

      // Fetch invitee details
      const inviteeResponse = await fetch(inviteeUri, {
        headers: {
          'Authorization': `Bearer ${calendlyToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!inviteeResponse.ok) {
        throw new Error(`Failed to fetch Calendly invitee: ${inviteeResponse.statusText}`);
      }

      const inviteeData = await inviteeResponse.json();

      // Extract meeting details
      const external_event_id = eventUri.split('/').pop();
      const start_time = eventData.resource.start_time;
      const end_time = eventData.resource.end_time;
      const title = eventData.resource.name || 'Meeting via Calendly';
      const meeting_link = eventData.resource.location?.join_url || eventData.resource.location?.url || '';

      // Update lead email if missing
      if (!leadData.email && inviteeData.resource.email) {
        const { error: updateError } = await supabase
          .from('leads')
          .update({ email: inviteeData.resource.email })
          .eq('id', leadId);

        if (updateError) {
          console.error('Failed to update lead email:', updateError);
          // Continue with meeting creation even if email update fails
        }
      }

      // Upsert meeting
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .upsert({
          user_id,
          lead_id: leadId,
          platform: 'calendly',
          external_event_id,
          meeting_link,
          title,
          description: `Meeting scheduled via Calendly`,
          start_time,
          end_time,
          status: 'scheduled',
          is_synced: true
        }, {
          onConflict: 'platform,external_event_id'
        })
        .select()
        .single();

      if (meetingError) {
        console.error('Meeting upsert error:', meetingError);
        return res.status(500).json({ error: 'Failed to create meeting' });
      }

      // Update lead status to "Meeting scheduled" when at least 1 meeting is created
      try {
        await LeadStatusService.checkAndUpdateMeetingStatus(leadId);
      } catch (statusError) {
        console.error('Failed to update lead status after meeting creation:', statusError);
        // Don't fail the meeting creation if status update fails
      }

      return res.json({ meeting: meetingData });
    } catch (calendlyError) {
      console.error('Calendly API error:', calendlyError);
      return res.status(500).json({ error: 'Failed to fetch Calendly details' });
    }
  } catch (error) {
    console.error('Calendly meeting creation error:', error);
    return res.status(500).json({ error: 'Failed to create meeting' });
  }
});

export default router;
