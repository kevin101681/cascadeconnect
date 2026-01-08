import { db } from '../db';
import { responseTemplates } from '../db/schema';
import { eq, asc } from 'drizzle-orm';

export interface ResponseTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
}

export interface CreateTemplateData {
  title: string;
  content: string;
  category?: string;
}

export interface UpdateTemplateData {
  title?: string;
  content?: string;
  category?: string;
}

/**
 * Get all response templates ordered by title
 */
export async function getTemplates(): Promise<ResponseTemplate[]> {
  try {
    const templates = await db
      .select()
      .from(responseTemplates)
      .orderBy(asc(responseTemplates.title));
    
    return templates.map(t => ({
      id: t.id,
      title: t.title,
      content: t.content,
      category: t.category || 'General',
      createdAt: t.createdAt || new Date(),
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
    const [newTemplate] = await db
      .insert(responseTemplates)
      .values({
        title: data.title,
        content: data.content,
        category: data.category || 'General',
      })
      .returning();
    
    return {
      id: newTemplate.id,
      title: newTemplate.title,
      content: newTemplate.content,
      category: newTemplate.category || 'General',
      createdAt: newTemplate.createdAt || new Date(),
    };
  } catch (error) {
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
    const [updatedTemplate] = await db
      .update(responseTemplates)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.category !== undefined && { category: data.category }),
      })
      .where(eq(responseTemplates.id, id))
      .returning();
    
    if (!updatedTemplate) {
      throw new Error('Template not found');
    }
    
    return {
      id: updatedTemplate.id,
      title: updatedTemplate.title,
      content: updatedTemplate.content,
      category: updatedTemplate.category || 'General',
      createdAt: updatedTemplate.createdAt || new Date(),
    };
  } catch (error) {
    console.error('Error updating template:', error);
    throw new Error('Failed to update template');
  }
}

/**
 * Delete a response template
 */
export async function deleteTemplate(id: string): Promise<void> {
  try {
    await db
      .delete(responseTemplates)
      .where(eq(responseTemplates.id, id));
  } catch (error) {
    console.error('Error deleting template:', error);
    throw new Error('Failed to delete template');
  }
}

