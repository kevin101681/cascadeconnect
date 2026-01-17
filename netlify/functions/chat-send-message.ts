/**
 * NETLIFY FUNCTION: SEND CHAT MESSAGE
 * Handles message creation and Pusher event triggering (server-side)
 * January 7, 2026
 */

import { Handler } from '@netlify/functions';
import { db } from '../../db';
import { internalMessages, internalChannels, channelMembers, users } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { triggerPusherEvent } from '../../lib/pusher-server';

interface SendMessageRequest {
  channelId: string;
  senderId: string;
  content: string;
  attachments?: Array<{
    url: string;
    type: 'image' | 'video' | 'file';
    filename?: string;
    publicId?: string;
  }>;
  mentions?: Array<{
    homeownerId: string;
    projectName: string;
    address: string;
  }>;
  replyTo?: string;
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
    const requestData: SendMessageRequest = JSON.parse(event.body || '{}');
    const { channelId, senderId, content, attachments = [], mentions = [], replyTo } = requestData;

    // Validate required fields - Allow empty content IF there are attachments
    if (!channelId || !senderId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: channelId, senderId' }),
      };
    }

    // Content OR attachments required (can't send completely empty message)
    if (!content && (!attachments || attachments.length === 0)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message must have content or attachments' }),
      };
    }

    console.log(`📨 Saving message to channel ${channelId} from user ${senderId}`);

    // ✅ CRITICAL: Resolve deterministic ID to database UUID (or create channel if needed)
    let dbChannelId = channelId;
    
    if (channelId.startsWith('dm-')) {
      console.log(`🔄 Resolving deterministic ID: ${channelId}`);
      
      // Parse participant IDs from deterministic ID format: "dm-userA-userB"
      const participantsStr = channelId.substring(3); // Remove 'dm-'
      const parts = participantsStr.split('-').filter(p => p.trim().length > 0);
      
      if (parts.length !== 2) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid deterministic channel ID format: ${channelId}` }),
        };
      }
      
      const [userA, userB] = parts.sort(); // Alphabetical order
      const participants = [userA, userB];
      
      // Try to find existing channel
      const existingChannels = await db
        .select({ id: internalChannels.id })
        .from(internalChannels)
        .where(
          and(
            eq(internalChannels.type, 'dm'),
            sql`${internalChannels.dmParticipants}::jsonb = ${JSON.stringify(participants)}::jsonb`
          )
        )
        .limit(1);
      
      if (existingChannels.length > 0) {
        dbChannelId = existingChannels[0].id;
        console.log(`✅ Found existing channel UUID: ${dbChannelId}`);
      } else {
        // Create new DM channel
        console.log(`🆕 Creating new DM channel for participants: ${participants.join(', ')}`);
        
        const channelName = `dm-${participants[0]}-${participants[1]}`;
        const [newChannel] = await db
          .insert(internalChannels)
          .values({
            name: channelName,
            type: 'dm',
            dmParticipants: participants,
            createdBy: senderId,
          })
          .returning({ id: internalChannels.id });
        
        dbChannelId = newChannel.id;
        
        // Add both users as channel members
        await db.insert(channelMembers).values([
          {
            channelId: dbChannelId,
            userId: participants[0],
          },
          {
            channelId: dbChannelId,
            userId: participants[1],
          },
        ]);
        
        console.log(`✅ Created new channel with UUID: ${dbChannelId}`);
      }
    }

    // 1. Insert message into database using resolved UUID
    const [newMessage] = await db
      .insert(internalMessages)
      .values({
        channelId: dbChannelId,  // ✅ Use resolved database UUID
        senderId,
        content: content || '',  // ✅ Allow empty content for media-only messages
        attachments,
        mentions,
        replyToId: replyTo || null,
      })
      .returning();

    // 2. Get sender info (using clerkId since senderId is Clerk ID text)
    console.log('🔍 [Netlify] Looking up sender info for Clerk ID:', senderId);
    const senderData = await db
      .select({
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.clerkId, senderId))
      .limit(1);

    console.log('👤 [Netlify] Sender lookup result:', {
      found: senderData.length > 0,
      name: senderData[0]?.name || 'NOT FOUND',
      email: senderData[0]?.email || 'NOT FOUND',
      clerkId: senderId
    });

    // 3. Get replied-to message if exists
    let replyToMessage = null;
    if (replyTo) {
      const replyMessages = await db
        .select({
          id: internalMessages.id,
          senderName: users.name,
          content: internalMessages.content,
        })
        .from(internalMessages)
        .leftJoin(users, eq(internalMessages.senderId, users.clerkId))  // ✅ SAFETY: LEFT JOIN
        .where(eq(internalMessages.id, replyTo))
        .limit(1);

      if (replyMessages.length > 0) {
        replyToMessage = replyMessages[0];
      }
    }

    // 4. Build complete message object
    const messageWithSender = {
      ...newMessage,
      senderName: senderData[0]?.name || 'Unknown',
      senderEmail: senderData[0]?.email || '',
      attachments: newMessage.attachments,
      mentions: newMessage.mentions,
      replyTo: replyToMessage,
    };

    console.log('✅ [Netlify] Message saved with ID:', newMessage.id);
    console.log('📦 [Netlify] Returning message:', {
      id: messageWithSender.id,
      senderId: messageWithSender.senderId,
      senderName: messageWithSender.senderName,
      senderEmail: messageWithSender.senderEmail,
      content: messageWithSender.content?.substring(0, 50) + '...'
    });

    // 5. ✅ TRIGGER PUSHER EVENTS (SERVER-SIDE)
    // Send to PUBLIC user channels for immediate delivery
    try {
      // For DM channels, extract participant IDs and notify each user
      if (channelId.startsWith('dm-')) {
        const participantsStr = channelId.substring(3);
        const participants = participantsStr.split('-').filter(p => p.trim().length > 0);
        
        console.log(`📡 Sending Pusher events to ${participants.length} participants:`, participants);
        
        // Send event to each participant's public channel
        for (const userId of participants) {
          const publicChannel = `public-user-${userId}`;
          
          await triggerPusherEvent(publicChannel, 'new-message', {
            channelId,
            message: messageWithSender,
          });
          
          console.log(`✅ Pusher event sent to ${publicChannel}`);
        }
      } else {
        // Fallback to team-chat for public channels (if they exist)
        await triggerPusherEvent('team-chat', 'new-message', {
          channelId,
          message: messageWithSender,
        });
        console.log(`📡 Pusher event triggered for public channel ${channelId}`);
      }
    } catch (pusherError) {
      console.error('⚠️ Failed to trigger Pusher event (message saved):', pusherError);
      // Don't fail the request if Pusher fails - message is already saved
    }

    // 6. Return the message
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(messageWithSender),
    };
  } catch (error) {
    console.error('❌ Error in chat-send-message function:', error);
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

