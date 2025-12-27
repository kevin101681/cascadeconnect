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
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { homeownerId, text, callId } = payload;

    if (!homeownerId || !text) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing required fields: homeownerId and text are required' }),
      };
    }

    // Check Twilio configuration
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('❌ Twilio configuration missing');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Twilio not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER' }),
      };
    }

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL is not configured');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Database not configured' }),
      };
    }

    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    // Get homeowner phone number
    const homeownerRecords = await db
      .select()
      .from(homeowners)
      .where(eq(homeowners.id, homeownerId))
      .limit(1);

    if (homeownerRecords.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Homeowner not found' }),
      };
    }

    const homeowner = homeownerRecords[0];
    const phoneNumber = homeowner.phone;

    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Homeowner does not have a phone number' }),
      };
    }

    // Send SMS via Twilio
    // Dynamic import for ESM compatibility in Netlify functions
    const twilioModule = await import('twilio');
    const twilio = twilioModule.default || twilioModule;
    const client = twilio(twilioAccountSid, twilioAuthToken);

    let twilioMessageSid: string | null = null;
    try {
      const message = await client.messages.create({
        body: text,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });
      twilioMessageSid = message.sid;
      console.log(`✅ SMS sent via Twilio: ${twilioMessageSid}`);
    } catch (twilioError: any) {
      console.error('❌ Twilio error:', twilioError);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: `Failed to send SMS: ${twilioError.message}` }),
      };
    }

    // Save message to database
    try {
      const result = await db
        .insert(smsMessages)
        .values({
          homeownerId: homeownerId,
          callId: callId || null,
          direction: 'outbound',
          content: text,
          status: 'sent',
        } as any)
        .returning();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          message: result[0],
          twilioMessageSid,
        }),
      };
    } catch (dbError: any) {
      console.error('❌ Database error saving message:', dbError);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'SMS sent but failed to save to database' }),
      };
    }
  } catch (error: any) {
    console.error('❌ Error in messages-send:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

