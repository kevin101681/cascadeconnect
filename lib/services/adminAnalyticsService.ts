/**
 * ADMIN ANALYTICS SERVICE
 * Fetches analytics data from Sentry and PostHog for Backend Dashboard
 * Follows .cursorrules: Strict TypeScript, Zod-first validation, Promise.allSettled
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
// SENTRY API FUNCTIONS
// ==========================================

/**
 * Fetch 24-hour error count from Sentry
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
  
  // Debug log to verify project
  console.log('🔹 Sentry Project:', project);
  
  try {
    // Calculate Unix timestamps (required by Sentry Stats API)
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - (24 * 60 * 60);
    
    // Build properly encoded query params for Issues API (simplified - no statsPeriod)
    const issuesParams = new URLSearchParams({
      query: 'is:unresolved',
      limit: '10'
    });
    
    // Build Stats API URL with resolution and generated stat (ALL environments)
    const statsUrl = `https://sentry.io/api/0/projects/${org}/${project}/stats/?since=${oneDayAgo}&until=${now}&resolution=1h&stat=generated`;
    const issuesUrl = `https://sentry.io/api/0/projects/${org}/${project}/issues/?${issuesParams.toString()}`;
    
    // Debug: Log exact URLs being used
    console.log('🔹 Sentry Stats Query:', statsUrl);
    console.log('🔹 Sentry Issues Query:', issuesUrl);
    
    // Fetch both stats and issues in parallel (ALL ENVIRONMENTS - no filter)
    const [statsRes, issuesRes] = await Promise.allSettled([
      // Stats API: Get error count for last 24h (all environments)
      fetch(statsUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }),
      // Issues API: Get recent unresolved issues (all environments)
      fetch(issuesUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }),
    ]);

    let errorCount24h = 0;
    let recentIssues: SentryErrorsResponse['recentIssues'] = [];

    // Process stats result
    if (statsRes.status === 'fulfilled') {
      if (!statsRes.value.ok) {
        const errorText = await statsRes.value.text();
        console.error('❌ Sentry Stats API error:', statsRes.value.status, statsRes.value.statusText);
        console.error('❌ Response body:', errorText);
      } else {
        try {
          const statsData = await statsRes.value.json();
          console.log('✅ Sentry Stats response:', statsData);
          const validatedStats = SentryStatsSchema.parse(statsData);
          
          // Sum all error counts
          errorCount24h = validatedStats.groups.reduce((sum, group) => {
            return sum + (group.totals['sum(quantity)'] || 0);
          }, 0);
          console.log('✅ Total errors (24h):', errorCount24h);
        } catch (parseError) {
          console.error('❌ Failed to parse Sentry stats:', parseError);
        }
      }
    } else {
      console.error('❌ Sentry stats fetch failed:', statsRes.reason);
    }

    // Process issues result
    if (issuesRes.status === 'fulfilled') {
      if (!issuesRes.value.ok) {
        const errorText = await issuesRes.value.text();
        console.error('❌ Sentry Issues API error:', issuesRes.value.status, issuesRes.value.statusText);
        console.error('❌ Response body:', errorText);
      } else {
        try {
          const issuesData = await issuesRes.value.json();
          console.log('✅ Sentry Issues response:', issuesData.length, 'issues found');
          const validatedIssues = SentryIssuesSchema.parse(issuesData);
          
          recentIssues = validatedIssues.slice(0, 5).map((issue) => ({
            id: issue.id,
            title: issue.title,
            count: typeof issue.count === 'string' ? parseInt(issue.count, 10) : issue.count,
            lastSeen: issue.lastSeen,
            level: issue.level || 'error',
            permalink: issue.permalink,
          }));
        } catch (parseError) {
          console.error('❌ Failed to parse Sentry issues:', parseError);
        }
      }
    } else {
      console.error('❌ Sentry issues fetch failed:', issuesRes.reason);
    }

    // Determine status
    let status: SentryErrorsResponse['status'] = 'healthy';
    if (errorCount24h > 50) {
      status = 'critical';
    } else if (errorCount24h > 5) {
      status = 'warning';
    }

    return {
      success: true,
      errorCount24h,
      recentIssues,
      status,
    };
  } catch (error) {
    console.error('❌ getSentryErrors failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching Sentry data',
    };
  }
}

// ==========================================
// POSTHOG API FUNCTIONS
// ==========================================

/**
 * Fetch PostHog trends (Weekly Active Users or Pageviews)
 * Uses PostHog Query API for last 7 days
 */
export async function getPostHogTrends(): Promise<PostHogTrendsResponse> {
  if (!isPostHogApiConfigured()) {
    return {
      success: false,
      error: 'PostHog API not configured. Set VITE_POSTHOG_PROJECT_ID and VITE_POSTHOG_PERSONAL_API_KEY.',
    };
  }

  const { projectId, apiKey, host } = getPostHogConfig();
  
  try {
    // PostHog Query API: Trends Query for Pageviews
    const query = {
      kind: 'TrendsQuery',
      series: [
        {
          kind: 'EventsNode',
          event: '$pageview',
          name: '$pageview',
        },
      ],
      trendsFilter: {
        display: 'ActionsLineGraph',
      },
      interval: 'day',
      dateRange: {
        date_from: '-7d',
        date_to: null,
      },
    };

    const response = await fetch(
      `${host}/api/projects/${projectId}/query/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ PostHog API error:', response.status, errorText);
      return {
        success: false,
        error: `PostHog API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const validatedData = PostHogTrendResultSchema.parse(data);

    // Extract daily data and calculate totals from parallel arrays
    const result = validatedData.results[0];
    if (!result) {
      return {
        success: true,
        activeUsers7d: 0,
        dailyData: [],
        totalEvents: 0,
      };
    }

    // Map parallel arrays (data and labels) to our expected format
    const dates = result.days || result.labels; // Prefer days, fallback to labels
    const dailyData = dates.map((date, idx) => ({
      date,
      count: result.data[idx] || 0,
    }));

    // Calculate total events by summing all daily counts
    const totalEvents = result.data.reduce((sum, count) => sum + count, 0);

    return {
      success: true,
      activeUsers7d: totalEvents,
      dailyData,
      totalEvents,
    };
  } catch (error) {
    console.error('❌ getPostHogTrends failed:', error);
    
    // Zod validation errors
    if (error instanceof z.ZodError) {
      console.error('❌ PostHog data validation failed:', error.errors);
      return {
        success: false,
        error: 'Invalid data format from PostHog API',
      };
    }
    
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
