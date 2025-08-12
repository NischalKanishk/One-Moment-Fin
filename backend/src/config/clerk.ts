import { clerkClient } from '@clerk/clerk-sdk-node';

// Initialize Clerk client with secret key
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  console.warn('WARNING: CLERK_SECRET_KEY is not set!');
  console.warn('Clerk metadata updates will fail.');
  console.warn('Please set the secret key in your .env file.');
}

// Export the initialized client
export { clerkClient };

// Helper function to check if Clerk is properly configured
export const isClerkConfigured = () => {
  return !!clerkSecretKey;
};
