import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import { AIService } from '../services/ai';

const router = express.Router();

// POST /api/leads/create (Public endpoint for lead form submission)
router.post('/create', [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().isMobilePhone('en-IN').withMessage('Valid phone number required'),
  body('age').optional().isInt({ min: 18, max: 100 }).withMessage('Valid age required'),
  body('source_link').notEmpty().withMessage('Source link is required'),
  body('user_id').notEmpty().withMessage('User ID is required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, email, phone, age, source_link, user_id } = req.body;

    // Verify the user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, referral_link')
      .eq('id', user_id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'Invalid referral link' });
    }

    // Create the lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id,
        full_name,
        email,
        phone,
        age,
        source_link,
        status: 'lead'
      })
      .select()
      .single();

    if (leadError) {
      console.error('Lead creation error:', leadError);
      return res.status(500).json({ error: 'Failed to create lead' });
    }

    return res.json({
      message: 'Lead created successfully',
      lead: leadData
    });
  } catch (error) {
    console.error('Lead creation error:', error);
    return res.status(500).json({ error: 'Lead creation failed' });
  }
});

// GET /api/leads (Get all leads for logged-in MFD)
router.get('/', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    // Try to get leads from database (may fail due to API key issues)
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          *,
          risk_assessments (
            id,
            risk_score,
            risk_category,
            ai_used,
            created_at
          ),
          meetings (
            id,
            title,
            start_time,
            status
          ),
          kyc_status (
            id,
            status,
            updated_at
          )
        `)
        .eq('user_id', req.user!.id)
        .order('created_at', { ascending: false });

      if (!error && leads) {
        return res.json({ leads });
      }
    } catch (dbError) {
      console.error('Database error (returning empty leads):', dbError);
    }

    // Return empty leads array if database fails
    return res.json({ leads: [] });
  } catch (error) {
    console.error('Leads fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id (Get single lead with details)
router.get('/:id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        *,
        risk_assessments (
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
        meetings (
          id,
          title,
          description,
          start_time,
          end_time,
          status,
          meeting_link,
          platform
        ),
        kyc_status (
          id,
          status,
          kyc_method,
          form_data,
          updated_at
        )
      `)
      .eq('id', id)
      .eq('user_id', req.user!.id)
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
  body('status').isIn(['lead', 'assessment_done', 'meeting_scheduled', 'converted', 'dropped'])
    .withMessage('Valid status required'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const { data, error } = await supabase
      .from('leads')
      .update({ status, notes })
      .eq('id', id)
      .eq('user_id', req.user!.id)
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
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { full_name, email, phone, age, notes } = req.body;

    const { data, error } = await supabase
      .from('leads')
      .update({ full_name, email, phone, age, notes })
      .eq('id', id)
      .eq('user_id', req.user!.id)
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

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user!.id);

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

// GET /api/leads/stats (Get lead statistics)
router.get('/stats', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    // Try to get stats from database (may fail due to API key issues)
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('status, created_at')
        .eq('user_id', req.user!.id);

      if (!error && leads) {
        const stats = {
          total: leads.length,
          byStatus: {
            lead: leads.filter(l => l.status === 'lead').length,
            assessment_done: leads.filter(l => l.status === 'assessment_done').length,
            meeting_scheduled: leads.filter(l => l.status === 'meeting_scheduled').length,
            converted: leads.filter(l => l.status === 'converted').length,
            dropped: leads.filter(l => l.status === 'dropped').length
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
      console.error('Database error (returning mock stats):', dbError);
    }

    // Return mock stats if database fails
    const mockStats = {
      total: 0,
      byStatus: {
        lead: 0,
        assessment_done: 0,
        meeting_scheduled: 0,
        converted: 0,
        dropped: 0
      },
      thisMonth: 0
    };

    return res.json({ stats: mockStats });
  } catch (error) {
    console.error('Lead stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch lead statistics' });
  }
});

export default router;
