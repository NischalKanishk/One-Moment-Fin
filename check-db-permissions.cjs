const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDBPermissions() {
  console.log('🔍 Checking database permissions and data access...');
  
  // Test with the specific lead ID from the logs
  const leadId = '2a74fc2b-b054-4278-a0ca-340f7d82a71f';
  const userId = 'a4a0f0c8-bfe2-4a0a-be10-0f3759a46b3f';
  
  console.log(`✅ Testing with Lead ID: ${leadId}`);
  console.log(`✅ User ID: ${userId}`);
  
  // 1. Check if the lead exists
  console.log('\n🔍 1. Checking lead data...');
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
  
  if (leadError) {
    console.error('❌ Lead query failed:', leadError);
    return;
  }
  
  console.log('✅ Lead found:', {
    id: lead.id,
    full_name: lead.full_name,
    user_id: lead.user_id,
    status: lead.status,
    risk_profile_id: lead.risk_profile_id
  });
  
  // 2. Check if assessment submissions exist for this lead
  console.log('\n🔍 2. Checking assessment submissions...');
  const { data: submissions, error: submissionsError } = await supabase
    .from('assessment_submissions')
    .select('*')
    .eq('lead_id', leadId);
  
  if (submissionsError) {
    console.error('❌ Submissions query failed:', submissionsError);
    return;
  }
  
  console.log(`✅ Assessment submissions found: ${submissions?.length || 0}`);
  if (submissions && submissions.length > 0) {
    submissions.forEach((sub, index) => {
      console.log(`  Submission ${index + 1}:`);
      console.log(`    ID: ${sub.id}`);
      console.log(`    Lead ID: ${sub.lead_id}`);
      console.log(`    Owner ID: ${sub.owner_id}`);
      console.log(`    Answers count: ${sub.answers ? Object.keys(sub.answers).length : 0}`);
      console.log(`    Result: ${JSON.stringify(sub.result)}`);
    });
  }
  
  // 3. Check RLS policies
  console.log('\n🔍 3. Checking RLS policies...');
  try {
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_rls_policies', { table_name: 'assessment_submissions' });
    
    if (policiesError) {
      console.log('⚠️ Could not fetch RLS policies:', policiesError.message);
    } else {
      console.log('✅ RLS policies for assessment_submissions:');
      policies?.forEach((policy, index) => {
        console.log(`  Policy ${index + 1}: ${policy.policyname}`);
        console.log(`    Command: ${policy.cmd}`);
        console.log(`    Roles: ${policy.roles}`);
        console.log(`    Qual: ${policy.qual}`);
      });
    }
  } catch (error) {
    console.log('⚠️ RLS policy check failed:', error.message);
  }
  
  // 4. Test the exact query the backend makes
  console.log('\n🔍 4. Testing backend query simulation...');
  const { data: backendQuery, error: backendError } = await supabase
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
  
  if (backendError) {
    console.error('❌ Backend query simulation failed:', backendError);
  } else {
    console.log(`✅ Backend query simulation successful: ${backendQuery?.length || 0} results`);
    if (backendQuery && backendQuery.length > 0) {
      console.log('  Sample data:', JSON.stringify(backendQuery[0], null, 2));
    }
  }
  
  // 5. Check if there are any permission issues
  console.log('\n🔍 5. Checking for permission issues...');
  const { data: allSubmissions, error: allSubmissionsError } = await supabase
    .from('assessment_submissions')
    .select('id, lead_id, owner_id')
    .limit(5);
  
  if (allSubmissionsError) {
    console.error('❌ General submissions query failed:', allSubmissionsError);
  } else {
    console.log(`✅ General submissions query successful: ${allSubmissions?.length || 0} results`);
    allSubmissions?.forEach((sub, index) => {
      console.log(`  Submission ${index + 1}: ID=${sub.id}, Lead=${sub.lead_id}, Owner=${sub.owner_id}`);
    });
  }
}

checkDBPermissions().catch(console.error);
