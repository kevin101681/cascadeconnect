import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { smsMessages } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const handler = async (event: any): Promise<HandlerResponse> => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Twilio sends form-urlencoded data
    let body: any;
    if (event.isBase64Encoded) {
      const rawBody = Buffer.from(event.body, 'base64').toString('utf-8');
      body = parseFormData(rawBody);
    } else {
      body = parseFormData(event.body || '');
    }

    const messageSid = body.MessageSid;
    const messageStatus = body.MessageStatus; // 'sent', 'delivered', 'failed', 'undelivered'

    if (!messageSid || !messageStatus) {
      console.error('❌ Missing MessageSid or MessageStatus in status webhook');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/xml' },
        body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      };
    }

    console.log(`📱 [SMS STATUS] Message ${messageSid} status: ${messageStatus}`);

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL is not configured');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/xml' },
        body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      };
    }

    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    // Map Twilio status to our status
    let ourStatus: 'sent' | 'delivered' | 'failed' = 'sent';
    if (messageStatus === 'delivered') {
      ourStatus = 'delivered';
    } else if (messageStatus === 'failed' || messageStatus === 'undelivered') {
      ourStatus = 'failed';
    }

    // Update message status in database
    // Note: We don't have messageSid in our schema, so we'll need to match by content/timestamp
    // For now, we'll log it. In a production system, you'd store the Twilio message SID
    console.log(`📱 [SMS STATUS] Status update: ${messageSid} -> ${ourStatus}`);

    // Return success to Twilio
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    };
  } catch (error: any) {
    console.error('❌ Error in sms-status-webhook:', error);
    // Always return success to Twilio to prevent retries
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    };
  }
};

// Helper to parse form-urlencoded data
function parseFormData(body: string): any {
  const params: any = {};
  const pairs = body.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return params;
}

