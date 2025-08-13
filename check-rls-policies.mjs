import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRLSPolicies() {
  try {
    console.log('🔍 Checking RLS policies on leads table...');
    
    // Check if RLS is enabled
    console.log('\n1️⃣ Checking if RLS is enabled...');
    try {
      const { data: rlsStatus, error: rlsError } = await supabase.rpc('get_rls_status', { table_name: 'leads' });
      
      if (rlsError) {
        console.log('❌ Could not check RLS status:', rlsError.message);
        console.log('Trying alternative approach...');
        
        // Try to check RLS manually
        const { data: testQuery, error: testError } = await supabase
          .from('leads')
          .select('id')
          .limit(1);
        
        if (testError) {
          console.log('❌ RLS might be blocking access:', testError.message);
        } else {
          console.log('✅ RLS is not blocking service role access');
        }
      } else {
        console.log('✅ RLS status:', rlsStatus);
      }
    } catch (e) {
      console.log('❌ Exception checking RLS status:', e.message);
    }
    
    // Check if we can access leads with service role
    console.log('\n2️⃣ Testing service role access to leads...');
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, full_name, user_id')
        .limit(5);
      
      if (error) {
        console.log('❌ Service role access error:', error.message);
      } else {
        console.log(`✅ Service role can access leads: ${leads?.length || 0} found`);
        if (leads && leads.length > 0) {
          console.log('📋 Sample leads:', leads.map(l => ({ id: l.id, name: l.full_name, user_id: l.user_id })));
        }
      }
    } catch (e) {
      console.log('❌ Exception testing service role access:', e.message);
    }
    
    // Check specific user's leads with service role
    console.log('\n3️⃣ Testing service role access to specific user leads...');
    try {
      const { data: userLeads, error } = await supabase
        .from('leads')
        .select('id, full_name, status')
        .eq('user_id', '11521d31-5477-4cf8-b718-78a64536e553');
      
      if (error) {
        console.log('❌ Service role user leads access error:', error.message);
      } else {
        console.log(`✅ Service role can access user leads: ${userLeads?.length || 0} found`);
        if (userLeads && userLeads.length > 0) {
          console.log('📋 User leads:', userLeads.map(l => ({ id: l.id, name: l.full_name, status: l.status })));
        }
      }
    } catch (e) {
      console.log('❌ Exception testing service role user access:', e.message);
    }
    
    // Check if there are any RLS policies
    console.log('\n4️⃣ Checking for RLS policies...');
    try {
      const { data: policies, error } = await supabase.rpc('get_policies', { table_name: 'leads' });
      
      if (error) {
        console.log('❌ Could not get policies:', error.message);
        console.log('This might mean no policies exist or the function is not available');
      } else {
        console.log('✅ RLS policies found:', policies);
      }
    } catch (e) {
      console.log('❌ Exception getting policies:', e.message);
    }
    
    console.log('\n🎯 RLS policy check complete!');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkRLSPolicies();
