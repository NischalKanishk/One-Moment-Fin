import { clerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  console.error('Missing CLERK_SECRET_KEY environment variable');
  process.exit(1);
}

async function debugClerkUser() {
  try {
    console.log('🔍 Debugging Clerk User Data...\n');

    // Get the most recent user from Clerk
    const users = await clerkClient.users.getUserList({
      limit: 1,
      orderBy: '-created_at'
    });

    if (users.length === 0) {
      console.log('❌ No users found in Clerk');
      return;
    }

    const user = users[0];
    if (!user) {
      console.log('❌ User object is undefined');
      return;
    }
    console.log('📋 Most recent Clerk user:');
    console.log('ID:', user.id);
    console.log('Email Addresses:', JSON.stringify(user.emailAddresses, null, 2));
    console.log('Phone Numbers:', JSON.stringify(user.phoneNumbers, null, 2));
    console.log('First Name:', user.firstName);
    console.log('Last Name:', user.lastName);
    console.log('Full Name:', user.fullName);
    console.log('Image URL:', user.imageUrl);
    console.log('Created At:', user.createdAt);
    console.log('Updated At:', user.updatedAt);
    console.log('Last Sign In:', user.lastSignInAt);
    console.log('External ID:', user.externalId);
    console.log('Username:', user.username);
    console.log('Public Metadata:', JSON.stringify(user.publicMetadata, null, 2));
    console.log('Private Metadata:', JSON.stringify(user.privateMetadata, null, 2));
    console.log('Unsafe Metadata:', JSON.stringify(user.unsafeMetadata, null, 2));

    console.log('\n🔍 Testing user data extraction...');
    
    // Test the same logic used in the frontend
    const email = user.emailAddresses?.[0]?.emailAddress || '';
    const phone = user.phoneNumbers?.[0]?.phoneNumber || '';
    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ') || 'User';

    console.log('Extracted Email:', email);
    console.log('Extracted Phone:', phone);
    console.log('Extracted Full Name:', fullName);

    // Check if the issue is with the data structure
    if (!user.firstName && !user.lastName) {
      console.log('\n⚠️  WARNING: No firstName or lastName found!');
      console.log('This could be why "New User" is being set.');
    }

    if (!email) {
      console.log('\n⚠️  WARNING: No email address found!');
      console.log('This could be why "{{user.primary_email_address.email}}" is being set.');
    }

    // Check if there are any webhook issues
    console.log('\n🔍 Checking webhook configuration...');
    console.log('Make sure your Clerk webhook is configured to send:');
    console.log('- user.created');
    console.log('- user.updated');
    console.log('- user.deleted');

  } catch (error) {
    console.error('❌ Error debugging Clerk user:', error);
  }
}

debugClerkUser();
