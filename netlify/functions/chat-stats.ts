import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { internalMessages, channelMembers, users } from '../../db/schema';
import { eq, and, gt, ne, sql } from 'drizzle-orm';

/**
 * Chat Statistics API
 * 
 * GET /.netlify/functions/chat-stats?userId=XXX
 * 
 * Returns unread message count for a user across all their channels
 * Handles both Clerk IDs (user_...) and internal UUIDs
 */

interface ChatStatsResponse {
  success: boolean;
  unreadCount?: number;
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
  console.log('🔵 chat-stats function invoked', {
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

    // Extract userId
    const userId = event.queryStringParameters?.userId;

    if (!userId || userId === 'placeholder' || userId.length < 10) {
      return createJsonResponse(200, {
        success: true,
        unreadCount: 0,
        message: 'No valid userId provided'
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
    const db = drizzle(sqlClient, { 
      schema: { internalMessages, channelMembers, users } 
    });

    // Determine if userId is a Clerk ID or UUID
    let resolvedUserId = userId;
    const isClerkId = userId.startsWith('user_');

    if (isClerkId) {
      console.log('🔍 Resolving Clerk ID to internal UUID...');
      
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, userId))
        .limit(1);

      if (userResult.length === 0) {
        console.warn(`⚠️ No user found with Clerk ID: ${userId}`);
        return createJsonResponse(404, {
          success: false,
          error: 'User not found'
        });
      }

      resolvedUserId = userResult[0].id;
      console.log(`✅ Resolved Clerk ID to UUID: ${resolvedUserId}`);
    }

    // Get all channels the user is a member of
    const memberChannels = await db
      .select({
        channelId: channelMembers.channelId,
        lastReadAt: channelMembers.lastReadAt,
      })
      .from(channelMembers)
      .where(eq(channelMembers.userId, resolvedUserId));

    console.log(`📊 User is member of ${memberChannels.length} channels`);

    // Calculate total unread count across all channels
    let totalUnread = 0;

    for (const channel of memberChannels) {
      // Count unread messages in this channel
      // CRITICAL: Only count messages from OTHER users, not the current user
      const unreadResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(internalMessages)
        .where(
          and(
            eq(internalMessages.channelId, channel.channelId),
            gt(internalMessages.createdAt, channel.lastReadAt || new Date(0)),
            eq(internalMessages.isDeleted, false),
            ne(internalMessages.senderId, userId) // Don't count own messages
          )
        );

      const channelUnread = Number(unreadResult[0]?.count || 0);
      totalUnread += channelUnread;
    }

    console.log(`✅ Total unread count: ${totalUnread}`);

    return createJsonResponse(200, {
      success: true,
      unreadCount: totalUnread,
    });

  } catch (error: any) {
    console.error('❌ Error in chat-stats function:', error);
    return createJsonResponse(500, {
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    });
  }
};
