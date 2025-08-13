import { clerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  console.error('Missing CLERK_SECRET_KEY environment variable');
  process.exit(1);
}

async function testJWTTemplate() {
  try {
    console.log('🔍 Testing Clerk JWT Template Configuration...\n');

    // Get the most recent user from Clerk
    const users = await clerkClient.users.getUserList({
      limit: 1,
      orderBy: '-created_at'
    });

    if (!users || users.length === 0) {
      console.log('❌ No users found in Clerk');
      return;
    }

    const user = users[0];
    console.log('📋 Most recent user:', user.id);

    // Try to get JWT tokens with different templates
    console.log('\n🔍 Testing JWT Templates...');
    
    try {
      // Test default template
      const defaultToken = await clerkClient.users.createSignInToken({
        userId: user.id,
        template: 'default'
      });
      console.log('✅ Default template works:', defaultToken ? 'Token generated' : 'No token');
    } catch (error) {
      console.log('❌ Default template failed:', error.message);
    }

    try {
      // Test supabase template
      const supabaseToken = await clerkClient.users.createSignInToken({
        userId: user.id,
        template: 'supabase'
      });
      console.log('✅ Supabase template works:', supabaseToken ? 'Token generated' : 'No token');
    } catch (error) {
      console.log('❌ Supabase template failed:', error.message);
    }

    // Check user data structure
    console.log('\n🔍 User Data Structure:');
    console.log('First Name:', user.firstName || 'NOT SET');
    console.log('Last Name:', user.lastName || 'NOT SET');
    console.log('Full Name:', user.fullName || 'NOT SET');
    console.log('Email Addresses:', user.emailAddresses?.length || 0);
    
    if (user.emailAddresses && user.emailAddresses.length > 0) {
      user.emailAddresses.forEach((email, index) => {
        console.log(`  Email ${index + 1}: ${email.emailAddress} (${email.verification?.status || 'unknown'})`);
      });
    }

    console.log('\n📋 Issue Analysis:');
    if (!user.firstName && !user.lastName) {
      console.log('❌ Problem: No firstName or lastName set in Clerk');
      console.log('   Solution: Check Clerk signup form configuration');
    }
    
    if (!user.emailAddresses || user.emailAddresses.length === 0) {
      console.log('❌ Problem: No email addresses in Clerk');
      console.log('   Solution: Check Clerk signup form configuration');
    }

    console.log('\n🔧 Quick Fix Options:');
    console.log('1. Configure JWT template "supabase" in Clerk dashboard');
    console.log('2. Update Clerk signup form to collect firstName and lastName');
    console.log('3. Fix the data extraction logic in the frontend');

  } catch (error) {
    console.error('❌ Error testing JWT template:', error);
  }
}

testJWTTemplate();
