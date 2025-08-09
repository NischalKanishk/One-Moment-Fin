import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { UserMigrationService } from '../services/userMigration';

const router = express.Router();

// POST /api/auth/login
// With Clerk, the frontend authenticates with Clerk directly.
// This endpoint is unused, but kept to avoid breaking clients; it validates a Clerk token and returns our user profile.
router.post('/login', async (_req: express.Request, res: express.Response) => {
  return res.status(501).json({ error: 'Auth disabled' });
});

// POST /api/auth/signup
router.post('/signup', async (_req: express.Request, res: express.Response) => {
  return res.status(501).json({ error: 'Auth disabled' });
});

// POST /api/auth/logout
router.post('/logout', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    return res.json({ message: 'Auth disabled' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    // Try to get user data from database (may fail due to API key issues)
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user!.id)
        .single();

      if (userData) {
        return res.json({ user: userData });
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to fetch user data from database' });
    }

    // If database fails or user not found, return error
    return res.status(404).json({ error: 'User not found in database' });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to get user data' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: express.Request, res: express.Response) => {
  // Clerk sessions are rotated by Clerk; endpoint kept for compatibility
  return res.status(501).json({ error: 'Not implemented with Clerk' });
});

// PUT /api/auth/profile
router.put('/profile', authenticateUser, [
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('phone').optional().isMobilePhone('en-IN').withMessage('Valid phone number required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, phone, settings } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({
        full_name,
        phone,
        settings
      })
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error?.message || 'Unknown error' });
    }

    return res.json({ user: data });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Profile update failed' });
  }
});

// POST /api/auth/migrate-user (Admin endpoint to migrate orphaned auth users)
router.post('/migrate-user', authenticateUser, [
  body('auth_user_id').notEmpty().withMessage('Auth user ID is required'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('role').optional().isIn(['mfd', 'admin']).withMessage('Valid role required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { auth_user_id, full_name, email, phone, role } = req.body;

    const result = await UserMigrationService.migrateAuthUser(auth_user_id, {
      full_name,
      email,
      phone,
      role
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.json(result);
  } catch (error) {
    console.error('User migration error:', error);
    return res.status(500).json({ error: 'Migration failed' });
  }
});

// GET /api/auth/orphaned-users (Admin endpoint to list orphaned auth users)
router.get('/orphaned-users', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await UserMigrationService.getOrphanedAuthUsers();

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.json(result);
  } catch (error) {
    console.error('Get orphaned users error:', error);
    return res.status(500).json({ error: 'Failed to get orphaned users' });
  }
});

// POST /api/auth/bulk-migrate (Admin endpoint to bulk migrate orphaned users)
router.post('/bulk-migrate', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await UserMigrationService.bulkMigrateOrphanedUsers();

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.json(result);
  } catch (error) {
    console.error('Bulk migration error:', error);
    return res.status(500).json({ error: 'Bulk migration failed' });
  }
});

export default router;
