/**
 * Response Templates - LocalStorage Implementation
 * Simple CRUD operations for managing warranty response templates
 */

const STORAGE_KEY = 'cascade_response_templates';

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
 * Load templates from localStorage
 */
function loadTemplatesFromStorage(): ResponseTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    // Convert createdAt strings back to Date objects
    return parsed.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt)
    }));
  } catch (error) {
    console.error('Error loading templates from localStorage:', error);
    return [];
  }
}

/**
 * Save templates to localStorage
 */
function saveTemplatesToStorage(templates: ResponseTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving templates to localStorage:', error);
    throw new Error('Failed to save templates');
  }
}

/**
 * Generate a unique ID for a template
 */
function generateId(): string {
  return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all response templates ordered by title
 */
export async function getTemplates(): Promise<ResponseTemplate[]> {
  // Simulate async operation for consistency with future database migration
  return new Promise((resolve) => {
    const templates = loadTemplatesFromStorage();
    const sorted = templates.sort((a, b) => a.title.localeCompare(b.title));
    resolve(sorted);
  });
}

/**
 * Create a new response template
 */
export async function createTemplate(data: CreateTemplateData): Promise<ResponseTemplate> {
  return new Promise((resolve, reject) => {
    try {
      const templates = loadTemplatesFromStorage();
      
      const newTemplate: ResponseTemplate = {
        id: generateId(),
        title: data.title,
        content: data.content,
        category: data.category || 'General',
        createdAt: new Date(),
      };
      
      templates.push(newTemplate);
      saveTemplatesToStorage(templates);
      
      resolve(newTemplate);
    } catch (error) {
      console.error('Error creating template:', error);
      reject(new Error('Failed to create template'));
    }
  });
}

/**
 * Update an existing response template
 */
export async function updateTemplate(
  id: string,
  data: UpdateTemplateData
): Promise<ResponseTemplate> {
  return new Promise((resolve, reject) => {
    try {
      const templates = loadTemplatesFromStorage();
      const index = templates.findIndex((t) => t.id === id);
      
      if (index === -1) {
        reject(new Error('Template not found'));
        return;
      }
      
      templates[index] = {
        ...templates[index],
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.category !== undefined && { category: data.category }),
      };
      
      saveTemplatesToStorage(templates);
      resolve(templates[index]);
    } catch (error) {
      console.error('Error updating template:', error);
      reject(new Error('Failed to update template'));
    }
  });
}

/**
 * Delete a response template
 */
export async function deleteTemplate(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const templates = loadTemplatesFromStorage();
      const filtered = templates.filter((t) => t.id !== id);
      
      if (filtered.length === templates.length) {
        // No template was removed, it didn't exist
        resolve(); // Silently succeed for idempotency
        return;
      }
      
      saveTemplatesToStorage(filtered);
      resolve();
    } catch (error) {
      console.error('Error deleting template:', error);
      reject(new Error('Failed to delete template'));
    }
  });
}

