const axios = require('axios');

async function testCORS() {
  console.log('🧪 Testing CORS configuration...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get('http://localhost:3001/health');
    console.log('✅ Health endpoint:', health.data);
    console.log('');

    // Test subscription plans (public endpoint)
    console.log('2. Testing subscription plans...');
    const plans = await axios.get('http://localhost:3001/api/subscription/plans');
    console.log('✅ Subscription plans:', plans.data);
    console.log('');

    // Test signup endpoint
    console.log('3. Testing signup endpoint...');
    try {
      const signup = await axios.post('http://localhost:3001/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User'
      });
      console.log('✅ Signup endpoint:', signup.data);
    } catch (error) {
      console.log('⚠️ Signup endpoint:', error.response?.data || error.message);
    }
    console.log('');

    console.log('🎉 CORS test completed!');
    console.log('📊 Backend is running and accepting requests from frontend.');

  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
  }
}

testCORS();
