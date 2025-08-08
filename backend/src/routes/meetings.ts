import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// GET /api/meetings
router.get('/', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select(`
        *,
        leads (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('user_id', req.user!.id)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Meetings fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch meetings' });
    }

    return res.json({ meetings });
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

    const { data, error } = await supabase
      .from('meetings')
      .insert({
        user_id: req.user!.id,
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

    const { data, error } = await supabase
      .from('meetings')
      .update({ status })
      .eq('id', id)
      .eq('user_id', req.user!.id)
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
