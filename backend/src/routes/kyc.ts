import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// GET /api/kyc/:lead_id
router.get('/:lead_id', authenticateUser, async (req: express.Request, res: express.Response) => {
  try {
    const { lead_id } = req.params;

    const { data: kyc, error } = await supabase
      .from('kyc_status')
      .select('*')
      .eq('lead_id', lead_id)
      .eq('user_id', req.user!.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('KYC fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch KYC status' });
    }

    return res.json({ kyc: kyc || null });
  } catch (error) {
    console.error('KYC fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

// POST /api/kyc/upload
router.post('/upload', authenticateUser, [
  body('lead_id').notEmpty().withMessage('Lead ID is required'),
  body('kyc_method').isIn(['manual_entry', 'file_upload', 'third_party_api']).withMessage('Valid KYC method required'),
  body('form_data').optional().isObject().withMessage('Form data must be an object'),
  body('kyc_file_url').optional().isURL().withMessage('Valid file URL required')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lead_id, kyc_method, form_data, kyc_file_url } = req.body;

    const { data, error } = await supabase
      .from('kyc_status')
      .upsert({
        lead_id,
        user_id: req.user!.id,
        kyc_method,
        form_data,
        kyc_file_url,
        status: 'submitted'
      })
      .select()
      .single();

    if (error) {
      console.error('KYC upload error:', error);
      return res.status(500).json({ error: 'Failed to upload KYC' });
    }

    return res.json({ kyc: data });
  } catch (error) {
    console.error('KYC upload error:', error);
    return res.status(500).json({ error: 'Failed to upload KYC' });
  }
});

// PATCH /api/kyc/:lead_id/status
router.patch('/:lead_id/status', authenticateUser, [
  body('status').isIn(['not_started', 'in_progress', 'submitted', 'verified', 'rejected']).withMessage('Valid status required'),
  body('verified_by').optional().isString().withMessage('Verified by must be a string')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lead_id } = req.params;
    const { status, verified_by } = req.body;

    const { data, error } = await supabase
      .from('kyc_status')
      .update({ status, verified_by })
      .eq('lead_id', lead_id)
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'KYC status not found' });
    }

    return res.json({ kyc: data });
  } catch (error) {
    console.error('KYC status update error:', error);
    return res.status(500).json({ error: 'Failed to update KYC status' });
  }
});

export default router;
