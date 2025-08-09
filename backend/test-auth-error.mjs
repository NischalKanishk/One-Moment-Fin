import fetch from 'node-fetch';

async function testAuthError() {
  try {
    console.log('🧪 Testing Authentication Error Response...');
    
    const response = await fetch('http://localhost:5000/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid.jwt.token'
      },
      body: JSON.stringify({
        full_name: 'Test Name',
        phone: '1234567890'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    // Try to get the response text
    const responseText = await response.text();
    console.log('Response Text:', responseText);
    
    // Try to parse as JSON if possible
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Response JSON:', responseJson);
    } catch (parseError) {
      console.log('Response is not valid JSON');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthError();
