import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { UserMigrationService } from '../services/userMigration';
import { DefaultAssessmentService } from '../services/defaultAssessmentService';

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
    return res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/test - Test authentication endpoint
router.get('/test', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    return res.json({ 
      message: 'Authentication working',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: 'Test failed' });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const clerkId = req.user!.clerk_id;

    // Try to get user data from database
    let { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (error && error.code === 'PGRST116') {
      // User doesn't exist, create them with basic info
      
      // Handle phone field - convert empty string to null
      const phoneValue = req.user!.phone === '' ? null : req.user!.phone;
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: clerkId,
          full_name: req.user!.email?.split('@')[0] || 'New User',
          email: req.user!.email || null,
          phone: phoneValue,
          auth_provider: 'clerk',
          role: 'mfd',
          referral_link: `ref_${clerkId.slice(-8)}`,

        })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ error: 'Failed to create user profile' });
      }

      // Automatically create default assessment for new user
      try {
        await DefaultAssessmentService.createDefaultAssessment(newUser.id);
        } catch (assessmentError) {
        // Don't fail the user creation if assessment creation fails
        // The user can still use the system and create assessments manually
      }

      userData = newUser;
    } else if (error) {
      return res.status(500).json({ error: 'Failed to fetch user data from database' });
    }

    if (userData) {
      return res.json({ user: userData });
    }

    // If we still don't have user data, return error
    return res.status(404).json({ error: 'User not found in database' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get user data' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: express.Request, res: express.Response) => {
  // Clerk sessions are rotated by Clerk; endpoint kept for compatibility
  return res.status(501).json({ error: 'Not implemented with Clerk' });
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateUser, [
  body('full_name').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('phone').optional().isString().trim().custom((value) => {
    // If phone is provided, it must be between 10-15 characters
    // If phone is empty string or undefined, it's valid (will be treated as null)
    if (value === '' || value === undefined || value === null) {
      return true; // Valid - will be converted to null
    }
    if (value.length < 10 || value.length > 15) {
      throw new Error('Phone number must be between 10-15 characters');
    }
    return true;
  }),
  body('mfd_registration_number').optional().isString().trim().isLength({ max: 50 }),

], async (req:express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      );
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { full_name, phone, mfd_registration_number } = req.body;
    // Get the actual Clerk ID from the authenticated user
    const clerkId = req.user!.clerk_id;
    // Handle phone field - convert empty string to null
    const phoneValue = phone === '' ? null : phone;
    // First, check if user exists in database
    let { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // User doesn't exist, create them
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: clerkId,
          full_name: full_name || req.user!.email?.split('@')[0] || 'New User',
          email: req.user!.email || null,
          phone: phoneValue || req.user!.phone || null,
          mfd_registration_number: mfd_registration_number || null,
          auth_provider: 'clerk',
          role: 'mfd',
          referral_link: `ref_${clerkId.slice(-8)}`,

        })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ error: 'Failed to create user profile' });
      }

      existingUser = newUser;
    } else if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    } else {
      }

    // Prepare update data - only update fields that are provided
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phoneValue !== undefined) updateData.phone = phoneValue;
    if (mfd_registration_number !== undefined) updateData.mfd_registration_number = mfd_registration_number;

    // Now update the user profile
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('clerk_id', clerkId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Profile update failed' });
    }

    return res.json({ user: data });
  } catch (error) {
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
    return res.status(500).json({ error: 'Failed to fetch orphaned users' });
  }
});

// POST /api/auth/bulk-migrate (Admin endpoint to bulk migrate orphaned auth users)
router.post('/bulk-migrate', authenticateUser, [
  body('user_ids').isArray().withMessage('User IDs must be an array'),
  body('user_ids.*').isString().withMessage('Each user ID must be a string')
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

    const { user_ids } = req.body;

    const result = await UserMigrationService.bulkMigrateOrphanedUsers();

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Migration failed' });
  }
});

// Debug route to catch all requests
router.all('*', (req: express.Request, res: express.Response) => {
  if (req.method === 'OPTIONS') {
    // Handle preflight request
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.status(200).end();
  } else {
    res.status(405).json({ 
      error: 'Method not allowed',
      method: req.method,
      path: req.path,
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    });
  }
});

export default router;
