import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { calls, homeowners, claims } from '../../db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 and 1, where 1 is identical and 0 is completely different
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeAddress(str1);
  const s2 = normalizeAddress(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  
  return 1 - (distance / maxLen);
}

/**
 * Normalize address string for comparison
 */
function normalizeAddress(address: string): string {
  if (!address) return '';
  
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[.,#]/g, '') // Remove common punctuation
    .replace(/\bstreet\b/gi, 'st')
    .replace(/\bavenue\b/gi, 'ave')
    .replace(/\broad\b/gi, 'rd')
    .replace(/\bdrive\b/gi, 'dr')
    .replace(/\bcourt\b/gi, 'ct')
    .replace(/\blane\b/gi, 'ln')
    .replace(/\bboulevard\b/gi, 'blvd')
    .replace(/\bway\b/gi, 'wy')
    .replace(/\bcircle\b/gi, 'cir')
    .replace(/\bplace\b/gi, 'pl');
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Find matching homeowner by address using fuzzy matching
 */
async function findMatchingHomeowner(
  db: any,
  address: string,
  minSimilarity: number = 0.4
): Promise<{ homeowner: any; similarity: number } | null> {
  if (!address || address.trim().length === 0) {
    return null;
  }
  
  // Fetch all homeowners
  const allHomeowners = await db.select().from(homeowners);
  
  let bestMatch: { homeowner: any; similarity: number } | null = null;
  
  for (const homeowner of allHomeowners) {
    const homeownerAddress = homeowner.address || '';
    const similarity = calculateSimilarity(address, homeownerAddress);
    
    if (similarity >= minSimilarity) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { homeowner, similarity };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Check for duplicate claims in the last 24 hours
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
 * Create a claim from a call if urgent and matched
 */
async function createClaimFromCall(
  db: any,
  callData: any,
  homeownerId: string,
  homeowner: any
): Promise<void> {
  // Check for duplicate claims
  const hasRecentClaim = await hasRecentOpenClaim(db, homeownerId);
  if (hasRecentClaim) {
    console.log(`⏭️ [VAPI WEBHOOK] Skipping claim creation - duplicate claim exists for homeowner ${homeownerId} in last 24 hours`);
    return;
  }
  
  // Get the next claim number for this homeowner
  const existingClaims = await db
    .select()
    .from(claims)
    .where(eq(claims.homeownerId, homeownerId));
  
  const maxNumber = existingClaims
    .map(c => {
      const num = c.claimNumber ? parseInt(c.claimNumber, 10) : 0;
      return isNaN(num) ? 0 : num;
    })
    .reduce((max, num) => Math.max(max, num), 0);
  
  const claimNumber = (maxNumber + 1).toString();
  
  // Create the claim
  await db.insert(claims).values({
    homeownerId: homeownerId,
    homeownerName: homeowner.name,
    homeownerEmail: homeowner.email,
    builderName: homeowner.builder || null,
    jobName: homeowner.jobName || null,
    address: homeowner.address,
    title: callData.issueDescription || 'Service Request',
    description: callData.issueDescription || 'Service request from AI intake call',
    category: 'General',
    claimNumber: claimNumber,
    status: 'SUBMITTED',
    classification: 'Unclassified',
    dateSubmitted: new Date(),
  });
  
  console.log(`✅ [VAPI WEBHOOK] Created claim #${claimNumber} for homeowner ${homeownerId}`);
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

  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🚀 [VAPI WEBHOOK] [${requestId}] Webhook endpoint called at ${new Date().toISOString()}`);

  try {
    // 1. Security Check: Verify Vapi Secret
    const vapiSecret = 
      event.headers['x-vapi-secret'] || 
      event.headers['X-Vapi-Secret'] ||
      event.headers['X-VAPI-SECRET'];
    
    const expectedSecret = process.env.VAPI_SECRET;
    
    if (!expectedSecret) {
      console.error('❌ VAPI_SECRET environment variable is not set');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error: VAPI_SECRET not set' }),
      };
    }
    
    if (!vapiSecret || vapiSecret !== expectedSecret) {
      console.error('❌ Webhook authentication failed');
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized: Invalid or missing Vapi secret' }),
      };
    }

    // Get the raw body
    let rawBody: string;
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(event.body, 'base64').toString('utf-8');
    } else {
      rawBody = event.body || '';
    }

    // Parse payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON payload:', parseError);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON payload' }),
      };
    }

    // Handle different payload structures
    const message = payload.message || payload;
    const callData = message.call || payload.call || message;
    const messageType = message.type || payload.type;

    console.log(`📦 [VAPI WEBHOOK] [${requestId}] Received payload summary:`, JSON.stringify({
      type: payload.type || messageType || 'unknown',
      hasMessage: !!payload.message,
      hasCall: !!payload.call || !!message.call,
      hasAnalysis: !!(message.analysis || callData.analysis || payload.analysis),
    }, null, 2));
    
    // Log full payload structure (truncated for large fields)
    console.log(`📦 [VAPI WEBHOOK] [${requestId}] Full payload keys:`, {
      payloadKeys: Object.keys(payload),
      messageKeys: message ? Object.keys(message) : [],
      callDataKeys: callData ? Object.keys(callData) : [],
    });

    // Extract call ID
    const vapiCallId = callData.id || callData.callId || callData.vapiCallId;
    if (!vapiCallId) {
      console.error('❌ No call ID found in payload');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Call ID is required' }),
      };
    }

    console.log(`🆔 [VAPI WEBHOOK] Processing call with ID: ${vapiCallId}`);

    // Extract structured data from Vapi Analysis (Structured Outputs)
    const analysis = message.analysis || callData.analysis || payload.analysis || {};
    const variables = callData.variables || message.variables || payload.variables || {};
    const assistantOverrides = callData.assistantOverrides || message.assistantOverrides || payload.assistantOverrides || {};
    const variableValues = assistantOverrides.variableValues || {};
    
    // Get structured data - prioritize analysis.structuredData, then fallback to other locations
    const structuredData = 
      analysis.structuredData || 
      analysis.extractedData ||
      variables.structuredData ||
      variableValues ||
      {};

    const transcript = callData.transcript || callData.transcription || message.transcript || payload.transcript || null;
    const recordingUrl = callData.recordingUrl || callData.recording_url || message.recordingUrl || payload.recordingUrl || null;

    // Log the full structured data to debug extraction issues
    console.log(`🔍 [VAPI WEBHOOK] Analysis object keys:`, analysis ? Object.keys(analysis) : 'null');
    console.log(`🔍 [VAPI WEBHOOK] Raw structured data keys:`, Object.keys(structuredData));
    if (Object.keys(structuredData).length > 0) {
      console.log(`🔍 [VAPI WEBHOOK] Full structured data:`, JSON.stringify(structuredData, null, 2));
    } else {
      console.log(`🔍 [VAPI WEBHOOK] Structured data is empty`);
      console.log(`🔍 [VAPI WEBHOOK] Analysis object:`, JSON.stringify(analysis, null, 2));
      console.log(`🔍 [VAPI WEBHOOK] Variables object:`, JSON.stringify(variables, null, 2));
      console.log(`🔍 [VAPI WEBHOOK] VariableValues object:`, JSON.stringify(variableValues, null, 2));
    }
    
    // Also check callData and message for address fields directly
    console.log(`🔍 [VAPI WEBHOOK] CallData address fields:`, {
      propertyAddress: callData.propertyAddress || callData.property_address || 'not found',
      address: callData.address || 'not found',
      property: callData.property || 'not found',
    });
    console.log(`🔍 [VAPI WEBHOOK] Message address fields:`, {
      propertyAddress: message.propertyAddress || message.property_address || 'not found',
      address: message.address || 'not found',
      property: message.property || 'not found',
    });

    // Extract data using exact Vapi Structured Output keys
    // These keys come directly from Vapi's Structured Outputs (Analysis)
    // Try multiple possible key variations
    const propertyAddress = 
      structuredData.propertyAddress || 
      structuredData.property_address ||
      structuredData.address ||
      callData.propertyAddress ||
      callData.property_address ||
      null;
    const callerType = structuredData.callerType || null;
    const callIntent = structuredData.callIntent || null;
    const issueDescription = structuredData.issueDescription || null;

    // Also check other possible locations for propertyAddress
    const propertyAddressFromCall = callData.propertyAddress || callData.property_address || callData.address || null;
    const propertyAddressFromMessage = message.propertyAddress || message.property_address || message.address || null;
    const finalPropertyAddress = propertyAddress || propertyAddressFromCall || propertyAddressFromMessage;

    console.log(`📊 [VAPI WEBHOOK] Extracted Structured Data:`, {
      propertyAddress: finalPropertyAddress || 'not provided',
      propertyAddressSource: propertyAddress ? 'structuredData' : propertyAddressFromCall ? 'callData' : propertyAddressFromMessage ? 'message' : 'none',
      callerType: callerType || 'not provided',
      callIntent: callIntent || 'not provided',
      issueDescription: issueDescription ? (issueDescription.substring(0, 100) + '...') : 'not provided',
    });

    // Extract other call data (not from structured outputs)
    const homeownerName = 
      structuredData.homeowner_name || 
      structuredData.homeownerName || 
      structuredData.name ||
      callData.homeownerName ||
      null;

    const phoneNumber = 
      structuredData.phone_number || 
      structuredData.phoneNumber ||
      callData.phoneNumber ||
      callData.from ||
      null;

    // Determine urgency (can be derived from callIntent or other fields if needed)
    const isUrgent = 
      structuredData.is_urgent === true || 
      structuredData.isUrgent === true || 
      structuredData.urgent === true ||
      callIntent === 'urgent' ||
      false;

    // Determine if this is a final event (with structured data)
    // Vapi sends multiple webhooks during a call - we only want to process the final one
    const isFinalEvent = 
      messageType === 'end-of-call-report' || 
      messageType === 'function-call' ||
      payload.type === 'end-of-call-report' || 
      payload.type === 'function-call' ||
      !!structuredData?.propertyAddress || // Has structured data
      !!structuredData?.callIntent || // Has call intent
      !!analysis?.structuredData; // Has analysis structured data
    
    console.log(`📋 [VAPI WEBHOOK] Event type: ${messageType || payload.type || 'unknown'}, isFinalEvent: ${isFinalEvent}`);

    // Connect to database
    // Check all possible environment variable names (matching other Netlify functions)
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL is not configured. Checked: DATABASE_URL, VITE_DATABASE_URL, NETLIFY_DATABASE_URL');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Database not configured' }),
      };
    }

    console.log(`🔌 [VAPI WEBHOOK] Connecting to database (URL length: ${databaseUrl.length})`);
    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    // Perform fuzzy matching using propertyAddress to find homeowner
    // Only do matching on final events (when we have structured data)
    let matchedHomeowner: any = null;
    let similarity: number = 0;
    let isVerified = false;
    let verifiedBuilderName: string | null = null;
    let verifiedClosingDate: Date | null = null;

    // Use the final propertyAddress (from any source)
    const addressForMatching = finalPropertyAddress;

    // Only attempt matching if we have an address (typically only on final events)
    if (addressForMatching) {
      console.log(`🔍 [VAPI WEBHOOK] Attempting to match address: "${addressForMatching}"`);
      const matchResult = await findMatchingHomeowner(db, addressForMatching, 0.4);
      
      if (matchResult) {
        matchedHomeowner = matchResult.homeowner;
        similarity = matchResult.similarity;
        isVerified = true;
        
        // Pull Builder Name and Closing Date from the matched homeowner record in database
        verifiedBuilderName = matchedHomeowner.builder || null;
        verifiedClosingDate = matchedHomeowner.closingDate ? new Date(matchedHomeowner.closingDate) : null;
        
        console.log(`✅ [VAPI WEBHOOK] Matched homeowner ${matchedHomeowner.id} (similarity: ${similarity.toFixed(3)})`);
        console.log(`📋 [VAPI WEBHOOK] Verified Builder: ${verifiedBuilderName || 'N/A'}, Closing Date: ${verifiedClosingDate ? verifiedClosingDate.toISOString() : 'N/A'}`);
      } else {
        console.log(`⚠️ [VAPI WEBHOOK] No matching homeowner found for address: "${addressForMatching}"`);
      }
    } else {
      console.log(`⚠️ [VAPI WEBHOOK] No propertyAddress provided in any data source (checked structuredData, callData, message)`);
    }

    // Save call record - IMPORTANT: Save ALL calls regardless of matching
    // The dashboard will display all calls; only matched calls can create claims
    // Note: This will upsert (update if exists, insert if new) based on vapiCallId
    // Multiple webhook events may update the same call record as more data arrives
    try {
      await db
        .insert(calls)
        .values({
          vapiCallId: vapiCallId,
          homeownerId: matchedHomeowner?.id || null,
          homeownerName: homeownerName,
          phoneNumber: phoneNumber,
          propertyAddress: addressForMatching,
          issueDescription: issueDescription,
          isUrgent: isUrgent,
          transcript: transcript,
          recordingUrl: recordingUrl,
          isVerified: isVerified, // true if matched, false if not matched
          addressMatchSimilarity: matchedHomeowner ? similarity.toFixed(3) : null,
        } as any)
        .onConflictDoUpdate({
          target: calls.vapiCallId,
          set: {
            homeownerId: matchedHomeowner?.id || null,
            homeownerName: homeownerName,
            phoneNumber: phoneNumber,
            propertyAddress: addressForMatching,
            issueDescription: issueDescription,
            isUrgent: isUrgent,
            transcript: transcript,
            recordingUrl: recordingUrl,
            isVerified: isVerified,
            addressMatchSimilarity: matchedHomeowner ? similarity.toFixed(3) : null,
          } as any,
        });

      console.log(`✅ [VAPI WEBHOOK] Call ${vapiCallId} successfully saved to database.`);
    } catch (dbError) {
      console.error('❌ Database error saving call:', dbError);
      return {
        statusCode: 200, // Return 200 to avoid Vapi retries
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          received: true, 
          warning: 'Call data received but database save failed',
          error: dbError instanceof Error ? dbError.message : 'Unknown database error'
        }),
      };
    }

    // Auto-create claim if matched homeowner AND callIntent is 'warranty_issue'
    // Only on final events with structured data
    // Skip for 'general_question' and 'solicitation'
    if (isFinalEvent && matchedHomeowner && callIntent === 'warranty_issue') {
      try {
        await createClaimFromCall(db, {
          issueDescription,
          homeownerName,
          propertyAddress,
        }, matchedHomeowner.id, matchedHomeowner);
        console.log(`✅ [VAPI WEBHOOK] Created claim for warranty_issue call`);
      } catch (claimError) {
        console.error('❌ Error creating claim from call:', claimError);
        // Don't fail the webhook if claim creation fails
      }
    } else if (matchedHomeowner && callIntent && callIntent !== 'warranty_issue') {
      console.log(`⏭️ [VAPI WEBHOOK] Skipping claim creation - callIntent is '${callIntent}' (only creating for warranty_issue)`);
    } else if (!matchedHomeowner) {
      console.log(`⏭️ [VAPI WEBHOOK] Skipping claim creation - no homeowner match found`);
    }

    // Only process fully (matching, email) on final events with structured data
    // Vapi sends multiple webhooks during a call - we only want to process the final one
    const isFinalEvent = 
      messageType === 'end-of-call-report' || 
      messageType === 'function-call' ||
      payload.type === 'end-of-call-report' || 
      payload.type === 'function-call' ||
      !!structuredData?.propertyAddress || // Has structured data
      !!structuredData?.callIntent || // Has call intent
      !!analysis?.structuredData; // Has analysis structured data
    
    console.log(`📋 [VAPI WEBHOOK] Event type: ${messageType || payload.type || 'unknown'}, isFinalEvent: ${isFinalEvent}`);

    // Send email notification only on final events with structured data
    if (isFinalEvent) {
      console.log(`📧 [VAPI WEBHOOK] Processing final event - attempting to send email for call ${vapiCallId}...`);
      try {
        const savedCall = await db
          .select()
          .from(calls)
          .where(eq(calls.vapiCallId, vapiCallId))
          .limit(1);

        if (savedCall.length > 0) {
          const call = savedCall[0];
          
          // Use verified data that was already retrieved from database during matching
          // These values come from the matched homeowner record (builder and closingDate)
          const builderName = verifiedBuilderName;
          const closingDate = verifiedClosingDate;

          // Determine email endpoint
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://www.cascadeconnect.app';
          const emailUrl = `${appUrl}/api/email/call-completed`;
          
          console.log(`📧 [VAPI WEBHOOK] Sending email request to: ${emailUrl}`);
          
          // Prepare email payload with verified data from database
          const emailPayload = {
            callId: call.id,
            vapiCallId: call.vapiCallId,
            homeownerName: call.homeownerName,
            phoneNumber: call.phoneNumber,
            propertyAddress: call.propertyAddress,
            builderName: builderName, // Verified from database (matched homeowner)
            closingDate: closingDate ? closingDate.toISOString() : null, // Verified from database (matched homeowner)
            isUrgent: call.isUrgent,
            issueDescription: call.issueDescription,
            transcript: call.transcript,
            recordingUrl: call.recordingUrl,
            isVerified: call.isVerified,
            matchedHomeownerId: matchedHomeowner?.id || null,
          };

          const emailResponse = await fetch(emailUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('❌ [VAPI WEBHOOK] Failed to send email notification:', {
              status: emailResponse.status,
              statusText: emailResponse.statusText,
              body: errorText,
            });
          } else {
            console.log(`✅ [VAPI WEBHOOK] Email notification sent successfully for call ${vapiCallId}`);
          }
        }
      } catch (emailError) {
        console.error('❌ [VAPI WEBHOOK] Error sending email notification:', emailError);
        // Don't fail the webhook if email fails
      }
    }

    // Always respond with 200 OK
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Still return 200 to prevent Vapi from retrying
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        received: true, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

