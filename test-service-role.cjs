const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testServiceRole() {
  console.log('🔍 Testing service role access to assessment_submissions...');
  
  const leadId = '2a74fc2b-b054-4278-a0ca-340f7d82a71f';
  
  try {
    // Test with service role (this is what the backend should be using)
    const { data: submissions, error: submissionsError } = await supabase
      .from('assessment_submissions')
      .select(`
        id,
        assessment_id,
        framework_version_id,
        answers,
        result,
        submitted_at,
        status
      `)
      .eq('lead_id', leadId);
    
    if (submissionsError) {
      console.error('❌ Service role query failed:', submissionsError);
      return;
    }
    
    console.log('✅ Service role query successful:');
    console.log(`  - Found ${submissions?.length || 0} submissions`);
    
    if (submissions && submissions.length > 0) {
      submissions.forEach((sub, index) => {
        console.log(`  Submission ${index + 1}:`);
        console.log(`    ID: ${sub.id}`);
        console.log(`    Answers count: ${sub.answers ? Object.keys(sub.answers).length : 0}`);
        console.log(`    Result: ${JSON.stringify(sub.result)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Service role test failed:', error);
  }
}

testServiceRole().catch(console.error);
