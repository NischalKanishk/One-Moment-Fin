#!/usr/bin/env node

/**
 * Environment Variables Checker for OneMFin Backend
 * Run this script to verify your Supabase configuration
 */

require('dotenv').config();

console.log('🔍 OneMFin Backend Environment Checker\n');

// Check required environment variables
const requiredVars = {
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
};

let allGood = true;

console.log('📋 Environment Variables Status:\n');

for (const [key, value] of Object.entries(requiredVars)) {
  const status = value ? '✅ Set' : '❌ Missing';
  const displayValue = value ? `${value.substring(0, 20)}...` : 'Not configured';
  
  console.log(`${key}: ${status}`);
  console.log(`   Value: ${displayValue}`);
  
  if (!value) {
    allGood = false;
  }
  
  console.log('');
}

// Additional checks
console.log('🔧 Additional Checks:\n');

// Check if service role key looks valid
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  if (serviceKey.startsWith('eyJ')) {
    console.log('✅ Service Role Key format looks valid');
  } else {
    console.log('❌ Service Role Key format looks invalid (should start with "eyJ")');
    allGood = false;
  }
} else {
  console.log('❌ Service Role Key is missing - this will cause database operations to fail');
  allGood = false;
}

// Check if anon key looks valid
const anonKey = process.env.SUPABASE_ANON_KEY;
if (anonKey) {
  if (anonKey.startsWith('eyJ')) {
    console.log('✅ Anon Key format looks valid');
  } else {
    console.log('❌ Anon Key format looks invalid (should start with "eyJ")');
    allGood = false;
  }
} else {
  console.log('❌ Anon Key is missing');
  allGood = false;
}

// Check if URL looks valid
const url = process.env.SUPABASE_URL;
if (url) {
  if (url.includes('supabase.co')) {
    console.log('✅ Supabase URL format looks valid');
  } else {
    console.log('❌ Supabase URL format looks invalid (should contain "supabase.co")');
    allGood = false;
  }
} else {
  console.log('❌ Supabase URL is missing');
  allGood = false;
}

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('\n🎉 All environment variables are properly configured!');
  console.log('   Your backend should work correctly.');
} else {
  console.log('\n⚠️  Some environment variables are missing or invalid.');
  console.log('\n📝 To fix this:');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to Settings → API');
  console.log('3. Copy the following values to your .env file:');
  console.log('   - Project URL → SUPABASE_URL');
  console.log('   - anon public → SUPABASE_ANON_KEY');
  console.log('   - service_role secret → SUPABASE_SERVICE_ROLE_KEY');
  console.log('\n4. Restart your backend server');
  console.log('\n💡 Make sure your .env file is in the backend directory');
}

console.log('\n' + '='.repeat(50));
