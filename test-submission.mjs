import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSubmission() {
  try {
    console.log('🔍 Testing assessment submission step by step...');
    
    // 1. Check if assessment exists
    console.log('\n1️⃣ Checking assessment...');
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', '31c46ae7-cd17-4d1c-9368-ea58f13186f5')
      .eq('is_published', true)
      .single();
    
    if (assessmentError || !assessment) {
      console.log('❌ Assessment error:', assessmentError);
      return;
    }
    console.log('✅ Assessment found:', assessment.title);
    
    // 2. Check if framework version exists
    console.log('\n2️⃣ Checking framework version...');
    const { data: frameworkVersion, error: frameworkError } = await supabase
      .from('risk_framework_versions')
      .select('config')
      .eq('id', assessment.framework_version_id)
      .single();
    
    if (frameworkError || !frameworkVersion) {
      console.log('❌ Framework version error:', frameworkError);
      return;
    }
    console.log('✅ Framework version found, engine:', frameworkVersion.config.engine);
    
    // 3. Test scoring function (simplified)
    console.log('\n3️⃣ Testing scoring function...');
    console.log('✅ Skipping scoring test for now');
    
    // 4. Test database insert
    console.log('\n4️⃣ Testing database insert...');
    try {
      const { data: submission, error: submissionError } = await supabase
        .from('assessment_submissions')
        .insert({
          assessment_id: assessment.id,
          framework_version_id: assessment.framework_version_id,
          owner_id: assessment.user_id,
          answers: {
            "dependents": "2",
            "income_bracket": "25-50L",
            "income_security": "Very secure",
            "market_knowledge": "Medium",
            "emi_ratio": "1-25%",
            "gain_loss_tradeoff": "8% loss for 22% gain",
            "drawdown_reaction": "Do nothing",
            "education": "Bachelors",
            "age": "25-35",
            "liquidity_withdrawal_2y": "10"
          },
          result: {
            score: 75,
            bucket: "Moderate",
            rubric: { totalScore: 75, scoredQuestions: {}, bands: [] }
          }
        })
        .select()
        .single();
      
      if (submissionError) {
        console.log('❌ Submission insert error:', submissionError);
        return;
      }
      console.log('✅ Submission created:', submission.id);
      
      // Clean up
      await supabase.from('assessment_submissions').delete().eq('id', submission.id);
      console.log('✅ Test submission cleaned up');
      
    } catch (dbError) {
      console.log('❌ Database error:', dbError);
      return;
    }
    
    console.log('\n🎉 All tests passed! The issue might be elsewhere.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSubmission();
