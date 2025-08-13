import express from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { UserDeletionServiceSimple } from '../services/userDeletionServiceSimple';
import { logger } from '../services/logger';
import { supabase } from '../config/supabase';

const router = express.Router();

// Clerk webhook signature verification middleware
const verifyClerkWebhook = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Get the webhook secret from environment
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.error('CLERK_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Get the signature from headers
    const signature = req.headers['svix-signature'] as string;
    const timestamp = req.headers['svix-timestamp'] as string;
    const id = req.headers['svix-id'] as string;

    if (!signature || !timestamp || !id) {
      logger.error('Missing required webhook headers', { headers: req.headers });
      return res.status(400).json({ error: 'Missing required webhook headers' });
    }

    // For production, you should verify the webhook signature using Clerk's SDK
    // For now, we'll do basic validation
    const body = JSON.stringify(req.body);
    const expectedSignature = `v1,${timestamp},${id},${webhookSecret}`;
    
    // In production, use proper cryptographic verification
    // This is a simplified version for development
    if (signature !== expectedSignature) {
      logger.warn('Webhook signature verification failed', { 
        received: signature, 
        expected: expectedSignature 
      });
      
      // In development, allow invalid signatures for testing
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Development mode: Allowing invalid signature for testing');
      } else {
        // In production, reject invalid signatures
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    // Call next() to continue to the next middleware/route handler
    next();
    return; // Add explicit return to satisfy TypeScript
  } catch (error) {
    logger.error('Webhook verification error', { error });
    return res.status(500).json({ error: 'Webhook verification failed' });
  }
};

// Apply webhook verification to all Clerk webhook routes EXCEPT test endpoint
router.use('/test', (req, res, next) => {
  // Skip webhook verification for test endpoint in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  // In production, still verify webhooks
  verifyClerkWebhook(req, res, next);
});

// Apply webhook verification to all other Clerk webhook routes
router.use(verifyClerkWebhook);

// POST /webhooks/clerk - Main Clerk webhook endpoint
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const { type, data } = req.body;

    logger.info('Received Clerk webhook', { type, userId: data?.id });

    switch (type) {
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      
      case 'user.created':
        await handleUserCreated(data);
        break;
      
      default:
        logger.info('Unhandled webhook type', { type });
    }

    return res.json({ received: true, processed: true });
  } catch (error) {
    logger.error('Error processing Clerk webhook', { error, body: req.body });
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle user deletion from Clerk
async function handleUserDeleted(data: any) {
  try {
    const clerkUserId = data.id;
    
    if (!clerkUserId) {
      logger.error('No user ID in deletion webhook', { data });
      return;
    }

    logger.info('Processing user deletion from Clerk', { clerkUserId });

    // Find the user in our database by clerk_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('clerk_id', clerkUserId)
      .single();

    if (userError || !user) {
      logger.warn('User not found in database for deletion', { clerkUserId, error: userError });
      return;
    }

    logger.info('User found in database, proceeding with simplified deletion', { 
      clerkUserId, 
      userId: user.id, 
      userEmail: user.email 
    });

    // Use the simplified UserDeletionServiceSimple to handle the deletion
    const deletionResult = await UserDeletionServiceSimple.deleteUser(
      user.id, 
      'clerk_webhook_deletion'
    );

    if (deletionResult.success) {
      logger.info('User successfully deleted and data migrated to single deprecated table', {
        clerkUserId,
        userId: user.id,
        deprecatedUserId: deletionResult.deprecatedUserId,
        migratedDataCount: deletionResult.migratedDataCount
      });
    } else {
      logger.error('Failed to delete user and migrate data', {
        clerkUserId,
        userId: user.id,
        error: deletionResult.message
      });
    }

  } catch (error) {
    logger.error('Error handling user deletion webhook', { error, data });
  }
}

// Handle user updates from Clerk
async function handleUserUpdated(data: any) {
  try {
    const clerkUserId = data.id;
    
    if (!clerkUserId) {
      logger.error('No user ID in update webhook', { data });
      return;
    }

    logger.info('Processing user update from Clerk', { clerkUserId });

    // Find the user in our database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single();

    if (userError || !user) {
      logger.warn('User not found in database for update', { clerkUserId, error: userError });
      return;
    }

    // Update user information if needed
    // For now, we'll just log the update
    logger.info('User update processed', { clerkUserId, userId: user.id });

  } catch (error) {
    logger.error('Error handling user update webhook', { error, data });
  }
}

// Handle user creation from Clerk
async function handleUserCreated(data: any) {
  try {
    const clerkUserId = data.id;
    
    if (!clerkUserId) {
      logger.error('No user ID in creation webhook', { data });
      return;
    }

    logger.info('Processing user creation from Clerk', { clerkUserId });

    // Get user details from Clerk
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.getUser(clerkUserId);
    } catch (clerkError) {
      logger.error('Failed to get user details from Clerk', { clerkUserId, error: clerkError });
      return;
    }

    // Extract user data from Clerk
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
    const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber || null;
    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
    const profileImageUrl = clerkUser.imageUrl || '';

    // Generate unique referral link
    const referralLink = `r/${clerkUserId.slice(0, 8)}`;
    const assessmentLink = `/assessment/${clerkUserId.slice(0, 8)}`;

    // Create user in Supabase with all required fields
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_id: clerkUserId,
        full_name: fullName,
        email: email,
        phone: phone,
        mfd_registration_number: null, // Will be updated later if provided
        auth_provider: 'clerk',
        referral_link: referralLink,
        profile_image_url: profileImageUrl,

        role: 'mfd'
      })
      .select()
      .single();

    if (userError) {
      logger.error('Failed to create user in Supabase', { clerkUserId, error: userError });
      return;
    }

    logger.info('User created successfully in Supabase', { 
      clerkUserId, 
      userId: newUser.id,
      email,
      fullName
    });



    // Create default assessment for new user
    try {
      const { AssessmentService } = await import('../services/assessmentService');
      const defaultAssessment = await AssessmentService.createDefaultAssessment(newUser.id);
      
      logger.info('Default assessment created for new user', {
        clerkUserId,
        userId: newUser.id,
        assessmentId: defaultAssessment.id,
        slug: defaultAssessment.slug
      });
    } catch (assessmentError) {
      logger.error('Failed to create default assessment for new user', {
        clerkUserId,
        userId: newUser.id,
        error: assessmentError
      });
    }

  } catch (error) {
    logger.error('Error handling user creation webhook', { error, data });
  }
}

// GET /webhooks/clerk/health - Health check for webhook endpoint
router.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'OK', 
    endpoint: 'clerk-webhooks',
    timestamp: new Date().toISOString()
  });
});

// POST /webhooks/clerk/test - Test endpoint for development
router.post('/test', (req: express.Request, res: express.Response) => {
  logger.info('Test webhook endpoint called', { body: req.body, headers: req.headers });
  res.json({ 
    message: 'Test webhook received',
    timestamp: new Date().toISOString(),
    body: req.body
  });
});

export default router;
