import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { calls, homeowners, claims, users } from '../../db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';

/**
 * VAPI WEBHOOK - COMPLETELY REWRITTEN
 * 
 * Features:
 * 1. Robust data extraction from multiple locations
 * 2. API fallback with 2-second delay if data is missing
 * 3. Fuzzy address matching against homeowners table
 * 4. Automatic claim creation for warranty_issue intent
 * 5. Direct SendGrid email notification with safety wrapper
 */

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Fetch call data from Vapi API as a fallback if webhook payload is incomplete
 */
async function fetchVapiCall(callId: string): Promise<any> {
  const vapiSecret = process.env.VAPI_SECRET;
  if (!vapiSecret) {
    throw new Error('VAPI_SECRET not configured');
  }

  const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${vapiSecret}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vapi API error: ${response.status} - ${errorText}`);
  }

  const callData = await response.json();
  console.log(`🔄 Webhook empty. Fetched data from API.`);
  return callData;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
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
    .replace(/\s+/g, ' ')
    .replace(/[.,#]/g, '')
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
 * Calculate Levenshtein distance
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
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
 * Get admin emails from database
 */
async function getAdminEmails(db: any): Promise<string[]> {
  try {
    const admins = await db
      .select()
      .from(users)
      .where(eq(users.role, 'ADMIN'));
    
    const adminEmails = admins
      .map((admin: any) => admin.email)
      .filter((email: string) => {
        // Filter out mock/test emails
        return email && 
               !email.includes('mock') && 
               !email.includes('test') && 
               !email.includes('example.com');
      });
    
    return adminEmails;
  } catch (error) {
    console.error('❌ Error fetching admin emails:', error);
    return [];
  }
}

/**
 * Send email notification via SendGrid
 * Wrapped in try/catch so failures don't break the webhook
 */
async function sendEmailNotification(
  propertyAddress: string,
  summary: string,
  homeownerName: string | null,
  phoneNumber: string | null,
  isUrgent: boolean,
  isVerified: boolean,
  matchedHomeownerId: string | null,
  vapiCallId: string,
  db: any
): Promise<void> {
  try {
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.log('⚠️ SendGrid not configured, skipping email notification');
      return;
    }

    // Get admin emails from database
    const adminEmails = await getAdminEmails(db);
    
    // Fallback to environment variable if no admins in database
    const recipientEmail = adminEmails.length > 0 
      ? adminEmails[0] 
      : (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SENDGRID_REPLY_EMAIL || 'info@cascadebuilderservices.com');
    
    console.log(`📧 Sending email to admin: ${recipientEmail}`);

    // Import SendGrid
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Build email subject
    const urgencyTag = isUrgent ? '[URGENT] ' : '';
    const verifiedTag = isVerified ? '[VERIFIED] ' : '[UNVERIFIED] ';
    const subject = `${urgencyTag}${verifiedTag}New Voice Claim: ${propertyAddress}`;

    // Build dashboard link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://www.cascadeconnect.app';
    const callsLink = `${appUrl}#ai-intake`;
    const homeownerLink = matchedHomeownerId 
      ? `${appUrl}#dashboard?homeownerId=${matchedHomeownerId}` 
      : null;

    // Build email body
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6750A4; margin-bottom: 20px;">🎙️ New Voice Claim Received</h2>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #333;">Call Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 150px;">Homeowner:</td>
              <td style="padding: 8px 0;">${homeownerName || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
              <td style="padding: 8px 0;">${phoneNumber || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0;"><strong>${propertyAddress || 'Not provided'}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0;">
                ${isVerified 
                  ? '<span style="color: green; font-weight: bold;">✓ Verified (Matched)</span>' 
                  : '<span style="color: orange; font-weight: bold;">⚠ Unverified</span>'}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Urgent:</td>
              <td style="padding: 8px 0;">
                ${isUrgent 
                  ? '<span style="color: red; font-weight: bold;">YES</span>' 
                  : 'No'}
              </td>
            </tr>
          </table>
        </div>

        ${summary ? `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0; color: #333;">Summary</h3>
          <p style="margin: 0; color: #333; white-space: pre-wrap;">${summary}</p>
        </div>
        ` : ''}

        <div style="margin-top: 30px; text-align: center;">
          <a href="${callsLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; margin: 5px;">
            View in Dashboard
          </a>
          ${homeownerLink ? `
          <a href="${homeownerLink}" style="display: inline-block; background-color: #4CAF50; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; margin: 5px;">
            View Homeowner
          </a>
          ` : ''}
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
          Call ID: ${vapiCallId}
        </div>
      </div>
    `;

    const textBody = `
New Voice Claim Received

Homeowner: ${homeownerName || 'Not provided'}
Phone: ${phoneNumber || 'Not provided'}
Property Address: ${propertyAddress || 'Not provided'}
Status: ${isVerified ? 'Verified (Matched)' : 'Unverified'}
Urgent: ${isUrgent ? 'YES' : 'No'}

${summary ? `Summary:\n${summary}\n` : ''}

View in Dashboard: ${callsLink}
${homeownerLink ? `View Homeowner: ${homeownerLink}\n` : ''}

Call ID: ${vapiCallId}
    `.trim();

    // Send email
    const fromEmail = process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || 'noreply@cascadeconnect.app';
    
    const msg = {
      to: recipientEmail,
      from: {
        email: fromEmail,
        name: 'Cascade Connect',
      },
      subject: subject,
      text: textBody,
      html: htmlBody,
    };

    const [response] = await sgMail.send(msg);
    
    console.log(`✅ Email sent successfully:`, {
      statusCode: response.statusCode,
      to: recipientEmail,
      subject: subject,
    });

    // Send to additional admins if available
    if (adminEmails.length > 1) {
      for (let i = 1; i < adminEmails.length; i++) {
        try {
          const additionalMsg = { ...msg, to: adminEmails[i] };
          await sgMail.send(additionalMsg);
          console.log(`✅ Email sent to additional admin: ${adminEmails[i]}`);
        } catch (err) {
          console.error(`❌ Failed to send to ${adminEmails[i]}:`, err);
        }
      }
    }
  } catch (error: any) {
    // Log the error but don't throw - we don't want email failures to break the webhook
    console.error('❌ Email notification failed (non-blocking):', error.message);
    if (error.response?.body) {
      console.error('SendGrid error details:', error.response.body);
    }
  }
}

/**
 * Main webhook handler
 */
export const handler = async (event: any): Promise<HandlerResponse> => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  console.log(`\n🚀 [VAPI WEBHOOK] [${requestId}] New webhook received at ${new Date().toISOString()}`);

  try {
    // Security: Verify Vapi Secret
    const vapiSecret = 
      event.headers['x-vapi-secret'] || 
      event.headers['X-Vapi-Secret'] ||
      event.headers['X-VAPI-SECRET'];
    
    const expectedSecret = process.env.VAPI_SECRET;
    
    if (!expectedSecret) {
      console.error('❌ VAPI_SECRET not configured');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }
    
    if (!vapiSecret || vapiSecret !== expectedSecret) {
      console.error('❌ Invalid Vapi secret');
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

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ Invalid JSON payload');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON' }),
      };
    }

    // ==========================================
    // STEP 1: DEEP LOGGING
    // ==========================================
    console.log(`📦 [${requestId}] STEP 1: Deep Logging`);
    console.log(`📦 [${requestId}] Full body structure (first 1000 chars):`, JSON.stringify(body).substring(0, 1000));
    console.log(`📦 [${requestId}] Body keys:`, Object.keys(body));
    
    const message = body.message || body;
    const callData = message.call || body.call || message;
    const messageType = message.type || body.type;
    
    console.log(`📦 [${requestId}] Message type: ${messageType || 'unknown'}`);
    console.log(`📦 [${requestId}] Message keys:`, message ? Object.keys(message) : []);
    console.log(`📦 [${requestId}] Call data keys:`, callData ? Object.keys(callData) : []);

    // Extract call ID
    const vapiCallId = callData?.id || callData?.callId || body?.id;
    if (!vapiCallId) {
      console.error('❌ No call ID found');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Call ID required' }),
      };
    }

    console.log(`🆔 [${requestId}] Call ID: ${vapiCallId}`);

    // ==========================================
    // STEP 2: SMART EXTRACTION
    // ==========================================
    console.log(`📦 [${requestId}] STEP 2: Smart Extraction`);
    
    // Look for structuredData in multiple locations
    const analysis = message?.analysis || callData?.analysis || body?.analysis || {};
    const artifact = message?.artifact || callData?.artifact || body?.artifact || {};
    
    let structuredData = 
      message?.analysis?.structuredData ||
      message?.artifact?.structuredOutputs ||
      message?.structuredData ||
      analysis?.structuredData || 
      artifact?.structuredOutputs ||
      artifact?.structuredData ||
      {};

    console.log(`🔍 [${requestId}] Structured data keys:`, Object.keys(structuredData));
    if (Object.keys(structuredData).length > 0) {
      console.log(`🔍 [${requestId}] Structured data:`, JSON.stringify(structuredData, null, 2));
    }

    // Extract fields
    let propertyAddress = 
      structuredData?.propertyAddress || 
      structuredData?.property_address ||
      structuredData?.address ||
      callData?.propertyAddress ||
      callData?.address ||
      null;

    let homeownerName = 
      structuredData?.homeownerName || 
      structuredData?.homeowner_name ||
      structuredData?.name ||
      callData?.homeownerName ||
      null;

    let phoneNumber = 
      structuredData?.phoneNumber || 
      structuredData?.phone_number ||
      callData?.phoneNumber ||
      callData?.from ||
      null;

    let issueDescription = 
      structuredData?.issueDescription || 
      structuredData?.issue_description ||
      structuredData?.description ||
      null;

    let callIntent = 
      structuredData?.callIntent || 
      structuredData?.call_intent ||
      structuredData?.intent ||
      null;

    let isUrgent = 
      structuredData?.isUrgent === true || 
      structuredData?.is_urgent === true ||
      structuredData?.urgent === true ||
      callIntent === 'urgent' ||
      false;

    const transcript = callData?.transcript || callData?.transcription || message?.transcript || null;
    const recordingUrl = callData?.recordingUrl || callData?.recording_url || null;

    console.log(`📊 [${requestId}] Extracted (before API fallback):`, {
      propertyAddress: propertyAddress || 'MISSING',
      homeownerName: homeownerName || 'not provided',
      phoneNumber: phoneNumber || 'not provided',
      callIntent: callIntent || 'not provided',
      isUrgent,
    });

    // ==========================================
    // STEP 3: API FALLBACK (Critical Fix)
    // ==========================================
    if (!propertyAddress && vapiCallId) {
      console.log(`⚠️ [${requestId}] STEP 3: propertyAddress missing, waiting 2000ms before API fallback...`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`🔄 [${requestId}] Fetching from Vapi API...`);
        const apiCallData = await fetchVapiCall(vapiCallId);
        
        // Extract from API response
        const apiAnalysis = apiCallData?.analysis || {};
        const apiArtifact = apiCallData?.artifact || {};
        const apiStructuredData = 
          apiAnalysis?.structuredData ||
          apiArtifact?.structuredOutputs ||
          apiArtifact?.structuredData ||
          {};
        
        console.log(`✅ [${requestId}] API structured data keys:`, Object.keys(apiStructuredData));
        
        // Update missing fields
        if (apiStructuredData?.propertyAddress && !propertyAddress) {
          propertyAddress = apiStructuredData.propertyAddress;
          console.log(`✅ [${requestId}] Got propertyAddress from API: ${propertyAddress}`);
        }
        if (apiStructuredData?.homeownerName && !homeownerName) {
          homeownerName = apiStructuredData.homeownerName;
        }
        if (apiStructuredData?.phoneNumber && !phoneNumber) {
          phoneNumber = apiStructuredData.phoneNumber;
        }
        if (apiStructuredData?.issueDescription && !issueDescription) {
          issueDescription = apiStructuredData.issueDescription;
        }
        if (apiStructuredData?.callIntent && !callIntent) {
          callIntent = apiStructuredData.callIntent;
        }
        if (apiStructuredData?.isUrgent !== undefined && !isUrgent) {
          isUrgent = apiStructuredData.isUrgent === true;
        }
      } catch (apiError: any) {
        console.error(`❌ [${requestId}] API fallback failed:`, apiError.message);
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
    // STEP 4: DATABASE LOGIC - Fuzzy Match
    // ==========================================
    console.log(`📦 [${requestId}] STEP 4: Database Matching`);
    
    let matchedHomeowner: any = null;
    let similarity: number = 0;
    let isVerified = false;

    if (propertyAddress) {
      console.log(`🔍 [${requestId}] Fuzzy matching address: "${propertyAddress}"`);
      const matchResult = await findMatchingHomeowner(db, propertyAddress, 0.4);
      
      if (matchResult) {
        matchedHomeowner = matchResult.homeowner;
        similarity = matchResult.similarity;
        isVerified = true;
        console.log(`✅ [${requestId}] Matched homeowner ${matchedHomeowner.id} (similarity: ${similarity.toFixed(3)})`);
      } else {
        console.log(`⚠️ [${requestId}] No match found for: "${propertyAddress}"`);
      }
    } else {
      console.log(`⚠️ [${requestId}] No propertyAddress available for matching`);
    }

    // Insert/update call record
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

      console.log(`✅ [${requestId}] Call saved to database`);
    } catch (dbError: any) {
      console.error(`❌ [${requestId}] Database error:`, dbError.message);
      // Continue processing even if DB save fails
    }

    // ==========================================
    // STEP 5: CREATE CLAIM (if warranty_issue)
    // ==========================================
    if (matchedHomeowner && callIntent === 'warranty_issue') {
      console.log(`📦 [${requestId}] STEP 5: Creating claim for warranty_issue`);
      
      try {
        // Check for duplicate claims
        const hasDuplicate = await hasRecentOpenClaim(db, matchedHomeowner.id);
        
        if (hasDuplicate) {
          console.log(`⏭️ [${requestId}] Duplicate claim detected, skipping`);
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
          
          const claimNumber = (maxNumber + 1).toString();
          
          // Insert claim
          await db.insert(claims).values({
            homeownerId: matchedHomeowner.id,
            homeownerName: matchedHomeowner.name,
            homeownerEmail: matchedHomeowner.email,
            builderName: matchedHomeowner.builder || null,
            jobName: matchedHomeowner.jobName || null,
            address: matchedHomeowner.address,
            title: issueDescription || 'Voice Service Request',
            description: issueDescription || 'Service request from AI voice intake',
            category: 'General',
            claimNumber: claimNumber,
            status: 'SUBMITTED',
            classification: 'Unclassified',
            summary: issueDescription,
            dateSubmitted: new Date(),
          } as any);
          
          console.log(`✅ [${requestId}] Claim #${claimNumber} created`);
        }
      } catch (claimError: any) {
        console.error(`❌ [${requestId}] Claim creation error:`, claimError.message);
      }
    } else if (callIntent && callIntent !== 'warranty_issue') {
      console.log(`⏭️ [${requestId}] Skipping claim - intent is '${callIntent}'`);
    }

    // ==========================================
    // STEP 6: EMAIL NOTIFICATION (Safe Wrapper)
    // ==========================================
    const isFinalEvent = 
      messageType === 'end-of-call-report' || 
      messageType === 'function-call' ||
      body.type === 'end-of-call-report' ||
      !!propertyAddress ||
      !!callIntent;

    if (isFinalEvent) {
      console.log(`📧 [${requestId}] STEP 6: Sending email notification`);
      
      // This is wrapped in try/catch inside the function
      await sendEmailNotification(
        propertyAddress || 'Address not provided',
        issueDescription || 'No description provided',
        homeownerName,
        phoneNumber,
        isUrgent,
        isVerified,
        matchedHomeowner?.id || null,
        vapiCallId,
        db
      );
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
    
    // Still return 200 to prevent Vapi retries
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  }
};
