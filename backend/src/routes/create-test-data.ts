import express from 'express';
import { supabase } from '../config/supabase';

const router = express.Router();

// Create test data for assessment submissions
router.post('/create-test-assessment', async (req: express.Request, res: express.Response) => {
  try {
    const { owner_id, lead_id } = req.body;
    
    if (!owner_id) {
      return res.status(400).json({ error: 'owner_id is required' });
    }

    // First, check if the user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', owner_id)
      .single();

    if (userError || !user) {
      return res.status(400).json({ 
        error: 'User not found',
        owner_id,
        userError: userError?.message 
      });
    }

    // Create a test assessment submission
    const testSubmission = {
      owner_id: owner_id,
      lead_id: lead_id || null,
      framework_version_id: null, // Allow null for now
      answers: {
        primary_goal: 'retirement',
        investment_horizon: '10-15 years',
        age: '35',
        income: '50000-75000',
        market_experience: 'moderate',
        volatility_comfort: 'somewhat comfortable',
        return_expectation: '8-12%'
      },
      result: {
        score: 65,
        bucket: 'medium',
        rubric: {
          capacity: 70,
          tolerance: 60,
          need: 65
        }
      },
      status: 'submitted'
    };

    const { data: submission, error: submissionError } = await supabase
      .from('assessment_submissions')
      .insert(testSubmission)
      .select()
      .single();

    if (submissionError) {
      return res.status(500).json({
        error: 'Failed to create test assessment submission',
        details: submissionError.message,
        code: submissionError.code
      });
    }

    return res.json({
      success: true,
      submission,
      message: 'Test assessment submission created successfully'
    });

  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Failed to create test data',
      message: error.message 
    });
  }
});

export default router;
