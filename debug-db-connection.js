const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? 'Set' : 'NOT SET');

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('\n📊 Testing basic connection...');
    
    // Test 1: Simple query
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, clerk_id, full_name, email')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log('✅ Users table accessible:', users?.length || 0, 'users found');
      if (users && users.length > 0) {
        console.log('Sample user:', users[0]);
      }
    }
    
    // Test 2: Check RLS status
    console.log('\n🔒 Checking RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('get_rls_status', { table_name: 'users' })
      .catch(() => ({ data: null, error: 'Function not available' }));
    
    if (rlsError) {
      console.log('ℹ️  RLS status check failed (normal):', rlsError);
    } else {
      console.log('✅ RLS status:', rlsStatus);
    }
    
    // Test 3: Try to insert a test record
    console.log('\n📝 Testing insert capability...');
    const testUser = {
      clerk_id: 'test_' + Date.now(),
      full_name: 'Test User',
      email: 'test@example.com'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert(testUser)
      .select();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Clean up test data
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('clerk_id', testUser.clerk_id);
      
      if (deleteError) {
        console.log('⚠️  Could not clean up test data:', deleteError);
      } else {
        console.log('✅ Test data cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testConnection();
