import { Handler } from '@netlify/functions';
import Telnyx from 'telnyx';

/**
 * TELNYX TOKEN GENERATOR
 * 
 * This endpoint generates a Telnyx on-demand credential (JWT token)
 * for the mobile app to connect to Telnyx Voice.
 * 
 * Flow:
 * 1. Authenticate user via Clerk
 * 2. Generate Telnyx credential token
 * 3. Return JWT token to mobile app
 * 
 * Authentication: Expects Clerk user ID in Authorization header
 */

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
 * Sanitize user ID for Telnyx SIP username
 * Telnyx usernames should be alphanumeric with underscores/hyphens
 */
function sanitizeUsername(userId: string): string {
  // Replace non-alphanumeric characters with underscore
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Main handler
 */
export const handler: Handler = async (event) => {
  const requestId = `telnyx-token-${Date.now()}`;
  console.log(`[${requestId}] Telnyx Token Request`);

  // Only accept GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get auth header
    const authHeader = event.headers['authorization'] || event.headers['Authorization'];
    const userId = getUserIdFromAuth(authHeader);

    if (!userId) {
      console.error(`[${requestId}] No authentication provided`);
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Authentication required' }),
      };
    }

    console.log(`[${requestId}] Generating token for user: ${userId}`);

    // Check required environment variables
    const apiKey = process.env.TELNYX_API_KEY;
    const connectionId = process.env.TELNYX_CONNECTION_ID;

    if (!apiKey) {
      console.error(`[${requestId}] Missing TELNYX_API_KEY`);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error: Missing Telnyx API key' }),
      };
    }

    if (!connectionId) {
      console.error(`[${requestId}] Missing TELNYX_CONNECTION_ID`);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error: Missing Telnyx Connection ID' }),
      };
    }

    // Hardcode username to "kevin_pixel" for single-user app
    const username = 'kevin_pixel';
    
    console.log(`[${requestId}] Client username: ${username} (user: ${userId})`);

    // Initialize Telnyx client
    const telnyx = new Telnyx(apiKey);

    // Generate on-demand credential
    // This creates a temporary SIP credential that the mobile client can use
    const credential = await telnyx.credentials.create({
      connection_id: connectionId,
      name: username,
      // Token expires in 24 hours
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    console.log(`[${requestId}] ✅ Telnyx credential generated:`, credential.id);

    // Return the credential token and username
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        token: credential.token,
        username: username,
        connection_id: connectionId,
        expires_at: credential.expires_at,
      }),
    };

  } catch (error: any) {
    console.error(`[${requestId}] Error generating Telnyx token:`, error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to generate token',
        message: error.message || 'Unknown error',
      }),
    };
  }
};
