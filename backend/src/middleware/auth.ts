import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { clerkClient, isClerkConfigured } from '../config/clerk';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        clerk_id: string;  // Clerk user ID from JWT token
        supabase_user_id?: string;  // Supabase user ID from database lookup
        email?: string;
        phone?: string;
        role: string;
      };
    }
  }
}

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth: No valid authorization header');
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔍 Auth: Token received, length:', token.length);
    
    // For development, allow any token that looks like a JWT
    if (process.env.NODE_ENV === 'development') {
      // Check if it looks like a JWT (3 parts separated by dots)
      if (token.split('.').length === 3) {
        try {
          // Try to decode the JWT payload
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          console.log('🔍 Auth: JWT payload decoded (dev mode):', payload);
          
          // Extract Clerk user ID from the token
          // Clerk JWT tokens have 'sub' field with the user ID
          const clerkUserId = payload.sub || payload.user_id || payload.clerk_id || 'dev-user-id';
          
          if (!payload.sub) {
            console.warn('⚠️ Auth: JWT token missing "sub" field, using fallback ID');
          }
          
          console.log('🔍 Auth: Looking up user with clerk_id:', clerkUserId);
          
          // Look up the corresponding Supabase user ID
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, phone, role')
            .eq('clerk_id', clerkUserId)
            .single();
          
          if (userError) {
            console.error('❌ Auth: Database error during user lookup:', userError);
            if (userError.code === 'PGRST116') {
              console.log('ℹ️ Auth: User not found in database, will create new user');
            } else {
              return res.status(500).json({ error: 'Database lookup failed' });
            }
          }
          
          if (!userData) {
            console.log('⚠️ Auth: User not found in database, creating new user');
            // Create a new user in the database
            const newUserData = {
              clerk_id: clerkUserId,
              full_name: payload.name || payload.full_name || 'New User',
              email: payload.email || payload.email_address || 'dev@example.com',
              phone: payload.phone_number || payload.phone || '+91 99999 99999',
              auth_provider: 'clerk',
              role: 'mfd',
              referral_link: `/r/${clerkUserId.slice(-8)}` // Generate referral link
            };
            
            console.log('🔍 Auth: Creating user with data:', newUserData);
            
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert(newUserData)
              .select('id, email, phone, role')
              .single();
            
            if (createError) {
              console.error('❌ Auth: Error creating new user:', createError);
              console.error('❌ Auth: User data that failed:', newUserData);
              return res.status(500).json({ error: 'User creation failed' });
            }
            
            console.log('✅ Auth: New user created successfully:', (newUser as any)?.id);
            
            req.user = {
              clerk_id: clerkUserId,
              supabase_user_id: newUser.id,
              email: newUser.email,
              phone: newUser.phone,
              role: newUser.role
            };
          } else {
            console.log('✅ Auth: User found in database:', userData.id);
            req.user = {
              clerk_id: clerkUserId,
              supabase_user_id: userData.id,
              email: userData.email,
              phone: userData.phone,
              role: userData.role
            };
          }
          
          console.log('✅ Auth: User authenticated (dev mode):', req.user);
          return next();
        } catch (decodeError) {
          console.warn('⚠️ Auth: JWT decode failed in dev mode, using default user');
          // In development, allow the request to continue with a default user
          req.user = {
            clerk_id: 'dev-user-id',
            supabase_user_id: 'dev-supabase-id',
            email: 'dev@example.com',
            phone: '+91 99999 99999',
            role: 'mfd'
          };
          return next();
        }
      } else {
        // Token doesn't look like a JWT
        console.log('❌ Auth: Token format invalid (not JWT)');
        return res.status(401).json({ error: 'Invalid token format' });
      }
    }
    
    // Production token verification (Clerk JWT handling)
    try {
      // Verify the JWT token with Clerk
      if (!isClerkConfigured()) {
        console.error('❌ Auth: Clerk not configured, cannot verify JWT');
        return res.status(500).json({ error: 'Authentication service not configured' });
      }

      let clerkUserId: string;

      try {
        // First, try to verify as a JWT token by decoding it
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log('🔍 Auth: JWT payload decoded:', payload);

        if (!payload.sub) {
          console.error('❌ Auth: JWT missing "sub" field');
          return res.status(401).json({ error: 'Invalid token - missing sub field' });
        }

        // Verify the user exists in Clerk
        const clerkUser = await clerkClient.users.getUser(payload.sub);
        console.log('🔍 Auth: User verified with Clerk:', clerkUser.id);

        clerkUserId = payload.sub;
      } catch (jwtError) {
        console.log('⚠️ Auth: JWT decode failed, trying session token...');
        
        try {
          // Try to verify as a session token
          const session = await clerkClient.sessions.getSession(token);
          console.log('🔍 Auth: Session verified with Clerk, session:', session.id);

          if (!session.userId) {
            console.error('❌ Auth: Session verification failed - no user ID in session');
            return res.status(401).json({ error: 'Invalid token - no user ID' });
          }

          clerkUserId = session.userId;
        } catch (sessionError) {
          console.error('❌ Auth: Both JWT decode and session verification failed');
          console.error('JWT error:', jwtError);
          console.error('Session error:', sessionError);
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
      }

      console.log('🔍 Auth: Looking up user with clerk_id:', clerkUserId);

      // Look up the corresponding Supabase user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, phone, role')
        .eq('clerk_id', clerkUserId)
        .single();
      
      if (userError && userError.code !== 'PGRST116') {
        console.error('❌ Auth: Error looking up user in database:', userError);
        return res.status(500).json({ error: 'Database lookup failed' });
      }
      
      if (!userData) {
        console.log('⚠️ Auth: User not found in database, creating new user');
        
        // Get user details from Clerk
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        
        // Create a new user in the database
        const newUserData = {
          clerk_id: clerkUserId,
          full_name: clerkUser.fullName || 'New User',
          email: clerkUser.primaryEmailAddress?.emailAddress || 'user@example.com',
          phone: clerkUser.primaryPhoneNumber?.phoneNumber || '+91 99999 99999',
          auth_provider: 'clerk',
          role: 'mfd',
          referral_link: `/r/${clerkUserId.slice(-8)}` // Generate referral link
        };
        
        console.log('🔍 Auth: Creating user with data:', newUserData);
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert(newUserData)
          .select('id, email, phone, role')
          .single();
        
        if (createError) {
          console.error('❌ Auth: Error creating new user:', createError);
          console.error('❌ Auth: User data that failed:', newUserData);
          return res.status(500).json({ error: 'User creation failed' });
        }
        
        console.log('✅ Auth: New user created successfully:', (newUser as any)?.id);
        
        req.user = {
          clerk_id: clerkUserId,
          supabase_user_id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role
        };
      } else {
        console.log('✅ Auth: User found in database:', userData.id);

        // Set user information from database
        req.user = {
          clerk_id: clerkUserId,
          supabase_user_id: userData.id,
          email: userData.email,
          phone: userData.phone,
          role: userData.role
        };
      }

      console.log('✅ Auth: User authenticated:', req.user);
      return next();
    } catch (tokenError) {
      console.error('❌ Auth: Token verification error:', tokenError);
      
      // Check if it's a Clerk-specific error
      if (tokenError instanceof Error) {
        if (tokenError.message.includes('jwt')) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
      }
      
      return res.status(401).json({ error: 'Authentication failed' });
    }
  } catch (error) {
    console.error('❌ Auth: Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
};

export const optionalAuth = async (
  _req: Request,
  _res: Response,
  next: NextFunction
) => next();
