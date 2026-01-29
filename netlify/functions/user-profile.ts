import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * User Profile API
 * 
 * GET /.netlify/functions/user-profile?clerkId=XXX
 * 
 * Returns user profile including role and internalRole
 * Used to determine if a Clerk user is an Admin/Employee
 */

interface UserProfileResponse {
  success: boolean;
  user?: {
    id: string;
    clerkId: string;
    name: string;
    email: string;
    role: string;
    internalRole?: string;
    builderGroupId?: string;
  };
  error?: string;
  message?: string;
}

const getJsonHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
  console.log('🔵 user-profile function invoked', {
    method: event.httpMethod,
    query: event.queryStringParameters
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

    // Extract clerkId
    const clerkId = event.queryStringParameters?.clerkId;

    if (!clerkId || clerkId.length < 10) {
      return createJsonResponse(400, {
        success: false,
        error: 'Invalid clerkId',
        message: 'clerkId parameter is required'
      });
    }

    // Get database URL
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not configured');
      return createJsonResponse(500, {
        success: false,
        error: 'Database not configured'
      });
    }

    // Initialize database
    const sqlClient = neon(databaseUrl);
    const db = drizzle(sqlClient, { schema: { users } });

    console.log('🔍 Looking up user with Clerk ID:', clerkId);

    // Query user by clerkId
    const userResult = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        name: users.name,
        email: users.email,
        role: users.role,
        internalRole: users.internalRole,
        builderGroupId: users.builderGroupId,
      })
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (userResult.length === 0) {
      console.log('⚠️ No user found with Clerk ID:', clerkId);
      return createJsonResponse(404, {
        success: false,
        error: 'User not found',
        message: `No user found with clerkId: ${clerkId}`
      });
    }

    const user = userResult[0];
    console.log('✅ User found:', {
      name: user.name,
      role: user.role,
      internalRole: user.internalRole
    });

    return createJsonResponse(200, {
      success: true,
      user: {
        id: user.id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        role: user.role,
        internalRole: user.internalRole || undefined,
        builderGroupId: user.builderGroupId || undefined,
      }
    });

  } catch (error: any) {
    console.error('❌ Error in user-profile function:', error);
    return createJsonResponse(500, {
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    });
  }
};
