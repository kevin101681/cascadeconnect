/**
 * ADMIN ANALYTICS SERVICE (CLIENT-SIDE)
 * Calls Netlify serverless function to fetch analytics data server-side
 * This avoids CORS/origin issues with Sentry and PostHog APIs
 * 
 * Server-side logic: netlify/functions/analytics.ts
 */

import { z } from 'zod';

// ==========================================
// ZOD SCHEMAS (Define First)
// ==========================================

/**
 * Sentry Stats Schema
 * Validates response from https://sentry.io/api/0/projects/{org}/{project}/stats/
 */
const SentryStatsSchema = z.object({
  start: z.string(),
  end: z.string(),
  intervals: z.array(z.string()),
  groups: z.array(
    z.object({
      by: z.record(z.string()),
      totals: z.object({
        'sum(quantity)': z.number(),
      }),
      series: z.object({
        'sum(quantity)': z.array(z.number()),
      }),
    })
  ),
});

/**
 * Sentry Issues Schema
 * Validates response from https://sentry.io/api/0/projects/{org}/{project}/issues/
 */
const SentryIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  culprit: z.string().optional(),
  count: z.string().or(z.number()),
  userCount: z.number().optional(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  level: z.enum(['fatal', 'error', 'warning', 'info', 'debug']).optional(),
  status: z.string().optional(),
  permalink: z.string().optional(),
});

const SentryIssuesSchema = z.array(SentryIssueSchema);

/**
 * PostHog Trends Query Schema
 * Validates response from https://us.posthog.com/api/projects/{id}/query/
 * Note: PostHog returns parallel arrays (data and labels), not an array of objects
 */
const PostHogTrendResultSchema = z.object({
  results: z.array(
    z.object({
      data: z.array(z.number()), // The counts (parallel array)
      labels: z.array(z.string()), // The dates (parallel array)
      days: z.array(z.string()).optional(), // Alternative date format
    })
  ),
  hasMore: z.boolean().optional(),
  timings: z.array(z.any()).nullable().optional(), // Can be null or undefined
  is_cached: z.boolean().nullable().optional(), // Can be null or undefined
});

// ==========================================
// TYPESCRIPT TYPES (Inferred from Zod)
// ==========================================

export type SentryStats = z.infer<typeof SentryStatsSchema>;
export type SentryIssue = z.infer<typeof SentryIssueSchema>;
export type SentryIssues = z.infer<typeof SentryIssuesSchema>;
export type PostHogTrendResult = z.infer<typeof PostHogTrendResultSchema>;

// ==========================================
// RESPONSE TYPES
// ==========================================

export interface SentryErrorsResponse {
  success: boolean;
  errorCount24h?: number;
  recentIssues?: Array<{
    id: string;
    title: string;
    count: number;
    lastSeen: string;
    level: string;
    permalink?: string;
  }>;
  status?: 'healthy' | 'warning' | 'critical';
  error?: string;
}

export interface PostHogTrendsResponse {
  success: boolean;
  activeUsers7d?: number;
  dailyData?: Array<{
    date: string;
    count: number;
  }>;
  totalEvents?: number;
  error?: string;
}

export interface BackendDashboardStats {
  sentry: SentryErrorsResponse;
  posthog: PostHogTrendsResponse;
  timestamp: string;
}

// ==========================================
// ENVIRONMENT VALIDATION
// ==========================================

/**
 * Check if Sentry API is configured
 */
export function isSentryApiConfigured(): boolean {
  const authToken = import.meta.env.VITE_SENTRY_AUTH_TOKEN;
  const org = import.meta.env.VITE_SENTRY_ORG;
  const project = import.meta.env.VITE_SENTRY_PROJECT;
  
  return !!(authToken && org && project);
}

/**
 * Check if PostHog API is configured
 */
export function isPostHogApiConfigured(): boolean {
  const projectId = import.meta.env.VITE_POSTHOG_PROJECT_ID;
  const apiKey = import.meta.env.VITE_POSTHOG_PERSONAL_API_KEY;
  
  return !!(projectId && apiKey);
}

/**
 * Get Sentry configuration
 */
function getSentryConfig() {
  return {
    authToken: import.meta.env.VITE_SENTRY_AUTH_TOKEN as string,
    org: import.meta.env.VITE_SENTRY_ORG as string,
    project: import.meta.env.VITE_SENTRY_PROJECT as string,
  };
}

/**
 * Get PostHog configuration
 */
function getPostHogConfig() {
  return {
    projectId: import.meta.env.VITE_POSTHOG_PROJECT_ID as string,
    apiKey: import.meta.env.VITE_POSTHOG_PERSONAL_API_KEY as string,
    host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.posthog.com',
  };
}

// ==========================================
// NETLIFY SERVERLESS FUNCTION CALLS
// ==========================================

/**
 * Fetch 24-hour error count from Sentry (via Netlify function)
 * Returns error count and recent issues
 */
export async function getSentryErrors(): Promise<SentryErrorsResponse> {
  if (!isSentryApiConfigured()) {
    return {
      success: false,
      error: 'Sentry API not configured. Set VITE_SENTRY_AUTH_TOKEN, VITE_SENTRY_ORG, and VITE_SENTRY_PROJECT.',
    };
  }

  const { authToken, org, project } = getSentryConfig();
  
  console.log('🌐 Calling Netlify function for Sentry data (server-side)...');
  
  try {
    const response = await fetch('/.netlify/functions/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service: 'sentry',
        authToken,
        org,
        project,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Netlify function error:', response.status, errorText);
      return {
        success: false,
        error: `Server error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log('✅ Sentry data received from server:', data);
    return data;
  } catch (error) {
    console.error('❌ getSentryErrors failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching Sentry data',
    };
  }
}

/**
 * Fetch PostHog trends (via Netlify function)
 * Returns 7-day pageview trends
 */
export async function getPostHogTrends(): Promise<PostHogTrendsResponse> {
  if (!isPostHogApiConfigured()) {
    return {
      success: false,
      error: 'PostHog API not configured. Set VITE_POSTHOG_PROJECT_ID and VITE_POSTHOG_PERSONAL_API_KEY.',
    };
  }

  const { projectId, apiKey, host } = getPostHogConfig();
  
  console.log('🌐 Calling Netlify function for PostHog data (server-side)...');
  
  try {
    const response = await fetch('/.netlify/functions/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service: 'posthog',
        projectId,
        apiKey,
        host,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Netlify function error:', response.status, errorText);
      return {
        success: false,
        error: `Server error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log('✅ PostHog data received from server:', data);
    return data;
  } catch (error) {
    console.error('❌ getPostHogTrends failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching PostHog data',
    };
  }
}

// ==========================================
// UNIFIED DASHBOARD STATS
// ==========================================

/**
 * Get all backend dashboard stats
 * Uses Promise.allSettled to ensure partial failures don't break everything
 */
export async function getBackendDashboardStats(): Promise<BackendDashboardStats> {
  const results = await Promise.allSettled([
    getSentryErrors(),
    getPostHogTrends(),
  ]);

  // Extract results, defaulting to error state if rejected
  const sentryResult = results[0];
  const posthogResult = results[1];

  const sentry: SentryErrorsResponse = 
    sentryResult.status === 'fulfilled' 
      ? sentryResult.value 
      : { success: false, error: 'Failed to fetch Sentry data' };

  const posthog: PostHogTrendsResponse = 
    posthogResult.status === 'fulfilled' 
      ? posthogResult.value 
      : { success: false, error: 'Failed to fetch PostHog data' };

  return {
    sentry,
    posthog,
    timestamp: new Date().toISOString(),
  };
}
