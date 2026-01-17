/**
 * INTERNAL CHAT SERVICE
 * Server actions for team messaging
 * January 3, 2026
 * 
 * Features:
 * - Send/receive messages
 * - Create/find DM channels
 * - Get channel list with unread counts
 * - Search homeowners for @ mentions
 * - Cloudinary media uploads
 */

import { db } from '../db';
import { 
  internalChannels, 
  internalMessages, 
  channelMembers,
  users,
  homeowners 
} from '../db/schema';
import { eq, and, desc, sql, or, ilike, ne, gt } from 'drizzle-orm';

// Types
export interface Channel {
  id: string;  // Deterministic ID (dm-userA-userB for DMs, UUID for public)
  dbId?: string;  // Original database UUID (for backend operations)
  name: string;
  type: 'public' | 'dm';
  dmParticipants?: string[];
  createdBy: string;
  createdAt: Date;
  unreadCount?: number;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: Date;
  };
  // For DM channels: the other user's info
  otherUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  attachments: Array<{
    url: string;
    type: 'image' | 'video' | 'file';
    filename?: string;
    publicId?: string;
  }>;
  mentions: Array<{
    homeownerId: string;
    projectName: string;
    address: string;
  }>;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  } | null;
  replyToId?: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  editedAt?: Date;
  createdAt: Date;
  readAt?: Date | null;  // WhatsApp-style read receipt timestamp
}

export interface HomeownerMention {
  id: string;
  name: string;
  projectName: string;
  address: string;
}

/**
 * Generate deterministic channel ID for DMs
 * CRITICAL: Must match frontend generation logic exactly
 * Format: dm-{sortedUserA}-{sortedUserB}
 */
function generateDmChannelId(userId1: string, userId2: string): string {
  const [userA, userB] = [userId1, userId2].sort();
  return `dm-${userA}-${userB}`;
}

/**
 * Resolve a channel ID (deterministic or UUID) to a database UUID
 * CRITICAL: This prevents "invalid input syntax for type uuid" errors
 * 
 * @param channelId - Either a deterministic ID (dm-userA-userB) or a database UUID
 * @returns Database UUID if found, null if channel doesn't exist
 */
async function resolveChannelId(channelId: string): Promise<string | null> {
  // 1. If it's already a UUID format, return it as-is
  if (!channelId.startsWith('dm-')) {
    return channelId;
  }

  // 2. Parse the deterministic ID to extract participant user IDs
  // Format: "dm-user_36zHRC-user_42aXYZ"
  const dmPrefix = 'dm-';
  const participantsStr = channelId.substring(dmPrefix.length);
  
  // Split by '-' and filter out empty strings
  // This handles: "user_36zHRC-user_42aXYZ" -> ["user_36zHRC", "user_42aXYZ"]
  const parts = participantsStr.split('-').filter(p => p.trim().length > 0);
  
  if (parts.length !== 2) {
    console.error(`❌ Invalid deterministic ID format: ${channelId}`);
    return null;
  }

  const [userA, userB] = parts.sort(); // Ensure alphabetical order
  const participants = [userA, userB];

  // 3. Query database to find channel with these participants
  try {
    const channels = await db
      .select({ id: internalChannels.id })
      .from(internalChannels)
      .where(
        and(
          eq(internalChannels.type, 'dm'),
          sql`${internalChannels.dmParticipants}::jsonb = ${JSON.stringify(participants)}::jsonb`
        )
      )
      .limit(1);

    if (channels.length > 0) {
      const resolvedId = channels[0].id;
      console.log(`✅ Resolved deterministic ID ${channelId} to UUID ${resolvedId}`);
      return resolvedId;
    }

    console.log(`⚠️ No database UUID found for ${channelId} (channel doesn't exist yet)`);
    return null;
  } catch (error) {
    console.error(`❌ Error resolving channel ID ${channelId}:`, error);
    return null;
  }
}

/**
 * Get all channels for a user (public + their DMs)
 */
export async function getUserChannels(userId: string): Promise<Channel[]> {
  try {
    // Get all channels the user is a member of
    const memberChannels = await db
      .select({
        channelId: channelMembers.channelId,
        lastReadAt: channelMembers.lastReadAt,
        channelName: internalChannels.name,
        channelType: internalChannels.type,
        dmParticipants: internalChannels.dmParticipants,
        createdBy: internalChannels.createdBy,
        createdAt: internalChannels.createdAt,
      })
      .from(channelMembers)
      .innerJoin(internalChannels, eq(channelMembers.channelId, internalChannels.id))
      .where(eq(channelMembers.userId, userId))
      .orderBy(desc(channelMembers.lastReadAt));

    // For each channel, get unread count and last message
    const channelsWithDetails = await Promise.all(
      memberChannels.map(async (ch) => {
        // ✅ CRITICAL: Count ONLY unread messages from OTHER users
        // This prevents user's own messages from showing as unread
        const unreadResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(internalMessages)
          .where(
            and(
              eq(internalMessages.channelId, ch.channelId),
              // 1. Must be newer than last read
              gt(internalMessages.createdAt, ch.lastReadAt || new Date(0)),
              // 2. Must not be deleted
              eq(internalMessages.isDeleted, false),
              // 3. CRITICAL: MUST NOT BE FROM ME
              ne(internalMessages.senderId, userId)
            )
          );

        const unreadCount = Number(unreadResult[0]?.count || 0);
        
        console.log(`📊 [getUserChannels] Unread count for channel ${ch.channelId}`, {
          channelId: ch.channelId,
          unreadCount,
          lastReadAt: ch.lastReadAt,
          currentUserId: userId,
          filterApplied: 'ne(senderId, userId)'
        });

        // Get last message
        const lastMessages = await db
          .select({
            content: internalMessages.content,
            senderId: internalMessages.senderId,
            createdAt: internalMessages.createdAt,
            senderName: users.name,
          })
          .from(internalMessages)
          .leftJoin(users, eq(internalMessages.senderId, users.clerkId))  // ✅ SAFETY: LEFT JOIN
          .where(
            and(
              eq(internalMessages.channelId, ch.channelId),
              eq(internalMessages.isDeleted, false)
            )
          )
          .orderBy(desc(internalMessages.createdAt))
          .limit(1);

        const lastMessage = lastMessages[0]
          ? {
              content: lastMessages[0].content,
              senderName: lastMessages[0].senderName,
              createdAt: lastMessages[0].createdAt,
            }
          : undefined;

        // For DM channels, get the other user's info
        let otherUser: Channel['otherUser'] = undefined;
        if (ch.channelType === 'dm' && ch.dmParticipants) {
          const participants = ch.dmParticipants as string[];
          const otherUserId = participants.find((id) => id !== userId);
          
          console.log(`🔍 [DM Channel] Finding other user`, {
            channelId: ch.channelId,
            channelName: ch.channelName,
            currentUserId: userId,
            allParticipants: participants,
            otherUserId
          });
          
          if (otherUserId) {
            const otherUserData = await db
              .select({
                id: users.clerkId,  // ✅ CRITICAL FIX: Return Clerk ID, not UUID
                name: users.name,
                email: users.email,
              })
              .from(users)
              .where(eq(users.clerkId, otherUserId))
              .limit(1);

            if (otherUserData.length > 0) {
              otherUser = otherUserData[0];
              console.log(`✅ [DM Channel] Found other user: ${otherUser.name} (Clerk ID: ${otherUser.id})`);
            } else {
              console.warn(`⚠️ [DM Channel] No user found for Clerk ID: ${otherUserId}`);
            }
          } else {
            console.warn(`⚠️ [DM Channel] Could not determine other user (participants: ${participants.join(', ')})`);
          }
        }

        // ✅ CRITICAL: For DMs, use deterministic ID instead of database UUID
        // This ensures frontend override mechanism works correctly
        let displayId = ch.channelId; // Default to database UUID
        
        if (ch.channelType === 'dm' && ch.dmParticipants) {
          const participants = ch.dmParticipants as string[];
          if (participants.length === 2) {
            // Generate deterministic ID: dm-sortedUserA-sortedUserB
            displayId = generateDmChannelId(participants[0], participants[1]);
          }
        }

        return {
          id: displayId,  // ✅ Use deterministic ID for DMs, UUID for public channels
          dbId: ch.channelId,  // ✅ Keep original database UUID for backend operations
          name: ch.channelName,
          type: ch.channelType as 'public' | 'dm',
          dmParticipants: ch.dmParticipants as string[] | undefined,
          createdBy: ch.createdBy,
          createdAt: ch.createdAt,
          unreadCount,
          lastMessage,
          otherUser,
        };
      })
    );

    return channelsWithDetails;
  } catch (error) {
    console.error('❌ Error getting user channels:', error);
    throw error;
  }
}

/**
 * Get all admin/employee users for DM discovery
 */
export async function getAllTeamMembers(): Promise<Array<{
  id: string;
  name: string;
  email: string;
  internalRole?: string;
}>> {
  try {
    const teamMembers = await db
      .select({
        id: users.clerkId,  // ✅ FIXED: Return Clerk ID for consistency with chat system
        name: users.name,
        email: users.email,
        internalRole: users.internalRole,
      })
      .from(users)
      .where(eq(users.role, 'ADMIN'))  // ✅ FIX: Only ADMIN role (includes Administrators, Employees, etc.)
      .orderBy(users.name);

    return teamMembers;
  } catch (error) {
    console.error('❌ Error getting team members:', error);
    throw error;
  }
}

/**
 * Find or create a DM channel between two users
 */
export async function findOrCreateDmChannel(
  userId1: string,
  userId2: string,
  createdBy: string
): Promise<string> {
  try {
    // Sort user IDs alphabetically for consistent lookup
    const participants = [userId1, userId2].sort();

    // Check if DM channel already exists
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
      return existingChannels[0].id;
    }

    // Create new DM channel
    // For DM channels, we don't need a descriptive name since we'll use otherUser.name in the UI
    // Just use a simple identifier
    const channelName = `dm-${participants[0]}-${participants[1]}`;

    const [newChannel] = await db
      .insert(internalChannels)
      .values({
        name: channelName,
        type: 'dm',
        dmParticipants: participants,
        createdBy,
      })
      .returning({ id: internalChannels.id });

    // Add both users as members
    await db.insert(channelMembers).values([
      {
        channelId: newChannel.id,
        userId: userId1,
      },
      {
        channelId: newChannel.id,
        userId: userId2,
      },
    ]);

    console.log(`✅ Created DM channel: ${channelName}`);
    return newChannel.id;
  } catch (error) {
    console.error('❌ Error finding/creating DM channel:', error);
    throw error;
  }
}

/**
 * Get messages for a channel
 */
export async function getChannelMessages(
  channelId: string,
  limit = 50,
  offset = 0
): Promise<Message[]> {
  console.log('🔎 [Service] Fetching messages for Channel:', channelId, '(limit:', limit, ')');
  
  try {
    // ✅ CRITICAL: Resolve deterministic ID to database UUID
    const dbChannelId = await resolveChannelId(channelId);
    
    // If no UUID exists, the channel doesn't exist yet (no history)
    if (!dbChannelId) {
      console.log('⚠️ [Service] Channel does not exist in database yet, returning empty messages');
      return [];
    }
    
    console.log('✅ [Service] Using database UUID:', dbChannelId);
    
    const messages = await db
      .select({
        id: internalMessages.id,
        channelId: internalMessages.channelId,
        senderId: internalMessages.senderId,
        senderName: users.name,
        senderEmail: users.email,
        content: internalMessages.content,
        attachments: internalMessages.attachments,
        mentions: internalMessages.mentions,
        replyToId: internalMessages.replyToId,
        isEdited: internalMessages.isEdited,
        isDeleted: internalMessages.isDeleted,
        editedAt: internalMessages.editedAt,
        createdAt: internalMessages.createdAt,
        // Note: readAt is calculated client-side based on channel_members.lastReadAt
      })
      .from(internalMessages)
      .leftJoin(users, eq(internalMessages.senderId, users.clerkId))  // ✅ SAFETY: LEFT JOIN instead of INNER
      .where(eq(internalMessages.channelId, dbChannelId))  // ✅ Use resolved UUID
      .orderBy(desc(internalMessages.createdAt))
      .limit(limit)
      .offset(offset);

    console.log('📊 [Service] Query Result:', {
      count: messages.length,
      channelId: channelId
    });

    if (messages.length > 0) {
      console.log('📄 [Service] SAMPLE ROW:', {
        id: messages[0].id,
        senderId: messages[0].senderId,
        senderName: messages[0].senderName,
        senderEmail: messages[0].senderEmail,
        content: messages[0].content?.substring(0, 50) + '...',
        createdAt: messages[0].createdAt
      });
    } else {
      console.log('⚠️ [Service] No messages found in DB for channel:', channelId);
    }

    // For each message, fetch the replied-to message if it exists
    const messagesWithReplies = await Promise.all(
      messages.map(async (msg) => {
        let replyTo = null;
        if (msg.replyToId) {
          const replyMessages = await db
            .select({
              id: internalMessages.id,
              senderName: users.name,
              content: internalMessages.content,
            })
            .from(internalMessages)
            .leftJoin(users, eq(internalMessages.senderId, users.clerkId))  // ✅ SAFETY: LEFT JOIN
            .where(eq(internalMessages.id, msg.replyToId))
            .limit(1);

          if (replyMessages.length > 0) {
            replyTo = replyMessages[0];
          }
        }

        return {
          ...msg,
          replyTo,
        };
      })
    );

    console.log('✅ [Service] Returning', messagesWithReplies.length, 'messages (with replies populated)');
    return messagesWithReplies.reverse(); // Reverse to show oldest first
  } catch (error) {
    console.error('❌ Error getting channel messages:', error);
    throw error;
  }
}

/**
 * Send a message to a channel
 * ✅ Calls server-side Netlify function to save message and trigger Pusher
 */
export async function sendMessage(params: {
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
}): Promise<Message> {
  try {
    const { channelId, senderId, content, attachments = [], mentions = [], replyTo } = params;

    console.log(`📨 Sending message to channel ${channelId} via Netlify function`);

    // ✅ Call server-side Netlify function
    const response = await fetch('/.netlify/functions/chat-send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelId,
        senderId,
        content,
        attachments,
        mentions,
        replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to send message: ${response.statusText}`);
    }

    const messageWithSender: Message = await response.json();

    console.log(`✅ Message sent successfully: ${messageWithSender.id}`);
    return messageWithSender;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}

/**
 * Update last read timestamp for a user in a channel
 */
/**
 * Mark a channel as read for a user
 * ✅ Calls server-side Netlify function
 */
/**
 * Mark a channel as read for a user
 * Handles both deterministic IDs (dm-userA-userB) and database UUIDs
 */
export async function markChannelAsRead(
  userId: string,
  channelId: string
): Promise<void> {
  try {
    console.log(`📖 [Service] markChannelAsRead called`, {
      inputChannelId: channelId,
      isDeterministic: channelId.startsWith('dm-'),
      userId
    });

    // ✅ CRITICAL: Resolve deterministic ID to database UUID
    const backendChannelId = await resolveChannelId(channelId);
    
    console.log(`📖 [Service] Channel ID resolution`, {
      input: channelId,
      resolved: backendChannelId,
      resolutionSucceeded: !!backendChannelId
    });
    
    if (!backendChannelId) {
      console.warn(`⚠️ Cannot mark as read: channel ${channelId} does not exist`);
      return; // Silently fail - channel doesn't exist yet
    }

    // ✅ Call server-side Netlify function with database UUID
    const response = await fetch('/.netlify/functions/chat-mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        channelId: backendChannelId,  // Use resolved UUID
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to mark as read: ${response.statusText}`);
    }

    console.log(`✅ Channel marked as read`);
  } catch (error) {
    console.error('❌ Error marking channel as read:', error);
    // Don't throw - marking as read is not critical
  }
}

/**
 * Search homeowners for @ mentions
 */
export async function searchHomeownersForMention(
  query: string
): Promise<HomeownerMention[]> {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const results = await db
      .select({
        id: homeowners.id,
        name: homeowners.name,
        jobName: homeowners.jobName,
        address: homeowners.address,
      })
      .from(homeowners)
      .where(
        or(
          ilike(homeowners.name, `%${query}%`),
          ilike(homeowners.jobName, `%${query}%`),
          ilike(homeowners.address, `%${query}%`)
        )
      )
      .limit(10);

    return results.map((h) => ({
      id: h.id,
      name: h.name,
      projectName: h.jobName || h.address,
      address: h.address,
    }));
  } catch (error) {
    console.error('❌ Error searching homeowners:', error);
    throw error;
  }
}

/**
 * Send typing indicator
 */
export async function sendTypingIndicator(params: {
  channelId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}): Promise<void> {
  try {
    // NOTE: Typing indicators disabled until server-side Pusher endpoint is created
    // pusher-server library cannot be used in browser/Vite (Node.js crypto incompatible)
    // await triggerPusherEvent('team-chat', 'typing-indicator', params);
    console.log('⌨️ Typing indicator (Pusher disabled):', params);
  } catch (error) {
    console.error('❌ Error sending typing indicator:', error);
    // Don't throw - typing indicators are not critical
  }
}

