import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { smsMessages, homeowners } from '../../db/schema';
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

    const fromPhone = body.From;
    const messageBody = body.Body;
    const messageSid = body.MessageSid;

    if (!fromPhone || !messageBody) {
      console.error('❌ Missing From or Body in webhook');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/xml' },
        body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      };
    }

    // Normalize phone number (remove +1 prefix, format consistently)
    const normalizedPhone = normalizePhoneNumber(fromPhone);

    console.log(`📱 [SMS WEBHOOK] Received SMS from ${fromPhone} (normalized: ${normalizedPhone}): ${messageBody.substring(0, 50)}...`);

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

    // Find homeowner by phone number (try both original and normalized)
    const allHomeowners = await db.select().from(homeowners);
    
    let matchedHomeowner = allHomeowners.find(h => {
      if (!h.phone) return false;
      const homeownerPhone = normalizePhoneNumber(h.phone);
      return homeownerPhone === normalizedPhone || h.phone === fromPhone;
    });

    if (!matchedHomeowner) {
      console.log(`⚠️ [SMS WEBHOOK] No homeowner found for phone ${fromPhone}`);
      // Still return success to Twilio
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      };
    }

    console.log(`✅ [SMS WEBHOOK] Matched homeowner ${matchedHomeowner.id} for phone ${fromPhone}`);

    // Save inbound message to database
    try {
      await db
        .insert(smsMessages)
        .values({
          homeownerId: matchedHomeowner.id,
          callId: null, // Inbound SMS may not be linked to a specific call
          direction: 'inbound',
          content: messageBody,
          status: 'delivered', // Inbound messages are considered delivered
        } as any);

      console.log(`✅ [SMS WEBHOOK] Saved inbound message from homeowner ${matchedHomeowner.id}`);
    } catch (dbError: any) {
      console.error('❌ Database error saving inbound message:', dbError);
      // Still return success to Twilio
    }

    // Return TwiML response (empty = no automated reply)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    };
  } catch (error: any) {
    console.error('❌ Error in sms-webhook:', error);
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

// Helper to normalize phone numbers (remove +1, spaces, dashes, etc.)
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove +1 prefix, spaces, dashes, parentheses
  return phone
    .replace(/^\+1/, '')
    .replace(/\D/g, '') // Remove all non-digits
    .trim();
}

