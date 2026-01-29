import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

/**
 * Admin Analytics Configuration Check
 * 
 * SECURITY: This endpoint checks if analytics services are configured
 * without exposing the actual API tokens to the client.
 * 
 * Returns configuration status for Sentry and PostHog
 */

interface AnalyticsConfigResponse {
  sentry: {
    configured: boolean;
    org?: string;
    project?: string;
  };
  posthog: {
    configured: boolean;
    projectId?: string;
    host?: string;
  };
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  try {
    // Check Sentry configuration
    const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
    const sentryOrg = process.env.SENTRY_ORG || process.env.VITE_SENTRY_ORG;
    const sentryProject = process.env.SENTRY_PROJECT || process.env.VITE_SENTRY_PROJECT;
    
    const sentryConfigured = !!(sentryAuthToken && sentryOrg && sentryProject);

    // Check PostHog configuration
    const posthogProjectId = process.env.POSTHOG_PROJECT_ID || process.env.VITE_POSTHOG_PROJECT_ID;
    const posthogApiKey = process.env.POSTHOG_PERSONAL_API_KEY || process.env.VITE_POSTHOG_PERSONAL_API_KEY;
    const posthogHost = process.env.POSTHOG_HOST || process.env.VITE_POSTHOG_HOST || 'https://us.posthog.com';
    
    const posthogConfigured = !!(posthogProjectId && posthogApiKey);

    const response: AnalyticsConfigResponse = {
      sentry: {
        configured: sentryConfigured,
        ...(sentryConfigured && {
          org: sentryOrg,
          project: sentryProject,
        }),
      },
      posthog: {
        configured: posthogConfigured,
        ...(posthogConfigured && {
          projectId: posthogProjectId,
          host: posthogHost,
        }),
      },
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      },
    };
  } catch (error) {
    console.error('Error checking analytics configuration:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to check analytics configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};
