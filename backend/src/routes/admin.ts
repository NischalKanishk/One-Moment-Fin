import express from 'express';
import { UserDeletionServiceSimple } from '../services/userDeletionServiceSimple';
import { logger } from '../services/logger';
import { supabase } from '../config/supabase';
import { authenticateUser, requireRole } from '../middleware/auth';

const router = express.Router();

// Apply authentication and admin role requirement to all routes
router.use(authenticateUser);
router.use(requireRole(['admin']));

// GET /admin/users - List all active users
router.get('/users', async (req: express.Request, res: express.Response) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, clerk_id, full_name, email, phone, role, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching users', { error });
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json({ users: users || [] });
    return; // Add explicit return
  } catch (error) {
    logger.error('Unexpected error fetching users', { error });
    res.status(500).json({ error: 'Internal server error' });
    return; // Add explicit return
  }
});

// GET /admin/users/:id - Get specific user details
router.get('/users/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,

        leads (count),
        assessments (count),
        meetings (count),
        user_subscriptions (count)
      `)
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
    return; // Add explicit return
  } catch (error) {
    logger.error('Unexpected error fetching user details', { error });
    res.status(500).json({ error: 'Internal server error' });
    return; // Add explicit return
  }
});

// DELETE /admin/users/:id - Delete user and all associated data
router.delete('/users/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user!.supabase_user_id;

    // Prevent admin from deleting themselves
    if (id === adminUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await UserDeletionServiceSimple.deleteUser(id);

          if (result.success) {
        logger.info('User deleted successfully', { 
          deletedUserId: id, 
          adminUserId,
          deprecatedUserId: result.deprecatedUserId,
          migratedDataCount: result.migratedDataCount
        });
        res.json({ 
          message: 'User deleted successfully', 
          deprecatedUserId: result.deprecatedUserId,
          migratedDataCount: result.migratedDataCount
        });
      } else {
        logger.error('Failed to delete user', { 
          userId: id, 
          message: result.message,
          adminUserId 
        });
        res.status(500).json({ error: result.message });
      }
    return; // Add explicit return
  } catch (error) {
    logger.error('Unexpected error deleting user', { error });
    res.status(500).json({ error: 'Internal server error' });
    return; // Add explicit return
  }
});

// GET /admin/stats - Get system statistics
router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      logger.error('Error counting users', { error: usersError });
      return res.status(500).json({ error: 'Failed to get user count' });
    }

    // Get total leads count
    const { count: totalLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (leadsError) {
      logger.error('Error counting leads', { error: leadsError });
      return res.status(500).json({ error: 'Failed to get lead count' });
    }

    // Get total meetings count
    const { count: totalMeetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true });

    if (meetingsError) {
      logger.error('Error counting meetings', { error: meetingsError });
      return res.status(500).json({ error: 'Failed to get meeting count' });
    }

    // Get total assessments count
    const { count: totalAssessments, error: assessmentsError } = await supabase
      .from('risk_assessments')
      .select('*', { count: 'exact', head: true });

    if (assessmentsError) {
      logger.error('Error counting assessments', { error: assessmentsError });
      return res.status(500).json({ error: 'Failed to get assessment count' });
    }

    const stats = {
      totalUsers: totalUsers || 0,
      totalLeads: totalLeads || 0,
      totalMeetings: totalMeetings || 0,
      totalAssessments: totalAssessments || 0,
      timestamp: new Date().toISOString()
    };

    logger.info('Admin stats retrieved', { adminUserId: req.user!.supabase_user_id });
    res.json({ stats });
    return; // Add explicit return
  } catch (error) {
    logger.error('Unexpected error getting admin stats', { error });
    res.status(500).json({ error: 'Internal server error' });
    return; // Add explicit return
  }
});

// GET /admin/health - System health check
router.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    // Check database connection
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (error) {
      logger.error('Database health check failed', { error });
      return res.status(500).json({ 
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }

    const healthStatus = {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      adminUserId: req.user!.supabase_user_id
    };

    logger.info('Admin health check passed', { adminUserId: req.user!.supabase_user_id });
    res.json(healthStatus);
    return; // Add explicit return
  } catch (error) {
    logger.error('Unexpected error during health check', { error });
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
    return; // Add explicit return
  }
});

export default router;
