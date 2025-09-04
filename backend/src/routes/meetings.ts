import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import MeetingService, { CreateMeetingRequest, UpdateMeetingRequest } from '../services/meetingService';
import CalendlyService from '../services/calendlyService';

const router = express.Router();
const meetingService = new MeetingService();
const calendlyService = new CalendlyService();

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

// GET /api/meetings/calendly-config - Get user's Calendly configuration
router.get('/calendly-config', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const calendlyService = new CalendlyService();
    const config = await calendlyService.getUserConfig(userId);

    res.json({ config });
  } catch (error) {
    console.error('Error fetching Calendly config:', error);
    res.status(500).json({ error: 'Failed to fetch Calendly configuration' });
  }
});

// POST /api/meetings/calendly-config - Save user's Calendly configuration
router.post('/calendly-config', authenticateUser, [
  body('username').notEmpty().withMessage('Calendly username is required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { username } = req.body;

    const calendlyService = new CalendlyService();
    const success = await calendlyService.saveUserConfig(userId, username);

    if (success) {
      res.json({ 
        message: 'Calendly configuration saved successfully',
        config: { username }
      });
    } else {
      res.status(500).json({ error: 'Failed to save Calendly configuration' });
    }
  } catch (error: any) {
    console.error('Error saving Calendly config:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to save Calendly configuration' 
    });
  }
});

// POST /api/meetings/calendly-validate - Validate Calendly username
router.post('/calendly-validate', authenticateUser, [
  body('username').notEmpty().withMessage('Calendly username is required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username } = req.body;

    const calendlyService = new CalendlyService();
    const isValid = await calendlyService.validateCalendlyUsername(username);

    if (isValid) {
      res.json({ 
        isValid: true,
        message: 'Username validated successfully'
      });
    } else {
      res.json({ 
        isValid: false,
        error: 'Username not found on Calendly. Please check and try again.'
      });
    }
  } catch (error) {
    console.error('Error validating Calendly username:', error);
    res.status(500).json({ 
      isValid: false,
      error: 'Failed to validate username' 
    });
  }
});

// GET /api/meetings/calendly-event-types - Get user's Calendly event types
router.get('/calendly-event-types', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const calendlyService = new CalendlyService();
    const config = await calendlyService.getUserConfig(userId);
    
    if (!config?.username) {
      return res.status(400).json({ error: 'Calendly username not configured' });
    }

    const eventTypes = await calendlyService.getEventTypes(config.username);
    res.json({ eventTypes });
  } catch (error) {
    console.error('Error fetching Calendly event types:', error);
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
});

// POST /api/meetings
router.post('/', authenticateUser, [
  body('lead_id').notEmpty().withMessage('Lead ID is required'),
  body('title').notEmpty().withMessage('Meeting title is required'),
  body('start_time').isISO8601().withMessage('Valid start time required'),
  body('end_time').isISO8601().withMessage('Valid end time required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('platform').isIn(['calendly', 'zoom', 'manual']).withMessage('Valid platform required'),
  body('attendees').optional().isArray().withMessage('Attendees must be an array'),
  body('calendly_link').optional().isURL().withMessage('Calendly link must be a valid URL')
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
      attendees: req.body.attendees || [],
      calendly_link: req.body.calendly_link
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
  body('attendees').optional().isArray().withMessage('Attendees must be an array'),
  body('calendly_link').optional().isURL().withMessage('Calendly link must be a valid URL')
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
      attendees: req.body.attendees,
      calendly_link: req.body.calendly_link
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

export default router;
