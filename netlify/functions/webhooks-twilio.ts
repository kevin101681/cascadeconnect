/**
 * TWILIO INBOUND SMS WEBHOOK
 * Receives incoming SMS messages from Twilio
 * Saves to database and triggers real-time Pusher event
 * December 29, 2025
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { smsThreads, smsMessages, homeowners } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { getPusherServer, triggerSmsMessageEvent } from '../../lib/pusher-server';
import type { Handler, HandlerEvent } from '@netlify/functions';

/**
 * Validate Twilio request signature for security
 */
function validateTwilioRequest(event: HandlerEvent): boolean {
  try {
    const twilioSignature = event.headers['x-twilio-signature'];
    if (!twilioSignature) {
      console.warn('⚠️ Missing Twilio signature header');
      return false;
    }

    // TODO: Implement full signature validation using twilio.validateRequest
    // For now, we'll accept all requests but log the signature
    console.log('🔐 Twilio signature present:', twilioSignature.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('❌ Error validating Twilio request:', error);
    return false;
  }
}

/**
 * Parse form-urlencoded data from Twilio
 */
function parseFormData(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = body.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    }
  }
  return params;
}

/**
 * Normalize phone number for consistent matching
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove +1 prefix, spaces, dashes, parentheses, keep only digits
  return phone
    .replace(/^\+1/, '')
    .replace(/\D/g, '')
    .trim();
}

export const handler: Handler = async (event) => {
  console.log('📱 [TWILIO WEBHOOK] Incoming SMS webhook request');

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'text/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Method not allowed</Message></Response>',
    };
  }

  // Validate Twilio request (basic check)
  if (!validateTwilioRequest(event)) {
    console.warn('⚠️ Invalid Twilio request signature');
    // Still process but log the warning
  }

  try {
    // Parse Twilio form data
    let body: Record<string, string>;
    if (event.isBase64Encoded && event.body) {
      const rawBody = Buffer.from(event.body, 'base64').toString('utf-8');
      body = parseFormData(rawBody);
    } else {
      body = parseFormData(event.body || '');
    }

    const fromPhone = body.From;
    const messageBody = body.Body;
    const messageSid = body.MessageSid;

    if (!fromPhone || !messageBody) {
      console.error('❌ Missing From or Body in Twilio webhook');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/xml' },
        body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      };
    }

    console.log(`📨 SMS from ${fromPhone}: "${messageBody.substring(0, 50)}${messageBody.length > 50 ? '...' : ''}"`);

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not configured');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/xml' },
        body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      };
    }

    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    // Normalize phone number for matching
    const normalizedPhone = normalizePhoneNumber(fromPhone);
    console.log(`🔍 Looking up homeowner by phone: ${fromPhone} (normalized: ${normalizedPhone})`);

    // Find homeowner by phone number
    const allHomeowners = await db.select().from(homeowners);
    const matchedHomeowner = allHomeowners.find(h => {
      if (!h.phone) return false;
      const homeownerPhone = normalizePhoneNumber(h.phone);
      return homeownerPhone === normalizedPhone || h.phone === fromPhone;
    });

    if (!matchedHomeowner) {
      console.log(`⚠️ No homeowner found for phone ${fromPhone}`);
      // Return success to Twilio (prevents retries)
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      };
    }

    console.log(`✅ Matched homeowner: ${matchedHomeowner.name} (${matchedHomeowner.id})`);

    // Find or create SMS thread for this homeowner
    let thread = await db
      .select()
      .from(smsThreads)
      .where(eq(smsThreads.homeownerId, matchedHomeowner.id))
      .limit(1);

    let threadId: string;

    if (thread.length === 0) {
      // Create new thread
      console.log('📝 Creating new SMS thread');
      const newThread = await db
        .insert(smsThreads)
        .values({
          homeownerId: matchedHomeowner.id,
          phoneNumber: fromPhone,
          lastMessageAt: new Date(),
        } as any)
        .returning();
      threadId = newThread[0].id;
      console.log(`✅ Created thread: ${threadId}`);
    } else {
      threadId = thread[0].id;
      // Update last message timestamp
      await db
        .update(smsThreads)
        .set({ lastMessageAt: new Date() } as any)
        .where(eq(smsThreads.id, threadId));
      console.log(`✅ Updated existing thread: ${threadId}`);
    }

    // Save inbound message
    const newMessage = await db
      .insert(smsMessages)
      .values({
        threadId,
        direction: 'inbound',
        body: messageBody,
        twilioSid: messageSid,
        status: 'received',
      } as any)
      .returning();

    const savedMessage = newMessage[0];
    console.log(`✅ Saved inbound message: ${savedMessage.id}`);

    // Trigger Pusher event for real-time update
    try {
      await triggerSmsMessageEvent({
        id: savedMessage.id,
        threadId: threadId,
        homeownerId: matchedHomeowner.id,
        direction: 'inbound',
        body: messageBody,
        phoneNumber: fromPhone,
        createdAt: savedMessage.createdAt || new Date(),
      });
      console.log('📡 Pusher event triggered successfully');
    } catch (pusherError) {
      console.error('❌ Failed to trigger Pusher event:', pusherError);
      // Don't fail the webhook if Pusher fails
    }

    // Return empty TwiML response (no auto-reply)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    };
  } catch (error) {
    console.error('❌ Error processing SMS webhook:', error);
    // Always return 200 to Twilio to prevent retries
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    };
  }
};

