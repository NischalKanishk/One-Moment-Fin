import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUsersTable() {
  console.log('🔧 Fixing users table - adding missing assessment_link column...\n');
  
  try {
    // Check current users table structure
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Error checking users table:', usersError.message);
      return;
    }
    
    console.log('📋 Current users table columns:', users.length > 0 ? Object.keys(users[0]) : 'No users found');
    
    // Try to add the missing assessment_link column
    console.log('\n➕ Adding assessment_link column...');
    
    // We'll use a direct SQL query to add the column
    const { data: alterResult, error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS assessment_link TEXT UNIQUE;'
    });
    
    if (alterError) {
      console.log('⚠️  Direct SQL not available, trying alternative approach...');
      
      // Alternative: Update existing users to have assessment_link
      const { data: allUsers, error: fetchError } = await supabase
        .from('users')
        .select('id, clerk_id, assessment_link');
      
      if (fetchError) {
        console.error('❌ Error fetching users:', fetchError.message);
        return;
      }
      
      console.log(`📊 Found ${allUsers.length} users`);
      
      // Update users that don't have assessment_link
      for (const user of allUsers) {
        if (!user.assessment_link) {
          const assessmentLink = `16849${user.clerk_id}FQZNZ`;
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ assessment_link: assessmentLink })
            .eq('id', user.id);
          
          if (updateError) {
            console.error(`❌ Error updating user ${user.id}:`, updateError.message);
          } else {
            console.log(`✅ Updated user ${user.id} with assessment_link`);
          }
        }
      }
    } else {
      console.log('✅ assessment_link column added successfully');
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const { data: updatedUsers, error: verifyError } = await supabase
      .from('users')
      .select('id, clerk_id, assessment_link')
      .limit(3);
    
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError.message);
    } else {
      console.log('✅ Verification successful:');
      updatedUsers.forEach(user => {
        console.log(`   • ${user.clerk_id}: ${user.assessment_link || 'No link'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixUsersTable();
