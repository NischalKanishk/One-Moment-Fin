const axios = require('axios');

async function testFrontendAPI() {
  console.log('🔍 Testing frontend API access...');
  
  const API_BASE_URL = 'https://one-moment-fin.vercel.app';
  const testLeadId = '63d8a119-331f-4313-be84-2e55d741073f';
  
  console.log('API Base URL:', API_BASE_URL);
  console.log('Test Lead ID:', testLeadId);
  
  try {
    // Test if the API endpoint is accessible
    const response = await axios.get(`${API_BASE_URL}/api/leads/${testLeadId}`, {
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without auth, but we can see if the endpoint is reachable
      }
    });
    
    console.log('✅ API endpoint accessible');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log('✅ API endpoint reachable (expected auth error)');
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('✅ This is expected - API requires authentication');
      }
    } else if (error.request) {
      console.log('❌ API endpoint not reachable');
      console.log('Error:', error.message);
    } else {
      console.log('❌ Other error:', error.message);
    }
  }
}

testFrontendAPI().catch(console.error);
