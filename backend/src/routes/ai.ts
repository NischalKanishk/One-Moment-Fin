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
    return res.status(500).json({ error: 'AI risk scoring failed' });
  }
});

// POST /api/ai/generate-scoring
router.post('/generate-scoring', authenticateUser, [
  body('questions').isArray().withMessage('Questions must be an array'),
  body('questions.*.title').isString().withMessage('Question title must be a string'),
  body('questions.*.type').isString().withMessage('Question type must be a string'),
  body('questions.*.options').optional().isArray().withMessage('Question options must be an array')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { questions } = req.body;

    const scoringConfig = await AIService.generateScoringConfig(questions);

    return res.json({ scoring: scoringConfig });
  } catch (error) {
    return res.status(500).json({ error: 'AI scoring generation failed' });
  }
});

export default router;
