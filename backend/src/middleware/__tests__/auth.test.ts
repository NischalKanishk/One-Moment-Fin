import { Request, Response, NextFunction } from 'express';
import { authenticateUser } from '../auth';

// Mock the supabase config
jest.mock('../../config/supabase', () => ({
  supabase: {}
}));

describe('Authentication Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('authenticateUser', () => {
    it('should reject requests without authorization header', async () => {
      await authenticateUser(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No valid authorization header' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests without Bearer prefix', async () => {
      req.headers!.authorization = 'InvalidToken';

      await authenticateUser(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No valid authorization header' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid JWT token in development mode', async () => {
      // Mock environment to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Create a valid JWT-like token
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ 
        sub: 'user123', 
        email: 'test@example.com',
        phone_number: '+91 99999 99999'
      })).toString('base64');
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      req.headers!.authorization = `Bearer ${token}`;

      await authenticateUser(req as Request, res as Response, next);

      expect(req.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        phone: '+91 99999 99999',
        role: 'mfd'
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle JWT tokens missing sub field in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ 
        email: 'test@example.com' // Missing sub field
      })).toString('base64');
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      req.headers!.authorization = `Bearer ${token}`;

      await authenticateUser(req as Request, res as Response, next);

      expect(req.user).toEqual({
        id: 'dev-user-id', // Fallback ID used
        email: 'test@example.com',
        phone: '+91 99999 99999',
        role: 'mfd'
      });
      expect(next).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should use default user for invalid JWT in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const invalidToken = 'invalid.jwt.token';
      req.headers!.authorization = `Bearer ${invalidToken}`;

      await authenticateUser(req as Request, res as Response, next);

      expect(req.user).toEqual({
        id: 'dev-user-id',
        email: 'dev@example.com',
        phone: '+91 99999 99999',
        role: 'mfd'
      });
      expect(next).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should reject non-JWT tokens in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      req.headers!.authorization = 'Bearer simple-token';

      await authenticateUser(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token format' });
      expect(next).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle production JWT tokens with valid sub field', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ 
        sub: 'clerk_user_123',
        email: 'prod@example.com',
        phone_number: '+91 88888 88888'
      })).toString('base64');
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      req.headers!.authorization = `Bearer ${token}`;

      await authenticateUser(req as Request, res as Response, next);

      expect(req.user).toEqual({
        id: 'clerk_user_123',
        email: 'prod@example.com',
        phone: '+91 88888 88888',
        role: 'mfd'
      });
      expect(next).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should reject production JWT tokens without sub field', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ 
        email: 'prod@example.com' // Missing sub field
      })).toString('base64');
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      req.headers!.authorization = `Bearer ${token}`;

      await authenticateUser(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token - missing sub field' });
      expect(next).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle malformed JWT tokens in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      req.headers!.authorization = 'Bearer invalid.malformed.token';

      await authenticateUser(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token format' });
      expect(next).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock console.error to avoid noise in tests
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Force an error by making headers undefined
      req.headers = undefined;

      await authenticateUser(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
      expect(next).not.toHaveBeenCalled();

      // Restore console.error
      console.error = originalConsoleError;
    });

    it('should extract user info from various JWT payload formats', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Test with email_address instead of email
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ 
        sub: 'user123',
        email_address: 'test@example.com', // Different field name
        phone: '+91 77777 77777' // Different field name
      })).toString('base64');
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      req.headers!.authorization = `Bearer ${token}`;

      await authenticateUser(req as Request, res as Response, next);

      expect(req.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        phone: '+91 77777 77777',
        role: 'mfd'
      });
      expect(next).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
