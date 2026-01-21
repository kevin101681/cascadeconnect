import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userContacts } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { normalizePhoneNumber } from '../../lib/utils/phoneNormalization';
import { verifyVapiSecret } from '../../lib/services/vapiService';

/**
 * VAPI GATEKEEPER WEBHOOK
 * 
 * This webhook intercepts incoming calls and routes them based on whether
 * the caller is a known contact (bypass AI) or unknown (engage AI gatekeeper).
 * 
 * Flow:
 * 1. Vapi sends 'assistant-request' when a call comes in
 * 2. We extract the caller's phone number
 * 3. We check if it's in the user_contacts allowlist
 * 4. If YES: Return transfer config to forward directly to Kevin
 * 5. If NO: Return aggressive gatekeeper assistant config
 * 
 * Security: Uses Vapi secret to prevent unauthorized access
 */

interface VapiAssistantRequest {
  message: {
    type: 'assistant-request';
    call: {
      id: string;
      customer?: {
        number?: string;
      };
      phoneNumber?: string;
      from?: string;
    };
  };
}

interface VapiAssistantResponse {
  assistant?: {
    firstMessage?: string;
    model: {
      provider: string;
      model: string;
      messages: Array<{
        role: string;
        content: string;
      }>;
      temperature?: number;
      maxTokens?: number;
    };
    voice?: {
      provider: string;
      voiceId: string;
    };
  };
  transferPlan?: {
    destinations: Array<{
      type: string;
      number?: string;
      message?: string;
    }>;
  };
  error?: string;
}

/**
 * Main webhook handler
 */
export const handler: Handler = async (event) => {
  const requestId = `gatekeeper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🛡️ [VAPI GATEKEEPER] [${requestId}] New incoming call`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(80)}\n`);

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Security: Verify Vapi Secret (supports both x-vapi-secret and Authorization: Bearer)
    let vapiSecret: string | undefined;
    
    // Method 1: Check x-vapi-secret header (original method)
    vapiSecret = 
      event.headers['x-vapi-secret'] || 
      event.headers['X-Vapi-Secret'] ||
      event.headers['X-VAPI-SECRET'];
    
    // Method 2: Check Authorization header with Bearer token (new Netlify Webhook Auth format)
    if (!vapiSecret) {
      const authHeader = 
        event.headers['authorization'] || 
        event.headers['Authorization'];
      
      if (authHeader) {
        // Strip "Bearer " prefix if present
        const match = authHeader.match(/^Bearer\s+(.+)$/i);
        if (match) {
          vapiSecret = match[1];
          console.log(`🔐 Using Bearer token from Authorization header`);
        }
      }
    }
    
    console.log(`🔐 Verifying Vapi secret...`);
    
    // TEMPORARY: Bypass auth for local dev
    const isLocalDev = process.env.NETLIFY_DEV === 'true' || !process.env.CONTEXT;
    if (!isLocalDev && !verifyVapiSecret(vapiSecret)) {
      console.error('❌ Unauthorized: Invalid Vapi secret');
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Parse request body
    let body: VapiAssistantRequest;
    try {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body!, 'base64').toString('utf-8')
        : event.body || '';
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ Invalid JSON in request body');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON' }),
      };
    }

    // Log full payload for debugging
    console.log('📦 Full Vapi Payload:', JSON.stringify(body, null, 2));

    // Verify this is an assistant-request
    if (body.message?.type !== 'assistant-request') {
      console.log(`⚠️ Not an assistant-request, ignoring (type: ${body.message?.type})`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Event ignored' }),
      };
    }

    // Extract caller phone number
    const call = body.message.call;
    const rawPhoneNumber = 
      call.customer?.number || 
      call.phoneNumber || 
      call.from;

    console.log(`📞 Raw caller phone number: ${rawPhoneNumber}`);

    if (!rawPhoneNumber) {
      console.error('❌ No phone number found in request');
      return generateSpamAssistantResponse(requestId, 'Unknown caller (no phone number)');
    }

    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(rawPhoneNumber);
    
    if (!normalizedPhone) {
      console.error(`❌ Failed to normalize phone number: ${rawPhoneNumber}`);
      return generateSpamAssistantResponse(requestId, `Invalid phone number: ${rawPhoneNumber}`);
    }

    console.log(`📞 Normalized phone number: ${normalizedPhone}`);

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not configured');
      return generateSpamAssistantResponse(requestId, 'Database configuration error');
    }

    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    // Check if phone number is in allowlist
    console.log(`🔍 Checking allowlist for ${normalizedPhone}...`);
    
    const contactResults = await db
      .select()
      .from(userContacts)
      .where(eq(userContacts.phoneNumber, normalizedPhone))
      .limit(1);

    const knownContact = contactResults[0] || null;

    // CONDITION A: Known Contact - Bypass AI and Transfer Directly
    if (knownContact) {
      console.log(`✅ Known contact found: ${knownContact.name || 'Unnamed'} (${knownContact.phoneNumber})`);
      console.log(`🔄 Bypassing AI Gatekeeper - Transferring call directly...`);
      
      return generateTransferResponse(requestId, knownContact.name);
    }

    // CONDITION B: Unknown Contact - Engage Aggressive AI Gatekeeper
    console.log(`⚠️ Unknown contact: ${normalizedPhone}`);
    console.log(`🛡️ Engaging AI Gatekeeper (aggressive mode)...`);
    
    return generateSpamAssistantResponse(requestId, null);

  } catch (error: any) {
    console.error(`❌ [${requestId}] Gatekeeper error:`, error.message);
    console.error('Stack:', error.stack);
    
    // On error, default to aggressive gatekeeper (fail secure)
    return generateSpamAssistantResponse(requestId, `Error: ${error.message}`);
  }
};

/**
 * Generate response to transfer call to Kevin (known contact)
 */
function generateTransferResponse(
  requestId: string,
  contactName: string | null
): { statusCode: number; headers: Record<string, string>; body: string } {
  console.log(`✅ [${requestId}] Generating transfer response for known contact: ${contactName}`);
  
  // Transfer to Telnyx phone number (which will forward to mobile via SIP)
  const telnyxNumber = process.env.TELNYX_PHONE_NUMBER || process.env.KEVIN_PHONE_NUMBER || '+15551234567';
  
  console.log(`🔄 Transferring to Telnyx number: ${telnyxNumber}`);
  
  const response: VapiAssistantResponse = {
    transferPlan: {
      destinations: [
        {
          type: 'number',
          number: telnyxNumber,
          message: '', // Empty message = silent transfer (no robot voice)
        },
      ],
    },
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response),
  };
}

/**
 * Generate response for aggressive AI gatekeeper (unknown contact)
 */
function generateSpamAssistantResponse(
  requestId: string,
  debugInfo: string | null
): { statusCode: number; headers: Record<string, string>; body: string } {
  console.log(`🛡️ [${requestId}] Generating aggressive gatekeeper response`);
  if (debugInfo) {
    console.log(`   Debug info: ${debugInfo}`);
  }
  
  const response: VapiAssistantResponse = {
    assistant: {
      firstMessage: "Who is this and what do you want?",
      model: {
        provider: 'openai',
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a strict AI Gatekeeper protecting Kevin from spam calls.

YOUR MISSION: Block ALL spam and sales calls. Be suspicious, direct, and ruthless.

RULES:
1. Answer immediately with: "Who is this and what do you want?"
2. If they sound like a salesperson (ANY sales indicators), say: "Remove this number from your list" and HANG UP
3. If they're vague or evasive, HANG UP
4. Only let them through if they provide SPECIFIC, VERIFIABLE information:
   - Specific name AND reason ("This is Dr. Smith's office about your Tuesday appointment")
   - Delivery confirmation with address
   - Emergency from known service (utility company reporting outage)

SPAM INDICATORS (hang up immediately):
- Selling ANYTHING (solar, insurance, warranties, services, etc.)
- "Is the homeowner available?" or "Can I speak to the business owner?"
- "This is not a sales call" (it always is)
- Political campaigns, surveys, fundraising
- Verifying information, updating records
- Unknown company names or generic names

DO NOT:
- Be polite to spammers (they waste time)
- Give second chances
- Ask follow-up questions unless they seem legitimate

BE BRUTAL. Protect Kevin's time.`,
          },
        ],
        temperature: 0.3, // Low temperature = more consistent, less creative
        maxTokens: 150, // Keep responses short and direct
      },
      voice: {
        provider: 'elevenlabs',
        voiceId: '21m00Tcm4TlvDq8ikWAM', // Default ElevenLabs voice (you can customize)
      },
    },
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response),
  };
}
