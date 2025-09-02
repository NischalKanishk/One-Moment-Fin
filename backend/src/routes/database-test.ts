import express from 'express';
import { supabase } from '../config/supabase';

const router = express.Router();

// Test endpoint to check if assessment_submissions table exists and works
router.get('/test-assessment-submissions', async (req: express.Request, res: express.Response) => {
  try {
    // Test 1: Check if table exists by trying to select from it
    const { data: testData, error: testError } = await supabase
      .from('assessment_submissions')
      .select('*')
      .limit(1);

    if (testError) {
      return res.json({
        tableExists: false,
        error: testError.message,
        code: testError.code,
        details: testError.details,
        hint: testError.hint
      });
    }

    // Test 2: Try to insert a test record
    const testSubmission = {
      owner_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      framework_version_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      answers: { test: 'data' },
      result: { score: 50, bucket: 'medium' },
      status: 'submitted'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('assessment_submissions')
      .insert(testSubmission)
      .select()
      .single();

    if (insertError) {
      return res.json({
        tableExists: true,
        canInsert: false,
        insertError: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      });
    }

    // Test 3: Clean up test data
    await supabase
      .from('assessment_submissions')
      .delete()
      .eq('id', insertData.id);

    return res.json({
      tableExists: true,
      canInsert: true,
      canDelete: true,
      testRecord: insertData,
      message: 'Assessment submissions table is working correctly'
    });

  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Database test failed',
      message: error.message 
    });
  }
});

export default router;
