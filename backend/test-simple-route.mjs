import fetch from 'node-fetch';

async function testSimpleRoute() {
  try {
    console.log('🧪 Testing Simple Route...');
    
    // Test 1: Test a route without authentication
    console.log('\n📝 Test 1: Simple GET route (should work)');
    try {
      const response1 = await fetch('http://localhost:5000/health');
      console.log('Status:', response1.status);
      const data1 = await response1.text();
      console.log('Response:', data1);
    } catch (error) {
      console.log('Request failed:', error.message);
    }
    
    // Test 2: Test the profile route with a valid-looking JWT
    console.log('\n📝 Test 2: Profile route with valid-looking JWT');
    try {
      // Create a fake JWT that looks valid (3 parts separated by dots)
      const fakeJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTYxNjI0NzI0MH0.signature';
      
      const response2 = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fakeJWT}`
        },
        body: JSON.stringify({
          full_name: 'Test Name',
          phone: '1234567890'
        })
      });
      
      console.log('Status:', response2.status);
      const data2 = await response2.text();
      console.log('Response:', data2);
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(data2);
        console.log('Response JSON:', jsonData);
      } catch (parseError) {
        console.log('Response is not valid JSON');
      }
      
    } catch (error) {
      console.log('Request failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSimpleRoute();
