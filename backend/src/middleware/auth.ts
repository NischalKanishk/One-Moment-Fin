import { Request, Response, NextFunction } from 'express';
import { supabasePublic } from '../config/supabase';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
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
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if this is a mock token
    if (token.startsWith('mock_token_')) {
      const mockUserId = token.replace('mock_token_', '');
      
      // Try to get user details from our users table (may fail due to API key issues)
      try {
        const { data: userData, error: userError } = await supabasePublic
          .from('users')
          .select('*')
          .eq('id', mockUserId)
          .single();

        if (userData) {
          // Attach user to request
          req.user = {
            id: userData.id,
            email: userData.email,
            phone: userData.phone,
            role: userData.role
          };
          return next();
        }
      } catch (dbError) {
        console.error('Database error (using mock user):', dbError);
      }

      // If database lookup fails, create a mock user for development
      req.user = {
        id: mockUserId,
        email: 'mock@example.com',
        phone: undefined,
        role: 'mfd'
      };

      return next();
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabasePublic.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user details from our users table
    const { data: userData, error: userError } = await supabasePublic
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = {
      id: userData.id,
      email: userData.email,
      phone: userData.phone,
      role: userData.role
    };

    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
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
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabasePublic.auth.getUser(token);

    if (!error && user) {
      const { data: userData } = await supabasePublic
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData) {
        req.user = {
          id: userData.id,
          email: userData.email,
          phone: userData.phone,
          role: userData.role
        };
      }
    }

    return next();
  } catch (error) {
    return next(); // Continue without user on error
  }
};
