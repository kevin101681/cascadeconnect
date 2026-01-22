import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { claims } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const getDbClient = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('❌ Database configuration is missing.');
  }
  const sqlClient = neon(databaseUrl);
  return drizzle(sqlClient, { schema: { claims } });
};

/**
 * GET /netlify/functions/get-claims?homeownerId=XXX
 * 
 * STRICT POLICY:
 * - homeownerId parameter is REQUIRED
 * - Returns ONLY claims for the specified homeowner
 * - Returns empty array if no homeownerId provided (400 error)
 * - NEVER returns all claims from the database
 * 
 * DATABASE SCHEMA VERIFICATION:
 * - Database column: homeowner_id (snake_case with underscore)
 * - Drizzle ORM maps: homeownerId -> homeowner_id
 * - Query uses: eq(claims.homeownerId, homeownerId)
 */
export const handler = async (event: any): Promise<HandlerResponse> => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Extract homeownerId from query parameters
    const homeownerId = event.queryStringParameters?.homeownerId;

    // ✅ CRITICAL FIX: Guard clause for invalid homeownerId BEFORE validation
    // Prevent "placeholder" or undefined from reaching UUID validation
    if (!homeownerId || homeownerId === 'placeholder' || homeownerId.length < 10) {
      console.warn('⚠️ get-claims called with invalid homeownerId (placeholder or too short), returning empty array:', homeownerId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          claims: [],
          count: 0,
          homeownerId: homeownerId || 'none',
        }),
      };
    }

    // STRICT: homeownerId format validation (after placeholder check)
    if (homeownerId.trim() === '') {
      console.warn('⚠️ get-claims called without homeownerId parameter');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'homeownerId parameter is required',
          message: 'You must provide a homeownerId to fetch claims. Never fetch all claims.',
          success: false,
          claims: [], // Return empty array for consistent response structure
        }),
      };
    }

    // Validate homeownerId format (should be a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(homeownerId)) {
      console.warn(`⚠️ Invalid homeownerId format: ${homeownerId}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid homeownerId format',
          message: 'homeownerId must be a valid UUID',
          success: false,
          claims: [],
        }),
      };
    }

    const db = getDbClient();

    // Fetch ONLY claims for this specific homeowner
    // Database column is 'homeowner_id' but Drizzle maps it to 'homeownerId'
    const dbClaims = await db
      .select()
      .from(claims)
      .where(eq(claims.homeownerId, homeownerId))
      .orderBy(desc(claims.dateSubmitted))
      .execute();

    console.log(`📋 Fetched ${dbClaims.length} claims for homeowner ${homeownerId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        claims: dbClaims,
        count: dbClaims.length,
        homeownerId: homeownerId,
      }),
    };
  } catch (error: any) {
    console.error('❌ Get Claims API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Internal Server Error',
        success: false,
        claims: [], // Return empty array on error for consistent response structure
      }),
    };
  }
};

