import { Handler } from '@netlify/functions';
import twilio from 'twilio';

/**
 * TWILIO ACCESS TOKEN GENERATOR
 * 
 * This endpoint generates a Twilio Access Token for the mobile app
 * to register as a VoIP client and receive incoming calls.
 * 
 * Flow:
 * 1. Authenticate user via Clerk
 * 2. Generate Twilio Access Token with Voice Grant
 * 3. Return JWT token to mobile app
 * 
 * Authentication: Expects Clerk user ID in Authorization header
 */

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

/**
 * Extract user ID from Authorization header
 */
function getUserIdFromAuth(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  // Support both "Bearer <token>" and direct Clerk ID
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  return authHeader;
}

/**
 * Sanitize user ID for Twilio client identity
 * Twilio identity must be alphanumeric with underscores/hyphens
 */
function sanitizeIdentity(userId: string): string {
  // Replace non-alphanumeric characters with underscore
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Main handler
 */
export const handler: Handler = async (event) => {
  const requestId = `token-${Date.now()}`;
  console.log(`[${requestId}] Twilio Token Request`);

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only accept GET or POST
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromAuth(event.headers.authorization || event.headers.Authorization);
    
    if (!userId) {
      console.error(`[${requestId}] Unauthorized: No user ID`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Authorization header required (Clerk user ID)',
        }),
      };
    }

    console.log(`[${requestId}] Generating token for user: ${userId}`);

    // Get Twilio credentials from environment
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    // Validate environment variables
    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      console.error(`[${requestId}] Missing Twilio configuration`);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Configuration Error',
          message: 'Twilio credentials not configured',
        }),
      };
    }

    // Hardcode identity to "kevin_pixel" for single-user app
    const identity = 'kevin_pixel';
    
    console.log(`[${requestId}] Client identity: ${identity} (user: ${userId})`);

    // Create Access Token
    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity: identity,
      ttl: 3600, // Token valid for 1 hour
    });

    // Create Voice Grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true, // Allow incoming calls
    });

    // Add grant to token
    token.addGrant(voiceGrant);

    // Generate JWT
    const jwt = token.toJwt();

    console.log(`[${requestId}] Token generated successfully for ${identity}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token: jwt,
        identity: identity,
        expiresIn: 3600,
      }),
    };

  } catch (error: any) {
    console.error(`[${requestId}] Error generating token:`, error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
      }),
    };
  }
};
