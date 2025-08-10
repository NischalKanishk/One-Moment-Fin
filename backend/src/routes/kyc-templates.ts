import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { seedKYCTemplates, clearKYCTemplates } from '../services/seedKYCData';

const router = express.Router();

// GET /api/kyc-templates - Get all KYC templates for the authenticated user
router.get('/', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { data: templates, error } = await supabase
      .from('kyc_templates')
      .select('*')
      .eq('user_id', req.user!.supabase_user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('KYC templates fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch KYC templates' });
    }

    return res.json({ templates: templates || [] });
  } catch (error) {
    console.error('KYC templates fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch KYC templates' });
  }
});

// GET /api/kyc-templates/:id - Get a specific KYC template
router.get('/:id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const { data: template, error } = await supabase
      .from('kyc_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user!.supabase_user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'KYC template not found' });
      }
      console.error('KYC template fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch KYC template' });
    }

    return res.json({ template });
  } catch (error) {
    console.error('KYC template fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch KYC template' });
  }
});

// POST /api/kyc-templates - Create a new KYC template
router.post('/', authenticateUser, [
  body('name').notEmpty().withMessage('Template name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('fields').isArray().withMessage('Fields must be an array'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, fields, is_active = true } = req.body;

    const { data, error } = await supabase
      .from('kyc_templates')
      .insert({
        user_id: req.user!.supabase_user_id,
        name,
        description,
        fields,
        is_active
      })
      .select()
      .single();

    if (error) {
      console.error('KYC template creation error:', error);
      return res.status(500).json({ error: 'Failed to create KYC template' });
    }

    return res.status(201).json({ template: data });
  } catch (error) {
    console.error('KYC template creation error:', error);
    return res.status(500).json({ error: 'Failed to create KYC template' });
  }
});

// PUT /api/kyc-templates/:id - Update a KYC template
router.put('/:id', authenticateUser, [
  body('name').optional().notEmpty().withMessage('Template name cannot be empty'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('fields').optional().isArray().withMessage('Fields must be an array'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Remove user_id from update data to prevent unauthorized changes
    delete updateData.user_id;

    const { data, error } = await supabase
      .from('kyc_templates')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user!.supabase_user_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'KYC template not found' });
      }
      console.error('KYC template update error:', error);
      return res.status(500).json({ error: 'Failed to update KYC template' });
    }

    return res.json({ template: data });
  } catch (error) {
    console.error('KYC template update error:', error);
    return res.status(500).json({ error: 'Failed to update KYC template' });
  }
});

// DELETE /api/kyc-templates/:id - Delete a KYC template
router.delete('/:id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('kyc_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user!.supabase_user_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'KYC template not found' });
      }
      console.error('KYC template deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete KYC template' });
    }

    return res.json({ message: 'KYC template deleted successfully', template: data });
  } catch (error) {
    console.error('KYC template deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete KYC template' });
  }
});

// POST /api/kyc-templates/seed - Seed dummy KYC templates
router.post('/seed', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const result = await seedKYCTemplates(req.user.supabase_user_id);
    
    if (result.success) {
      return res.json({ 
        message: 'KYC templates seeded successfully', 
        results: result.results,
        summary: result.summary
      });
    } else {
      return res.status(500).json({ error: 'Failed to seed KYC templates', details: result.error });
    }
  } catch (error) {
    console.error('KYC templates seeding error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/kyc-templates/seed - Clear all KYC templates for the user
router.delete('/seed', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user?.supabase_user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const result = await clearKYCTemplates(req.user.supabase_user_id);
    
    if (result.success) {
      return res.json({ message: 'KYC templates cleared successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to clear KYC templates', details: result.error });
    }
  } catch (error) {
    console.error('KYC templates clearing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
