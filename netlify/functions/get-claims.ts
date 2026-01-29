import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { claims, users } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * CRITICAL: These headers MUST be included in EVERY response
 * to ensure the frontend always receives JSON, never HTML
 */
const getJsonHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
});

/**
 * Helper to create a safe JSON response
 * Ensures we ALWAYS return valid JSON, even on errors
 */
const createJsonResponse = (statusCode: number, data: any): HandlerResponse => {
  const headers = getJsonHeaders();
  let body: string;
  
  try {
    body = JSON.stringify(data);
  } catch (stringifyError) {
    // If JSON.stringify fails, return a safe error response
    console.error('❌ Failed to stringify response data:', stringifyError);
    body = JSON.stringify({ 
      error: 'Internal serialization error',
      success: false,
      claims: []
    });
  }
  
  return { statusCode, headers, body };
};

/**
 * GET /.netlify/functions/get-claims?homeownerId=XXX
 * 
 * STRICT POLICY:
 * - homeownerId parameter is REQUIRED
 * - Returns ONLY claims for the specified homeowner
 * - Returns empty array if no homeownerId provided
 * - NEVER returns all claims from the database
 * - ALWAYS returns JSON (never HTML/text)
 * 
 * DATABASE SCHEMA:
 * - Table: claims
 * - Column: homeowner_id (snake_case)
 * - Drizzle ORM maps: homeownerId -> homeowner_id
 */
export const handler = async (event: any): Promise<HandlerResponse> => {
  console.log('🔵 get-claims function invoked', {
    method: event.httpMethod,
    path: event.path,
    query: event.queryStringParameters
  });

  // OUTER try/catch: Catches ANY error including catastrophic failures
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      console.log('✅ CORS preflight - returning 200');
      return createJsonResponse(200, {});
    }

    // Method validation
    if (event.httpMethod !== 'GET') {
      console.warn(`⚠️ Invalid method: ${event.httpMethod}`);
      return createJsonResponse(405, { 
        error: 'Method not allowed',
        message: 'Only GET requests are supported',
        success: false,
        claims: []
      });
    }

    // Extract and validate homeownerId
    const homeownerId = event.queryStringParameters?.homeownerId;
    
    console.log('📝 Received homeownerId:', homeownerId);

    // Guard: Invalid/missing homeownerId
    if (!homeownerId || homeownerId === 'placeholder' || homeownerId.length < 10) {
      console.warn('⚠️ Invalid or placeholder homeownerId, returning empty array');
      return createJsonResponse(200, { 
        success: true,
        claims: [],
        count: 0,
        homeownerId: homeownerId || 'none',
        message: 'No valid homeownerId provided'
      });
    }

    // Determine if this is a Clerk ID (starts with user_) or UUID
    const isClerkId = homeownerId.startsWith('user_');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    let resolvedHomeownerId = homeownerId;
    
    // If it's a Clerk ID, we need to resolve it to the internal UUID
    if (isClerkId) {
      console.log('🔍 Detected Clerk ID, resolving to internal UUID...');
      
      try {
        // Get database URL
        const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
        if (!databaseUrl) {
          console.error('❌ DATABASE_URL not configured');
          return createJsonResponse(500, { 
            error: 'Database not configured',
            message: 'DATABASE_URL environment variable is missing',
            success: false,
            claims: []
          });
        }

        // Initialize database client
        const sqlClient = neon(databaseUrl);
        const db = drizzle(sqlClient, { schema: { users, claims } });
        
        // Look up user by clerkId
        const userResult = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerkId, homeownerId))
          .limit(1);
        
        if (userResult.length === 0) {
          console.warn(`⚠️ No user found with Clerk ID: ${homeownerId}`);
          return createJsonResponse(404, { 
            error: 'User not found',
            message: `No user found with ID: ${homeownerId}`,
            success: false,
            claims: []
          });
        }
        
        resolvedHomeownerId = userResult[0].id;
        console.log(`✅ Resolved Clerk ID ${homeownerId} to UUID ${resolvedHomeownerId}`);
        
      } catch (resolveError: any) {
        console.error('❌ Error resolving Clerk ID:', resolveError);
        return createJsonResponse(500, { 
          error: 'Failed to resolve user ID',
          message: resolveError.message || 'Unknown error',
          success: false,
          claims: []
        });
      }
    } else if (!uuidRegex.test(homeownerId)) {
      // Not a Clerk ID and not a valid UUID format
      console.warn(`⚠️ Invalid ID format: ${homeownerId}`);
      return createJsonResponse(400, { 
        error: 'Invalid homeownerId format',
        message: 'homeownerId must be either a Clerk ID (user_...) or a valid UUID',
        success: false,
        claims: []
      });
    }

    // Database connection and query (wrapped in inner try/catch)
    try {
      console.log('🔌 Connecting to database...');
      
      // Get database URL
      const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
      if (!databaseUrl) {
        console.error('❌ DATABASE_URL not configured');
        return createJsonResponse(500, { 
          error: 'Database not configured',
          message: 'DATABASE_URL environment variable is missing',
          success: false,
          claims: []
        });
      }

      // Initialize database client
      const sqlClient = neon(databaseUrl);
      const db = drizzle(sqlClient, { schema: { claims } });
      
      console.log('✅ Database connected, querying claims...');

      // Fetch claims for this homeowner (using resolved UUID)
      const dbClaims = await db
        .select()
        .from(claims)
        .where(eq(claims.homeownerId, resolvedHomeownerId))
        .orderBy(desc(claims.dateSubmitted))
        .execute();

      console.log(`✅ Successfully fetched ${dbClaims.length} claims for homeowner ${resolvedHomeownerId}`);

      return createJsonResponse(200, {
        success: true,
        claims: dbClaims,
        count: dbClaims.length,
        homeownerId: resolvedHomeownerId,
        originalId: homeownerId, // Return original ID for debugging
      });

    } catch (dbError: any) {
      // Database/query errors
      console.error('❌ Database error:', {
        message: dbError.message,
        stack: dbError.stack,
        name: dbError.name
      });
      
      return createJsonResponse(500, { 
        error: 'Database query failed',
        message: dbError.message || 'Unknown database error',
        success: false,
        claims: []
      });
    }

  } catch (error: any) {
    // CATASTROPHIC ERROR: Catch-all for any unhandled errors
    console.error('❌ CATASTROPHIC ERROR in get-claims handler:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      error: error
    });
    
    // Last resort: Return safe JSON error response
    return createJsonResponse(500, { 
      error: 'Internal server error',
      message: error?.message || 'An unexpected error occurred',
      success: false,
      claims: []
    });
  }
};

