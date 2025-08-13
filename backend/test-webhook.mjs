import fetch from 'node-fetch';

async function testWebhook() {
  try {
    console.log('🧪 Testing Clerk webhook endpoint...\n');

    // Test webhook payload (simulating user.created event)
    const testPayload = {
      type: 'user.created',
      data: {
        id: 'user_test_123',
        email_addresses: [
          {
            email_address: 'test@example.com',
            id: 'email_test_123',
            verification: { status: 'verified' }
          }
        ],
        phone_numbers: [],
        first_name: 'John',
        last_name: 'Doe',
        image_url: 'https://example.com/avatar.jpg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    // Test headers (simulating Clerk webhook headers)
    const testHeaders = {
      'svix-signature': 'v1,1234567890,test_id,test_secret',
      'svix-timestamp': '1234567890',
      'svix-id': 'test_id',
      'Content-Type': 'application/json'
    };

    console.log('📋 Sending test webhook payload:');
    console.log(JSON.stringify(testPayload, null, 2));

    // Send test webhook to local endpoint
    const response = await fetch('http://localhost:3001/webhooks/clerk', {
      method: 'POST',
      headers: testHeaders,
      body: JSON.stringify(testPayload)
    });

    console.log('\n📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const responseData = await response.text();
      console.log('📡 Response body:', responseData);
      console.log('\n✅ Webhook endpoint is working!');
    } else {
      console.log('❌ Webhook endpoint returned error status');
    }

  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

testWebhook();
