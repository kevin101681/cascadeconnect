/**
 * NETLIFY FUNCTION: CHAT TYPING INDICATOR
 * Handles real-time typing indicator broadcasting
 * January 17, 2026
 */

import { Handler } from '@netlify/functions';
import { triggerPusherEvent } from '../../lib/pusher-server';
import { db } from '../../db';
import { internalChannels } from '../../db/schema/internal-chat';
import { eq } from 'drizzle-orm';

interface TypingRequest {
  recipientId?: string;  // For DM channels
  channelId: string;
  userId: string;
  userName?: string;
  isTyping: boolean;
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
    const requestData: TypingRequest = JSON.parse(event.body || '{}');
    const { recipientId, channelId, userId, userName = 'User', isTyping } = requestData;

    // Validate required fields
    if (!channelId || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: channelId, userId' }),
      };
    }

    console.log(`⌨️ Typing indicator: ${userName} (${userId}) ${isTyping ? 'started' : 'stopped'} typing in ${channelId}`);

    // Get channel info to determine participants
    if (channelId.startsWith('dm-')) {
      // For DM channels, parse participant IDs
      const participantsStr = channelId.substring(3);
      const participants = participantsStr.split('-').filter(p => p.trim().length > 0);
      
      // Send to each participant's public channel (they'll filter out their own)
      for (const participantId of participants) {
        if (participantId !== userId) {
          await triggerPusherEvent(`public-user-${participantId}`, 'user-typing', {
            channelId,
            userId,
            userName,
            isTyping,
          });
          console.log(`✅ Typing event sent to public-user-${participantId}`);
        }
      }
    } else if (recipientId) {
      // Direct recipient specified
      await triggerPusherEvent(`public-user-${recipientId}`, 'user-typing', {
        channelId,
        userId,
        userName,
        isTyping,
      });
      console.log(`✅ Typing event sent to public-user-${recipientId}`);
    } else {
      // For public channels, broadcast to the channel itself
      // Query database to get members
      const channelInfo = await db
        .select({
          type: internalChannels.type,
        })
        .from(internalChannels)
        .where(eq(internalChannels.id, channelId))
        .limit(1);

      if (channelInfo.length > 0) {
        await triggerPusherEvent('team-chat', 'user-typing', {
          channelId,
          userId,
          userName,
          isTyping,
        });
        console.log(`✅ Typing event broadcast to team-chat for channel ${channelId}`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('❌ Error in chat-typing function:', error);
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
