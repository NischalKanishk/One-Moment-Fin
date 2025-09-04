import { clerkClient } from '@clerk/clerk-sdk-node';

// Initialize Clerk client with secret key
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  }

// Export the initialized client
export { clerkClient };

// Helper function to check if Clerk is properly configured
export const isClerkConfigured = () => {
  return !!clerkSecretKey;
};
