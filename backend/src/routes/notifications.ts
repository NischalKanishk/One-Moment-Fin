import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

// GET /api/notifications - Get user notifications
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.supabase_user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user!.supabase_user_id)
      .eq('is_read', false);

    return res.json({
      notifications,
      unread_count: unreadCount || 0,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        has_more: notifications.length === Number(limit)
      }
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/count - Get unread notification count
router.get('/count', async (req: express.Request, res: express.Response) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user!.supabase_user_id)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching notification count:', error);
      return res.status(500).json({ error: 'Failed to fetch notification count' });
    }

    return res.json({ unread_count: count || 0 });
  } catch (error: any) {
    console.error('Get notification count error:', error);
    return res.status(500).json({ error: 'Failed to fetch notification count' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('user_id', req.user!.supabase_user_id);

    if (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', async (req: express.Request, res: express.Response) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', req.user!.supabase_user_id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Mark all notifications as read error:', error);
    return res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// POST /api/notifications - Create notification (admin only)
router.post('/', [
  body('user_id').isUUID().withMessage('Valid user ID is required'),
  body('type').isIn(['new_lead', 'meeting_today', 'meeting_reminder', 'assessment_completed', 'follow_up_reminder', 'system_update']).withMessage('Valid notification type is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, type, title, message, data, priority = 'medium', expires_at } = req.body;

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        data,
        priority,
        expires_at
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    return res.status(201).json(notification);
  } catch (error: any) {
    console.error('Create notification error:', error);
    return res.status(500).json({ error: 'Failed to create notification' });
  }
});

export default router;
