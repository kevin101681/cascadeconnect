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
import { eq, and, desc, sql, or, ilike } from 'drizzle-orm';
import { triggerPusherEvent } from '../lib/pusher-server';

// Types
export interface Channel {
  id: string;
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
  isEdited: boolean;
  isDeleted: boolean;
  editedAt?: Date;
  createdAt: Date;
}

export interface HomeownerMention {
  id: string;
  name: string;
  projectName: string;
  address: string;
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
        // Get unread count
        const unreadMessages = await db
          .select({ count: sql<number>`count(*)` })
          .from(internalMessages)
          .where(
            and(
              eq(internalMessages.channelId, ch.channelId),
              sql`${internalMessages.createdAt} > ${ch.lastReadAt}`,
              eq(internalMessages.isDeleted, false)
            )
          );

        const unreadCount = Number(unreadMessages[0]?.count || 0);

        // Get last message
        const lastMessages = await db
          .select({
            content: internalMessages.content,
            senderId: internalMessages.senderId,
            createdAt: internalMessages.createdAt,
            senderName: users.name,
          })
          .from(internalMessages)
          .innerJoin(users, eq(internalMessages.senderId, users.id))
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
          
          if (otherUserId) {
            const otherUserData = await db
              .select({
                id: users.id,
                name: users.name,
                email: users.email,
              })
              .from(users)
              .where(eq(users.id, otherUserId))
              .limit(1);

            otherUser = otherUserData[0];
          }
        }

        return {
          id: ch.channelId,
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
        id: users.id,
        name: users.name,
        email: users.email,
        internalRole: users.internalRole,
      })
      .from(users)
      .where(eq(users.role, 'ADMIN'))
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
    // Get both users' names
    const user1Data = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId1))
      .limit(1);

    const user2Data = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId2))
      .limit(1);

    const channelName = `${user1Data[0]?.name || 'User'} & ${user2Data[0]?.name || 'User'}`;

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
  try {
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
        isEdited: internalMessages.isEdited,
        isDeleted: internalMessages.isDeleted,
        editedAt: internalMessages.editedAt,
        createdAt: internalMessages.createdAt,
      })
      .from(internalMessages)
      .innerJoin(users, eq(internalMessages.senderId, users.id))
      .where(eq(internalMessages.channelId, channelId))
      .orderBy(desc(internalMessages.createdAt))
      .limit(limit)
      .offset(offset);

    return messages.reverse(); // Reverse to show oldest first
  } catch (error) {
    console.error('❌ Error getting channel messages:', error);
    throw error;
  }
}

/**
 * Send a message to a channel
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
}): Promise<Message> {
  try {
    const { channelId, senderId, content, attachments = [], mentions = [] } = params;

    // Insert message
    const [newMessage] = await db
      .insert(internalMessages)
      .values({
        channelId,
        senderId,
        content,
        attachments,
        mentions,
      })
      .returning();

    // Get sender info
    const senderData = await db
      .select({
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);

    const messageWithSender: Message = {
      ...newMessage,
      senderName: senderData[0]?.name || 'Unknown',
      senderEmail: senderData[0]?.email || '',
      attachments: newMessage.attachments as any,
      mentions: newMessage.mentions as any,
    };

    // Trigger Pusher event
    await triggerPusherEvent('team-chat', 'new-message', {
      channelId,
      message: messageWithSender,
    });

    console.log(`📨 Message sent to channel ${channelId}`);
    return messageWithSender;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}

/**
 * Update last read timestamp for a user in a channel
 */
export async function markChannelAsRead(
  userId: string,
  channelId: string
): Promise<void> {
  try {
    await db
      .update(channelMembers)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(channelMembers.userId, userId),
          eq(channelMembers.channelId, channelId)
        )
      );

    console.log(`✅ Marked channel ${channelId} as read for user ${userId}`);
  } catch (error) {
    console.error('❌ Error marking channel as read:', error);
    throw error;
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
    await triggerPusherEvent('team-chat', 'typing-indicator', params);
  } catch (error) {
    console.error('❌ Error sending typing indicator:', error);
    // Don't throw - typing indicators are not critical
  }
}

