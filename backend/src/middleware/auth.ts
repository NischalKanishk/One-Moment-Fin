import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

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
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // For development, allow any token that looks like a JWT
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Accepting any JWT token');
      
      // Check if it looks like a JWT (3 parts separated by dots)
      if (token.split('.').length === 3) {
        try {
          // Try to decode the JWT payload
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          console.log('Development: JWT payload:', payload);
          
          req.user = {
            id: payload.sub || 'dev-user-id',
            email: payload.email || 'dev@example.com',
            phone: payload.phone_number || '+91 99999 99999',
            role: 'mfd'
          };
          
          return next();
        } catch (decodeError) {
          console.log('Development: Failed to decode JWT, but allowing anyway');
          req.user = {
            id: 'dev-user-id',
            email: 'dev@example.com',
            phone: '+91 99999 99999',
            role: 'mfd'
          };
          return next();
        }
      }
    }
    
    // Production token verification (original logic)
    try {
      // Decode JWT token (this is a simplified approach)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      if (!payload.sub) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Set user information from token
      req.user = {
        id: payload.sub,
        email: payload.email,
        phone: payload.phone_number,
        role: 'mfd' // Default role, can be updated based on user data
      };

      return next();
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
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
