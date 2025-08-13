import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkLeadsData() {
  try {
    console.log('🔍 Checking leads data in database...');
    
    // Check total leads count
    console.log('\n1️⃣ Checking total leads count...');
    try {
      const { data: totalLeads, error: totalError } = await supabase
        .from('leads')
        .select('id', { count: 'exact' });
      
      if (totalError) {
        console.log('❌ Error counting total leads:', totalError.message);
      } else {
        console.log(`✅ Total leads in database: ${totalLeads.length}`);
      }
    } catch (e) {
      console.log('❌ Exception counting total leads:', e.message);
    }
    
    // Check leads for specific user
    console.log('\n2️⃣ Checking leads for user Tuskar Noob...');
    try {
      const { data: userLeads, error: userError } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', '11521d31-5477-4cf8-b718-78a64536e553');
      
      if (userError) {
        console.log('❌ Error fetching user leads:', userError.message);
      } else {
        console.log(`✅ Leads for user: ${userLeads?.length || 0}`);
        if (userLeads && userLeads.length > 0) {
          console.log('📋 Sample lead:', {
            id: userLeads[0].id,
            full_name: userLeads[0].full_name,
            email: userLeads[0].email,
            status: userLeads[0].status,
            created_at: userLeads[0].created_at
          });
        }
      }
    } catch (e) {
      console.log('❌ Exception fetching user leads:', e.message);
    }
    
    // Check leads table structure
    console.log('\n3️⃣ Checking leads table structure...');
    try {
      const { data: sampleLead, error: structureError } = await supabase
        .from('leads')
        .select('*')
        .limit(1)
        .single();
      
      if (structureError) {
        console.log('❌ Error getting table structure:', structureError.message);
      } else if (sampleLead) {
        console.log('✅ Leads table structure:');
        console.log('Columns:', Object.keys(sampleLead));
        
        // Check important fields
        const importantFields = ['user_id', 'full_name', 'email', 'status', 'risk_profile_id'];
        for (const field of importantFields) {
          if (sampleLead[field] !== undefined) {
            console.log(`✅ ${field} field exists`);
          } else {
            console.log(`❌ ${field} field missing`);
          }
        }
      }
    } catch (e) {
      console.log('❌ Exception checking table structure:', e.message);
    }
    
    // Check if there are any leads with assessment data
    console.log('\n4️⃣ Checking leads with assessment data...');
    try {
      const { data: assessmentLeads, error: assessmentError } = await supabase
        .from('leads')
        .select('*')
        .not('risk_profile_id', 'is', null);
      
      if (assessmentError) {
        console.log('❌ Error fetching assessment leads:', assessmentError.message);
      } else {
        console.log(`✅ Leads with assessment data: ${assessmentLeads?.length || 0}`);
        if (assessmentLeads && assessmentLeads.length > 0) {
          console.log('📋 Sample assessment lead:', {
            id: assessmentLeads[0].id,
            full_name: assessmentLeads[0].full_name,
            risk_profile_id: assessmentLeads[0].risk_profile_id,
            risk_bucket: assessmentLeads[0].risk_bucket,
            risk_score: assessmentLeads[0].risk_score
          });
        }
      }
    } catch (e) {
      console.log('❌ Exception fetching assessment leads:', e.message);
    }
    
    console.log('\n🎯 Leads data check complete!');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkLeadsData();
