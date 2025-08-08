const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('Testing Supabase Auth...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? 'Set' : 'Not set');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
  try {
    console.log('\n1. Testing signup...');
    
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });

    if (error) {
      console.error('Signup error:', error);
      return;
    }

    console.log('Signup success:', data);
    
    if (data.user) {
      console.log('User created:', data.user.id);
    }
    
    if (data.session) {
      console.log('Session created:', !!data.session.access_token);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

async function testSignIn() {
  try {
    console.log('\n2. Testing sign in...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    });

    if (error) {
      console.error('Sign in error:', error);
      return;
    }

    console.log('Sign in success:', data);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

async function runTests() {
  await testSignup();
  await testSignIn();
}

runTests();
