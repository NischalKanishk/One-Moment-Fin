import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';
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
    const clerkUserId = req.user!.clerk_id;

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
      
      user_id = (userData as { id: string }).id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    // Insert lead, enforce tenant isolation using RLS policies
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
    
    // Remove all non-digit characters
    const cleanPhone = value.replace(/\D/g, '');
    
    // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      return true;
    }
    
    // Check if it's a valid Indian mobile number with country code (12 digits starting with 91)
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91') && /^91[6-9]/.test(cleanPhone)) {
      return true;
    }
    
    // Check if it's a valid Indian mobile number with +91 (13 digits starting with +91)
    if (cleanPhone.length === 13 && cleanPhone.startsWith('91') && /^91[6-9]/.test(cleanPhone)) {
      return true;
    }
    
    return false;
  }).withMessage('Please enter a valid Indian mobile number (10 digits starting with 6, 7, 8, or 9)'),
  body('age').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    const age = parseInt(value);
    return !isNaN(age) && age >= 18 && age <= 100;
  }).withMessage('Age must be between 18 and 100'),
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('source_link').optional().isString().withMessage('Source link must be a string'),
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
    const { full_name, email, phone, age, user_id, source_link } = req.body;

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
        source_link: source_link || 'Link Submission', // Use provided source_link or default
        status: 'lead', // Default status
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
  query('sort_by').optional().isIn(['created_at', 'full_name', 'status', 'source_link']).withMessage('Invalid sort field'),
  query('sort_order').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('status').optional().isIn(['lead', 'assessment_done', 'meeting_scheduled', 'converted', 'dropped', 'halted', 'rejected']).withMessage('Invalid status filter'),
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search term too long'),
  query('source_link').optional().isString().isLength({ max: 100 }).withMessage('Source filter too long')
], async (req: express.Request, res: express.Response) => {
  console.log('🔍 Leads: Route handler reached for GET /api/leads');
  console.log('🔍 Leads: Request headers:', req.headers);
  console.log('🔍 Leads: Request user:', req.user);
  
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

    const clerkUserId = req.user!.clerk_id;
    console.log('🔍 Leads: Fetching leads for clerk user:', clerkUserId);

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      console.log('🔍 Leads: Looking up user in database with clerk_id:', clerkUserId);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        console.error('❌ Leads: User lookup failed:', userError);
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = (userData as { id: string }).id;
      console.log('✅ Leads: User found in database with ID:', user_id);
    } catch (error) {
      console.error('❌ Leads: User lookup error:', error);
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

    console.log('🔍 Leads: Query parameters:', { page, limit, sortBy, sortOrder, statusFilter, searchTerm, user_id });

    // Try to get leads from database using RLS policies
    try {
      // Get the JWT token from the request headers
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7); // Remove 'Bearer ' prefix
      
      if (!token) {
        throw new Error('No JWT token available');
      }

      console.log('🔍 Leads: JWT token received, length:', token.length);

      // For now, use service role to bypass RLS policy issues
      // TODO: Fix RLS policies to work with user JWT tokens
      console.log('🔍 Leads: Using service role to bypass RLS issues temporarily');
      
      let query = supabase
        .from('leads')
        .select(`
          id,
          full_name,
          email,
          phone,
          age,
          risk_category,
          status,
          source_link,
          created_at,
          risk_profile_id,
          risk_bucket,
          risk_score
        `, { count: 'exact' })
        .eq('user_id', user_id); // Filter by user_id manually since we're using service role

      // Apply filters
      if (statusFilter) {
        query = query.eq('status', statusFilter);
        console.log('🔍 Leads: Applied status filter:', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
        console.log('🔍 Leads: Applied search filter:', searchTerm);
      }

      // Apply source filter
      const sourceFilter = req.query.source_link as string;
      if (sourceFilter) {
        query = query.eq('source_link', sourceFilter);
        console.log('🔍 Leads: Applied source filter:', sourceFilter);
      }

      // Apply sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      console.log('🔍 Leads: Query prepared, executing database query with service role...');
      console.log('🔍 Leads: Final query parameters:', { sortBy, sortOrder, offset, limit, user_id });
      
      const { data: leads, error, count } = await query;

      if (error) {
        console.error('❌ Leads: Database query error:', error);
        console.error('❌ Leads: Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ Leads: Database query successful. Found leads:', leads?.length || 0);
      console.log('✅ Leads: Total count:', count);

      if (leads && leads.length > 0) {
        console.log('🔍 Leads: Sample lead data:', leads[0]);
      }

      const totalPages = Math.ceil((count || 0) / limit);
      
      return res.json({ 
        leads: leads || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (dbError) {
      console.error('❌ Leads: Database error:', dbError);
      return res.status(500).json({ 
        error: 'Database query failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
  } catch (error) {
    console.error('❌ Leads: Unexpected error:', error);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/stats (Get lead statistics)
router.get('/stats', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const clerkUserId = req.user!.clerk_id;

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
      
      user_id = (userData as { id: string }).id;
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

// Test route to verify routing is working
router.get('/test', (req: express.Request, res: express.Response) => {
  console.log('🔍 Backend: Test route hit');
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// Check if lead already exists by email or phone (for preventing duplicate submissions)
router.post('/check-existing', [
  body('email').optional().isEmail().withMessage('Email must be valid'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('user_id').notEmpty().withMessage('User ID is required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, phone, user_id } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ 
        error: 'Either email or phone is required' 
      });
    }

    // Check if lead with same email or phone already exists for this user
    let existingLead = null;
    
    if (email) {
      const { data: emailLead, error: emailError } = await supabase
        .from('leads')
        .select('id, full_name, email, phone, status, created_at, risk_profile_id, risk_bucket, risk_score')
        .eq('user_id', user_id)
        .eq('email', email)
        .single();

      if (!emailError && emailLead) {
        existingLead = emailLead;
      }
    }

    if (!existingLead && phone) {
      const { data: phoneLead, error: phoneError } = await supabase
        .from('leads')
        .select('id, full_name, email, phone, status, created_at, risk_profile_id, risk_bucket, risk_score')
        .eq('user_id', user_id)
        .eq('phone', phone)
        .single();

      if (!phoneError && phoneLead) {
        existingLead = phoneLead;
      }
    }

    if (existingLead) {
      // Check if they have completed an assessment
      let assessmentData = null;
      if (existingLead.risk_profile_id) {
        try {
          const { data: submission, error: submissionError } = await supabase
            .from('assessment_submissions')
            .select(`
              id,
              answers,
              result,
              submitted_at
            `)
            .eq('id', existingLead.risk_profile_id)
            .single();

          if (!submissionError && submission) {
            assessmentData = {
              submission,
              hasAssessment: true,
              riskScore: existingLead.risk_score,
              riskBucket: existingLead.risk_bucket
            };
          }
        } catch (error) {
          console.log('Could not fetch assessment data for existing lead');
        }
      }

      return res.json({
        exists: true,
        lead: existingLead,
        assessment: assessmentData,
        message: 'Lead already exists'
      });
    }

    return res.json({
      exists: false,
      message: 'No existing lead found'
    });

  } catch (error) {
    console.error('Check existing lead error:', error);
    return res.status(500).json({ error: 'Failed to check existing lead' });
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
    const clerkUserId = req.user!.clerk_id;

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
      
      user_id = (userData as { id: string }).id;
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
    const clerkUserId = req.user!.clerk_id;

    // Get the actual user UUID from the users table using the Clerk ID
    let user_id;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError || !userData) {
        console.error('User lookup failed:', userError);
        throw new Error('User not found. Please complete your profile first.');
      }
      
      user_id = (userData as { id: string }).id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    console.log('🔍 Backend: Querying lead with ID:', id, 'for user:', user_id);
    
    // Use service role to bypass RLS policy issues temporarily
    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        id,
        full_name,
        email,
        phone,
        age,
        risk_category,
        status,
        source_link,
        created_at,
        risk_profile_id,
        risk_bucket,
        risk_score,
        notes
      `)
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (error || !lead) {
      console.error('Lead query failed:', error);
      return res.status(404).json({ error: 'Lead not found' });
    }

    // If lead has a risk profile, fetch the assessment submission details
    let assessmentData = null;
    if (lead.risk_profile_id) {
      try {
        const { data: submission, error: submissionError } = await supabase
          .from('assessment_submissions')
          .select(`
            id,
            assessment_id,
            framework_version_id,
            answers,
            result,
            submitted_at
          `)
          .eq('id', lead.risk_profile_id)
          .single();

        if (!submissionError && submission) {
          // Get the assessment details to understand the framework
          const { data: assessment, error: assessmentError } = await supabase
            .from('assessments')
            .select(`
              id,
              title,
              framework_version_id
            `)
            .eq('id', submission.assessment_id)
            .single();

          if (!assessmentError && assessment) {
            // Get the framework questions to map answers
            const { data: frameworkQuestions, error: questionsError } = await supabase
              .from('framework_question_map')
              .select(`
                qkey,
                required,
                order_index,
                question_bank!inner (
                  label,
                  qtype,
                  options,
                  module
                )
              `)
              .eq('framework_version_id', assessment.framework_version_id)
              .order('order_index', { ascending: true });

            if (!questionsError && frameworkQuestions) {
              assessmentData = {
                submission,
                assessment,
                questions: frameworkQuestions,
                mappedAnswers: frameworkQuestions.map((q: any) => {
                  // Get the answer value, handling different possible formats
                  let answerValue = submission.answers[q.qkey];
                  
                  // If no direct match, try alternative keys or formats
                  if (!answerValue || answerValue === 'Not answered') {
                    const possibleKeys = [
                      q.qkey,
                      q.question_bank?.label,
                      q.question_bank?.label?.toLowerCase().replace(/\s+/g, '_'),
                      q.question_bank?.label?.toLowerCase().replace(/\s+/g, '-'),
                      typeof q.qkey === 'number' ? q.qkey.toString() : null,
                      q.qkey?.toString().toLowerCase(),
                      q.qkey?.toString().toUpperCase()
                    ].filter(Boolean); // Remove null/undefined values
                    
                    for (const key of possibleKeys) {
                      if (key && submission.answers[key]) {
                        answerValue = submission.answers[key];
                        console.log(`🔍 Found answer for ${q.qkey} using key: ${key}`);
                        break;
                      }
                    }
                  }
                  
                  // If still no answer, try to find any answer that might match this question
                  if (!answerValue || answerValue === 'Not answered') {
                    const questionText = q.question_bank?.label || q.qkey;
                    if (questionText) {
                      for (const [answerKey, answerVal] of Object.entries(submission.answers)) {
                        if (answerKey.toLowerCase().includes(questionText.toLowerCase()) || 
                            questionText.toLowerCase().includes(answerKey.toLowerCase())) {
                          answerValue = answerVal;
                          console.log(`🔍 Found answer for ${q.qkey} using fuzzy match: ${answerKey}`);
                          break;
                        }
                      }
                    }
                  }
                  
                  // If still no answer, check if it's a required field that might be empty
                  if (!answerValue || answerValue === 'Not answered') {
                    if (q.required) {
                      answerValue = 'Required field - No response provided';
                    } else {
                      answerValue = 'No response provided';
                    }
                  }
                  
                  console.log(`🔍 Final answer for ${q.qkey}: ${answerValue}`);
                  
                  return {
                    question: q.question_bank?.label || q.qkey,
                    answer: answerValue,
                    type: q.question_bank?.qtype,
                    options: q.question_bank?.options,
                    module: q.question_bank?.module
                  };
                })
              };
              
              // Fallback to show raw answers if no mapped answers found
              if (assessmentData.mappedAnswers.every(qa => qa.answer === 'No response provided' || qa.answer === 'Required field - No response provided')) {
                console.log('⚠️ No mapped answers found, showing raw answers');
                assessmentData.mappedAnswers = Object.entries(submission.answers).map(([key, value]) => ({
                  question: key,
                  answer: value,
                  type: 'unknown',
                  options: null,
                  module: 'Raw Data'
                }));
              }
              
              // Fallback to show data structure info if no answers at all
              if (assessmentData.mappedAnswers.length === 0) {
                console.log('⚠️ No answers found at all, showing data structure info');
                assessmentData.mappedAnswers = [{
                  question: 'Data Structure Information',
                  answer: `Submission ID: ${submission.id}, Answers object keys: ${Object.keys(submission.answers).join(', ')}`,
                  type: 'info',
                  options: null,
                  module: 'Debug Info'
                }];
              }
            }
          }
        }
      } catch (assessmentError) {
        console.log('Could not fetch assessment data:', assessmentError);
        // Continue without assessment data
      }
    }

    return res.json({ 
      lead: {
        ...lead,
        assessment: assessmentData
      }
    });
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
    const clerkUserId = req.user!.clerk_id;

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
      
      user_id = (userData as { id: string }).id;
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
  body('age').optional().isInt({ min: 18, max: 100 }).withMessage('Valid age required'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('cfa_goals').optional().isLength({ max: 1000 }).withMessage('CFA goals cannot exceed 1000 characters'),
  body('cfa_min_investment').optional().isLength({ max: 100 }).withMessage('CFA min investment cannot exceed 100 characters'),
  body('cfa_investment_horizon').optional().isIn(['short_term', 'medium_term', 'long_term']).withMessage('Invalid investment horizon value')
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
    const { full_name, email, phone, age, notes, cfa_goals, cfa_min_investment, cfa_investment_horizon } = req.body;
    const clerkUserId = req.user!.clerk_id;

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
      
      user_id = (userData as { id: string }).id;
    } catch (error) {
      console.error('User lookup error:', error);
      return res.status(400).json({ error: error instanceof Error ? error.message : 'User lookup failed' });
    }

    const { data, error } = await supabase
      .from('leads')
      .update({ 
        full_name, 
        email, 
        phone, 
        age, 
        notes, 
        cfa_goals, 
        cfa_min_investment, 
        cfa_investment_horizon 
      })
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
    const clerkUserId = req.user!.clerk_id;

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
      
      user_id = (userData as { id: string }).id;
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

// Debug endpoint to test database connectivity and table structure
router.get('/debug', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const clerkUserId = req.user!.clerk_id;
    console.log('🔍 Debug: Testing database connectivity for user:', clerkUserId);

    const results: any = {};

    // Test 1: Check if user exists
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, clerk_id, full_name')
        .eq('clerk_id', clerkUserId)
        .single();

      if (userError) {
        results.user_lookup = { error: userError.message, code: userError.code };
      } else {
        results.user_lookup = { success: true, user: userData };
      }
    } catch (error) {
      results.user_lookup = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test 2: Check if leads table exists and has data
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, full_name, created_at')
        .limit(5);

      if (leadsError) {
        results.leads_query = { error: leadsError.message, code: leadsError.code };
      } else {
        results.leads_query = { success: true, count: leadsData?.length || 0, sample: leadsData?.[0] };
      }
    } catch (error) {
      results.leads_query = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test 3: Check if new schema tables exist
    try {
      const { data: formsData, error: formsError } = await supabase
        .from('assessment_forms')
        .select('id, name')
        .limit(1);

      if (formsError) {
        results.assessment_forms = { error: formsError.message, code: formsError.code };
      } else {
        results.assessment_forms = { success: true, exists: true };
      }
    } catch (error) {
      results.assessment_forms = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

          // Test 4: Check RLS policies
      try {
        const { data: policiesData, error: policiesError } = await supabase
          .rpc('get_rls_status', { table_name: 'leads' });

        if (policiesError) {
          results.rls_status = { error: policiesError.message, code: policiesError.code };
        } else {
          results.rls_status = { success: true, data: policiesData };
        }
      } catch (error) {
        results.rls_status = { error: error instanceof Error ? error.message : 'Unknown error' };
      }

    console.log('🔍 Debug: Results:', results);
    return res.json({ debug: results });

  } catch (error) {
    console.error('❌ Debug: Unexpected error:', error);
    return res.status(500).json({ error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
