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

async function createNotificationsTable() {
  try {
    console.log('🔧 Creating notifications table...\n');

    // Create the notifications table
    const { error: createError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS notifications (
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
      `
    });

    if (createError) {
      console.error('❌ Error creating table:', createError);
      return;
    }

    console.log('✅ Notifications table created successfully');

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;'
    ];

    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec', { sql: indexSql });
      if (indexError) {
        console.error('❌ Error creating index:', indexError);
      } else {
        console.log('✅ Index created successfully');
      }
    }

    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError);
    } else {
      console.log('✅ RLS enabled successfully');
    }

    // Create RLS policies
    const policies = [
      `CREATE POLICY "Users can view own notifications" ON notifications
       FOR SELECT USING (user_id IN (
         SELECT id FROM users WHERE clerk_id = get_clerk_user_id()
       ));`,
      `CREATE POLICY "Users can update own notifications" ON notifications
       FOR UPDATE USING (user_id IN (
         SELECT id FROM users WHERE clerk_id = get_clerk_user_id()
       ));`,
      `CREATE POLICY "Service role can manage all notifications" ON notifications
       FOR ALL USING (auth.role() = 'service_role');`
    ];

    for (const policySql of policies) {
      const { error: policyError } = await supabase.rpc('exec', { sql: policySql });
      if (policyError) {
        console.error('❌ Error creating policy:', policyError);
      } else {
        console.log('✅ Policy created successfully');
      }
    }

    console.log('\n✅ Notifications table setup completed!');
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

// Run the setup
createNotificationsTable();
