import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// GET /api/products
router.get('/', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { data: products, error } = await supabase
      .from('product_recommendations')
      .select('*')
      .or(`user_id.eq.${req.user!.supabase_user_id},visibility.eq.public`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Products fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    return res.json({ products });
  } catch (error) {
    console.error('Products fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products
router.post('/', authenticateUser, [
  body('title').notEmpty().withMessage('Product title is required'),
  body('risk_category').isIn(['low', 'medium', 'high']).withMessage('Valid risk category required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('amc_name').optional().isString().withMessage('AMC name must be a string'),
  body('product_type').optional().isIn(['equity', 'debt', 'hybrid', 'balanced']).withMessage('Valid product type required'),
  body('visibility').optional().isIn(['public', 'private']).withMessage('Valid visibility required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, risk_category, description, amc_name, product_type, visibility } = req.body;

    const { data, error } = await supabase
      .from('product_recommendations')
      .insert({
        user_id: req.user!.supabase_user_id,
        title,
        risk_category,
        description,
        amc_name,
        product_type,
        visibility: visibility || 'private',
        is_ai_generated: false
      })
      .select()
      .single();

    if (error) {
      console.error('Product creation error:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }

    return res.json({ product: data });
  } catch (error) {
    console.error('Product creation error:', error);
    return res.status(500).json({ error: 'Failed to create product' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('product_recommendations')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user!.supabase_user_id);

    if (error) {
      console.error('Product deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete product' });
    }

    return res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Product deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

// GET /api/products/recommended/:lead_id
router.get('/recommended/:lead_id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { lead_id } = req.params;

    // Get lead's risk assessment
    const { data: riskAssessment, error: riskError } = await supabase
      .from('risk_assessments')
      .select('risk_category')
      .eq('lead_id', lead_id)
      .eq('user_id', req.user!.supabase_user_id)
      .single();

    if (riskError || !riskAssessment) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    // Get recommended products for this risk category
    const { data: products, error } = await supabase
      .from('product_recommendations')
      .select('*')
      .eq('risk_category', riskAssessment.risk_category)
      .or(`user_id.eq.${req.user!.supabase_user_id},visibility.eq.public`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Recommended products fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch recommended products' });
    }

    return res.json({ products });
  } catch (error) {
    console.error('Recommended products fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch recommended products' });
  }
});

export default router;
