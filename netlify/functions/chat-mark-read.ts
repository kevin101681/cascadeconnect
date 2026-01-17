/**
 * NETLIFY FUNCTION: MARK CHAT AS READ
 * Updates the lastReadAt timestamp for a user in a channel
 * January 7, 2026
 * 
 * Features:
 * - Real-time read receipts (notifies message senders)
 */

import { Handler } from '@netlify/functions';
import { db } from '../../db';
import { channelMembers, internalMessages, internalChannels } from '../../db/schema/internal-chat';
import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { triggerPusherEvent } from '../../lib/pusher-server';

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

    // ✅ Log to verify we received a UUID (not a deterministic ID)
    if (channelId.startsWith('dm-')) {
      console.error(`⚠️ CRITICAL: Received deterministic ID instead of UUID: ${channelId}`);
      console.error('This should have been resolved in the service layer!');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid channel ID format. Expected UUID, got deterministic ID.',
          hint: 'The service layer should resolve dm-... to UUID before calling this function.'
        }),
      };
    }

    // ✅ CRITICAL: Get OLD lastReadAt timestamp BEFORE updating
    // This is needed to find which messages were unread
    const oldLastReadResult = await db
      .select({ lastReadAt: channelMembers.lastReadAt })
      .from(channelMembers)
      .where(
        and(
          eq(channelMembers.userId, userId),
          eq(channelMembers.channelId, channelId)
        )
      )
      .limit(1);

    const oldLastReadAt = oldLastReadResult[0]?.lastReadAt || new Date(0);
    const readAt = new Date();

    console.log(`📊 [chat-mark-read] Read timestamps:`, {
      oldLastReadAt: oldLastReadAt.toISOString(),
      newReadAt: readAt.toISOString(),
      willCheckMessagesAfter: oldLastReadAt.toISOString()
    });

    // Update lastReadAt timestamp
    await db
      .update(channelMembers)
      .set({ lastReadAt: readAt })
      .where(
        and(
          eq(channelMembers.userId, userId),
          eq(channelMembers.channelId, channelId)
        )
      );

    console.log(`✅ Channel marked as read`);

    // ✅ TASK 1: Identify senders of unread messages and notify them
    try {
      // Get the channel info to determine if it's a DM or public channel
      const channelInfo = await db
        .select({
          type: internalChannels.type,
          dmParticipants: internalChannels.dmParticipants,
        })
        .from(internalChannels)
        .where(eq(internalChannels.id, channelId))
        .limit(1);

      if (channelInfo.length === 0) {
        console.warn(`⚠️ Channel not found: ${channelId}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      }

      const channel = channelInfo[0];

      // For DM channels, notify the other user
      if (channel.type === 'dm' && channel.dmParticipants) {
        const participants = channel.dmParticipants as string[];
        const otherUserId = participants.find(id => id !== userId);

        if (otherUserId) {
          console.log(`📡 Notifying sender ${otherUserId} that their messages were read by ${userId}`);
          
          // Trigger event on the sender's public channel
          await triggerPusherEvent(`public-user-${otherUserId}`, 'messages-read', {
            channelId,
            readBy: userId,
            readAt: readAt.toISOString(),
          });
          
          console.log(`✅ Read receipt sent to public-user-${otherUserId}`);
        }
      } else {
        // For public channels, find all unique senders of unread messages
        const lastReadResult = await db
          .select({ lastReadAt: channelMembers.lastReadAt })
          .from(channelMembers)
          .where(
            and(
              eq(channelMembers.userId, userId),
              eq(channelMembers.channelId, channelId)
            )
          )
          .limit(1);

        const lastReadAt = lastReadResult[0]?.lastReadAt || new Date(0);

        // Get all unique senders who sent messages since last read
        const unreadSenders = await db
          .selectDistinct({ senderId: internalMessages.senderId })
          .from(internalMessages)
          .where(
            and(
              eq(internalMessages.channelId, channelId),
              gt(internalMessages.createdAt, lastReadAt),
              sql`${internalMessages.senderId} != ${userId}` // Don't notify self
            )
          );

        // Notify each sender
        for (const sender of unreadSenders) {
          console.log(`📡 Notifying sender ${sender.senderId} in public channel`);
          
          await triggerPusherEvent(`public-user-${sender.senderId}`, 'messages-read', {
            channelId,
            readBy: userId,
            readAt: readAt.toISOString(),
          });
          
          console.log(`✅ Read receipt sent to public-user-${sender.senderId}`);
        }
      }
    } catch (pusherError) {
      console.error('⚠️ Failed to trigger Pusher read receipt event:', pusherError);
      // Don't fail the request if Pusher fails - the DB update succeeded
    }

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

