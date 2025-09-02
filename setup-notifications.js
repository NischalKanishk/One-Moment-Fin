import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

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

async function setupNotifications() {
  try {
    console.log('🔧 Setting up notifications table...\n');

    // Read the SQL file
    const sqlContent = fs.readFileSync('./create-notifications-table.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        }
      }
    }

    // Test the setup by creating a test notification
    console.log('\n🧪 Testing notification system...');
    
    // Get a test user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.log('⚠️ No users found to test with');
    } else {
      const testUser = users[0];
      console.log(`📧 Creating test notification for user: ${testUser.full_name}`);
      
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: testUser.id,
          type: 'system_update',
          title: 'Notification System Setup',
          message: 'The notification system has been successfully set up!',
          priority: 'medium'
        })
        .select()
        .single();
      
      if (notificationError) {
        console.error('❌ Error creating test notification:', notificationError);
      } else {
        console.log('✅ Test notification created successfully:', notification.id);
        
        // Clean up test notification
        await supabase
          .from('notifications')
          .delete()
          .eq('id', notification.id);
        console.log('🧹 Test notification cleaned up');
      }
    }

    console.log('\n✅ Notifications table setup completed!');
    console.log('\n📋 Available notification types:');
    console.log('   • new_lead - When a new lead is added');
    console.log('   • meeting_today - Daily meeting reminders');
    console.log('   • meeting_reminder - Before meetings (30 min, 1 hour)');
    console.log('   • assessment_completed - When assessment is completed');
    console.log('   • follow_up_reminder - For overdue follow-ups');
    console.log('   • system_update - System notifications');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
setupNotifications();
