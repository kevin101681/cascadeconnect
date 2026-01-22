/**
 * Layout Constants
 * 
 * Centralized layout values to ensure consistent alignment between
 * Header, Sidebar, and main content areas across the application.
 * 
 * These constants prevent visual misalignment caused by animation
 * states or inconsistent padding values.
 */

/**
 * Sidebar Content Padding (Left)
 * 
 * This is the horizontal padding used for the sidebar's content area.
 * The sidebar uses p-4 (16px) for its search bar and card content.
 * 
 * Usage:
 * - Apply to sidebar content containers
 * - Apply to header logo container to maintain vertical alignment
 */
export const SIDEBAR_CONTENT_PADDING_LEFT = 'pl-4';

/**
 * Sidebar Width (Desktop)
 * 
 * Fixed width of the sidebar on desktop screens (lg breakpoint and up).
 * Used to calculate proper spacing and alignment.
 */
export const SIDEBAR_WIDTH_DESKTOP = 'lg:w-72';

/**
 * Main Content Max Width
 * 
 * Standard max-width for centered content areas.
 */
export const CONTENT_MAX_WIDTH = 'max-w-7xl';

/**
 * Standard Horizontal Padding
 * 
 * Default horizontal padding for main content areas.
 */
export const CONTENT_PADDING_X = 'px-4';
