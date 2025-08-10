import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample KYC template data
const dummyTemplates = [
  {
    name: 'Individual Investor - Basic',
    description: 'Standard KYC template for individual retail investors with basic requirements',
    fields: [
      'full_name', 'date_of_birth', 'gender', 'nationality', 'email', 'phone',
      'address_line_1', 'city', 'state', 'postal_code', 'country',
      'id_type', 'id_number', 'occupation', 'annual_income', 'source_of_funds',
      'investment_experience', 'risk_tolerance', 'investment_objective',
      'pep_status', 'us_tax_resident', 'fatca_compliance',
      'address_proof', 'income_proof', 'photo'
    ],
    is_active: true
  },
  {
    name: 'Corporate Investor - Enhanced',
    description: 'Comprehensive KYC template for corporate entities with enhanced due diligence',
    fields: [
      'full_name', 'date_of_birth', 'gender', 'nationality', 'email', 'phone',
      'address_line_1', 'address_line_2', 'city', 'state', 'postal_code', 'country',
      'id_type', 'id_number', 'id_issue_date', 'id_expiry_date',
      'occupation', 'employer', 'annual_income', 'source_of_funds',
      'investment_experience', 'risk_tolerance', 'investment_objective',
      'pep_status', 'us_tax_resident', 'fatca_compliance',
      'address_proof', 'income_proof', 'photo'
    ],
    is_active: true
  }
];

async function testKYCTemplateSeeding() {
  try {
    console.log('🧪 Testing KYC template seeding...');
    
    // First, let's check if we can connect to the database
    console.log('🔌 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('kyc_templates')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Get a sample user ID (you'll need to replace this with a real user ID)
    console.log('👤 Looking for a test user...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('❌ No users found:', userError);
      console.log('💡 You need to create a user first or use an existing user ID');
      return;
    }
    
    const testUserId = users[0].id;
    console.log(`✅ Using test user: ${users[0].email} (${testUserId})`);
    
    // Test inserting a single template
    console.log('📝 Testing template insertion...');
    const { data: insertedTemplate, error: insertError } = await supabase
      .from('kyc_templates')
      .insert({
        user_id: testUserId,
        ...dummyTemplates[0]
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Template insertion failed:', insertError);
      return;
    }
    
    console.log('✅ Template inserted successfully:', insertedTemplate.name);
    
    // Test retrieving the template
    console.log('🔍 Testing template retrieval...');
    const { data: retrievedTemplate, error: retrieveError } = await supabase
      .from('kyc_templates')
      .select('*')
      .eq('id', insertedTemplate.id)
      .single();
    
    if (retrieveError) {
      console.error('❌ Template retrieval failed:', retrieveError);
      return;
    }
    
    console.log('✅ Template retrieved successfully:', retrievedTemplate.name);
    
    // Test deleting the template
    console.log('🗑️ Testing template deletion...');
    const { error: deleteError } = await supabase
      .from('kyc_templates')
      .delete()
      .eq('id', insertedTemplate.id);
    
    if (deleteError) {
      console.error('❌ Template deletion failed:', deleteError);
      return;
    }
    
    console.log('✅ Template deleted successfully');
    
    console.log('🎉 All tests passed! KYC template seeding is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testKYCTemplateSeeding();
