import { Handler } from '@netlify/functions';

/**
 * TELNYX TOKEN GENERATOR
 * 
 * This endpoint generates a Telnyx on-demand credential (JWT token)
 * for the mobile app to connect to Telnyx Voice.
 * 
 * Flow:
 * 1. Authenticate user via Clerk
 * 2. Generate Telnyx credential token using REST API
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

    // Create telephony credential using REST API
    const credResponse = await fetch('https://api.telnyx.com/v2/telephony_credentials', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection_id: connectionId,
        name: username,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });

    if (!credResponse.ok) {
      const errorText = await credResponse.text();
      console.error(`[${requestId}] Failed to create credential:`, errorText);
      throw new Error(`Telnyx API error: ${credResponse.status}`);
    }

    const credData = await credResponse.json();
    const credential = credData.data;
    
    console.log(`[${requestId}] ✅ Telnyx credential generated:`, credential.id);

    // Generate JWT token from the credential
    const tokenResponse = await fetch(`https://api.telnyx.com/v2/telephony_credentials/${credential.id}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[${requestId}] Failed to create token:`, errorText);
      throw new Error(`Telnyx token API error: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const jwt = tokenData.data.token;

    console.log(`[${requestId}] ✅ JWT token generated`);

    // Return the JWT token and SIP credentials
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        token: jwt,
        username: credential.sip_username,
        password: credential.sip_password,
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
