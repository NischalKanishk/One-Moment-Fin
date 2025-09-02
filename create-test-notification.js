// Create a test notification
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestNotification() {
  try {
    console.log('🔍 Creating test notification...');
    
    // Insert a test notification for the test user
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: '8b139374-1886-4d63-8f74-1b64db7fa71b', // Test user ID
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification to verify the notifications system is working.',
        priority: 'medium',
        is_read: false,
        data: { test: true }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating notification:', error);
      return;
    }

    console.log('✅ Test notification created:', notification);
    
    // Check if we can fetch it
    const { data: fetchedNotification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', '8b139374-1886-4d63-8f74-1b64db7fa71b');

    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError);
      return;
    }

    console.log('✅ Fetched notifications:', fetchedNotification);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestNotification();
