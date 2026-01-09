'use server';

/**
 * Response Templates - Database-backed Server Actions
 * CRUD operations for managing warranty response templates
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { responseTemplates } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================
// Types & Validation
// ============================================================

export interface ResponseTemplate {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const createTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  category: z.string().optional().default('General'),
});

const updateTemplateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  category: z.string().optional(),
});

export type CreateTemplateData = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateData = z.infer<typeof updateTemplateSchema>;

// ============================================================
// Server Actions
// ============================================================

/**
 * Get all response templates for the current user
 */
export async function getTemplates(): Promise<ResponseTemplate[]> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('Unauthorized: User must be logged in');
    }

    const templates = await db
      .select()
      .from(responseTemplates)
      .where(eq(responseTemplates.userId, userId))
      .orderBy(desc(responseTemplates.createdAt));

    return templates.map(t => ({
      ...t,
      createdAt: new Date(t.createdAt!),
      updatedAt: new Date(t.updatedAt!),
    }));
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw new Error('Failed to fetch templates');
  }
}

/**
 * Create a new response template
 */
export async function createTemplate(data: CreateTemplateData): Promise<ResponseTemplate> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('Unauthorized: User must be logged in');
    }

    // Validate input
    const validated = createTemplateSchema.parse(data);

    const [newTemplate] = await db
      .insert(responseTemplates)
      .values({
        userId,
        title: validated.title,
        content: validated.content,
        category: validated.category,
      })
      .returning();

    return {
      ...newTemplate,
      createdAt: new Date(newTemplate.createdAt!),
      updatedAt: new Date(newTemplate.updatedAt!),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors[0].message}`);
    }
    console.error('Error creating template:', error);
    throw new Error('Failed to create template');
  }
}

/**
 * Update an existing response template
 */
export async function updateTemplate(
  id: string,
  data: UpdateTemplateData
): Promise<ResponseTemplate> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('Unauthorized: User must be logged in');
    }

    // Validate input
    const validated = updateTemplateSchema.parse(data);

    // Check ownership and update
    const [updatedTemplate] = await db
      .update(responseTemplates)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(responseTemplates.id, id),
          eq(responseTemplates.userId, userId)
        )
      )
      .returning();

    if (!updatedTemplate) {
      throw new Error('Template not found or access denied');
    }

    return {
      ...updatedTemplate,
      createdAt: new Date(updatedTemplate.createdAt!),
      updatedAt: new Date(updatedTemplate.updatedAt!),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors[0].message}`);
    }
    console.error('Error updating template:', error);
    throw new Error('Failed to update template');
  }
}

/**
 * Delete a response template
 */
export async function deleteTemplate(id: string): Promise<void> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('Unauthorized: User must be logged in');
    }

    // Check ownership and delete
    const result = await db
      .delete(responseTemplates)
      .where(
        and(
          eq(responseTemplates.id, id),
          eq(responseTemplates.userId, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error('Template not found or access denied');
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    throw new Error('Failed to delete template');
  }
}
