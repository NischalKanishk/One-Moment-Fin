import { clerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  console.error('Missing CLERK_SECRET_KEY environment variable');
  process.exit(1);
}

async function debugClerkUserData() {
  try {
    console.log('🔍 Debugging Clerk User Data Structure...\n');

    // Get the most recent user from Clerk
    const users = await clerkClient.users.getUserList({
      limit: 5,
      orderBy: '-created_at'
    });

    if (users.length === 0) {
      console.log('❌ No users found in Clerk');
      return;
    }

    console.log(`📋 Found ${users.length} users in Clerk\n`);

    // Check each user's data structure
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`👤 User ${i + 1} (${user.id}):`);
      console.log('  - ID:', user.id);
      console.log('  - Email Addresses:', user.emailAddresses?.length || 0);
      if (user.emailAddresses && user.emailAddresses.length > 0) {
        user.emailAddresses.forEach((email, index) => {
          console.log(`    ${index + 1}. ${email.emailAddress} (${email.verification?.status || 'unknown'})`);
        });
      }
      
      console.log('  - Phone Numbers:', user.phoneNumbers?.length || 0);
      if (user.phoneNumbers && user.phoneNumbers.length > 0) {
        user.phoneNumbers.forEach((phone, index) => {
          console.log(`    ${index + 1}. ${phone.phoneNumber} (${phone.verification?.status || 'unknown'})`);
        });
      }
      
      console.log('  - First Name:', user.firstName || 'NOT SET');
      console.log('  - Last Name:', user.lastName || 'NOT SET');
      console.log('  - Full Name:', user.fullName || 'NOT SET');
      console.log('  - Image URL:', user.imageUrl || 'NOT SET');
      console.log('  - Created At:', user.createdAt);
      console.log('  - Updated At:', user.updatedAt);
      console.log('  - Last Sign In:', user.lastSignInAt || 'NEVER');
      console.log('  - Username:', user.username || 'NOT SET');
      
      // Test the same logic used in the frontend
      const email = user.emailAddresses?.[0]?.emailAddress || '';
      const phone = user.phoneNumbers?.[0]?.phoneNumber || '';
      const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(' ') || 'User';

      console.log('  - Extracted Email:', email || 'EMPTY');
      console.log('  - Extracted Phone:', phone || 'EMPTY');
      console.log('  - Extracted Full Name:', fullName);
      
      console.log(''); // Empty line for readability
    }

    // Check for potential issues
    console.log('🔍 Potential Issues Found:');
    let hasIssues = false;
    
    users.forEach((user, index) => {
      if (!user.firstName && !user.lastName) {
        console.log(`  ❌ User ${index + 1}: No firstName or lastName set`);
        hasIssues = true;
      }
      
      if (!user.emailAddresses || user.emailAddresses.length === 0) {
        console.log(`  ❌ User ${index + 1}: No email addresses`);
        hasIssues = true;
      }
      
      if (user.emailAddresses && user.emailAddresses.length > 0) {
        const verifiedEmails = user.emailAddresses.filter(email => email.verification?.status === 'verified');
        if (verifiedEmails.length === 0) {
          console.log(`  ⚠️  User ${index + 1}: No verified email addresses`);
        }
      }
    });

    if (!hasIssues) {
      console.log('  ✅ No obvious data structure issues found');
    }

    console.log('\n📋 Recommendations:');
    console.log('1. Check if users are completing the signup process in Clerk');
    console.log('2. Verify that firstName and lastName are being collected during signup');
    console.log('3. Ensure email addresses are being verified');
    console.log('4. Check Clerk signup form configuration');

  } catch (error) {
    console.error('❌ Error debugging Clerk user data:', error);
  }
}

debugClerkUserData();
