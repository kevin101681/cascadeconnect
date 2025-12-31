import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { calls, homeowners, claims, users } from '../../db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { 
  fetchVapiCall, 
  extractCallDataWithFallback, 
  verifyVapiSecret, 
  isFinalEvent,
  logCallData,
  type VapiWebhookPayload,
  type ExtractedCallData
} from '../../lib/services/vapiService';
import { sendUniversalNotification } from '../../lib/services/emailService';
import { findMatchingHomeowner } from '../../lib/services/homeownerMatchingService';

/**
 * VAPI WEBHOOK - UNIVERSAL EMAIL NOTIFICATIONS
 * 
 * Sends email for EVERY call with dynamic content:
 * - Scenario A: Claim created (warranty_issue + matched)
 * - Scenario B: Match found, no claim (other intent)
 * - Scenario C: No match / unknown caller
 */

/**
 * Extended type for Vapi call payload with customer information
 * The customer object may not be in official SDK types but appears in actual payloads
 */
interface VapiCustomer {
  number?: string;
  id?: string;
  name?: string;
  phoneNumber?: string;
}

interface VapiCallWithCustomer {
  id?: string;
  customer?: VapiCustomer;
  phoneNumber?: string;
  from?: string;
  artifact?: any;
  transcript?: string;
  recordingUrl?: string;
  [key: string]: any;
}

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Check for duplicate claims in last 24 hours
 */
async function hasRecentOpenClaim(
  db: any,
  homeownerId: string
): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentClaims = await db
    .select()
    .from(claims)
    .where(
      and(
        eq(claims.homeownerId, homeownerId),
        gte(claims.dateSubmitted, oneDayAgo),
        inArray(claims.status, ['SUBMITTED', 'REVIEWING', 'SCHEDULING', 'SCHEDULED'])
      )
    )
    .limit(1);
  
  return recentClaims.length > 0;
}

/**
 * Main webhook handler
 */
export const handler = async (event: any): Promise<HandlerResponse> => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 🔍 BLIND LOGGING: Log EVERYTHING before any processing
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 [VAPI WEBHOOK] [${requestId}] New webhook received`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`📍 HTTP Method: ${event.httpMethod}`);
  console.log(`📦 Headers:`, JSON.stringify(event.headers, null, 2));
  console.log(`${'='.repeat(80)}\n`);
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Security: Verify Vapi Secret
    const vapiSecret = 
      event.headers['x-vapi-secret'] || 
      event.headers['X-Vapi-Secret'] ||
      event.headers['X-VAPI-SECRET'];
    
    // DEBUG: Log what we're comparing (only first 10 chars for security)
    console.log(`🔐 Received secret: ${vapiSecret ? vapiSecret.substring(0, 10) + '...' : 'NONE'}`);
    console.log(`🔐 Expected secret: ${process.env.VAPI_SECRET ? process.env.VAPI_SECRET.substring(0, 10) + '...' : 'NOT SET'}`);
    
    // TEMPORARY: Bypass auth for local testing (REMOVE BEFORE PRODUCTION)
    const isLocalDev = process.env.NETLIFY_DEV === 'true' || !process.env.CONTEXT;
    if (isLocalDev && vapiSecret?.startsWith('ferguson')) {
      console.log('⚠️  LOCAL DEV: Auth check bypassed (secret starts with expected prefix)');
    } else if (!verifyVapiSecret(vapiSecret)) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Parse body
    let rawBody: string;
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(event.body, 'base64').toString('utf-8');
    } else {
      rawBody = event.body || '';
    }

    let body: VapiWebhookPayload;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ Invalid JSON');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON' }),
      };
    }

    // 🔍 BLIND LOGGING: Log the COMPLETE payload structure
    console.log('📦 ========== FULL VAPI PAYLOAD ==========');
    console.log(JSON.stringify(body, null, 2));
    console.log('📦 =========================================\n');
    
    // 🔍 Log specific critical fields
    console.log('🔍 Payload Analysis:');
    console.log('  - message.type:', body?.message?.type || 'NOT FOUND');
    console.log('  - call.id:', body?.message?.call?.id || body?.call?.id || 'NOT FOUND');
    console.log('  - artifact exists:', !!(body?.message?.call?.artifact || body?.call?.artifact));
    console.log('  - structuredOutputs exists:', !!(body?.message?.call?.artifact?.structuredOutputs || body?.call?.artifact?.structuredOutputs));
    console.log('');

    // ==========================================
    // STEP 1: EXTRACTION
    // ==========================================
    console.log(`📦 [${requestId}] STEP 1: Extraction with fallback`);
    
    // Use service to extract data with automatic API fallback
    const callData = await extractCallDataWithFallback(body, ['propertyAddress']);
    
    const vapiCallId = callData.vapiCallId;
    if (!vapiCallId) {
      console.error('❌ No call ID');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Call ID required' }),
      };
    }

    console.log(`🆔 Call ID: ${vapiCallId}`);
    logCallData(callData);

    // 📞 PHONE NUMBER FALLBACK: Use Caller ID if extracted phone is missing
    let {
      propertyAddress,
      homeownerName,
      phoneNumber,
      issueDescription,
      callIntent,
      isUrgent,
      transcript,
      recordingUrl
    } = callData;
    
    // Fallback to caller ID if phone number wasn't extracted
    if (!phoneNumber || phoneNumber === 'not provided' || phoneNumber === 'Not Provided') {
      // Safely access call data with proper typing
      const messageCall = body?.message?.call as VapiCallWithCustomer | undefined;
      const payloadCall = body?.call as VapiCallWithCustomer | undefined;
      
      const callerId = messageCall?.customer?.number || 
                       payloadCall?.customer?.number ||
                       messageCall?.phoneNumber ||
                       payloadCall?.phoneNumber ||
                       messageCall?.from ||
                       payloadCall?.from;
      
      if (callerId) {
        console.log(`📞 Using Caller ID as fallback: ${callerId}`);
        phoneNumber = callerId;
      }
    }
    
    // 🎯 CALL INTENT SMART DEFAULT: If missing but has robust issue description, default to 'new_claim'
    if (!callIntent || callIntent === 'not provided') {
      if (issueDescription && issueDescription.length > 20 && issueDescription !== 'not provided') {
        console.log(`🎯 Defaulting callIntent to 'new_claim' (robust issue description detected)`);
        callIntent = 'new_claim';
      } else {
        callIntent = 'other';
      }
    }

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not configured');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Database not configured' }),
      };
    }

    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    // ==========================================
    // STEP 2: DATABASE - Find Homeowner
    // ==========================================
    console.log(`📦 [${requestId}] STEP 2: Database Matching`);
    
    let matchedHomeowner: any = null;
    let similarity: number = 0;
    let isVerified = false;

    if (propertyAddress) {
      console.log(`🔍 Fuzzy matching: "${propertyAddress}"`);
      const matchResult = await findMatchingHomeowner(db, propertyAddress, { minSimilarity: 0.4 });
      
      if (matchResult) {
        matchedHomeowner = matchResult.homeowner;
        similarity = matchResult.similarity;
        isVerified = true;
        console.log(`✅ Matched homeowner ${matchedHomeowner.id} (${Math.round(similarity * 100)}% similar)`);
      } else {
        console.log(`⚠️ No match found`);
      }
    } else {
      console.log(`⚠️ No propertyAddress for matching`);
    }

    // Save call record (ALWAYS, regardless of match)
    try {
      await db
        .insert(calls)
        .values({
          vapiCallId: vapiCallId,
          homeownerId: matchedHomeowner?.id || null,
          homeownerName: homeownerName,
          phoneNumber: phoneNumber,
          propertyAddress: propertyAddress,
          issueDescription: issueDescription,
          isUrgent: isUrgent,
          transcript: transcript,
          recordingUrl: recordingUrl,
          isVerified: isVerified,
          addressMatchSimilarity: matchedHomeowner ? similarity.toFixed(3) : null,
        } as any)
        .onConflictDoUpdate({
          target: calls.vapiCallId,
          set: {
            homeownerId: matchedHomeowner?.id || null,
            homeownerName: homeownerName,
            phoneNumber: phoneNumber,
            propertyAddress: propertyAddress,
            issueDescription: issueDescription,
            isUrgent: isUrgent,
            transcript: transcript,
            recordingUrl: recordingUrl,
            isVerified: isVerified,
            addressMatchSimilarity: matchedHomeowner ? similarity.toFixed(3) : null,
          } as any,
        });

      console.log(`✅ Call saved to database`);
    } catch (dbError: any) {
      console.error(`❌ Database error:`, dbError.message);
    }

    // ==========================================
    // STEP 3: CREATE CLAIM (if applicable)
    // ==========================================
    let claimCreated = false;
    let claimNumber: string | null = null;
    let claimId: string | null = null;

    // Create claim if homeowner matched AND call intent indicates a new claim or emergency
    const shouldCreateClaim = matchedHomeowner && (callIntent === 'new_claim' || callIntent === 'emergency');
    
    if (shouldCreateClaim) {
      console.log(`📦 [${requestId}] STEP 3: Creating claim (intent: ${callIntent})`);
      
      try {
        const hasDuplicate = await hasRecentOpenClaim(db, matchedHomeowner.id);
        
        if (hasDuplicate) {
          console.log(`⏭️ Duplicate claim detected, skipping`);
        } else {
          // Get next claim number
          const existingClaims = await db
            .select()
            .from(claims)
            .where(eq(claims.homeownerId, matchedHomeowner.id));
          
          const maxNumber = existingClaims
            .map((c: any) => {
              const num = c.claimNumber ? parseInt(c.claimNumber, 10) : 0;
              return isNaN(num) ? 0 : num;
            })
            .reduce((max: number, num: number) => Math.max(max, num), 0);
          
          claimNumber = (maxNumber + 1).toString();
          
          // Insert claim
          const insertResult = await db.insert(claims).values({
            homeownerId: matchedHomeowner.id,
            homeownerName: matchedHomeowner.name,
            homeownerEmail: matchedHomeowner.email,
            builderName: matchedHomeowner.builder || null,
            jobName: matchedHomeowner.jobName || null,
            address: matchedHomeowner.address,
            title: 'Call in',
            description: issueDescription || 'Service request from AI voice intake',
            category: 'General',
            claimNumber: claimNumber,
            status: 'SUBMITTED',
            classification: 'Unclassified',
            summary: issueDescription,
            dateSubmitted: new Date(),
          } as any).returning();
          
          claimCreated = true;
          claimId = insertResult[0]?.id || null;
          console.log(`✅ Claim #${claimNumber} created (ID: ${claimId})`);
        }
      } catch (claimError: any) {
        console.error(`❌ Claim creation error:`, claimError.message);
      }
    } else {
      if (!matchedHomeowner) {
        console.log(`⏭️ Skipping claim - no homeowner match found`);
      } else {
        console.log(`⏭️ Skipping claim - intent is '${callIntent}' (requires 'new_claim' or 'emergency')`);
      }
    }

    // ==========================================
    // STEP 4: UNIVERSAL EMAIL NOTIFICATION
    // (ALWAYS SENT, OUTSIDE ANY IF/ELSE)
    // ==========================================
    console.log(`📧 [${requestId}] STEP 4: Sending universal email notification`);

    if (isFinalEvent(body, callData)) {
      // Determine scenario
      let scenario: 'CLAIM_CREATED' | 'MATCH_NO_CLAIM' | 'NO_MATCH';
      
      if (claimCreated) {
        scenario = 'CLAIM_CREATED';
      } else if (matchedHomeowner) {
        scenario = 'MATCH_NO_CLAIM';
      } else {
        scenario = 'NO_MATCH';
      }

      console.log(`📧 Determined scenario: ${scenario}`);

      // Send email using centralized email service
      await sendUniversalNotification(
        scenario,
        {
          propertyAddress: propertyAddress || null,
          homeownerName: homeownerName || null,
          phoneNumber: phoneNumber || null,
          issueDescription: issueDescription || null,
          callIntent: callIntent || null,
          isUrgent: isUrgent || false,
          isVerified: isVerified,
          matchedHomeownerId: matchedHomeowner?.id || null,
          matchedHomeownerName: matchedHomeowner?.name || null,
          claimNumber: claimNumber,
          claimId: claimId,
          vapiCallId: vapiCallId,
          similarity: similarity,
        },
        db
      );
    } else {
      console.log(`⏭️ Not a final event, skipping email`);
    }

    // ==========================================
    // ALWAYS RETURN 200 OK
    // ==========================================
    console.log(`✅ [${requestId}] Webhook processed successfully\n`);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };

  } catch (error: any) {
    console.error(`❌ [${requestId}] Webhook error:`, error.message);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  }
};
