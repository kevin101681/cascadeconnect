/**
 * Utility Functions
 * Helper functions for className merging and other utilities
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names using clsx and tailwind-merge
 * Handles Tailwind CSS class conflicts intelligently
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format phone number for display
 * Strips +1 and formats as 253-508-0621
 * @param phoneNumber - Raw phone number (e.g., "+12535080621" or "2535080621")
 * @returns Formatted phone number (e.g., "253-508-0621") or original if invalid
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  
  // Strip non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Strip leading 1 (country code) if present
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    cleaned = cleaned.substring(1);
  }
  
  // Format as XXX-XXX-XXXX
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
  }
  
  // Return original if format doesn't match
  return phoneNumber;
}

