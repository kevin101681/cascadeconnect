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
      const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 1000; // Increased default limit
      
      // Fetch all recent messages and filter by date range client-side
      // SendGrid's Messages API doesn't reliably support query parameters for date filtering
      activityUrl.searchParams.set('limit', '1000'); // Fetch up to 1000 most recent messages
      
      console.log('Fetching SendGrid messages (will filter by date range client-side)');
      console.log('Date range:', startDate, 'to', endDate);
      console.log('Full URL:', activityUrl.toString());
      
      const activityResponse = await fetch(activityUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('SendGrid Messages API response status:', activityResponse.status);
      console.log('SendGrid Messages API response headers:', Object.fromEntries(activityResponse.headers.entries()));

      if (activityResponse.ok) {
        const activityResult = await activityResponse.json();
        console.log('SendGrid Messages API full response:', JSON.stringify(activityResult, null, 2));
        console.log(`SendGrid Messages API returned ${activityResult.messages?.length || 0} messages`);
        
        // Check if the response structure is different
        if (!activityResult.messages && activityResult.results) {
          console.log('⚠️ Response structure appears different - found "results" instead of "messages"');
        }
        
        const messages = activityResult.messages || activityResult.results || [];
        
        if (messages.length === 0) {
          console.log('⚠️ WARNING: SendGrid Messages API returned 0 messages');
          console.log('This could mean:');
          console.log('1. The Messages API feature is not enabled on your SendGrid account');
          console.log('2. Your API key doesn\'t have "messages.read" permission');
          console.log('3. There are actually no messages in SendGrid\'s Messages API');
          console.log('4. The Messages API only tracks messages sent via API, not all emails');
        }
        
        // Filter messages by date range (client-side filtering)
        // Use UTC dates to avoid timezone issues
        const startTimestampMs = new Date(`${startDate}T00:00:00.000Z`).getTime();
        const endTimestampMs = new Date(`${endDate}T23:59:59.999Z`).getTime();
        
        console.log(`\n=== DATE FILTERING DEBUG ===`);
        console.log(`Date range: ${startDate} to ${endDate}`);
        console.log(`Start timestamp (UTC): ${new Date(startTimestampMs).toISOString()} (${startTimestampMs})`);
        console.log(`End timestamp (UTC): ${new Date(endTimestampMs).toISOString()} (${endTimestampMs})`);
        console.log(`Total messages fetched: ${messages.length}`);
        
        const filteredMessages = messages.filter((msg, index) => {
          const msgDate = msg.last_event_time || msg.sent_at;
          if (!msgDate) {
            if (index < 10) {
              console.warn(`Message ${msg.msg_id}: missing date field`);
            }
            return false;
          }
          
          // Parse the date - SendGrid dates are typically ISO strings
          const msgTimestamp = new Date(msgDate).getTime();
          const inRange = msgTimestamp >= startTimestampMs && msgTimestamp <= endTimestampMs;
          
          // Log first 10 messages for debugging
          if (index < 10) {
            console.log(`Message ${index + 1}: msg_id=${msg.msg_id?.substring(0, 20)}..., date=${msgDate}, parsed=${new Date(msgTimestamp).toISOString()}, inRange=${inRange}`);
          }
          
          return inRange;
        });
        
        console.log(`\n=== FILTERING RESULTS ===`);
        console.log(`Filtered to ${filteredMessages.length} messages within date range`);
        console.log(`Date range: ${startDate} to ${endDate}`);
        console.log(`Total messages fetched from SendGrid: ${messages.length}`);
        if (filteredMessages.length === 0 && messages.length > 0) {
          console.log(`\n⚠️ WARNING: No messages matched the date range!`);
          console.log(`This could mean:`);
          console.log(`1. The date range is outside the most recent 1000 messages (SendGrid limit)`);
          console.log(`2. There's a timezone mismatch`);
          console.log(`3. The messages have different date formats`);
          console.log(`\nSample message dates (first 5):`);
          messages.slice(0, 5).forEach((msg, i) => {
            const msgDate = msg.last_event_time || msg.sent_at;
            console.log(`  ${i + 1}. ${msgDate} (${new Date(msgDate).toISOString()})`);
          });
        }
        console.log(`========================\n`);
        
        // Process ALL filtered messages (removed the 200 message limit)
        // Note: SendGrid API rate limit is 6 requests per minute, so we process in batches with delays
        const batchSize = 50;
        const finalMessagesToProcess = filteredMessages.slice(0, limit); // Process up to the requested limit
        console.log(`Processing ${finalMessagesToProcess.length} messages in detail`);
        
        // Process messages in batches to respect rate limits
        for (let i = 0; i < finalMessagesToProcess.length; i++) {
          const msg = finalMessagesToProcess[i];
          
          // Add delay between batches to respect SendGrid rate limits (6 requests per minute)
          if (i > 0 && i % batchSize === 0) {
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}, pausing 11 seconds to respect rate limits...`);
            await new Promise(resolve => setTimeout(resolve, 11000)); // 11 second delay between batches
          }
          
          try {
            // Get opens for this message
            let opens = [];
            try {
              const opensUrl = `https://api.sendgrid.com/v3/messages/${msg.msg_id}/opens`;
              const opensResponse = await fetch(opensUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                }
              });
              if (opensResponse.ok) {
                const opensData = await opensResponse.json();
                opens = (opensData.opens || []).map(o => ({
                  email: o.email || 'Unknown',
                  timestamp: o.timestamp,
                  ip: o.ip || 'N/A',
                  user_agent: o.user_agent || 'N/A'
                }));
              }
            } catch (e) {
              console.warn(`Could not fetch opens for message ${msg.msg_id}:`, e.message);
            }

            // Get clicks for this message
            let clicks = [];
            try {
              const clicksUrl = `https://api.sendgrid.com/v3/messages/${msg.msg_id}/clicks`;
              const clicksResponse = await fetch(clicksUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                }
              });
              if (clicksResponse.ok) {
                const clicksData = await clicksResponse.json();
                clicks = (clicksData.clicks || []).map(c => ({
                  email: c.email || 'Unknown',
                  timestamp: c.timestamp,
                  url: c.url || 'N/A',
                  ip: c.ip || 'N/A',
                  user_agent: c.user_agent || 'N/A'
                }));
              }
            } catch (e) {
              console.warn(`Could not fetch clicks for message ${msg.msg_id}:`, e.message);
            }

            // Extract recipient emails from the 'to' field
            let recipients = [];
            if (msg.to) {
              if (Array.isArray(msg.to)) {
                recipients = msg.to.map(r => typeof r === 'string' ? r : (r.email || r));
              } else if (typeof msg.to === 'string') {
                recipients = [msg.to];
              }
            }

            activityData.push({
              msg_id: msg.msg_id,
              from: msg.from?.email || 'Unknown',
              from_name: msg.from?.name || '',
              subject: msg.subject || 'No subject',
              to: recipients,
              status: msg.status || 'unknown',
              sent_at: msg.last_event_time || msg.sent_at,
              last_event_time: msg.last_event_time || msg.sent_at,
              opens_count: opens.length || msg.opens_count || 0,
              clicks_count: clicks.length || msg.clicks_count || 0,
              opens: opens,
              clicks: clicks
            });
          } catch (error) {
            console.warn(`Error processing message ${msg.msg_id}:`, error.message);
            // Fallback to basic message data
            activityData.push({
              msg_id: msg.msg_id,
              from: msg.from?.email || 'Unknown',
              from_name: msg.from?.name || '',
              subject: msg.subject || 'No subject',
              to: Array.isArray(msg.to) ? msg.to.map(r => typeof r === 'string' ? r : (r.email || r)) : (msg.to ? [msg.to] : []),
              status: msg.status || 'unknown',
              sent_at: msg.last_event_time || msg.sent_at,
              last_event_time: msg.last_event_time || msg.sent_at,
              opens_count: msg.opens_count || 0,
              clicks_count: msg.clicks_count || 0,
              opens: [],
              clicks: []
            });
          }
        }
        console.log(`Processed ${activityData.length} activity records`);
      } else {
        const errorText = await activityResponse.text();
        console.error('❌ SendGrid Messages API Error:', activityResponse.status, errorText);
        
        // Try to parse error as JSON
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('Error details:', JSON.stringify(errorData, null, 2));
        } catch {
          console.error('Error response (not JSON):', errorText);
        }
        
        // Provide helpful error messages
        if (activityResponse.status === 403) {
          console.error('⚠️ 403 Forbidden: Your API key may not have "messages.read" permission');
          console.error('Please check your SendGrid API key permissions in the SendGrid dashboard');
        } else if (activityResponse.status === 404) {
          console.error('⚠️ 404 Not Found: The Messages API endpoint may not be available');
          console.error('The Messages API feature may need to be enabled in your SendGrid account');
        }
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

    // Process activity data (already processed above with detailed info)
    const processedActivity = activityData.map(msg => ({
      msg_id: msg.msg_id,
      from: msg.from || 'Unknown',
      from_name: msg.from_name || '',
      subject: msg.subject || 'No subject',
      to: Array.isArray(msg.to) ? msg.to : (msg.to ? [msg.to] : []),
      status: msg.status || 'unknown',
      sent_at: msg.sent_at || msg.last_event_time,
      opens_count: msg.opens?.length || msg.opens_count || 0,
      clicks_count: msg.clicks?.length || msg.clicks_count || 0,
      opens: msg.opens || [],
      clicks: msg.clicks || [],
      last_event_time: msg.sent_at || msg.last_event_time
    }));

    // Add warning if stats show emails but Messages API returned none
    const hasDeliveredEmails = totals.delivered > 0;
    const hasActivity = processedActivity.length > 0;
    
    if (hasDeliveredEmails && !hasActivity) {
      console.warn('\n⚠️ IMPORTANT: Stats API shows delivered emails, but Messages API returned 0 messages');
      console.warn(`Stats show ${totals.delivered} delivered emails in date range ${startDate} to ${endDate}`);
      console.warn('Possible reasons:');
      console.warn('1. Email Activity History add-on not enabled (required for Messages API)');
      console.warn('2. API key missing "messages.read" permission');
      console.warn('3. Messages API only tracks emails sent via Mail Send API v3');
      console.warn('4. Consider using Event Webhooks to track emails in real-time\n');
    }
    
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
        activityCount: processedActivity.length,
        warning: hasDeliveredEmails && !hasActivity 
          ? 'Stats show delivered emails, but Messages API returned 0 messages. This may require the Email Activity History add-on or messages.read permission.'
          : undefined
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

