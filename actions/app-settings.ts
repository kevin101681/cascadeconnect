/**
 * Server Actions: App Settings Management
 * January 22, 2026
 * 
 * Manages dynamic application configuration stored in the database.
 */

import { db } from '../db';
import { appSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get the current AI model configuration
 * @returns The model string (e.g., 'gpt-5.2')
 */
export async function getAIModelConfig(): Promise<string> {
  try {
    const result = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'ai_model'))
      .limit(1);
    
    // Default to gpt-5.2 if not set
    return result[0]?.value || 'gpt-5.2';
  } catch (error) {
    console.error('Error fetching AI model config:', error);
    return 'gpt-5.2'; // Fallback to default
  }
}

/**
 * Update the AI model configuration
 * @param modelValue - The model string to use (e.g., 'gpt-5.2', 'gpt-4o')
 */
export async function updateAIModelConfig(modelValue: string): Promise<boolean> {
  try {
    // Validate input
    if (!modelValue || modelValue.trim().length === 0) {
      throw new Error('Model value cannot be empty');
    }

    // Upsert the setting (update if exists, insert if not)
    await db
      .insert(appSettings)
      .values({
        key: 'ai_model',
        value: modelValue.trim(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: modelValue.trim(),
          updatedAt: new Date(),
        },
      });

    console.log(`✅ AI model config updated to: ${modelValue}`);
    return true;
  } catch (error) {
    console.error('Error updating AI model config:', error);
    return false;
  }
}
