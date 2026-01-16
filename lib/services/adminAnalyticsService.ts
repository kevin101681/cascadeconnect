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
 */
const PostHogTrendResultSchema = z.object({
  results: z.array(
    z.object({
      action: z.object({
        id: z.string().or(z.number()).optional(),
        type: z.string().optional(),
        order: z.number().optional(),
        name: z.string().optional(),
        custom_name: z.string().optional(),
      }).optional(),
      label: z.string(),
      count: z.number(),
      data: z.array(z.number()),
      labels: z.array(z.string()),
      days: z.array(z.string()),
      chartLabel: z.string().optional(),
    })
  ),
  hasMore: z.boolean().optional(),
  timings: z.array(z.any()).optional(),
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
  const orgSlug = import.meta.env.VITE_SENTRY_ORG_SLUG;
  const projectSlug = import.meta.env.VITE_SENTRY_PROJECT_SLUG;
  
  return !!(authToken && orgSlug && projectSlug);
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
    orgSlug: import.meta.env.VITE_SENTRY_ORG_SLUG as string,
    projectSlug: import.meta.env.VITE_SENTRY_PROJECT_SLUG as string,
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
      error: 'Sentry API not configured. Set VITE_SENTRY_AUTH_TOKEN, VITE_SENTRY_ORG_SLUG, and VITE_SENTRY_PROJECT_SLUG.',
    };
  }

  const { authToken, orgSlug, projectSlug } = getSentryConfig();
  
  try {
    // Calculate 24h ago timestamp
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Fetch both stats and issues in parallel
    const [statsRes, issuesRes] = await Promise.allSettled([
      // Stats API: Get error count for last 24h
      fetch(
        `https://sentry.io/api/0/projects/${orgSlug}/${projectSlug}/stats/?stat=received&since=${Math.floor(yesterday.getTime() / 1000)}&until=${Math.floor(now.getTime() / 1000)}&resolution=1h`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      ),
      // Issues API: Get recent issues
      fetch(
        `https://sentry.io/api/0/projects/${orgSlug}/${projectSlug}/issues/?query=is:unresolved&statsPeriod=24h&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      ),
    ]);

    let errorCount24h = 0;
    let recentIssues: SentryErrorsResponse['recentIssues'] = [];

    // Process stats result
    if (statsRes.status === 'fulfilled') {
      if (!statsRes.value.ok) {
        console.error('❌ Sentry Stats API error:', statsRes.value.status, statsRes.value.statusText);
      } else {
        try {
          const statsData = await statsRes.value.json();
          const validatedStats = SentryStatsSchema.parse(statsData);
          
          // Sum all error counts
          errorCount24h = validatedStats.groups.reduce((sum, group) => {
            return sum + (group.totals['sum(quantity)'] || 0);
          }, 0);
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
        console.error('❌ Sentry Issues API error:', issuesRes.value.status, issuesRes.value.statusText);
      } else {
        try {
          const issuesData = await issuesRes.value.json();
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

    // Extract daily data and calculate totals
    const result = validatedData.results[0];
    if (!result) {
      return {
        success: true,
        activeUsers7d: 0,
        dailyData: [],
        totalEvents: 0,
      };
    }

    const dailyData = result.days.map((day, idx) => ({
      date: day,
      count: result.data[idx] || 0,
    }));

    const totalEvents = result.count || 0;

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
