import * as Sentry from '@sentry/react';
import React from 'react';

/**
 * Sentry Configuration
 * 
 * This file initializes Sentry for error tracking and performance monitoring.
 * It should be imported early in your application (in index.tsx).
 */

export function initializeSentry() {
  // Only initialize if DSN is provided
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('⚠️ Sentry DSN not configured. Error tracking is disabled.');
    return;
  }

  Sentry.init({
    dsn,
    
    // Environment (development, staging, production)
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
    
    // Set sample rates for performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in production, 100% in dev
    
    // Capture replay sessions for debugging
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0, // 10% in production, disabled in dev
    replaysOnErrorSampleRate: 1.0, // Always capture replays when errors occur
    
    // Enable React-specific integrations
    integrations: [
      // Automatically instrument React components
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation: () => {
          // We'll set this up properly when we integrate with routing
          return window.location;
        },
        useNavigationType: () => 'PUSH',
        createRoutesFromChildren: () => [],
        matchRoutes: () => null,
      }),
      
      // Session Replay for visual debugging
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask all text by default
        blockAllMedia: true, // Privacy: block all media by default
      }),
      
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),
    ],
    
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (import.meta.env.DEV && !import.meta.env.VITE_SENTRY_DEBUG) {
        console.log('🔍 Sentry event (not sent in dev):', event);
        return null;
      }
      
      // Filter out sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      
      return event;
    },
    
    // Don't report errors from browser extensions or third-party scripts
    ignoreErrors: [
      // Browser extensions
      'chrome-extension://',
      'moz-extension://',
      // Third-party scripts
      'fb_xd_fragment',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch',
      // ResizeObserver errors (common and harmless)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
    
    // Set release version (useful for tracking which version has issues)
    release: import.meta.env.VITE_SENTRY_RELEASE || 'cascade-connect@1.0.0',
    
    // Additional tags for filtering in Sentry dashboard
    initialScope: {
      tags: {
        app: 'cascade-connect',
        platform: 'web',
      },
    },
  });

  console.log('✅ Sentry initialized');
}

// Re-export commonly used Sentry functions
export { Sentry };
