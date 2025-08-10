import express from 'express';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// GET /api/subscription/plans
router.get('/plans', async (req: express.Request, res: express.Response) => {
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_per_month', { ascending: true });

    if (error) {
      console.error('Plans fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch plans' });
    }

    return res.json({ plans });
  } catch (error) {
    console.error('Plans fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// GET /api/subscription/current
router.get('/current', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          name,
          price_per_month,
          lead_limit,
          ai_enabled,
          custom_form_enabled,
          product_edit_enabled,
          kyc_enabled,
          meeting_limit
        )
      `)
      .eq('user_id', req.user!.supabase_user_id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Current subscription fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch current subscription' });
    }

    return res.json({ subscription: subscription || null });
  } catch (error) {
    console.error('Current subscription fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch current subscription' });
  }
});

// POST /api/subscription/start
router.post('/start', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    // Verify plan exists
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Deactivate current subscription
    await supabase
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('user_id', req.user!.supabase_user_id)
      .eq('is_active', true);

    // Create new subscription
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: req.user!.supabase_user_id,
        subscription_plan_id: plan_id,
        start_date: new Date().toISOString().split('T')[0],
        is_active: true,
        payment_status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Subscription creation error:', error);
      return res.status(500).json({ error: 'Failed to create subscription' });
    }

    return res.json({ subscription });
  } catch (error) {
    console.error('Subscription start error:', error);
    return res.status(500).json({ error: 'Failed to start subscription' });
  }
});

export default router;
