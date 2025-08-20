const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAPIResponse() {
  console.log('🔍 Testing production API response...');
  
  // Get a lead ID
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, full_name')
    .limit(1);
  
  if (leadsError || !leads || leads.length === 0) {
    console.error('❌ No leads found:', leadsError);
    return;
  }
  
  const leadId = leads[0].id;
  console.log(`✅ Testing with lead: ${leads[0].full_name} (${leadId})`);
  
  // Simulate the exact backend query
  const { data: leadData, error: leadError } = await supabase
    .from('leads')
    .select(`
      id,
      full_name,
      email,
      phone,
      age,
      risk_category,
      status,
      source_link,
      created_at,
      risk_profile_id,
      risk_bucket,
      risk_score,
      notes
    `)
    .eq('id', leadId)
    .single();
  
  if (leadError) {
    console.error('❌ Lead query failed:', leadError);
    return;
  }
  
  // Get assessment submissions
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
    console.error('❌ Submissions query failed:', submissionsError);
    return;
  }
  
  // Simulate the exact API response structure
  const apiResponse = {
    lead: {
      ...leadData,
      assessment_submissions: submissions || []
    }
  };
  
  console.log('\n🔍 API Response Structure:');
  console.log('Lead ID:', apiResponse.lead.id);
  console.log('Lead Name:', apiResponse.lead.full_name);
  console.log('Assessment Submissions Count:', apiResponse.lead.assessment_submissions?.length || 0);
  
  if (apiResponse.lead.assessment_submissions && apiResponse.lead.assessment_submissions.length > 0) {
    const submission = apiResponse.lead.assessment_submissions[0];
    console.log('✅ First Submission:');
    console.log('  - ID:', submission.id);
    console.log('  - Answers Count:', Object.keys(submission.answers || {}).length);
    console.log('  - Result Score:', submission.result?.score);
    console.log('  - Result Bucket:', submission.result?.bucket);
    console.log('  - Sample Answer:', Object.entries(submission.answers || {})[0]);
  } else {
    console.log('❌ No assessment submissions found');
  }
  
  console.log('\n🔍 Full Response (truncated):');
  console.log(JSON.stringify(apiResponse, null, 2).substring(0, 1000) + '...');
}

testAPIResponse().catch(console.error);
