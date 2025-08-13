import express from 'express';
import { supabase } from '../config/supabase';

const router = express.Router();

// POST /webhooks/stripe
router.post('/stripe', async (req: express.Request, res: express.Response) => {
  try {
    // Verify webhook signature (implement based on Stripe docs)
    const { type, data } = req.body;

    if (type === 'invoice.payment_succeeded') {
      // Handle successful payment
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .update({ payment_status: 'active' })
        .eq('payment_ref_id', data.object.id)
        .select()
        .single();

      if (error) {
        console.error('Stripe webhook error:', error);
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /webhooks/google
router.post('/google', async (req: express.Request, res: express.Response) => {
  try {
    // Handle Google Calendar webhooks
    const { event } = req.body;

    if (event.type === 'event.created') {
      // Handle new calendar event
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          external_event_id: event.id,
          platform: 'google',
          meeting_link: event.hangoutLink,
          title: event.summary,
          description: event.description,
          start_time: event.start.dateTime,
          end_time: event.end.dateTime,
          status: 'scheduled',
          is_synced: true
        })
        .select()
        .single();

      if (error) {
        console.error('Google webhook error:', error);
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Google webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
