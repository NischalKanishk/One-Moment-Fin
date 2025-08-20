const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('🔍 Checking leads table...');
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*');
  
  if (leadsError) {
    console.error('❌ Leads error:', leadsError);
    return;
  }
  
  console.log('✅ Leads found:', leads.length);
  leads.forEach(lead => {
    console.log(`  - ${lead.full_name} (${lead.id}):`);
    console.log(`    Status: ${lead.status}`);
    console.log(`    Risk Profile ID: ${lead.risk_profile_id || 'NULL'}`);
    console.log(`    Risk Bucket: ${lead.risk_bucket || 'NULL'}`);
    console.log(`    Risk Score: ${lead.risk_score || 'NULL'}`);
    console.log(`    Created: ${lead.created_at}`);
  });
  
  console.log('\n🔍 Checking assessment_submissions table...');
  const { data: submissions, error: submissionsError } = await supabase
    .from('assessment_submissions')
    .select('*');
  
  if (submissionsError) {
    console.error('❌ Submissions error:', submissionsError);
    return;
  }
  
  console.log('✅ Submissions found:', submissions.length);
  submissions.forEach(sub => {
    console.log(`  - Submission ${sub.id}:`);
    console.log(`    Lead ID: ${sub.lead_id || 'NULL'}`);
    console.log(`    Owner ID: ${sub.owner_id || 'NULL'}`);
    console.log(`    Assessment ID: ${sub.assessment_id || 'NULL'}`);
    console.log(`    Framework Version ID: ${sub.framework_version_id || 'NULL'}`);
    console.log(`    Answers count: ${sub.answers ? Object.keys(sub.answers).length : 0}`);
    console.log(`    Result: ${JSON.stringify(sub.result)}`);
    console.log(`    Status: ${sub.status}`);
    console.log(`    Submitted: ${sub.submitted_at}`);
  });
  
  // Check if there's a connection between leads and submissions
  console.log('\n🔍 Checking lead-submission connections...');
  leads.forEach(lead => {
    const relatedSubmissions = submissions.filter(sub => sub.lead_id === lead.id);
    console.log(`  - Lead ${lead.full_name}:`);
    if (relatedSubmissions.length > 0) {
      console.log(`    ✅ Has ${relatedSubmissions.length} assessment submission(s)`);
      relatedSubmissions.forEach(sub => {
        console.log(`      - Submission ${sub.id} with result: ${JSON.stringify(sub.result)}`);
      });
    } else {
      console.log(`    ❌ No assessment submissions found`);
      // Check if there are submissions with this lead's risk_profile_id
      if (lead.risk_profile_id) {
        const profileSubmission = submissions.find(sub => sub.id === lead.risk_profile_id);
        if (profileSubmission) {
          console.log(`    🔍 Found submission via risk_profile_id: ${profileSubmission.id}`);
          console.log(`      Result: ${JSON.stringify(profileSubmission.result)}`);
        } else {
          console.log(`    ❌ No submission found with risk_profile_id: ${lead.risk_profile_id}`);
        }
      }
    }
  });
}

checkData().catch(console.error);
