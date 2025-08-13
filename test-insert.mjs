import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testInsert() {
  try {
    console.log('🧪 Testing database insert with corrected column names...');
    
    // Test data
    const testData = {
      form_id: '31c46ae7-cd17-4d1c-9368-ea58f13186f5',                    // assessment_id
      version_id: '64ec22e8-09af-4199-aa7d-7679fc827705',                 // framework_version_id
      user_id: '11521d31-5477-4cf8-b718-78a64536e553',                    // owner_id
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
      score: 75,                                                             // result.score
      risk_category: "Moderate",                                             // result.bucket
      filled_by: 'lead',                                                     // required field
      status: 'submitted'                                                    // required field
    };
    
    console.log('📝 Test data:', testData);
    
    // Try to insert
    const { data, error } = await supabase
      .from('assessment_submissions')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.log('❌ Insert failed:', error.message);
      console.log('Error details:', error);
      return;
    }
    
    console.log('✅ Insert successful!');
    console.log('Created submission:', data);
    
    // Clean up
    await supabase.from('assessment_submissions').delete().eq('id', data.id);
    console.log('✅ Test submission cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testInsert();
