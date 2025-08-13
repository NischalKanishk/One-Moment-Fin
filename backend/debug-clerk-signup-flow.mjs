import { clerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  console.error('Missing CLERK_SECRET_KEY environment variable');
  process.exit(1);
}

async function debugClerkSignupFlow() {
  try {
    console.log('🔍 Debugging Clerk Signup Flow and User Data...\n');

    // Get all users from Clerk
    const users = await clerkClient.users.getUserList({
      limit: 10,
      orderBy: '-created_at'
    });

    if (!users || users.length === 0) {
      console.log('❌ No users found in Clerk');
      return;
    }

    console.log(`📋 Found ${users.length} users in Clerk\n`);

    // Check each user's data structure
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`👤 User ${i + 1} (${user.id}):`);
      console.log('  - ID:', user.id);
      console.log('  - Created At:', user.createdAt);
      console.log('  - Updated At:', user.updatedAt);
      console.log('  - Last Sign In:', user.lastSignInAt || 'NEVER');
      
      // Check all available properties
      console.log('  - Available Properties:', Object.keys(user));
      
      // Check specific properties
      console.log('  - firstName:', user.firstName || 'NOT SET');
      console.log('  - lastName:', user.lastName || 'NOT SET');
      console.log('  - fullName:', user.fullName || 'NOT SET');
      console.log('  - username:', user.username || 'NOT SET');
      console.log('  - imageUrl:', user.imageUrl || 'NOT SET');
      
      // Check email addresses
      console.log('  - Email Addresses:', user.emailAddresses?.length || 0);
      if (user.emailAddresses && user.emailAddresses.length > 0) {
        user.emailAddresses.forEach((email, index) => {
          console.log(`    ${index + 1}. ${email.emailAddress} (${email.verification?.status || 'unknown'})`);
        });
      }
      
      // Check phone numbers
      console.log('  - Phone Numbers:', user.phoneNumbers?.length || 0);
      if (user.phoneNumbers && user.phoneNumbers.length > 0) {
        user.phoneNumbers.forEach((phone, index) => {
          console.log(`    ${index + 1}. ${phone.phoneNumber} (${phone.verification?.status || 'unknown'})`);
        });
      }
      
      // Check public metadata
      console.log('  - Public Metadata:', JSON.stringify(user.publicMetadata, null, 2));
      
      // Check private metadata
      console.log('  - Private Metadata:', JSON.stringify(user.privateMetadata, null, 2));
      
      // Check unsafe metadata
      console.log('  - Unsafe Metadata:', JSON.stringify(user.unsafeMetadata, null, 2));
      
      console.log(''); // Empty line for readability
    }

    // Check for patterns
    console.log('🔍 Analysis:');
    const usersWithoutNames = users.filter(u => !u.firstName && !u.lastName);
    const usersWithoutEmails = users.filter(u => !u.emailAddresses || u.emailAddresses.length === 0);
    
    if (usersWithoutNames.length > 0) {
      console.log(`❌ ${usersWithoutNames.length} users without firstName/lastName`);
      console.log('   This suggests the signup form is not collecting names properly');
    }
    
    if (usersWithoutEmails.length > 0) {
      console.log(`❌ ${usersWithoutEmails.length} users without email addresses`);
      console.log('   This suggests the signup form is not collecting emails properly');
    }

    // Check the most recent user more carefully
    const mostRecentUser = users[0];
    console.log('\n🔍 Most Recent User Deep Dive:');
    console.log('User ID:', mostRecentUser.id);
    console.log('All Properties:', Object.getOwnPropertyNames(mostRecentUser));
    
    // Try to access properties that might exist
    console.log('\n🔍 Property Access Test:');
    console.log('user.firstName:', mostRecentUser.firstName);
    console.log('user.lastName:', mostRecentUser.lastName);
    console.log('user.fullName:', mostRecentUser.fullName);
    console.log('user.primaryEmailAddress:', mostRecentUser.primaryEmailAddress);
    console.log('user.primaryPhoneNumber:', mostRecentUser.primaryPhoneNumber);
    
    // Check if there are any getter methods
    console.log('\n🔍 Method Check:');
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(mostRecentUser));
    console.log('Available methods:', methods);

  } catch (error) {
    console.error('❌ Error debugging Clerk signup flow:', error);
  }
}

debugClerkSignupFlow();
