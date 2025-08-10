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

// GET /api/auth/test - Test authentication endpoint
router.get('/test', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 Test endpoint called');
    console.log('Authenticated user:', req.user);
    
    return res.json({ 
      message: 'Authentication working',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
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
          settings: {}
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }

      userData = newUser;
    } else if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch user data from database' });
    }

    if (userData) {
      return res.json({ user: userData });
    }

    // If we still don't have user data, return error
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
  body('settings').optional().isObject()
], async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 Profile update request received');
    console.log('Request body:', req.body);
    console.log('Authenticated user:', req.user);
    console.log('User ID from auth middleware:', req.user?.clerk_id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { full_name, phone, settings } = req.body;
    console.log('🔍 Extracted data:', { full_name, phone, settings });
    
    // Get the actual Clerk ID from the authenticated user
    const clerkId = req.user!.clerk_id;
    console.log('🔍 Clerk ID from request:', clerkId);

    // Handle phone field - convert empty string to null
    const phoneValue = phone === '' ? null : phone;
    console.log('🔍 Phone value after processing:', phoneValue);

    // First, check if user exists in database
    console.log('🔍 Checking if user exists in database with clerk_id:', clerkId);
    let { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      console.log('📝 User does not exist, creating new user...');
      // User doesn't exist, create them
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: clerkId,
          full_name: full_name || req.user!.email?.split('@')[0] || 'New User',
          email: req.user!.email || null,
          phone: phoneValue || req.user!.phone || null,
          auth_provider: 'clerk',
          role: 'mfd',
          referral_link: `ref_${clerkId.slice(-8)}`,
          settings: settings || {}
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }

      console.log('✅ New user created successfully:', newUser);
      existingUser = newUser;
    } else if (fetchError) {
      console.error('❌ Error fetching user:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    } else {
      console.log('✅ Existing user found:', existingUser);
    }

    // Prepare update data - only update fields that are provided
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phoneValue !== undefined) updateData.phone = phoneValue;
    if (settings !== undefined) updateData.settings = settings;

    console.log('🔍 Update data prepared:', updateData);

    // Now update the user profile
    console.log('🚀 Updating user profile in database...');
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('clerk_id', clerkId)
      .select()
      .single();

    if (error) {
      console.error('❌ Profile update error:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return res.status(500).json({ error: 'Profile update failed' });
    }

    console.log('✅ Profile updated successfully:', data);
    return res.json({ user: data });
  } catch (error) {
    console.error('❌ Profile update error:', error);
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
