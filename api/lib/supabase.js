const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required Supabase environment variables:');
  console.error('❌ SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present' : 'Missing');
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

// Create Supabase client with service role key for backend operations
// Service role key bypasses RLS policies
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Log which key is being used
console.log('🔍 Supabase client configuration:');
console.log('🔍 URL:', supabaseUrl);
console.log('🔍 Service Role Key:', supabaseServiceKey ? 'Present' : 'Missing');
console.log('🔍 Using key: Service Role (bypasses RLS)');

// Create public client for auth operations (if needed)
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

module.exports = { supabase, supabasePublic };
