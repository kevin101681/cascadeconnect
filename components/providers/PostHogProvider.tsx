import { useEffect, ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import posthog from 'posthog-js';

interface PostHogProviderProps {
  children: ReactNode;
}

/**
 * PostHog Provider
 * 
 * Initializes PostHog for product analytics and session replay.
 * Automatically tracks page views on route changes.
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Initialize PostHog once on mount
  useEffect(() => {
    const apiKey = import.meta.env.VITE_POSTHOG_KEY;
    const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

    // Only initialize if API key is provided
    if (!apiKey) {
      console.warn('⚠️ PostHog API key not configured. Analytics disabled.');
      return;
    }

    // Check if already initialized
    if (posthog.__loaded) {
      console.log('✅ PostHog already initialized');
      return;
    }

    // Initialize PostHog
    // Note: PostHog's TS types can lag behind runtime config options, so we keep
    // the config strongly documented here but pass it as `any` to avoid build breaks.
    const posthogConfig: any = {
      api_host: apiHost,
      
      // Person profiles: only create for identified users (saves costs)
      person_profiles: 'identified_only',
      
      // Session replay configuration
      session_recording: {
        // Enable session replay
        recordCrossOriginIframes: false, // Privacy: don't record iframes
        maskAllInputs: true, // Privacy: mask all form inputs
        maskTextSelector: '[data-sensitive]', // Custom selector for sensitive text
        
        // Performance optimization
        recordCanvas: false, // Disable canvas recording (heavy)
        recordHeaders: false, // Don't record request headers
        
        // Sample rate: 100% in dev, 50% in production
        sampleRate: import.meta.env.PROD ? 0.5 : 1.0,
      },
      
      // Capture configuration
      capture_pageview: false, // We'll manually track pageviews
      capture_pageleave: true, // Track when users leave pages
      
      // Autocapture: automatically track clicks, form submissions, etc.
      autocapture: {
        // Disable autocapture in development to reduce noise
        enabled: import.meta.env.PROD,
        css_selector_allowlist: ['[data-ph-capture]'], // Only capture elements with this attribute
      },
      
      // Privacy settings
      disable_session_recording: !import.meta.env.PROD, // Disable in dev
      respect_dnt: true, // Respect Do Not Track
      
      // Debug mode in development
      debug: import.meta.env.DEV,
      
      // Performance
      loaded: (posthog) => {
        console.log('✅ PostHog initialized');
        
        // Set user properties if Clerk user is available
        // This will be called after Clerk loads
        if (typeof window !== 'undefined' && (window as any).Clerk?.user) {
          const user = (window as any).Clerk.user;
          posthog.identify(user.id, {
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName,
            firstName: user.firstName,
            lastName: user.lastName,
          });
        }
      },
    };

    posthog.init(apiKey, posthogConfig);

    // Cleanup on unmount
    return () => {
      // PostHog doesn't need explicit cleanup
      // It will handle cleanup automatically
    };
  }, []);

  // Track page views on route changes
  useEffect(() => {
    // Skip if PostHog is not initialized
    if (!posthog.__loaded) {
      return;
    }

    // Build page view properties
    const properties: Record<string, any> = {
      $current_url: window.location.href,
      $pathname: location.pathname,
      $search: location.search,
      $hash: location.hash,
      navigation_type: navigationType,
    };

    // Capture pageview event
    posthog.capture('$pageview', properties);

    // Debug log in development
    if (import.meta.env.DEV) {
      console.log('📊 PostHog pageview:', location.pathname);
    }
  }, [location.pathname, location.search, location.hash, navigationType]);

  // No wrapper needed - just return children
  return <>{children}</>;
}

/**
 * Helper function to identify a user in PostHog
 * Call this after user authentication
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (posthog.__loaded) {
    posthog.identify(userId, traits);
    console.log('📊 PostHog user identified:', userId);
  }
}

/**
 * Helper function to track custom events
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (posthog.__loaded) {
    posthog.capture(eventName, properties);
    
    if (import.meta.env.DEV) {
      console.log('📊 PostHog event:', eventName, properties);
    }
  }
}

/**
 * Helper function to reset user identity (call on logout)
 */
export function resetUser() {
  if (posthog.__loaded) {
    posthog.reset();
    console.log('📊 PostHog user reset');
  }
}

// Export posthog instance for advanced usage
export { posthog };
