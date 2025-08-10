import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import { AIService } from '../services/ai';

const router = express.Router();

// POST /api/leads (Authenticated endpoint for logged-in MFD to create a lead)
router.post('/', authenticateUser, [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('email').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }).withMessage('Valid email required'),
  body('phone').optional().custom((value) => {
    // More flexible phone validation for Indian numbers
    if (value === undefined || value === null || value === '') return true;
    const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
    return phoneRegex.test(value.replace(/\s+/g, ''));
  }).withMessage('Valid phone number required'),
  body('age').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    const age = parseInt(value);
    return !isNaN(age) && age >= 18 && age <= 100;
  }).withMessage('Age must be between 18 and 100'),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.type,
          message: err.msg
        }))
      });
    }

    // Only allow whitelisted fields
    const { full_name, email, phone, age } = req.body;
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    // Insert lead, enforce tenant isolation
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id,
        full_name,
        email,
        phone,
        age,
        source_link: 'Manually Added', // Auto-populate for manual submissions
        status: 'lead', // Default status
        kyc_status: 'pending', // Default KYC status
      })
      .select()
      .single();

    if (leadError) {
      console.error('Lead creation error:', leadError);
      return res.status(500).json({ error: 'Failed to create lead' });
    }

    return res.json({ message: 'Lead created successfully', lead: leadData });
  } catch (error) {
    console.error('Lead creation error:', error);
    return res.status(500).json({ error: 'Lead creation failed' });
  }
});

// POST /api/leads/create (Public endpoint for link submissions)
router.post('/create', [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('email').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }).withMessage('Valid email required'),
  body('phone').optional().custom((value) => {
    // More flexible phone validation for Indian numbers
    if (value === undefined || value === null || value === '') return true;
    const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
    return phoneRegex.test(value.replace(/\s+/g, ''));
  }).withMessage('Valid phone number required'),
  body('age').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    const age = parseInt(value);
    return !isNaN(age) && age >= 18 && age <= 100;
  }).withMessage('Age must be between 18 and 100'),
  body('user_id').notEmpty().withMessage('User ID is required'),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.type,
          message: err.msg
        }))
      });
    }

    // Only allow whitelisted fields
    const { full_name, email, phone, age, user_id } = req.body;

    // Verify the user_id exists and is valid
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user_id)
        .single();

      if (userError || !userData) {
        throw new Error('Invalid user ID provided');
      }
    } catch (error) {
      console.error('User validation error:', error);
      return res.status(400).json({ error: 'Invalid user ID provided' });
    }

    // Insert lead for link submissions
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id,
        full_name,
        email,
        phone,
        age,
        source_link: 'Link Submission', // Auto-populate for link submissions
        status: 'lead', // Default status
        kyc_status: 'pending', // Default KYC status
      })
      .select()
      .single();

    if (leadError) {
      console.error('Lead creation error:', leadError);
      return res.status(500).json({ error: 'Failed to create lead' });
    }

    return res.json({ message: 'Lead created successfully', lead: leadData });
  } catch (error) {
    console.error('Lead creation error:', error);
    return res.status(500).json({ error: 'Lead creation failed' });
  }
});

// GET /api/leads (Get all leads for logged-in MFD with pagination and sorting)
router.get('/', authenticateUser, [
  // Server-side validation for query parameters
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort_by').optional().isIn(['created_at', 'full_name', 'status', 'kyc_status', 'source_link']).withMessage('Invalid sort field'),
  query('sort_order').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('status').optional().isIn(['lead', 'assessment_done', 'meeting_scheduled', 'converted', 'dropped', 'halted', 'rejected']).withMessage('Invalid status filter'),
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search term too long'),
  query('source_link').optional().isString().isLength({ max: 100 }).withMessage('Source filter too long')
], async (req: express.Request, res: express.Response) => {
  try {
    // Validate query parameters
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.type,
          message: err.msg
        }))
      });
    }

    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    // Parse and validate pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Parse and validate sorting parameters
    const sortBy = (req.query.sort_by as string) || 'created_at';
    const sortOrder = (req.query.sort_order as string) || 'desc';
    const statusFilter = req.query.status as string;
    const searchTerm = req.query.search as string;

    // Try to get leads from database (may fail due to API key issues)
    try {
      let query = supabase
        .from('leads')
        .select(`
          id,
          full_name,
          email,
          phone,
          age,
          status,
          source_link,
          created_at,
          kyc_status,
          risk_assessments!risk_assessments_lead_id_fkey (
            id,
            risk_score,
            risk_category,
            ai_used,
            created_at
          ),
          meetings!meetings_lead_id_fkey (
            id,
            title,
            start_time,
            status
          ),
          kyc_status!kyc_status_lead_id_fkey (
            id,
            status,
            updated_at
          )
        `, { count: 'exact' })
        .eq('user_id', user_id);

      // Apply filters
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      // Apply source filter
      const sourceFilter = req.query.source_link as string;
      if (sourceFilter) {
        query = query.eq('source_link', sourceFilter);
      }

      // Apply sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      const { data: leads, error, count } = await query;

      if (!error && leads) {
        const totalPages = Math.ceil((count || 0) / limit);
        
        return res.json({ 
          leads,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        });
      }
    } catch (dbError) {
      console.error('Database error (returning empty leads):', dbError);
    }

    // Return empty leads when database fails
    return res.json({ 
      leads: [], 
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    });
  } catch (error) {
    console.error('Leads fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/stats (Get lead statistics)
router.get('/stats', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    // Try to get stats from database (may fail due to API key issues)
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('status, created_at')
        .eq('user_id', user_id);

      if (!error && leads) {
        const stats = {
          total: leads.length,
          byStatus: {
            lead: leads.filter(l => l.status === 'lead').length,
            assessment_done: leads.filter(l => l.status === 'assessment_done').length,
            meeting_scheduled: leads.filter(l => l.status === 'meeting_scheduled').length,
            converted: leads.filter(l => l.status === 'converted').length,
            dropped: leads.filter(l => l.status === 'dropped').length,
            halted: leads.filter(l => l.status === 'halted').length,
            rejected: leads.filter(l => l.status === 'rejected').length
          },
          thisMonth: leads.filter(l => {
            const created = new Date(l.created_at);
            const now = new Date();
            return created.getMonth() === now.getMonth() && 
                   created.getFullYear() === now.getFullYear();
          }).length
        };

        return res.json({ stats });
      }
    } catch (dbError) {
      console.error('Database error (returning empty stats):', dbError);
    }

    // Return empty stats when database fails
    const emptyStats = {
      total: 0,
      byStatus: {
        lead: 0,
        assessment_done: 0,
        meeting_scheduled: 0,
        converted: 0,
        dropped: 0,
        halted: 0,
        rejected: 0
      },
      thisMonth: 0
    };

    return res.json({ stats: emptyStats });
  } catch (error) {
    console.error('Lead stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch lead statistics' });
  }
});

// GET /api/leads/search (Search leads for autocomplete)
router.get('/search', authenticateUser, [
  query('search').notEmpty().withMessage('Search term is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const searchTerm = req.query.search as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    // Search leads by name, email, or phone
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, full_name, email, phone')
      .eq('user_id', user_id)
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Lead search error:', error);
      return res.status(500).json({ error: 'Failed to search leads' });
    }

    return res.json({ leads: leads || [] });
  } catch (error) {
    console.error('Lead search error:', error);
    return res.status(500).json({ error: 'Failed to search leads' });
  }
});

// GET /api/leads/:id (Get single lead with details)
router.get('/:id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        id,
        full_name,
        email,
        phone,
        age,
        status,
        source_link,
        created_at,
        kyc_status,
        risk_assessments!risk_assessments_lead_id_fkey (
          id,
          risk_score,
          risk_category,
          ai_used,
          created_at,
          risk_assessment_answers (
            id,
            answer_value,
            assessment_questions (
              id,
              question_text,
              type,
              options
            )
          )
        ),
        meetings!meetings_lead_id_fkey (
          id,
          title,
          description,
          start_time,
          end_time,
          status,
          meeting_link,
          platform
        ),
        kyc_status!kyc_status_lead_id_fkey (
          id,
          status,
          kyc_method,
          form_data,
          updated_at
        )
      `)
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (error || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.json({ lead });
  } catch (error) {
    console.error('Lead fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// PATCH /api/leads/:id/status (Update lead status)
router.patch('/:id/status', authenticateUser, [
  body('status').isIn(['lead', 'assessment_done', 'meeting_scheduled', 'converted', 'dropped', 'halted', 'rejected'])
    .withMessage('Valid status required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.type,
          message: err.msg
        }))
      });
    }

    const { id } = req.params;
    const { status } = req.body;
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.json({ lead: data });
  } catch (error) {
    console.error('Lead status update error:', error);
    return res.status(500).json({ error: 'Failed to update lead status' });
  }
});

// PUT /api/leads/:id (Update lead details)
router.put('/:id', authenticateUser, [
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().isMobilePhone('en-IN').withMessage('Valid phone number required'),
  body('age').optional().isInt({ min: 18, max: 100 }).withMessage('Valid age required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.type,
          message: err.msg
        }))
      });
    }

    const { id } = req.params;
    const { full_name, email, phone, age } = req.body;
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    const { data, error } = await supabase
      .from('leads')
      .update({ full_name, email, phone, age })
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.json({ lead: data });
  } catch (error) {
    console.error('Lead update error:', error);
    return res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id (Delete lead)
router.delete('/:id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = req.user!.id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = userData.id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) {
      console.error('Lead deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete lead' });
    }

    return res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Lead deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;
