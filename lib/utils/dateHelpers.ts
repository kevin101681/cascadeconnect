/**
 * Date formatting and manipulation utilities
 * Pure functions with no dependencies on React hooks or component state
 */

/**
 * Formats a date string or Date object to a localized date string
 * @param date - Date string or Date object to format
 * @returns Formatted date string (e.g., "1/15/2024")
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return '';
  }
}

/**
 * Formats a date for Excel export (handles null/undefined)
 * @param date - Date string or Date object to format
 * @returns Formatted date string or empty string
 */
export function formatDateForExcel(date: string | Date | null | undefined): string {
  return date ? formatDate(date) : '';
}

/**
 * Formats a date with specific locale options
 * @param date - Date string or Date object to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDateWithOptions(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US', options);
  } catch {
    return '';
  }
}

/**
 * Formats a date for task assignment display
 * @param date - Date string or Date object to format
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatTaskDateAssigned(date: string | Date): string {
  return formatDateWithOptions(date, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Gets ISO date string for file naming (YYYY-MM-DD)
 * @param date - Optional date (defaults to now)
 * @returns ISO date string
 */
export function getISODateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}
