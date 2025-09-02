import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNotificationSystem() {
  try {
    console.log('🧪 Testing notification system...\n');

    // Test 1: Check if notifications table exists
    console.log('1️⃣ Checking if notifications table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Notifications table does not exist yet');
      console.log('📝 You need to create the notifications table in Supabase manually');
      console.log('\n🔧 SQL to run in Supabase SQL Editor:');
      console.log(`
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_lead',
    'meeting_today',
    'meeting_reminder', 
    'assessment_completed',
    'follow_up_reminder',
    'system_update'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = get_clerk_user_id()
  ));

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = get_clerk_user_id()
  ));

CREATE POLICY "Service role can manage all notifications" ON notifications
  FOR ALL USING (auth.role() = 'service_role');
      `);
      return;
    }

    console.log('✅ Notifications table exists');

    // Test 2: Get a test user
    console.log('\n2️⃣ Getting test user...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.log('❌ No users found to test with');
      return;
    }

    const testUser = users[0];
    console.log(`✅ Found test user: ${testUser.full_name}`);

    // Test 3: Create a test notification
    console.log('\n3️⃣ Creating test notification...');
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: testUser.id,
        type: 'system_update',
        title: 'Notification System Test',
        message: 'The notification system is working correctly!',
        priority: 'medium'
      })
      .select()
      .single();
    
    if (notificationError) {
      console.error('❌ Error creating test notification:', notificationError);
      return;
    }

    console.log('✅ Test notification created:', notification.id);

    // Test 4: Fetch notifications
    console.log('\n4️⃣ Fetching notifications...');
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError);
      return;
    }

    console.log(`✅ Found ${notifications.length} notifications for user`);

    // Test 5: Get unread count
    console.log('\n5️⃣ Getting unread count...');
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUser.id)
      .eq('is_read', false);
    
    console.log(`✅ Unread notifications: ${unreadCount || 0}`);

    // Test 6: Mark notification as read
    console.log('\n6️⃣ Marking notification as read...');
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notification.id);
    
    if (updateError) {
      console.error('❌ Error marking notification as read:', updateError);
      return;
    }

    console.log('✅ Notification marked as read');

    // Test 7: Clean up test notification
    console.log('\n7️⃣ Cleaning up test notification...');
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notification.id);
    
    if (deleteError) {
      console.error('❌ Error deleting test notification:', deleteError);
      return;
    }

    console.log('✅ Test notification cleaned up');

    console.log('\n🎉 Notification system test completed successfully!');
    console.log('\n📋 Available notification types:');
    console.log('   • new_lead - When a new lead is added');
    console.log('   • meeting_today - Daily meeting reminders');
    console.log('   • meeting_reminder - Before meetings');
    console.log('   • assessment_completed - When assessment is completed');
    console.log('   • follow_up_reminder - For overdue follow-ups');
    console.log('   • system_update - System notifications');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testNotificationSystem();
