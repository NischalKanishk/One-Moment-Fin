import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import MeetingService, { CreateMeetingRequest, UpdateMeetingRequest } from '../services/meetingService';

const router = express.Router();
const meetingService = new MeetingService();

// GET /api/meetings
router.get('/', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    // Use the user ID from the authenticated request
    const userId = req.user!.supabase_user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please complete your profile first.' });
    }

    const meetings = await meetingService.getUserMeetings(userId);
    return res.json({ meetings });
  } catch (error) {
    console.error('Meetings fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// GET /api/meetings/lead/:leadId
router.get('/lead/:leadId', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { leadId } = req.params;
    const userId = req.user!.supabase_user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please complete your profile first.' });
    }

    const meetings = await meetingService.getLeadMeetings(userId, leadId);
    return res.json({ meetings });
  } catch (error) {
    console.error('Lead meetings fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch lead meetings' });
  }
});

// GET /api/meetings/google-status
router.get('/google-status', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user!.supabase_user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please complete your profile first.' });
    }

    const connectionStatus = await meetingService.checkGoogleCalendarConnection(userId);
    return res.json(connectionStatus);
  } catch (error) {
    console.error('Google Calendar status check error:', error);
    return res.status(500).json({ error: 'Failed to check Google Calendar connection' });
  }
});

// POST /api/meetings
router.post('/', authenticateUser, [
  body('lead_id').notEmpty().withMessage('Lead ID is required'),
  body('title').notEmpty().withMessage('Meeting title is required'),
  body('start_time').isISO8601().withMessage('Valid start time required'),
  body('end_time').isISO8601().withMessage('Valid end time required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('platform').isIn(['google_meet', 'zoom', 'manual']).withMessage('Valid platform required'),
  body('attendees').optional().isArray().withMessage('Attendees must be an array')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.supabase_user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please complete your profile first.' });
    }

    const meetingRequest: CreateMeetingRequest = {
      lead_id: req.body.lead_id,
      title: req.body.title,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      description: req.body.description,
      platform: req.body.platform,
      attendees: req.body.attendees || []
    };

    const meeting = await meetingService.createMeeting(userId, meetingRequest);
    return res.status(201).json({ meeting });
  } catch (error) {
    console.error('Meeting creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create meeting';
    return res.status(500).json({ error: errorMessage });
  }
});

// PUT /api/meetings/:id
router.put('/:id', authenticateUser, [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('start_time').optional().isISO8601().withMessage('Valid start time required'),
  body('end_time').optional().isISO8601().withMessage('Valid end time required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('attendees').optional().isArray().withMessage('Attendees must be an array')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user!.supabase_user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please complete your profile first.' });
    }

    const updateRequest: UpdateMeetingRequest = {
      title: req.body.title,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      description: req.body.description,
      attendees: req.body.attendees
    };

    const meeting = await meetingService.updateMeeting(userId, id, updateRequest);
    return res.json({ meeting });
  } catch (error) {
    console.error('Meeting update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update meeting';
    return res.status(500).json({ error: errorMessage });
  }
});

// POST /api/meetings/:id/cancel
router.post('/:id/cancel', authenticateUser, [
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.supabase_user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please complete your profile first.' });
    }

    const meeting = await meetingService.cancelMeeting(userId, id, reason);
    return res.json({ meeting });
  } catch (error) {
    console.error('Meeting cancellation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel meeting';
    return res.status(500).json({ error: errorMessage });
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
    const userId = req.user!.supabase_user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please complete your profile first.' });
    }

    const { data, error } = await supabase
      .from('meetings')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId)
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

// POST /api/meetings/google-auth
router.post('/google-auth', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user!.supabase_user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please complete your profile first.' });
    }

    const authUrl = meetingService['googleCalendarService'].getAuthUrl();
    return res.json({ authUrl });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ error: 'Failed to generate Google auth URL' });
  }
});

// POST /api/meetings/google-callback
router.post('/google-callback', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const userId = req.user!.supabase_user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please complete your profile first.' });
    }

    const tokens = await meetingService['googleCalendarService'].getTokensFromCode(code);

    // Store tokens in user_settings table
    const { error: updateError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_email: tokens.email,
        google_name: tokens.name,
        google_calendar_connected: true
      });

    if (updateError) {
      throw new Error('Failed to store Google Calendar tokens');
    }

    return res.json({ 
      message: 'Google Calendar connected successfully',
      email: tokens.email,
      name: tokens.name
    });
  } catch (error) {
    console.error('Google callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect Google Calendar';
    return res.status(500).json({ error: errorMessage });
  }
});

export default router;
