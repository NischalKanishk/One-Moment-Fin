import express from 'express';
import { UserDeletionServiceSimple } from '../services/userDeletionServiceSimple';
import { logger } from '../services/logger';
import { supabase } from '../config/supabase';

// Note: The user property is already declared in middleware/auth.ts
// We'll work with the existing structure: { clerk_id, supabase_user_id, email, phone, role }

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token and check if user is admin
    // This is a simplified check - in production, you'd want proper JWT verification
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user has admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Add user info to request for logging
    req.user = {
      clerk_id: user.id, // Use user.id as clerk_id for consistency
      supabase_user_id: user.id,
      email: user.email,
      phone: undefined,
      role: userData.role
    };
    next();
    return; // Add explicit return to satisfy TypeScript
  } catch (error) {
    logger.error('Admin middleware error', { error });
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Apply admin middleware to all routes
router.use(requireAdmin);

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
    logger.error('Error fetching user details', { userId: req.params.id, error });
    res.status(500).json({ error: 'Internal server error' });
    return; // Add explicit return
  }
});

// DELETE /admin/users/:id - Manually delete a user (admin override)
router.delete('/users/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { reason = 'admin_manual_deletion' } = req.body;

    logger.info('Admin manual user deletion requested', { 
      userId: id, 
      reason, 
      adminId: req.user?.supabase_user_id 
    });

    // Use the simplified UserDeletionServiceSimple to handle the deletion
    const deletionResult = await UserDeletionServiceSimple.deleteUser(id, reason);

    if (deletionResult.success) {
      logger.info('Admin user deletion successful with simplified approach', { 
        userId: id, 
        deprecatedUserId: deletionResult.deprecatedUserId,
        migratedDataCount: deletionResult.migratedDataCount
      });

      res.json({
        success: true,
        message: deletionResult.message,
        deprecatedUserId: deletionResult.deprecatedUserId,
        migratedDataCount: deletionResult.migratedDataCount
      });
    } else {
      logger.error('Admin user deletion failed', { 
        userId: id, 
        error: deletionResult.message 
      });

      res.status(400).json({
        success: false,
        message: deletionResult.message
      });
    }
  } catch (error) {
    logger.error('Unexpected error during admin user deletion', { 
      userId: req.params.id, 
      error 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/deprecated-users - List all deprecated users
router.get('/deprecated-users', async (req: express.Request, res: express.Response) => {
  try {
    const deprecatedUsers = await UserDeletionServiceSimple.getAllDeprecatedUsers();

    res.json({ deprecatedUsers });
  } catch (error) {
    logger.error('Error fetching deprecated users', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/deprecated-users/:id - Get specific deprecated user details
router.get('/deprecated-users/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    // Get deprecated user data
    const { data: deprecatedUser, error: userError } = await supabase
      .from('deprecated_users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !deprecatedUser) {
      return res.status(404).json({ error: 'Deprecated user not found' });
    }

    // Extract data from the JSON user_data field
    const userData = deprecatedUser.user_data || {};
    
    res.json({
      deprecatedUser: {
        id: deprecatedUser.id,
        original_user_id: deprecatedUser.original_user_id,
        clerk_id: deprecatedUser.clerk_id,
        full_name: deprecatedUser.full_name,
        email: deprecatedUser.email,
        phone: deprecatedUser.phone,
        role: deprecatedUser.role,
        deleted_at: deprecatedUser.deleted_at,
        deletion_reason: deprecatedUser.deletion_reason,
        data_migration_status: deprecatedUser.data_migration_status
      },
      userData: {
        user_info: userData.user_info,

        leads: userData.leads,
        assessments: userData.assessments,
        assessment_questions: userData.assessment_questions,
        risk_assessments: userData.risk_assessments,
        meetings: userData.meetings,
        user_subscriptions: userData.user_subscriptions,
        product_recommendations: userData.product_recommendations,
        ai_feedback: userData.ai_feedback,
        migration_metadata: userData.migration_metadata
      }
    });
    return; // Add explicit return
  } catch (error) {
    logger.error('Error fetching deprecated user details', { deprecatedUserId: req.params.id, error });
    res.status(500).json({ error: 'Internal server error' });
    return; // Add explicit return
  }
});

// GET /admin/deprecated-users/:id/:dataType - Get specific data type from deprecated user
router.get('/deprecated-users/:id/:dataType', async (req: express.Request, res: express.Response) => {
  try {
    const { id, dataType } = req.params;

    // Validate data type
    const validDataTypes = ['leads', 'assessments', 'meetings', 'user_subscriptions', 'product_recommendations', 'ai_feedback'];
    
    if (!validDataTypes.includes(dataType)) {
      return res.status(400).json({ error: 'Invalid data type. Valid types: ' + validDataTypes.join(', ') });
    }

    const data = await UserDeletionServiceSimple.getDeprecatedUserDataByType(id, dataType);

    if (data === null) {
      return res.status(404).json({ error: 'Data not found or error occurred' });
    }

    res.json({ dataType, data });
    return; // Add explicit return
  } catch (error) {
    logger.error('Error fetching deprecated user data by type', { 
      deprecatedUserId: req.params.id, 
      dataType: req.params.dataType, 
      error 
    });
    res.status(500).json({ error: 'Internal server error' });
    return; // Add explicit return
  }
});

// POST /admin/deprecated-users/:id/restore - Mark deprecated user as restorable
router.post('/deprecated-users/:id/restore', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    logger.info('Admin restoration request for deprecated user', { 
      deprecatedUserId: id, 
      adminId: req.user?.supabase_user_id 
    });

    const restorationResult = await UserDeletionServiceSimple.restoreDeprecatedUser(id);

    if (restorationResult.success) {
      res.json({
        success: true,
        message: restorationResult.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: restorationResult.message
      });
    }
  } catch (error) {
    logger.error('Error marking deprecated user as restorable', { 
      deprecatedUserId: req.params.id, 
      error 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/deprecated-users/search/:term - Search deprecated users
router.get('/deprecated-users/search/:term', async (req: express.Request, res: express.Response) => {
  try {
    const { term } = req.params;

    const searchResults = await UserDeletionServiceSimple.searchDeprecatedUsers(term);

    res.json({ searchTerm: term, results: searchResults });
  } catch (error) {
    logger.error('Error searching deprecated users', { searchTerm: req.params.term, error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/stats - Get system statistics
router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    const [
      { count: activeUsers },
      { count: deprecatedUsers },
      { count: totalLeads },
      { count: totalAssessments },
      { count: totalMeetings }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('deprecated_users').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('assessments').select('*', { count: 'exact', head: true }),
      supabase.from('meetings').select('*', { count: 'exact', head: true })
    ]);

    // Get deprecated data statistics
    const deprecatedStats = await UserDeletionServiceSimple.getDeprecatedDataStats();

    res.json({
      stats: {
        activeUsers: activeUsers || 0,
        deprecatedUsers: deprecatedUsers || 0,
        totalLeads: totalLeads || 0,
        totalAssessments: totalAssessments || 0,
        totalMeetings: totalMeetings || 0
      },
      deprecatedStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching admin stats', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/health - Admin endpoint health check
router.get('/health', (req: express.Request, res: express.Response) => {
      res.json({ 
      status: 'OK', 
      endpoint: 'admin',
      timestamp: new Date().toISOString(),
      adminId: req.user?.supabase_user_id
    });
});

export default router;
