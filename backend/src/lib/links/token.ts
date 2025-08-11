import crypto from 'crypto';

/**
 * Generate a secure random token for assessment links
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a shorter token (for display purposes)
 */
export function generateShortToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Validate token format
 */
export function isValidToken(token: string): boolean {
  // Check if token is a valid base64url string
  return /^[A-Za-z0-9_-]+$/.test(token) && token.length >= 16;
}

/**
 * Generate a token with custom length
 */
export function generateCustomToken(length: number = 32): string {
  if (length < 16) {
    throw new Error('Token length must be at least 16 characters');
  }
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate a human-readable token (easier to share)
 */
export function generateReadableToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
