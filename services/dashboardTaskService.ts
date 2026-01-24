/**
 * Task Service - Database operations for tasks
 * Handles all direct database interactions for tasks
 */

import { db, isDbConfigured } from '../db';
import { tasks as tasksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Task } from '../types';

/**
 * Create a new task in the database
 * @param taskData - Task data to insert
 * @returns The created task
 * @throws Error if database is not configured or creation fails
 */
export async function createTask(taskData: Partial<Task>): Promise<Task> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  const result = await db.insert(tasksTable)
    .values({
      id: taskData.id,
      title: taskData.title,
      description: taskData.description,
      assignedToId: taskData.assignedToId,
      assignedById: taskData.assignedById,
      isCompleted: taskData.isCompleted ?? false,
      dateAssigned: taskData.dateAssigned,
      dueDate: taskData.dueDate,
      relatedClaimIds: taskData.relatedClaimIds
    } as any) // Type assertion needed for Drizzle ORM
    .returning();
  
  return result[0] as Task;
}

/**
 * Update a task in the database
 * @param taskId - ID of the task to update
 * @param updates - Partial task data to update
 * @throws Error if database is not configured or update fails
 */
export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  await db.update(tasksTable)
    .set({
      ...updates,
      // Ensure date fields are properly handled
      dateAssigned: updates.dateAssigned ? new Date(updates.dateAssigned) : undefined,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
    } as any) // Type assertion needed for Drizzle ORM
    .where(eq(tasksTable.id, taskId));
}

/**
 * Delete a task from the database
 * @param taskId - ID of the task to delete
 * @throws Error if database is not configured or deletion fails
 */
export async function deleteTask(taskId: string): Promise<void> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
}

/**
 * Toggle task completion status
 * @param taskId - ID of the task to toggle
 * @param isCompleted - New completion status
 * @throws Error if database is not configured or update fails
 */
export async function toggleTaskStatus(taskId: string, isCompleted: boolean): Promise<void> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  await db.update(tasksTable)
    .set({ isCompleted } as any)
    .where(eq(tasksTable.id, taskId));
}
