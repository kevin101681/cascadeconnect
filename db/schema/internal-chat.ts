/**
 * INTERNAL CHAT SCHEMA
 * Real-time team messaging for admin/employee users
 * January 6, 2026
 * 
 * Features:
 * - Public channels (e.g., 'general', 'repairs')
 * - Direct messages (DMs) between team members
 * - @ mentions of homeowners/projects
 * - Media attachments (Cloudinary)
 * - Read receipts
 * - Quote replies (reply to specific messages)
 */

import { pgTable, text, timestamp, boolean, uuid, pgEnum, json } from 'drizzle-orm/pg-core';
import { users } from '../schema';
import { homeowners } from '../schema';

// Channel type enum
export const channelTypeEnum = pgEnum('channel_type', ['public', 'dm']);

// --- 1. Internal Channels ---
// Represents both public channels and DM threads
export const internalChannels = pgTable('internal_channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // 'general', 'repairs', or user names for DMs
  type: channelTypeEnum('type').default('public'),
  
  // For DMs: store both user IDs for quick lookup
  // Format: JSON array with exactly 2 user IDs, sorted alphabetically
  dmParticipants: json('dm_participants').$type<string[]>(),
  
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- 2. Internal Messages ---
export const internalMessages = pgTable('internal_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').references(() => internalChannels.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  
  content: text('content').notNull(), // Message text
  
  // Attachments: Array of Cloudinary URLs with metadata
  // Format: [{ url: string, type: 'image' | 'video' | 'file', filename?: string }]
  attachments: json('attachments').$type<Array<{
    url: string;
    type: 'image' | 'video' | 'file';
    filename?: string;
    publicId?: string; // Cloudinary public ID for deletion
  }>>().default([]),
  
  // Mentions: Array of homeowner IDs referenced in the message
  // Format: [{ homeownerId: string, projectName: string, address: string }]
  mentions: json('mentions').$type<Array<{
    homeownerId: string;
    projectName: string;
    address: string;
  }>>().default([]),
  
  // Reply to another message (quote reply)
  replyToId: uuid('reply_to_id').references(() => internalMessages.id),
  
  // Editing and deletion
  isEdited: boolean('is_edited').default(false),
  isDeleted: boolean('is_deleted').default(false),
  editedAt: timestamp('edited_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- 3. Channel Members ---
// Tracks who has access to each channel and their read status
export const channelMembers = pgTable('channel_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').references(() => internalChannels.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  
  // Last time this user read messages in this channel
  lastReadAt: timestamp('last_read_at').defaultNow().notNull(),
  
  // When they joined the channel
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  
  // Notification preferences for this channel
  isMuted: boolean('is_muted').default(false),
});

