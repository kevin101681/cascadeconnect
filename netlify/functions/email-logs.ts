import { neon } from '@neondatabase/serverless';

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// Helper to get database URL
const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database configuration is missing. Please set DATABASE_URL, VITE_DATABASE_URL, or NETLIFY_DATABASE_URL.');
  }
  return databaseUrl;
};

export const handler = async (event: any): Promise<HandlerResponse> => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const databaseUrl = getDatabaseUrl();
    const sql = neon(databaseUrl);

    // GET: Fetch email logs
    if (event.httpMethod === 'GET') {
      const queryParams = event.queryStringParameters || {};
      const startDate = queryParams.start_date || null;
      const endDate = queryParams.end_date || null;
      const limit = parseInt(queryParams.limit || '500', 10);

      // Build WHERE clause for date filters
      let whereClause = '';
      const params: any[] = [];
      let paramIndex = 1;

      if (startDate) {
        whereClause += ` WHERE created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        const endDateWithTime = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
        whereClause += whereClause ? ` AND created_at <= $${paramIndex}` : ` WHERE created_at <= $${paramIndex}`;
        params.push(endDateWithTime);
        paramIndex++;
      }

      // Fetch logs
      const logsQuery = `SELECT * FROM email_logs${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);
      const logsResult = await sql(logsQuery, params);
      const logs = Array.isArray(logsResult) ? logsResult : [];

      // Get total count for stats (without date filters)
      const countQuery = `SELECT COUNT(*) as count FROM email_logs`;
      const totalCountResult = await sql(countQuery);
      const totalCount = Array.isArray(totalCountResult) && totalCountResult[0] ? Number(totalCountResult[0].count) : 0;

      // Get sent count
      const sentQuery = `SELECT COUNT(*) as count FROM email_logs WHERE status = $1`;
      const totalSentResult = await sql(sentQuery, ['sent']);
      const totalSent = Array.isArray(totalSentResult) && totalSentResult[0] ? Number(totalSentResult[0].count) : 0;

      // Get failed count
      const failedQuery = `SELECT COUNT(*) as count FROM email_logs WHERE status = $1`;
      const totalFailedResult = await sql(failedQuery, ['failed']);
      const totalFailed = Array.isArray(totalFailedResult) && totalFailedResult[0] ? Number(totalFailedResult[0].count) : 0;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          logs: logs,
          stats: {
            total: totalCount,
            sent: totalSent,
            failed: totalFailed,
          }
        }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error: any) {
    console.error('❌ Email Logs API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
