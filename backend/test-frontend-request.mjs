import fetch from 'node-fetch';

// Test the exact request your frontend is making
async function testFrontendRequest() {
  try {
    console.log('🧪 Testing Frontend Request...');
    
    // Test 1: Test without authentication (should fail)
    console.log('\n📝 Test 1: No authentication (should fail with 401)');
    try {
      const response1 = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: 'Test Name',
          phone: '1234567890'
        })
      });
      
      console.log('Status:', response1.status);
      const data1 = await response1.json();
      console.log('Response:', data1);
    } catch (error) {
      console.log('Request failed:', error.message);
    }
    
    // Test 2: Test with invalid JWT (should fail)
    console.log('\n📝 Test 2: Invalid JWT (should fail with 401)');
    try {
      const response2 = await fetch('http://localhost:5000/api/auth/profile', {
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
      
      console.log('Status:', response2.status);
      const data2 = await response2.json();
      console.log('Response:', data2);
    } catch (error) {
      console.log('Request failed:', error.message);
    }
    
    // Test 3: Test with empty phone (should work)
    console.log('\n📝 Test 3: Empty phone (should work)');
    try {
      const response3 = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid.jwt.token' // Still invalid, but testing validation
        },
        body: JSON.stringify({
          full_name: 'Test Name',
          phone: ''
        })
      });
      
      console.log('Status:', response3.status);
      const data3 = await response3.json();
      console.log('Response:', data3);
    } catch (error) {
      console.log('Request failed:', error.message);
    }
    
    // Test 4: Test with valid JWT (you'll need to get this from your browser)
    console.log('\n📝 Test 4: Valid JWT (you need to get this from browser)');
    console.log('💡 To get a valid JWT:');
    console.log('   1. Open your app in browser');
    console.log('   2. Open DevTools > Network tab');
    console.log('   3. Try to update profile');
    console.log('   4. Copy the Authorization header value');
    console.log('   5. Replace the token in this test');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFrontendRequest();
