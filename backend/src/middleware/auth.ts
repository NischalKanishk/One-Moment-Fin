import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

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
            // Create a new user in the database
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                clerk_id: clerkUserId,
                full_name: payload.name || payload.full_name || 'New User',
                email: payload.email || payload.email_address || 'dev@example.com',
                phone: payload.phone_number || payload.phone || '+91 99999 99999',
                auth_provider: 'clerk',
                role: 'mfd'
              })
              .select('id, email, phone, role')
              .single();
            
            if (createError) {
              console.error('❌ Auth: Error creating new user:', createError);
              return res.status(500).json({ error: 'User creation failed' });
            }
            
            req.user = {
              clerk_id: clerkUserId,
              supabase_user_id: newUser.id,
              email: newUser.email,
              phone: newUser.phone,
              role: newUser.role
            };
          } else {
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
      // Decode JWT token
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      console.log('🔍 Auth: JWT payload received:', payload);
      
      if (!payload.sub) {
        console.error('❌ Auth: JWT missing "sub" field');
        return res.status(401).json({ error: 'Invalid token - missing sub field' });
      }

      // Look up the corresponding Supabase user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, phone, role')
        .eq('clerk_id', payload.sub)
        .single();
      
      if (userError && userError.code !== 'PGRST116') {
        console.error('❌ Auth: Error looking up user in database:', userError);
        return res.status(500).json({ error: 'Database lookup failed' });
      }
      
      if (!userData) {
        console.error('❌ Auth: User not found in database');
        return res.status(401).json({ error: 'User not found' });
      }

      // Set user information from token and database
      req.user = {
        clerk_id: payload.sub,
        supabase_user_id: userData.id,
        email: userData.email || payload.email || payload.email_address,
        phone: userData.phone || payload.phone_number || payload.phone,
        role: userData.role
      };

      console.log('✅ Auth: User authenticated:', req.user);
      return next();
    } catch (tokenError) {
      console.error('❌ Auth: Token verification error:', tokenError);
      return res.status(401).json({ error: 'Invalid token format' });
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
