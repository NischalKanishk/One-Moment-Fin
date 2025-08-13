import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testLegacyTables() {
  try {
    console.log('🧪 Testing legacy tables...');
    
    // Test risk_assessments table
    console.log('\n1️⃣ Testing risk_assessments table...');
    try {
      const { data, error } = await supabase
        .from('risk_assessments')
        .select('*')
        .limit(0);
      
      if (error) {
        console.log('❌ risk_assessments error:', error.message);
      } else {
        console.log('✅ risk_assessments table exists');
      }
    } catch (e) {
      console.log('❌ risk_assessments exception:', e.message);
    }
    
    // Test risk_assessment_answers table
    console.log('\n2️⃣ Testing risk_assessment_answers table...');
    try {
      const { data, error } = await supabase
        .from('risk_assessment_answers')
        .select('*')
        .limit(0);
      
      if (error) {
        console.log('❌ risk_assessment_answers error:', error.message);
      } else {
        console.log('✅ risk_assessment_answers table exists');
      }
    } catch (e) {
      console.log('❌ risk_assessment_answers exception:', e.message);
    }
    
    // Test inserting into risk_assessments
    console.log('\n3️⃣ Testing insert into risk_assessments...');
    try {
      const testData = {
        user_id: '11521d31-5477-4cf8-b718-78a64536e553',
        assessment_id: '31c46ae7-cd17-4d1c-9368-ea58f13186f5',
        risk_score: 75,
        risk_category: 'medium'
      };
      
      const { data, error } = await supabase
        .from('risk_assessments')
        .insert(testData)
        .select()
        .single();
      
      if (error) {
        console.log('❌ Insert failed:', error.message);
      } else {
        console.log('✅ Insert successful:', data.id);
        
        // Clean up
        await supabase.from('risk_assessments').delete().eq('id', data.id);
        console.log('✅ Test record cleaned up');
      }
    } catch (e) {
      console.log('❌ Insert exception:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLegacyTables();
