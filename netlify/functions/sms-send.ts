/**
 * SMS SEND FUNCTION
 * Sends outbound SMS via Twilio and triggers Pusher event
 * December 29, 2025
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { smsThreads, smsMessages, homeowners } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { triggerSmsMessageEvent } from '../../lib/pusher-server';
import type { Handler } from '@netlify/functions';

interface SendSmsRequest {
  homeownerId: string;
  message: string;
}

export const handler: Handler = async (event) => {
  console.log('📤 [SMS SEND] Outbound SMS request');

  // Handle CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request
    const payload: SendSmsRequest = JSON.parse(event.body || '{}');
    const { homeownerId, message } = payload;

    if (!homeownerId || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing homeownerId or message' }),
      };
    }

    // Check Twilio configuration
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('❌ Twilio credentials missing');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER',
        }),
      };
    }

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' }),
      };
    }

    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    // Get homeowner
    const homeownerRecords = await db
      .select()
      .from(homeowners)
      .where(eq(homeowners.id, homeownerId))
      .limit(1);

    if (homeownerRecords.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Homeowner not found' }),
      };
    }

    const homeowner = homeownerRecords[0];
    const phoneNumber = homeowner.phone;

    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Homeowner has no phone number' }),
      };
    }

    console.log(`📤 Sending SMS to ${homeowner.name} (${phoneNumber})`);

    // Send via Twilio
    const twilio = require('twilio');
    const client = twilio(twilioAccountSid, twilioAuthToken);

    let twilioMessage: any;
    try {
      twilioMessage = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });
      console.log(`✅ Twilio SMS sent: ${twilioMessage.sid}`);
    } catch (twilioError: any) {
      console.error('❌ Twilio error:', twilioError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `Twilio error: ${twilioError.message}` }),
      };
    }

    // Find or create thread
    let thread = await db
      .select()
      .from(smsThreads)
      .where(eq(smsThreads.homeownerId, homeownerId))
      .limit(1);

    let threadId: string;

    if (thread.length === 0) {
      // Create new thread
      console.log('📝 Creating new SMS thread');
      const newThread = await db
        .insert(smsThreads)
        .values({
          homeownerId,
          phoneNumber,
          lastMessageAt: new Date(),
        } as any)
        .returning();
      threadId = newThread[0].id;
    } else {
      threadId = thread[0].id;
      // Update last message timestamp
      await db
        .update(smsThreads)
        .set({ lastMessageAt: new Date() } as any)
        .where(eq(smsThreads.id, threadId));
    }

    // Save outbound message to database
    const savedMessage = await db
      .insert(smsMessages)
      .values({
        threadId,
        direction: 'outbound',
        body: message,
        twilioSid: twilioMessage.sid,
        status: 'sent',
      } as any)
      .returning();

    const dbMessage = savedMessage[0];
    console.log(`✅ Saved outbound message: ${dbMessage.id}`);

    // Trigger Pusher event so admin sees their own message
    try {
      await triggerSmsMessageEvent({
        id: dbMessage.id,
        threadId: threadId,
        homeownerId: homeownerId,
        direction: 'outbound',
        body: message,
        phoneNumber: phoneNumber,
        createdAt: dbMessage.createdAt || new Date(),
      });
      console.log('📡 Pusher event triggered');
    } catch (pusherError) {
      console.error('❌ Pusher event failed:', pusherError);
      // Don't fail the request if Pusher fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageId: dbMessage.id,
        twilioSid: twilioMessage.sid,
      }),
    };
  } catch (error: any) {
    console.error('❌ Error in SMS send:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

