// Check current RLS policies on assessment_submissions table
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zldljufeyskfzvzftjos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGxqdWZleXNrZnp2emZ0am9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczOTQ5OSwiZXhwIjoyMDcwMzE1NDk5fQ.esryGKwYPX4gXsFG8697lzCAUqBAnGVbs6rWUnr5cPAgit';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  try {
    console.log('🔍 Checking RLS policies on assessment_submissions table...\n');
    
    // Check if we can query assessment_submissions directly
    console.log('📊 Testing direct query to assessment_submissions...');
    
    const { data: submissions, error: queryError } = await supabase
      .from('assessment_submissions')
      .select('*')
      .limit(5);
    
    if (queryError) {
      console.error('❌ Error querying assessment_submissions:', queryError);
      return;
    }
    
    console.log(`✅ Found ${submissions?.length || 0} assessment submissions in total`);
    
    if (submissions && submissions.length > 0) {
      submissions.forEach((sub, index) => {
        console.log(`\n📝 Submission ${index + 1}:`);
        console.log(`   - ID: ${sub.id}`);
        console.log(`   - Lead ID: ${sub.lead_id}`);
        console.log(`   - Owner ID: ${sub.owner_id}`);
        console.log(`   - Status: ${sub.status}`);
        console.log(`   - Created: ${sub.created_at}`);
        console.log(`   - Result:`, sub.result);
      });
    }
    
    // Check specific lead's submissions
    console.log('\n🔍 Checking submissions for specific lead...');
    const leadId = '63d8a119-331f-4313-be84-2e55d741073f';
    
    const { data: leadSubmissions, error: leadError } = await supabase
      .from('assessment_submissions')
      .select('*')
      .eq('lead_id', leadId);
    
    if (leadError) {
      console.error('❌ Error querying lead submissions:', leadError);
    } else {
      console.log(`📊 Found ${leadSubmissions?.length || 0} submissions for lead ${leadId}`);
      if (leadSubmissions && leadSubmissions.length > 0) {
        leadSubmissions.forEach((sub, index) => {
          console.log(`   ${index + 1}. Submission ${sub.id} - Status: ${sub.status}`);
        });
      }
    }
    
    // Check RLS policies
    console.log('\n🔍 Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .rpc('get_rls_policies', { table_name: 'assessment_submissions' })
      .catch(() => ({ data: null, error: 'RPC function not available' }));
    
    if (policyError) {
      console.log('ℹ️ RPC function not available, checking manually...');
      // Try to describe the table structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('*')
        .eq('table_name', 'assessment_submissions')
        .eq('table_schema', 'public');
      
      if (tableError) {
        console.error('❌ Error checking table info:', tableError);
      } else {
        console.log('📋 Table exists:', tableInfo);
      }
    } else {
      console.log('📋 RLS Policies:', policies);
    }
    
  } catch (error) {
    console.error('❌ Error checking RLS policies:', error);
  }
}

checkRLSPolicies();
