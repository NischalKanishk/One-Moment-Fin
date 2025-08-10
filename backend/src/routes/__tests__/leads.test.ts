import request from 'supertest';
import express from 'express';
import { supabase } from '../../config/supabase';
import leadsRouter from '../leads';
import { authenticateUser } from '../../middleware/auth';

// Mock the supabase client
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }
}));

// Mock the auth middleware
jest.mock('../../middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/leads', leadsRouter);

const mockAuthenticateUser = authenticateUser as jest.MockedFunction<typeof authenticateUser>;

describe('Leads API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication by default
    mockAuthenticateUser.mockImplementation(async (req, res, next) => {
      req.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        phone: '+91 99999 99999',
        role: 'mfd'
      };
      next();
    });
  });

  describe('POST /api/leads', () => {
    it('should create a lead with valid data', async () => {
      const mockLeadData = {
        id: 'test-lead-id',
        user_id: 'test-user-id',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        age: 30,
        source_link: 'website',
        notes: 'Test notes',
        status: 'lead',
        kyc_status: 'pending',
        created_at: '2023-01-01T00:00:00Z'
      };

      const mockSupabaseResponse = {
        data: mockLeadData,
        error: null
      };

      // Mock the supabase chain
      const mockSingle = jest.fn().mockResolvedValue(mockSupabaseResponse);
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const leadData = {
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        age: 30,
        source_link: 'website',
        notes: 'Test notes',
        status: 'lead',
        kyc_status: 'pending'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(200);

      expect(response.body.message).toBe('Lead created successfully');
      expect(response.body.lead).toEqual(mockLeadData);
      expect(mockFrom).toHaveBeenCalledWith('leads');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        age: 30,
        source_link: 'website',
        notes: 'Test notes',
        status: 'lead',
        kyc_status: 'pending'
      });
    });

    it('should require authentication', async () => {
      // Mock failed authentication
      mockAuthenticateUser.mockImplementation(async (req, res, next) => {
        return res.status(401).json({ error: 'No valid authorization header' });
      });

      const leadData = {
        full_name: 'John Doe',
        source_link: 'website'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(401);

      expect(response.body.error).toBe('No valid authorization header');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/leads')
        .send({})
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Full name is required' }),
          expect.objectContaining({ msg: 'Source link is required' })
        ])
      );
    });

    it('should validate email format', async () => {
      const leadData = {
        full_name: 'John Doe',
        email: 'invalid-email',
        source_link: 'website'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Valid email required' })
        ])
      );
    });

    it('should validate phone number format', async () => {
      const leadData = {
        full_name: 'John Doe',
        phone: '123', // Invalid phone
        source_link: 'website'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Valid phone number required' })
        ])
      );
    });

    it('should validate age range', async () => {
      const leadData = {
        full_name: 'John Doe',
        age: 15, // Below minimum
        source_link: 'website'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Valid age required' })
        ])
      );
    });

    it('should validate status enum', async () => {
      const leadData = {
        full_name: 'John Doe',
        source_link: 'website',
        status: 'invalid-status'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Invalid status' })
        ])
      );
    });

    it('should validate kyc_status enum', async () => {
      const leadData = {
        full_name: 'John Doe',
        source_link: 'website',
        kyc_status: 'invalid-kyc-status'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Invalid KYC status' })
        ])
      );
    });

    it('should limit notes length', async () => {
      const leadData = {
        full_name: 'John Doe',
        source_link: 'website',
        notes: 'a'.repeat(1001) // Exceeds 1000 char limit
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Notes must be a string (max 1000 chars)' })
        ])
      );
    });

    it('should handle database errors', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: { message: 'Database error' }
      };

      const mockSingle = jest.fn().mockResolvedValue(mockSupabaseResponse);
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const leadData = {
        full_name: 'John Doe',
        source_link: 'website'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(500);

      expect(response.body.error).toBe('Failed to create lead');
    });

    it('should enforce tenant isolation (user_id set correctly)', async () => {
      const mockLeadData = {
        id: 'test-lead-id',
        user_id: 'test-user-id',
        full_name: 'John Doe',
        source_link: 'website',
        status: 'lead',
        kyc_status: 'pending'
      };

      const mockSupabaseResponse = {
        data: mockLeadData,
        error: null
      };

      const mockSingle = jest.fn().mockResolvedValue(mockSupabaseResponse);
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const leadData = {
        full_name: 'John Doe',
        source_link: 'website',
        user_id: 'malicious-user-id' // This should be ignored
      };

      await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(200);

      // Verify that the user_id from the token is used, not from request body
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id' // From auth token, not request body
        })
      );
    });
  });

  describe('GET /api/leads', () => {
    it('should return leads for authenticated user only', async () => {
      const mockLeadsData = [
        {
          id: 'lead-1',
          user_id: 'test-user-id',
          full_name: 'John Doe',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const mockSupabaseResponse = {
        data: mockLeadsData,
        error: null
      };

      const mockOrder = jest.fn().mockResolvedValue(mockSupabaseResponse);
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const response = await request(app)
        .get('/api/leads')
        .expect(200);

      expect(response.body.leads).toEqual(mockLeadsData);
      expect(mockFrom).toHaveBeenCalledWith('leads');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user-id');
    });

    it('should require authentication for listing leads', async () => {
      mockAuthenticateUser.mockImplementation(async (req, res, next) => {
        return res.status(401).json({ error: 'No valid authorization header' });
      });

      const response = await request(app)
        .get('/api/leads')
        .expect(401);

      expect(response.body.error).toBe('No valid authorization header');
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: { message: 'Database connection failed' }
      };

      const mockOrder = jest.fn().mockResolvedValue(mockSupabaseResponse);
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const response = await request(app)
        .get('/api/leads')
        .expect(200);

      // Should return empty array when database fails
      expect(response.body.leads).toEqual([]);
    });
  });

  describe('GET /api/leads/:id', () => {
    it('should return specific lead for authenticated user', async () => {
      const mockLeadData = {
        id: 'test-lead-id',
        user_id: 'test-user-id',
        full_name: 'John Doe',
        email: 'john@example.com'
      };

      const mockSupabaseResponse = {
        data: mockLeadData,
        error: null
      };

      const mockSingle = jest.fn().mockResolvedValue(mockSupabaseResponse);
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const response = await request(app)
        .get('/api/leads/test-lead-id')
        .expect(200);

      expect(response.body.lead).toEqual(mockLeadData);
      expect(mockEq1).toHaveBeenCalledWith('id', 'test-lead-id');
      expect(mockEq2).toHaveBeenCalledWith('user_id', 'test-user-id');
    });

    it('should return 404 for non-existent lead', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: { message: 'No rows returned' }
      };

      const mockSingle = jest.fn().mockResolvedValue(mockSupabaseResponse);
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const response = await request(app)
        .get('/api/leads/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Lead not found');
    });

    it('should enforce tenant isolation (only return user\'s leads)', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: { message: 'No rows returned' }
      };

      const mockSingle = jest.fn().mockResolvedValue(mockSupabaseResponse);
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await request(app)
        .get('/api/leads/other-user-lead-id')
        .expect(404);

      // Verify that both id and user_id are checked
      expect(mockEq1).toHaveBeenCalledWith('id', 'other-user-lead-id');
      expect(mockEq2).toHaveBeenCalledWith('user_id', 'test-user-id');
    });
  });

  describe('DELETE /api/leads/:id', () => {
    it('should delete lead for authenticated user', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: null
      };

      const mockEq2 = jest.fn().mockResolvedValue(mockSupabaseResponse);
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete });
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const response = await request(app)
        .delete('/api/leads/test-lead-id')
        .expect(200);

      expect(response.body.message).toBe('Lead deleted successfully');
      expect(mockEq1).toHaveBeenCalledWith('id', 'test-lead-id');
      expect(mockEq2).toHaveBeenCalledWith('user_id', 'test-user-id');
    });

    it('should enforce tenant isolation on delete', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: null
      };

      const mockEq2 = jest.fn().mockResolvedValue(mockSupabaseResponse);
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete });
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await request(app)
        .delete('/api/leads/other-user-lead-id')
        .expect(200);

      // Verify tenant isolation is enforced
      expect(mockEq1).toHaveBeenCalledWith('id', 'other-user-lead-id');
      expect(mockEq2).toHaveBeenCalledWith('user_id', 'test-user-id');
    });
  });
});
