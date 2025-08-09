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
