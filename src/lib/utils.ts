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
 * Generates a unique assessment link in the format: 5 random digits + userid + 5 random letters
 * @param userId - The user's ID
 * @returns A unique assessment link string
 */
export function generateAssessmentLink(userId: string): string {
  // Generate 5 random digits
  const randomDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  // Generate 5 random letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetters = Array.from({ length: 5 }, () => 
    letters.charAt(Math.floor(Math.random() * letters.length))
  ).join('');
  
  // Combine: 5 digits + userid + 5 letters
  return `${randomDigits}${userId}${randomLetters}`;
}

/**
 * Format source link for display
 * Replaces assessment links with "Via link" for better readability
 */
export function formatSourceLink(sourceLink: string | null | undefined): string {
  if (!sourceLink) return 'N/A';
  
  // Check if it's the specific assessment link format: 5 digits + "user_" + 32 alphanumeric chars
  // Example: "44510user_31MARrS901A6oz27HnTO3psz164BANAQ"
  const assessmentLinkRegex = /^\d{5}user_[a-zA-Z0-9]{32}$/i;
  
  if (assessmentLinkRegex.test(sourceLink)) {
    return 'Via link';
  }
  
  // Check if it's the new /a/assessment_link format
  if (sourceLink.startsWith('/a/')) {
    return 'Via link';
  }
  
  // Check if it contains common assessment-related text
  if (sourceLink.toLowerCase().includes('assessment') || 
      sourceLink.toLowerCase().includes('form') ||
      sourceLink.toLowerCase().includes('link')) {
    return 'Via link';
  }
  
  // Return original source link for other cases
  return sourceLink;
}
