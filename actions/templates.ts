/**
 * Response Templates - Client-side API calls to Netlify Functions
 * CRUD operations for managing warranty response templates
 */

import { useUser } from '@clerk/clerk-react';

// ============================================================
// Types
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

// ============================================================
// Helper to get user ID from Clerk
// ============================================================

// Note: These functions must be called from React components that have access to Clerk context
// The component should pass the userId to these functions

const API_BASE = '/.netlify/functions';

// ============================================================
// API Functions
// ============================================================

/**
 * Get all response templates for the current user
 */
export async function getTemplates(userId: string): Promise<ResponseTemplate[]> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const response = await fetch(`${API_BASE}/templates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch templates');
    }

    const templates = await response.json();
    
    // Convert date strings to Date objects
    return templates.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    }));
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw new Error('Failed to fetch templates');
  }
}

/**
 * Create a new response template
 */
export async function createTemplate(
  userId: string,
  data: CreateTemplateData
): Promise<ResponseTemplate> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!data.title || !data.content) {
      throw new Error('Title and content are required');
    }

    const response = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create template');
    }

    const template = await response.json();
    
    return {
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt),
    };
  } catch (error) {
    console.error('Error creating template:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create template');
  }
}

/**
 * Update an existing response template
 */
export async function updateTemplate(
  userId: string,
  id: string,
  data: UpdateTemplateData
): Promise<ResponseTemplate> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!id) {
      throw new Error('Template ID is required');
    }

    const response = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update template');
    }

    const template = await response.json();
    
    return {
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt),
    };
  } catch (error) {
    console.error('Error updating template:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update template');
  }
}

/**
 * Delete a response template
 */
export async function deleteTemplate(userId: string, id: string): Promise<void> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!id) {
      throw new Error('Template ID is required');
    }

    const response = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete template');
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete template');
  }
}
