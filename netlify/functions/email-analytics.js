// Use fetch API for SendGrid REST API calls
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        body: JSON.stringify({ 
          error: "SendGrid API key not configured" 
        })
      };
    }

    // Get query parameters for date range
    const queryParams = event.queryStringParameters || {};
    const startDate = queryParams.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default: 30 days ago
    const endDate = queryParams.end_date || new Date().toISOString().split('T')[0]; // Default: today
    const aggregatedBy = queryParams.aggregated_by || 'day'; // day, week, or month

    // Fetch email statistics using SendGrid REST API
    const statsUrl = new URL('https://api.sendgrid.com/v3/stats');
    statsUrl.searchParams.set('start_date', startDate);
    statsUrl.searchParams.set('end_date', endDate);
    statsUrl.searchParams.set('aggregated_by', aggregatedBy);

    const statsResponse = await fetch(statsUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      throw new Error(`SendGrid stats API error: ${statsResponse.status} - ${errorText}`);
    }

    const statsData = await statsResponse.json();

    // Fetch recent email activity using SendGrid Messages API
    let activityData = [];
    try {
      const activityUrl = new URL('https://api.sendgrid.com/v3/messages');
      activityUrl.searchParams.set('limit', '1000');
      activityUrl.searchParams.set('query', `last_event_time BETWEEN "${startDate}T00:00:00Z" AND "${endDate}T23:59:59Z"`);

      const activityResponse = await fetch(activityUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (activityResponse.ok) {
        const activityResult = await activityResponse.json();
        activityData = activityResult.messages || [];
      } else {
        console.warn('Could not fetch email activity:', activityResponse.status, await activityResponse.text());
      }
    } catch (activityError) {
      console.warn('Could not fetch email activity:', activityError.message);
      // Continue without activity data
    }

    // Process statistics
    const processedStats = (statsData || []).map(stat => ({
      date: stat.date,
      stats: stat.stats.map(s => ({
        metrics: {
          blocks: s.metrics?.blocks || 0,
          bounce_drops: s.metrics?.bounce_drops || 0,
          bounces: s.metrics?.bounces || 0,
          clicks: s.metrics?.clicks || 0,
          deferred: s.metrics?.deferred || 0,
          delivered: s.metrics?.delivered || 0,
          invalid_emails: s.metrics?.invalid_emails || 0,
          opens: s.metrics?.opens || 0,
          processed: s.metrics?.processed || 0,
          requests: s.metrics?.requests || 0,
          spam_report_drops: s.metrics?.spam_report_drops || 0,
          spam_reports: s.metrics?.spam_reports || 0,
          unique_clicks: s.metrics?.unique_clicks || 0,
          unique_opens: s.metrics?.unique_opens || 0,
          unsubscribe_drops: s.metrics?.unsubscribe_drops || 0,
          unsubscribes: s.metrics?.unsubscribes || 0
        }
      }))
    }));

    // Calculate totals
    const totals = processedStats.reduce((acc, stat) => {
      stat.stats.forEach(s => {
        Object.keys(s.metrics).forEach(key => {
          acc[key] = (acc[key] || 0) + s.metrics[key];
        });
      });
      return acc;
    }, {});

    // Process activity data
    const processedActivity = activityData.map(msg => ({
      msg_id: msg.msg_id,
      from: msg.from?.email || 'Unknown',
      subject: msg.subject || 'No subject',
      to: msg.to || [],
      status: msg.status || 'unknown',
      opens_count: msg.opens_count || 0,
      clicks_count: msg.clicks_count || 0,
      last_event_time: msg.last_event_time,
      asm_group_id: msg.asm_group_id
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        dateRange: {
          start: startDate,
          end: endDate
        },
        aggregatedBy,
        stats: processedStats,
        totals,
        activity: processedActivity,
        activityCount: processedActivity.length
      })
    };
  } catch (error) {
    console.error("EMAIL ANALYTICS ERROR:", {
      message: error.message,
      code: error.code,
      response: error.response ? {
        statusCode: error.response.statusCode,
        body: error.response.body,
        headers: error.response.headers
      } : null,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({ 
        error: error.message || "Failed to fetch email analytics",
        details: error.response ? {
          statusCode: error.response.statusCode,
          body: error.response.body
        } : null
      })
    };
  }
};

