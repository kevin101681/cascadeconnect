import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { claims } from '../../db/schema';
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(homeownerId)) {
      console.warn(`⚠️ Invalid UUID format: ${homeownerId}`);
      return createJsonResponse(400, { 
        error: 'Invalid homeownerId format',
        message: 'homeownerId must be a valid UUID',
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

      // Fetch claims for this homeowner
      const dbClaims = await db
        .select()
        .from(claims)
        .where(eq(claims.homeownerId, homeownerId))
        .orderBy(desc(claims.dateSubmitted))
        .execute();

      console.log(`✅ Successfully fetched ${dbClaims.length} claims for homeowner ${homeownerId}`);

      return createJsonResponse(200, {
        success: true,
        claims: dbClaims,
        count: dbClaims.length,
        homeownerId: homeownerId,
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

