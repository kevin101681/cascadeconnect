'use server';

/**
 * GUIDE EDITOR ACTIONS
 * Server actions for managing the Homeowner Warranty Guide
 */

import { db } from '@/db';
import { guideSteps, type GuideStep, type NewGuideStep } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Get all active guide steps ordered by sortOrder
 */
export async function getGuideSteps(): Promise<GuideStep[]> {
  try {
    const steps = await db
      .select()
      .from(guideSteps)
      .where(eq(guideSteps.isActive, true))
      .orderBy(asc(guideSteps.sortOrder));

    return steps;
  } catch (error) {
    console.error('Failed to fetch guide steps:', error);
    throw new Error('Failed to fetch guide steps');
  }
}

/**
 * Get all guide steps (including inactive) - for admin panel
 */
export async function getAllGuideSteps(): Promise<GuideStep[]> {
  try {
    const steps = await db
      .select()
      .from(guideSteps)
      .orderBy(asc(guideSteps.sortOrder));

    return steps;
  } catch (error) {
    console.error('Failed to fetch all guide steps:', error);
    throw new Error('Failed to fetch all guide steps');
  }
}

/**
 * Create or update a guide step
 */
export async function saveGuideStep(data: {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  sortOrder?: string;
  isActive?: boolean;
}): Promise<GuideStep> {
  try {
    if (data.id) {
      // Update existing step
      const [updated] = await db
        .update(guideSteps)
        .set({
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          ...(data.sortOrder && { sortOrder: data.sortOrder }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        })
        .where(eq(guideSteps.id, data.id))
        .returning();

      revalidatePath('/');
      revalidatePath('/dashboard/admin/guide');
      return updated;
    } else {
      // Create new step - auto-generate sortOrder
      const existingSteps = await db
        .select()
        .from(guideSteps)
        .orderBy(asc(guideSteps.sortOrder));

      // Generate new sortOrder as string (e.g., "001", "002", "003")
      const newSortOrder = String(existingSteps.length + 1).padStart(3, '0');

      const [created] = await db
        .insert(guideSteps)
        .values({
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          sortOrder: data.sortOrder || newSortOrder,
          isActive: data.isActive !== undefined ? data.isActive : true,
        })
        .returning();

      revalidatePath('/');
      revalidatePath('/dashboard/admin/guide');
      return created;
    }
  } catch (error) {
    console.error('Failed to save guide step:', error);
    throw new Error('Failed to save guide step');
  }
}

/**
 * Delete a guide step
 */
export async function deleteGuideStep(id: string): Promise<void> {
  try {
    await db.delete(guideSteps).where(eq(guideSteps.id, id));

    revalidatePath('/');
    revalidatePath('/dashboard/admin/guide');
  } catch (error) {
    console.error('Failed to delete guide step:', error);
    throw new Error('Failed to delete guide step');
  }
}

/**
 * Reorder guide steps
 */
export async function reorderSteps(
  items: { id: string; sortOrder: string }[]
): Promise<void> {
  try {
    // Update each step's sortOrder in a transaction
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(guideSteps)
          .set({ sortOrder: item.sortOrder })
          .where(eq(guideSteps.id, item.id));
      }
    });

    revalidatePath('/');
    revalidatePath('/dashboard/admin/guide');
  } catch (error) {
    console.error('Failed to reorder steps:', error);
    throw new Error('Failed to reorder steps');
  }
}

/**
 * Toggle step active status
 */
export async function toggleStepActive(
  id: string,
  isActive: boolean
): Promise<void> {
  try {
    await db
      .update(guideSteps)
      .set({ isActive })
      .where(eq(guideSteps.id, id));

    revalidatePath('/');
    revalidatePath('/dashboard/admin/guide');
  } catch (error) {
    console.error('Failed to toggle step status:', error);
    throw new Error('Failed to toggle step status');
  }
}
