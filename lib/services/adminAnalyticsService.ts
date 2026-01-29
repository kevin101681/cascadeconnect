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

// Configuration state cache
let configCache: {
  sentry: { configured: boolean; org?: string; project?: string } | null;
  posthog: { configured: boolean; projectId?: string; host?: string } | null;
  lastFetch: number;
} = {
  sentry: null,
  posthog: null,
  lastFetch: 0,
};

const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch analytics configuration from server
 * SECURITY: This fetches config from the server without exposing tokens to client
 */
async function fetchAnalyticsConfig() {
  const now = Date.now();
  
  // Return cached config if still valid
  if (configCache.lastFetch && (now - configCache.lastFetch) < CONFIG_CACHE_TTL) {
    return configCache;
  }

  try {
    const response = await fetch('/.netlify/functions/admin-analytics-config');
    
    if (!response.ok) {
      console.error('Failed to fetch analytics config:', response.status);
      return configCache; // Return stale cache on error
    }

    const data = await response.json();
    
    configCache = {
      sentry: data.sentry,
      posthog: data.posthog,
      lastFetch: now,
    };
    
    return configCache;
  } catch (error) {
    console.error('Error fetching analytics config:', error);
    return configCache; // Return stale cache on error
  }
}

/**
 * Check if Sentry API is configured
 * SECURITY: Now fetches from server instead of reading client env vars
 */
export async function isSentryApiConfigured(): Promise<boolean> {
  const config = await fetchAnalyticsConfig();
  return config.sentry?.configured || false;
}

/**
 * Check if PostHog API is configured
 * SECURITY: Now fetches from server instead of reading client env vars
 */
export async function isPostHogApiConfigured(): Promise<boolean> {
  const config = await fetchAnalyticsConfig();
  return config.posthog?.configured || false;
}

/**
 * Get Sentry configuration
 * SECURITY: Returns config without auth token
 */
async function getSentryConfig() {
  const config = await fetchAnalyticsConfig();
  
  if (!config.sentry?.configured) {
    throw new Error('Sentry is not configured');
  }
  
  return {
    org: config.sentry.org!,
    project: config.sentry.project!,
  };
}

/**
 * Get PostHog configuration
 * SECURITY: Returns config without API key
 */
async function getPostHogConfig() {
  const config = await fetchAnalyticsConfig();
  
  if (!config.posthog?.configured) {
    throw new Error('PostHog is not configured');
  }
  
  return {
    projectId: config.posthog.projectId!,
    host: config.posthog.host || 'https://us.posthog.com',
  };
}

// ==========================================
// NETLIFY SERVERLESS FUNCTION CALLS
// ==========================================

/**
 * Fetch 24-hour error count from Sentry (via Netlify function)
 * Returns error count and recent issues
 * SECURITY: Auth token is passed via server-side Netlify function, not exposed to client
 */
export async function getSentryErrors(): Promise<SentryErrorsResponse> {
  const isConfigured = await isSentryApiConfigured();
  
  if (!isConfigured) {
    return {
      success: false,
      error: 'Sentry API not configured. Set SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT in server environment.',
    };
  }

  try {
    const { org, project } = await getSentryConfig();
    
    console.log('🌐 Calling Netlify function for Sentry data (server-side)...');
    
    const response = await fetch('/.netlify/functions/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service: 'sentry',
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
 * SECURITY: API key is passed via server-side Netlify function, not exposed to client
 */
export async function getPostHogTrends(): Promise<PostHogTrendsResponse> {
  const isConfigured = await isPostHogApiConfigured();
  
  if (!isConfigured) {
    return {
      success: false,
      error: 'PostHog API not configured. Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY in server environment.',
    };
  }

  try {
    const { projectId, host } = await getPostHogConfig();
    
    console.log('🌐 Calling Netlify function for PostHog data (server-side)...');
    
    const response = await fetch('/.netlify/functions/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service: 'posthog',
        projectId,
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
