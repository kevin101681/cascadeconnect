/**
 * Phone Number Normalization Utilities
 * 
 * Normalizes phone numbers to E.164 format for consistent database storage
 * E.164 format: +[country code][area code][number] (e.g., +15551234567)
 */

/**
 * Normalize a phone number to E.164 format
 * 
 * @param phone - Raw phone number from contact list or user input
 * @param defaultCountryCode - Default country code (default: "1" for US/Canada)
 * @returns Normalized phone number in E.164 format, or null if invalid
 * 
 * @example
 * normalizePhoneNumber("(555) 123-4567") // "+15551234567"
 * normalizePhoneNumber("555-123-4567") // "+15551234567"
 * normalizePhoneNumber("+1 555 123 4567") // "+15551234567"
 * normalizePhoneNumber("5551234567") // "+15551234567"
 */
export function normalizePhoneNumber(
  phone: string | null | undefined, 
  defaultCountryCode: string = "1"
): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If empty after cleaning, return null
  if (cleaned.length === 0) return null;

  // Handle different formats
  if (cleaned.length === 10) {
    // 10 digits: assume US/Canada number without country code
    cleaned = defaultCountryCode + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // 11 digits starting with 1: already has US country code
    // Keep as-is
  } else if (cleaned.length === 11 && !cleaned.startsWith('1')) {
    // 11 digits NOT starting with 1: might be international
    // Keep as-is (trust the format)
  } else if (cleaned.length > 11) {
    // More than 11 digits: likely international with country code
    // Keep as-is
  } else {
    // Less than 10 digits: invalid
    console.warn(`Invalid phone number: ${phone} (only ${cleaned.length} digits)`);
    return null;
  }

  // Add + prefix for E.164 format
  return `+${cleaned}`;
}

/**
 * Batch normalize phone numbers
 * 
 * @param phones - Array of phone numbers to normalize
 * @param defaultCountryCode - Default country code
 * @returns Array of normalized phone numbers (nulls filtered out)
 */
export function batchNormalizePhoneNumbers(
  phones: (string | null | undefined)[],
  defaultCountryCode: string = "1"
): string[] {
  return phones
    .map(phone => normalizePhoneNumber(phone, defaultCountryCode))
    .filter((phone): phone is string => phone !== null);
}

/**
 * Check if a phone number is in valid E.164 format
 * 
 * @param phone - Phone number to validate
 * @returns true if valid E.164 format
 */
export function isE164Format(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Format a phone number for display (US format)
 * 
 * @param phone - Phone number in E.164 format
 * @returns Formatted phone number for display
 * 
 * @example
 * formatPhoneForDisplay("+15551234567") // "(555) 123-4567"
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';

  // Remove + and country code (assuming US)
  const cleaned = phone.replace(/^\+1/, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // If not 10 digits, return as-is
  return phone;
}
