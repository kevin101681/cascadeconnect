import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { calls, homeowners, claims, users } from '../../db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';

/**
 * VAPI WEBHOOK - UNIVERSAL EMAIL NOTIFICATIONS
 * 
 * Sends email for EVERY call with dynamic content:
 * - Scenario A: Claim created (warranty_issue + matched)
 * - Scenario B: Match found, no claim (other intent)
 * - Scenario C: No match / unknown caller
 */

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Fetch call data from Vapi API as a fallback
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
 * Calculate similarity between two strings
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
 * Normalize address for comparison
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
 * Find matching homeowner by address
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
 * UNIVERSAL EMAIL NOTIFICATION
 * Sends email for EVERY call with dynamic content based on scenario
 */
async function sendUniversalEmailNotification(
  scenario: 'CLAIM_CREATED' | 'MATCH_NO_CLAIM' | 'NO_MATCH',
  data: {
    propertyAddress: string | null;
    homeownerName: string | null;
    phoneNumber: string | null;
    issueDescription: string | null;
    callIntent: string | null;
    isUrgent: boolean;
    isVerified: boolean;
    matchedHomeownerId: string | null;
    matchedHomeownerName: string | null;
    claimNumber: string | null;
    claimId: string | null;
    vapiCallId: string;
    similarity: number | null;
  },
  db: any
): Promise<void> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('⚠️ SendGrid not configured, skipping email');
      return;
    }

    // Get admin emails
    const adminEmails = await getAdminEmails(db);
    const recipientEmail = adminEmails.length > 0 
      ? adminEmails[0] 
      : (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SENDGRID_REPLY_EMAIL || 'info@cascadebuilderservices.com');
    
    console.log(`📧 Sending ${scenario} email to: ${recipientEmail}`);

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://www.cascadeconnect.app';
    const callsLink = `${appUrl}#ai-intake`;
    const homeownerLink = data.matchedHomeownerId ? `${appUrl}#dashboard?homeownerId=${data.matchedHomeownerId}` : null;
    const claimLink = data.claimId ? `${appUrl}#claims?claimId=${data.claimId}` : null;

    let subject = '';
    let headerTitle = '';
    let scenarioDescription = '';
    let statusBadge = '';
    let primaryCta = { text: '', link: '', color: '' };

    // ====================================
    // SCENARIO A: CLAIM CREATED
    // ====================================
    if (scenario === 'CLAIM_CREATED') {
      subject = `🚨 New Warranty Claim: ${data.propertyAddress || 'Unknown Address'}`;
      headerTitle = '🚨 New Warranty Claim Created';
      scenarioDescription = `A warranty claim has been automatically created for ${data.matchedHomeownerName || data.homeownerName || 'this homeowner'}.`;
      statusBadge = '<span style="background-color: #dc3545; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block;">✓ Claim Created</span>';
      primaryCta = { text: 'View Claim', link: claimLink || callsLink, color: '#dc3545' };
    }
    // ====================================
    // SCENARIO B: MATCH FOUND, NO CLAIM
    // ====================================
    else if (scenario === 'MATCH_NO_CLAIM') {
      subject = `📞 Homeowner Call: ${data.propertyAddress || 'Unknown Address'}`;
      headerTitle = '📞 Homeowner Call Received';
      scenarioDescription = `${data.matchedHomeownerName || data.homeownerName || 'A homeowner'} called, but no claim was automatically created. Intent: ${data.callIntent || 'unknown'}.`;
      statusBadge = '<span style="background-color: #ffc107; color: #333; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block;">✓ Matched - No Claim</span>';
      primaryCta = { text: 'View Homeowner', link: homeownerLink || callsLink, color: '#4CAF50' };
    }
    // ====================================
    // SCENARIO C: NO MATCH / UNKNOWN
    // ====================================
    else {
      subject = `⚠️ Unknown Caller: ${data.phoneNumber || 'No Phone'}`;
      headerTitle = '⚠️ Unknown Caller - Manual Review Required';
      scenarioDescription = `The AI could not match this address to any homeowner in the database. Please review manually and create a homeowner record if needed.`;
      statusBadge = '<span style="background-color: #ff5722; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block;">⚠ Unmatched</span>';
      primaryCta = { text: 'Review Call', link: callsLink, color: '#ff5722' };
    }

    // Add urgency flag to subject if urgent
    if (data.isUrgent) {
      subject = `[URGENT] ${subject}`;
    }

    // Build HTML email body
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <h2 style="color: #6750A4; margin-bottom: 10px; margin-top: 0;">${headerTitle}</h2>
          <div style="margin-bottom: 20px;">${statusBadge}</div>
          <p style="color: #666; font-size: 15px; line-height: 1.6;">${scenarioDescription}</p>
          
          <hr style="border: none; border-top: 2px solid #e0e0e0; margin: 30px 0;">
          
          <!-- Call Information -->
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #333; font-size: 16px;">Call Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${scenario === 'NO_MATCH' ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; width: 160px; color: #666;">Phone Number:</td>
                <td style="padding: 10px 0; color: #333;"><strong>${data.phoneNumber || 'Not provided'}</strong></td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; font-weight: bold; width: 160px; color: #666;">Property Address:</td>
                <td style="padding: 10px 0; color: #333;"><strong>${data.propertyAddress || 'Not provided'}</strong></td>
              </tr>
              ${scenario !== 'NO_MATCH' ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Homeowner:</td>
                <td style="padding: 10px 0; color: #333;">${data.matchedHomeownerName || data.homeownerName || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Phone:</td>
                <td style="padding: 10px 0; color: #333;">${data.phoneNumber || 'Not provided'}</td>
              </tr>
              ` : `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Caller Name:</td>
                <td style="padding: 10px 0; color: #333;">${data.homeownerName || 'Not provided'}</td>
              </tr>
              `}
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Call Intent:</td>
                <td style="padding: 10px 0; color: #333;">${data.callIntent || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Urgency:</td>
                <td style="padding: 10px 0; color: #333;">
                  ${data.isUrgent ? '<span style="color: #dc3545; font-weight: bold;">🔥 URGENT</span>' : 'Normal'}
                </td>
              </tr>
              ${scenario === 'CLAIM_CREATED' ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Claim Number:</td>
                <td style="padding: 10px 0; color: #333;"><strong>#${data.claimNumber}</strong></td>
              </tr>
              ` : ''}
              ${scenario !== 'NO_MATCH' && data.similarity ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Match Quality:</td>
                <td style="padding: 10px 0; color: #333;">${Math.round((data.similarity || 0) * 100)}% similar</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Issue Description -->
          ${data.issueDescription ? `
          <div style="background-color: ${scenario === 'CLAIM_CREATED' ? '#fff3cd' : '#e3f2fd'}; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${scenario === 'CLAIM_CREATED' ? '#ffc107' : '#2196F3'};">
            <h3 style="margin-top: 0; color: #333; font-size: 16px;">${scenario === 'CLAIM_CREATED' ? '🔧 Issue Description' : '💬 Caller Message'}</h3>
            <p style="margin: 0; color: #333; white-space: pre-wrap; line-height: 1.6;">${data.issueDescription}</p>
          </div>
          ` : ''}

          <!-- Action Needed (for NO_MATCH scenario) -->
          ${scenario === 'NO_MATCH' ? `
          <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f44336;">
            <h3 style="margin-top: 0; color: #d32f2f; font-size: 16px;">⚠️ Action Required</h3>
            <p style="margin: 0; color: #666; line-height: 1.6;">
              This caller could not be matched to a homeowner in the database. Please:
            </p>
            <ul style="color: #666; line-height: 1.8; margin-top: 10px;">
              <li>Verify if this is a valid homeowner</li>
              <li>Check if the address was captured correctly</li>
              <li>Add homeowner to database if needed</li>
              <li>Create a claim manually if this is a warranty issue</li>
            </ul>
          </div>
          ` : ''}

          <!-- Primary CTA Button -->
          <div style="margin-top: 30px; text-align: center;">
            <a href="${primaryCta.link}" style="display: inline-block; background-color: ${primaryCta.color}; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 5px;">
              ${primaryCta.text}
            </a>
            ${scenario !== 'NO_MATCH' && homeownerLink && scenario !== 'CLAIM_CREATED' ? `
            <a href="${homeownerLink}" style="display: inline-block; background-color: #4CAF50; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 5px;">
              View Homeowner
            </a>
            ` : ''}
            <a href="${callsLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 5px;">
              View All Calls
            </a>
          </div>

          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 5px 0;">Vapi Call ID: ${data.vapiCallId}</p>
            <p style="margin: 5px 0;">Powered by Cascade Connect AI Intake</p>
          </div>

        </div>
      </div>
    `;

    // Build plain text version
    const textBody = `
${headerTitle}

${scenarioDescription}

CALL INFORMATION
${scenario === 'NO_MATCH' ? `Phone Number: ${data.phoneNumber || 'Not provided'}` : ''}
Property Address: ${data.propertyAddress || 'Not provided'}
${scenario !== 'NO_MATCH' ? `Homeowner: ${data.matchedHomeownerName || data.homeownerName || 'Not provided'}` : `Caller Name: ${data.homeownerName || 'Not provided'}`}
${scenario !== 'NO_MATCH' ? `Phone: ${data.phoneNumber || 'Not provided'}` : ''}
Call Intent: ${data.callIntent || 'Not specified'}
Urgency: ${data.isUrgent ? 'URGENT' : 'Normal'}
${scenario === 'CLAIM_CREATED' ? `Claim Number: #${data.claimNumber}` : ''}
${scenario !== 'NO_MATCH' && data.similarity ? `Match Quality: ${Math.round((data.similarity || 0) * 100)}%` : ''}

${data.issueDescription ? `\nISSUE DESCRIPTION\n${data.issueDescription}\n` : ''}

${scenario === 'NO_MATCH' ? `
ACTION REQUIRED
This caller could not be matched to a homeowner. Please:
- Verify if this is a valid homeowner
- Check if the address was captured correctly
- Add homeowner to database if needed
- Create a claim manually if this is a warranty issue
` : ''}

LINKS
${primaryCta.text}: ${primaryCta.link}
${scenario !== 'NO_MATCH' && homeownerLink ? `View Homeowner: ${homeownerLink}` : ''}
View All Calls: ${callsLink}

---
Vapi Call ID: ${data.vapiCallId}
Powered by Cascade Connect AI Intake
    `.trim();

    // Send email
    const fromEmail = process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || 'noreply@cascadeconnect.app';
    
    const msg = {
      to: recipientEmail,
      from: {
        email: fromEmail,
        name: 'Cascade Connect AI',
      },
      subject: subject,
      text: textBody,
      html: htmlBody,
    };

    const [response] = await sgMail.send(msg);
    
    console.log(`✅ Sent '${scenario}' email successfully:`, {
      statusCode: response.statusCode,
      to: recipientEmail,
      subject: subject,
    });

    // Send to additional admins
    if (adminEmails.length > 1) {
      for (let i = 1; i < adminEmails.length; i++) {
        try {
          const additionalMsg = { ...msg, to: adminEmails[i] };
          await sgMail.send(additionalMsg);
          console.log(`✅ Sent to additional admin: ${adminEmails[i]}`);
        } catch (err) {
          console.error(`❌ Failed to send to ${adminEmails[i]}:`, err);
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ Email notification failed (non-blocking) for scenario '${scenario}':`, error.message);
    if (error.response?.body) {
      console.error('SendGrid error:', error.response.body);
    }
  }
}

/**
 * Main webhook handler
 */
export const handler = async (event: any): Promise<HandlerResponse> => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
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
      console.error('❌ Invalid JSON');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON' }),
      };
    }

    // ==========================================
    // STEP 1: EXTRACTION
    // ==========================================
    console.log(`📦 [${requestId}] STEP 1: Extraction`);
    console.log(`📦 Body keys:`, Object.keys(body));
    
    const message = body.message || body;
    const callData = message.call || body.call || message;
    const messageType = message.type || body.type;
    
    const vapiCallId = callData?.id || callData?.callId || body?.id;
    if (!vapiCallId) {
      console.error('❌ No call ID');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Call ID required' }),
      };
    }

    console.log(`🆔 Call ID: ${vapiCallId}`);

    // Extract structured data
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

    console.log(`🔍 Structured data keys:`, Object.keys(structuredData));

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

    console.log(`📊 Extracted:`, {
      propertyAddress: propertyAddress || 'MISSING',
      homeownerName: homeownerName || 'not provided',
      phoneNumber: phoneNumber || 'not provided',
      callIntent: callIntent || 'not provided',
      isUrgent,
    });

    // API Fallback if propertyAddress missing
    if (!propertyAddress && vapiCallId) {
      console.log(`⚠️ [${requestId}] propertyAddress missing, waiting 2000ms...`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`🔄 [${requestId}] Fetching from Vapi API...`);
        const apiCallData = await fetchVapiCall(vapiCallId);
        
        const apiAnalysis = apiCallData?.analysis || {};
        const apiArtifact = apiCallData?.artifact || {};
        const apiStructuredData = 
          apiAnalysis?.structuredData ||
          apiArtifact?.structuredOutputs ||
          apiArtifact?.structuredData ||
          {};
        
        console.log(`✅ API structured data keys:`, Object.keys(apiStructuredData));
        
        if (apiStructuredData?.propertyAddress && !propertyAddress) {
          propertyAddress = apiStructuredData.propertyAddress;
          console.log(`✅ Got propertyAddress from API: ${propertyAddress}`);
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
        console.error(`❌ API fallback failed:`, apiError.message);
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
      const matchResult = await findMatchingHomeowner(db, propertyAddress, 0.4);
      
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

    if (matchedHomeowner && callIntent === 'warranty_issue') {
      console.log(`📦 [${requestId}] STEP 3: Creating claim`);
      
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
            title: issueDescription || 'Voice Service Request',
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
      console.log(`⏭️ Skipping claim - ${!matchedHomeowner ? 'no match' : `intent is '${callIntent}'`}`);
    }

    // ==========================================
    // STEP 4: UNIVERSAL EMAIL NOTIFICATION
    // (ALWAYS SENT, OUTSIDE ANY IF/ELSE)
    // ==========================================
    console.log(`📧 [${requestId}] STEP 4: Sending universal email notification`);

    const isFinalEvent = 
      messageType === 'end-of-call-report' || 
      messageType === 'function-call' ||
      body.type === 'end-of-call-report' ||
      !!propertyAddress ||
      !!callIntent;

    if (isFinalEvent) {
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

      // Send email with all data
      await sendUniversalEmailNotification(
        scenario,
        {
          propertyAddress: propertyAddress,
          homeownerName: homeownerName,
          phoneNumber: phoneNumber,
          issueDescription: issueDescription,
          callIntent: callIntent,
          isUrgent: isUrgent,
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
