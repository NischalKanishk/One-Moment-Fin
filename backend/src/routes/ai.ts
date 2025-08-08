import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateUser } from '../middleware/auth';
import { AIService } from '../services/ai';

const router = express.Router();

// POST /api/ai/risk-score
router.post('/risk-score', authenticateUser, [
  body('answers').isArray().withMessage('Answers must be an array'),
  body('lead_age').optional().isInt().withMessage('Lead age must be a number')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { answers, lead_age } = req.body;

    const result = await AIService.assessRisk(answers, lead_age);

    return res.json(result);
  } catch (error) {
    console.error('AI risk scoring error:', error);
    return res.status(500).json({ error: 'AI risk scoring failed' });
  }
});

// POST /api/ai/suggest-products
router.post('/suggest-products', authenticateUser, [
  body('risk_category').isIn(['low', 'medium', 'high']).withMessage('Valid risk category required'),
  body('lead_age').optional().isInt().withMessage('Lead age must be a number')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { risk_category, lead_age } = req.body;

    const products = await AIService.suggestProducts(risk_category, lead_age);

    return res.json({ products });
  } catch (error) {
    console.error('AI product suggestion error:', error);
    return res.status(500).json({ error: 'AI product suggestion failed' });
  }
});

export default router;
