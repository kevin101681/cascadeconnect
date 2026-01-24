/**
 * Message Service - Database operations for message threads
 * Handles all direct database interactions for messaging
 */

import { db, isDbConfigured } from '../db';
import { messageThreads as messageThreadsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { MessageThread, Message } from '../types';

/**
 * Create a new message thread in the database
 * @param threadData - Thread data to insert
 * @returns The created thread
 * @throws Error if database is not configured or creation fails
 */
export async function createThread(threadData: MessageThread): Promise<MessageThread> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  await db.insert(messageThreadsTable).values({
    id: threadData.id,
    subject: threadData.subject,
    homeownerId: threadData.homeownerId,
    participants: threadData.participants,
    isRead: threadData.isRead,
    lastMessageAt: threadData.lastMessageAt,
    messages: threadData.messages
  } as any); // Type assertion needed for Drizzle ORM
  
  return threadData;
}

/**
 * Add a message to an existing thread
 * @param threadId - ID of the thread to update
 * @param newMessage - New message to add
 * @param updatedMessages - Complete array of messages (including new one)
 * @throws Error if database is not configured or update fails
 */
export async function addMessageToThread(
  threadId: string, 
  updatedMessages: Message[],
  lastMessageAt: Date
): Promise<void> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  await db.update(messageThreadsTable)
    .set({
      messages: updatedMessages,
      lastMessageAt: lastMessageAt
    } as any)
    .where(eq(messageThreadsTable.id, threadId));
}

/**
 * Update a message thread
 * @param threadId - ID of the thread to update
 * @param updates - Partial thread data to update
 * @throws Error if database is not configured or update fails
 */
export async function updateThread(threadId: string, updates: Partial<MessageThread>): Promise<void> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  await db.update(messageThreadsTable)
    .set({
      ...updates,
      lastMessageAt: updates.lastMessageAt || undefined
    } as any)
    .where(eq(messageThreadsTable.id, threadId));
}

/**
 * Mark a thread as read/unread
 * @param threadId - ID of the thread to update
 * @param isRead - Read status
 * @throws Error if database is not configured or update fails
 */
export async function markThreadAsRead(threadId: string, isRead: boolean): Promise<void> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  await db.update(messageThreadsTable)
    .set({ isRead } as any)
    .where(eq(messageThreadsTable.id, threadId));
}

/**
 * Delete a message thread from the database
 * @param threadId - ID of the thread to delete
 * @throws Error if database is not configured or deletion fails
 */
export async function deleteThread(threadId: string): Promise<void> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  await db.delete(messageThreadsTable).where(eq(messageThreadsTable.id, threadId));
}
