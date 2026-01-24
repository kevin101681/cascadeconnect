/**
 * Claim Service - Database operations for warranty claims
 * Handles all direct database interactions for claims
 */

import { db, isDbConfigured } from '../db';
import { claims as claimsSchema } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Claim } from '../types';

/**
 * Delete a single claim from the database
 * @param claimId - ID of the claim to delete
 * @throws Error if database is not configured or deletion fails
 */
export async function deleteClaim(claimId: string): Promise<void> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  await db.delete(claimsSchema).where(eq(claimsSchema.id, claimId));
}

/**
 * Delete multiple claims from the database
 * @param claimIds - Array of claim IDs to delete
 * @returns Number of claims successfully deleted
 * @throws Error if database is not configured
 */
export async function bulkDeleteClaims(claimIds: string[]): Promise<number> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  let deletedCount = 0;
  
  for (const claimId of claimIds) {
    try {
      await db.delete(claimsSchema).where(eq(claimsSchema.id, claimId));
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete claim ${claimId}:`, error);
      // Continue with other deletions even if one fails
    }
  }
  
  return deletedCount;
}

/**
 * Update a claim in the database
 * @param claimId - ID of the claim to update
 * @param updates - Partial claim data to update
 * @throws Error if database is not configured or update fails
 */
export async function updateClaim(claimId: string, updates: Partial<Claim>): Promise<void> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  await db.update(claimsSchema)
    .set(updates as any) // Type assertion needed for Drizzle ORM
    .where(eq(claimsSchema.id, claimId));
}

/**
 * Create a new claim in the database
 * @param claimData - Claim data to insert
 * @returns The created claim
 * @throws Error if database is not configured or creation fails
 */
export async function createClaim(claimData: Partial<Claim>): Promise<Claim> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }
  
  const result = await db.insert(claimsSchema)
    .values(claimData as any) // Type assertion needed for Drizzle ORM
    .returning();
  
  return result[0] as Claim;
}
