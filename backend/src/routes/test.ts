import express from 'express';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Test endpoint to verify authentication
router.get('/auth-test', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    return res.json({
      message: 'Authentication successful',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Auth test error:', error);
    return res.status(500).json({ error: 'Auth test failed' });
  }
});

// Test endpoint to check notifications table
router.get('/notifications-test', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { supabase } = await import('../config/supabase');
    
    // Try to query notifications table
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.supabase_user_id)
      .limit(5);

    if (error) {
      return res.json({
        message: 'Notifications table query failed',
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    return res.json({
      message: 'Notifications table accessible',
      notifications: notifications || [],
      user_id: req.user!.supabase_user_id
    });
  } catch (error: any) {
    console.error('Notifications test error:', error);
    return res.status(500).json({ 
      error: 'Notifications test failed',
      message: error.message 
    });
  }
});

export default router;
