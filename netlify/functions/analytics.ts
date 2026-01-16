import { Handler } from '@netlify/functions';
import { z } from 'zod';

// ==========================================
// ZOD SCHEMAS (Server-Side Validation)
// ==========================================

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

const PostHogTrendResultSchema = z.object({
  results: z.array(
    z.object({
      data: z.array(z.number()),
      labels: z.array(z.string()),
      days: z.array(z.string()).optional(),
    })
  ),
  hasMore: z.boolean().optional(),
  timings: z.array(z.any()).nullable().optional(),
  is_cached: z.boolean().nullable().optional(),
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function getSentryData(
  authToken: string,
  org: string,
  project: string
) {
  console.log('⚡️ (Server Action) Sentry Project:', project);

  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - (24 * 60 * 60);

  const statsUrl = `https://sentry.io/api/0/projects/${org}/${project}/stats/?since=${oneDayAgo}&until=${now}&resolution=1h&stat=generated`;
  const issuesParams = new URLSearchParams({
    query: 'is:unresolved',
    limit: '10'
  });
  const issuesUrl = `https://sentry.io/api/0/projects/${org}/${project}/issues/?${issuesParams.toString()}`;

  console.log('⚡️ (Server Action) Sentry Stats Query:', statsUrl);
  console.log('⚡️ (Server Action) Sentry Issues Query:', issuesUrl);

  const [statsRes, issuesRes] = await Promise.allSettled([
    fetch(statsUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }),
    fetch(issuesUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }),
  ]);

  let errorCount24h = 0;
  let recentIssues: Array<{
    id: string;
    title: string;
    count: number;
    lastSeen: string;
    level: string;
    permalink?: string;
  }> = [];

  // Process stats
  if (statsRes.status === 'fulfilled') {
    if (!statsRes.value.ok) {
      const errorText = await statsRes.value.text();
      console.error('⚡️ (Server Action) ❌ Sentry Stats API error:', statsRes.value.status, statsRes.value.statusText);
      console.error('⚡️ (Server Action) ❌ Response body:', errorText);
    } else {
      try {
        const statsData = await statsRes.value.json();
        console.log('⚡️ (Server Action) ✅ Sentry Stats response received');
        const validatedStats = SentryStatsSchema.parse(statsData);
        
        errorCount24h = validatedStats.groups.reduce((sum, group) => {
          return sum + (group.totals['sum(quantity)'] || 0);
        }, 0);
        console.log('⚡️ (Server Action) ✅ Total errors (24h):', errorCount24h);
      } catch (parseError) {
        console.error('⚡️ (Server Action) ❌ Failed to parse Sentry stats:', parseError);
      }
    }
  } else {
    console.error('⚡️ (Server Action) ❌ Sentry stats fetch failed:', statsRes.reason);
  }

  // Process issues
  if (issuesRes.status === 'fulfilled') {
    if (!issuesRes.value.ok) {
      const errorText = await issuesRes.value.text();
      console.error('⚡️ (Server Action) ❌ Sentry Issues API error:', issuesRes.value.status, issuesRes.value.statusText);
      console.error('⚡️ (Server Action) ❌ Response body:', errorText);
    } else {
      try {
        const issuesData = await issuesRes.value.json();
        console.log('⚡️ (Server Action) ✅ Sentry Issues response:', issuesData.length, 'issues found');
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
        console.error('⚡️ (Server Action) ❌ Failed to parse Sentry issues:', parseError);
      }
    }
  } else {
    console.error('⚡️ (Server Action) ❌ Sentry issues fetch failed:', issuesRes.reason);
  }

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
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
}

async function getPostHogData(
  projectId: string,
  apiKey: string,
  host: string = 'https://us.posthog.com'
) {
  console.log('⚡️ (Server Action) PostHog Project:', projectId);

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
    console.error('⚡️ (Server Action) ❌ PostHog API error:', response.status, errorText);
    return {
      success: false,
      error: `PostHog API error: ${response.status} ${response.statusText}`,
    };
  }

  const data = await response.json();
  console.log('⚡️ (Server Action) ✅ PostHog response received');

  try {
    const validatedData = PostHogTrendResultSchema.parse(data);

    const result = validatedData.results[0];
    if (!result) {
      return {
        success: true,
        activeUsers7d: 0,
        dailyData: [],
        totalEvents: 0,
      };
    }

    const dates = result.days || result.labels;
    const dailyData = dates.map((date, idx) => ({
      date,
      count: result.data[idx] || 0,
    }));

    const totalEvents = result.data.reduce((sum, count) => sum + count, 0);

    console.log('⚡️ (Server Action) ✅ Total pageviews (7d):', totalEvents);

    return {
      success: true,
      activeUsers7d: totalEvents,
      dailyData,
      totalEvents,
    };
  } catch (error) {
    console.error('⚡️ (Server Action) ❌ PostHog validation failed:', error);
    if (error instanceof z.ZodError) {
      console.error('⚡️ (Server Action) ❌ Validation errors:', error.errors);
      return {
        success: false,
        error: 'Invalid data format from PostHog API',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==========================================
// NETLIFY FUNCTION HANDLER
// ==========================================

export const handler: Handler = async (event) => {
  console.log('⚡️ (Server Action) Analytics function invoked');

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { service } = body;

    if (service === 'sentry') {
      const { authToken, org, project } = body;

      if (!authToken || !org || !project) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Missing required Sentry parameters',
          }),
        };
      }

      const data = await getSentryData(authToken, org, project);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }

    if (service === 'posthog') {
      const { projectId, apiKey, host } = body;

      if (!projectId || !apiKey) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Missing required PostHog parameters',
          }),
        };
      }

      const data = await getPostHogData(projectId, apiKey, host);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Invalid service parameter. Must be "sentry" or "posthog"',
      }),
    };
  } catch (error) {
    console.error('⚡️ (Server Action) ❌ Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
