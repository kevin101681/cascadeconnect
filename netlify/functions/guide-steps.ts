import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { guideSteps } from '../../db/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * Guide Steps API
 * 
 * GET /.netlify/functions/guide-steps
 * 
 * Returns active guide steps ordered by sortOrder
 * Moves database access to server-side for security
 */

const getJsonHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
});

const createJsonResponse = (statusCode: number, data: any) => {
  return {
    statusCode,
    headers: getJsonHeaders(),
    body: JSON.stringify(data),
  };
};

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  console.log('🔵 guide-steps function invoked', {
    method: event.httpMethod,
  });

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createJsonResponse(200, {});
    }

    // Method validation
    if (event.httpMethod !== 'GET') {
      return createJsonResponse(405, {
        success: false,
        error: 'Method not allowed',
        message: 'Only GET requests are supported'
      });
    }

    // Get database URL
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not configured');
      return createJsonResponse(500, {
        success: false,
        error: 'Database not configured',
        steps: []
      });
    }

    // Initialize database
    const sqlClient = neon(databaseUrl);
    const db = drizzle(sqlClient, { schema: { guideSteps } });

    console.log('🔌 Database connected, querying guide steps...');

    // Fetch active guide steps ordered by sortOrder
    const steps = await db
      .select()
      .from(guideSteps)
      .where(eq(guideSteps.isActive, true))
      .orderBy(asc(guideSteps.sortOrder));

    console.log(`✅ Successfully fetched ${steps.length} guide steps`);

    return createJsonResponse(200, {
      success: true,
      steps,
      count: steps.length
    });

  } catch (error: any) {
    console.error('❌ Error in guide-steps function:', error);
    return createJsonResponse(500, {
      success: false,
      error: 'Failed to fetch guide steps',
      message: error?.message || 'Unknown error',
      steps: []
    });
  }
};
