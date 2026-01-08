/**
 * NETLIFY FUNCTION: MARK CHAT AS READ
 * Updates the lastReadAt timestamp for a user in a channel
 * January 7, 2026
 */

import { Handler } from '@netlify/functions';
import { db } from '../../db';
import { channelMembers } from '../../db/schema/internal-chat';
import { eq, and } from 'drizzle-orm';

interface MarkReadRequest {
  userId: string;
  channelId: string;
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const requestData: MarkReadRequest = JSON.parse(event.body || '{}');
    const { userId, channelId } = requestData;

    // Validate required fields
    if (!userId || !channelId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: userId, channelId' }),
      };
    }

    console.log(`📖 Marking channel ${channelId} as read for user ${userId}`);

    // Update lastReadAt timestamp
    await db
      .update(channelMembers)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(channelMembers.userId, userId),
          eq(channelMembers.channelId, channelId)
        )
      );

    console.log(`✅ Channel marked as read`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('❌ Error in chat-mark-read function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

