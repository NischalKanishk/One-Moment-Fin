const axios = require('axios');

async function testAPIEndpoint() {
  console.log('🔍 Testing API endpoint that frontend is calling...');
  
  // This is the URL the frontend is using
  const apiUrl = 'https://one-moment-fin.vercel.app';
  const leadId = '2a74fc2b-b054-4278-a0ca-340f7d82a71f';
  
  console.log(`🔍 Testing: ${apiUrl}/api/leads/${leadId}`);
  
  try {
    // Test without authentication first
    const response = await axios.get(`${apiUrl}/api/leads/${leadId}`, {
      timeout: 10000
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:');
      console.log('  Status:', error.response.status);
      console.log('  Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('❌ No response received:', error.message);
    } else {
      console.log('❌ Request setup error:', error.message);
    }
  }
  
  // Also test the aliased URL
  console.log('\n🔍 Testing aliased URL...');
  const aliasedUrl = 'https://one-moment-fin-nischal-kanishks-projects.vercel.app';
  
  try {
    const response2 = await axios.get(`${aliasedUrl}/api/leads/${leadId}`, {
      timeout: 10000
    });
    
    console.log('✅ Aliased API Response Status:', response2.status);
    console.log('✅ Aliased API Response Data:', JSON.stringify(response2.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Aliased API Error Response:');
      console.log('  Status:', error.response.status);
      console.log('  Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('❌ Aliased API no response received:', error.message);
    } else {
      console.log('❌ Aliased API request setup error:', error.message);
    }
  }
}

testAPIEndpoint().catch(console.error);
