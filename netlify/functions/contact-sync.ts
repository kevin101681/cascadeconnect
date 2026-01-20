import { Handler } from '@netlify/functions';
import { syncContacts, getUserContacts, deleteUserContacts, isKnownContact } from '../../actions/contact-sync';

/**
 * CONTACT SYNC API ENDPOINT
 * 
 * Netlify Function for mobile app to sync contacts to the database.
 * Provides RESTful API for contact management.
 * 
 * Endpoints:
 * - POST /sync - Sync contacts from mobile app
 * - GET /list - Get all contacts for user
 * - DELETE /clear - Clear all contacts for user
 * - GET /check?phone=+15551234567 - Check if phone is known contact
 * 
 * Authentication: Expects Clerk user ID in Authorization header
 */

interface ContactSyncRequest {
  contacts: Array<{
    name: string;
    phone: string;
  }>;
}

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
  const requestId = `sync-${Date.now()}`;
  console.log(`[${requestId}] Contact Sync API - ${event.httpMethod} ${event.path}`);

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Extract user ID from Authorization header
  const userId = getUserIdFromAuth(event.headers.authorization || event.headers.Authorization);
  
  if (!userId) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: 'Unauthorized',
        message: 'Authorization header required (Clerk user ID)',
      }),
    };
  }

  try {
    // Route based on HTTP method and path
    switch (event.httpMethod) {
      case 'POST': {
        // Sync contacts
        const body: ContactSyncRequest = JSON.parse(event.body || '{}');
        
        if (!body.contacts || !Array.isArray(body.contacts)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Bad Request',
              message: 'contacts array required',
            }),
          };
        }

        console.log(`[${requestId}] Syncing ${body.contacts.length} contacts for user ${userId}`);
        
        const result = await syncContacts(userId, body.contacts);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result),
        };
      }

      case 'GET': {
        // Check query params
        const phone = event.queryStringParameters?.phone;
        
        if (phone) {
          // Check if specific phone is known contact
          console.log(`[${requestId}] Checking if ${phone} is known contact`);
          
          const contact = await isKnownContact(phone);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              isKnown: !!contact,
              contact: contact || null,
            }),
          };
        } else {
          // List all contacts for user
          console.log(`[${requestId}] Listing contacts for user ${userId}`);
          
          const contacts = await getUserContacts(userId);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              contacts,
              count: contacts.length,
            }),
          };
        }
      }

      case 'DELETE': {
        // Clear all contacts for user
        console.log(`[${requestId}] Clearing contacts for user ${userId}`);
        
        const count = await deleteUserContacts(userId);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Deleted ${count} contacts`,
            count,
          }),
        };
      }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({
            error: 'Method Not Allowed',
            allowedMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
          }),
        };
    }
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    
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
