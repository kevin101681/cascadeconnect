/**
 * Monitoring & Analytics Helper Functions
 * 
 * This file provides helper functions to integrate Clerk with Sentry and PostHog.
 */

import * as Sentry from '@sentry/react';
import { identifyUser, resetUser, trackEvent } from '../components/providers/PostHogProvider';

// Track the last identified user ID to prevent duplicate identification
let lastIdentifiedUserId: string | null = null;

/**
 * Identify user in both Sentry and PostHog
 * Call this after successful Clerk authentication
 */
export function identifyUserInMonitoring(user: {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}) {
  // Guard: Skip if we've already identified this user
  if (lastIdentifiedUserId === user.id) {
    console.log('⏭️  Skipping user identification - already identified:', user.id);
    return;
  }

  // Sentry: Set user context
  Sentry.setUser({
    id: user.id,
    email: user.email || undefined,
    username: user.fullName || undefined,
  });

  // PostHog: Identify user with traits
  identifyUser(user.id, {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.fullName,
  });

  // Update tracking
  lastIdentifiedUserId = user.id;
  console.log('✅ User identified in monitoring:', user.id);
}

/**
 * Clear user data from both Sentry and PostHog
 * Call this on logout
 */
export function clearUserFromMonitoring() {
  // Sentry: Clear user context
  Sentry.setUser(null);

  // PostHog: Reset user
  resetUser();

  // Clear tracking
  lastIdentifiedUserId = null;
  console.log('✅ User cleared from monitoring');
}

/**
 * Track a custom event
 * Wrapper around PostHog's trackEvent
 */
export function track(eventName: string, properties?: Record<string, any>) {
  trackEvent(eventName, properties);
}

/**
 * Capture an error manually
 * Use this for caught errors that you want to track
 */
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Add breadcrumb for debugging
 * Breadcrumbs help you understand what led to an error
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  });
}

/**
 * Set a custom tag for filtering in Sentry
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Track page view manually (if needed)
 * Note: PageViews are automatically tracked by PostHogProvider
 */
export function trackPageView(pageName: string, properties?: Record<string, any>) {
  trackEvent('$pageview', {
    page_name: pageName,
    ...properties,
  });
}

// Export Sentry for advanced usage
export { Sentry };
