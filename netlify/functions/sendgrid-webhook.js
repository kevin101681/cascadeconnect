// SendGrid Event Webhook Handler
// Receives email tracking events (opens, clicks, bounces, etc.)
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse SendGrid webhook payload (array of events)
    const events = JSON.parse(event.body || '[]');
    
    console.log(`📬 Received ${events.length} SendGrid event(s)`);

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!databaseUrl) {
      console.warn('⚠️ DATABASE_URL not set, cannot process webhook');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Webhook received but database not configured' })
      };
    }

    const sql = neon(databaseUrl);
    let processedCount = 0;

    // Process each event
    for (const webhookEvent of events) {
      const { event: eventType, sg_message_id, email, timestamp } = webhookEvent;
      
      // We're primarily interested in 'open' events
      if (eventType === 'open') {
        try {
          // Update the email_logs table with opened_at timestamp
          // Only update if opened_at is null (first open only)
          const result = await sql(
            `UPDATE email_logs 
             SET opened_at = to_timestamp($1)
             WHERE sendgrid_message_id = $2 
             AND opened_at IS NULL
             RETURNING id`,
            [timestamp, sg_message_id]
          );

          if (result && result.length > 0) {
            console.log(`✅ Marked email as opened: ${email} (${sg_message_id})`);
            processedCount++;
          } else {
            console.log(`ℹ️ Email already marked as opened or not found: ${sg_message_id}`);
          }
        } catch (err) {
          console.error(`❌ Failed to update email log for ${sg_message_id}:`, err);
        }
      } else {
        // Log other event types for debugging
        console.log(`📊 Event: ${eventType} for ${email}`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: `Processed ${processedCount} open event(s)`,
        received: events.length
      })
    };

  } catch (error) {
    console.error('❌ SendGrid webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process webhook',
        message: error.message 
      })
    };
  }
};

module.exports = { handler: exports.handler };

