const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing OneMFin Backend API...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health endpoint:', health.data);
    console.log('');

    // Test subscription plans (public endpoint)
    console.log('2. Testing subscription plans...');
    const plans = await axios.get(`${BASE_URL}/api/subscription/plans`);
    console.log('✅ Subscription plans:', plans.data);
    console.log('');

    // Test auth endpoints
    console.log('3. Testing auth endpoints...');
    try {
      const signup = await axios.post(`${BASE_URL}/api/auth/signup`, {
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User'
      });
      console.log('✅ Signup endpoint:', signup.data);
    } catch (error) {
      console.log('⚠️ Signup endpoint:', error.response?.data || error.message);
    }
    console.log('');

    // Test leads endpoint (should fail without auth)
    console.log('4. Testing leads endpoint (should fail without auth)...');
    try {
      const leads = await axios.get(`${BASE_URL}/api/leads`);
      console.log('❌ Leads endpoint should have failed but succeeded');
    } catch (error) {
      console.log('✅ Leads endpoint correctly requires auth:', error.response?.status);
    }
    console.log('');

    console.log('🎉 API testing completed!');
    console.log('📊 Server is running and responding to requests.');
    console.log('🔗 API Base URL:', BASE_URL);

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPI();
