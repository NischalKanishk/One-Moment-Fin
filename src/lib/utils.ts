import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique referral link for users
 * Format: /{firstname}{5 random numbers}
 * Example: /rahul12345
 */
export function generateReferralLink(firstName: string): string {
  if (!firstName || firstName.trim() === '') {
    firstName = 'user';
  }
  
  // Clean the first name (remove special characters, convert to lowercase)
  const cleanName = firstName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10); // Limit length
  
  // Generate 5 random numbers
  const randomNumbers = Math.floor(Math.random() * 90000) + 10000; // 10000-99999
  
  return `/${cleanName}${randomNumbers}`;
}

/**
 * Generate a unique referral link and ensure it doesn't exist in the database
 * This should be called when creating new users
 */
export async function generateUniqueReferralLink(
  firstName: string, 
  supabaseClient: any,
  maxAttempts: number = 10
): Promise<string> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const referralLink = generateReferralLink(firstName);
    
    // Check if this referral link already exists
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .eq('referral_link', referralLink)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // No user found with this referral link, so it's unique
      return referralLink;
    }
    
    if (data) {
      // Link exists, try again
      attempts++;
      continue;
    }
    
    // If we get here, the link is unique
    return referralLink;
  }
  
  // If we can't generate a unique link after max attempts, add timestamp
  const timestamp = Date.now().toString().slice(-6);
  const cleanName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 5);
  return `/${cleanName}${timestamp}`;
}
