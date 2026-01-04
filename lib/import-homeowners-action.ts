/**
 * Server Action: Import Homeowners from Buildertrend CSV
 * 
 * Handles:
 * - Builder lookup/creation
 * - Homeowner upsert (match on email OR job_name)
 * - Batch processing with progress tracking
 */

import { db, isDbConfigured } from '../db';
import { homeowners as homeownersTable, builderGroups as builderGroupsTable } from '../db/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { TransformedHomeowner } from './buildertrend-transformer';

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
  builderCreated: number;
}

/**
 * Finds or creates a builder group by name
 * Returns the builder group ID
 */
async function getOrCreateBuilder(builderName: string): Promise<string> {
  if (!builderName || !builderName.trim()) {
    throw new Error('Builder name is required');
  }

  if (!isDbConfigured) {
    // In mock mode, return a placeholder ID
    return crypto.randomUUID();
  }

  const normalizedName = builderName.trim();

  // Try to find existing builder (case-insensitive)
  const existing = await db
    .select()
    .from(builderGroupsTable)
    .where(ilike(builderGroupsTable.name, normalizedName))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new builder
  const newBuilder = await db
    .insert(builderGroupsTable)
    .values({
      name: normalizedName,
      email: null,
    })
    .returning();

  return newBuilder[0].id;
}

/**
 * Upserts a homeowner record
 * Matches on email OR job_name
 */
async function upsertHomeowner(
  transformed: TransformedHomeowner,
  builderId: string
): Promise<'created' | 'updated'> {
  if (!isDbConfigured) {
    throw new Error('Database not configured');
  }

  // Build full address string
  const addressParts = [
    transformed.street_address,
    transformed.city,
    transformed.state,
    transformed.zip_code,
  ].filter(Boolean);
  const fullAddress = addressParts.join(', ') || transformed.street_address || 'Unknown Address';

  // Check if homeowner exists (match on email OR job_name)
  const existing = await db
    .select()
    .from(homeownersTable)
    .where(
      or(
        eq(homeownersTable.email, transformed.email.toLowerCase().trim()),
        transformed.job_name
          ? eq(homeownersTable.jobName, transformed.job_name)
          : undefined
      )
    )
    .limit(1);

  const homeownerData = {
    name: transformed.full_name,
    firstName: transformed.firstName || null,
    lastName: transformed.lastName || null,
    email: transformed.email.toLowerCase().trim(),
    phone: transformed.phone || null,
    street: transformed.street_address || null,
    city: transformed.city || null,
    state: transformed.state || null,
    zip: transformed.zip_code || null,
    address: fullAddress,
    builder: transformed.builder_name || null,
    builderGroupId: builderId || null,
    jobName: transformed.job_name || null,
    closingDate: transformed.closing_date || null,
  };

  if (existing.length > 0) {
    // Update existing record (fill in missing fields)
    await db
      .update(homeownersTable)
      .set({
        ...homeownerData,
        // Preserve existing values for fields that might be more complete
        name: homeownerData.name || existing[0].name,
        phone: homeownerData.phone || existing[0].phone,
        street: homeownerData.street || existing[0].street,
        city: homeownerData.city || existing[0].city,
        state: homeownerData.state || existing[0].state,
        zip: homeownerData.zip || existing[0].zip,
        address: homeownerData.address || existing[0].address,
        builder: homeownerData.builder || existing[0].builder,
        builderGroupId: homeownerData.builderGroupId || existing[0].builderGroupId,
        jobName: homeownerData.jobName || existing[0].jobName,
        closingDate: homeownerData.closingDate || existing[0].closingDate,
      })
      .where(eq(homeownersTable.id, existing[0].id));

    return 'updated';
  } else {
    // Insert new record
    await db.insert(homeownersTable).values(homeownerData);
    return 'created';
  }
}

/**
 * Main import function - processes homeowners in batches
 */
export async function importHomeowners(
  transformedRows: TransformedHomeowner[],
  onProgress?: (progress: number, current: number, total: number) => void
): Promise<ImportResult> {
  if (!isDbConfigured) {
    throw new Error('Database not configured. Please set VITE_DATABASE_URL.');
  }

  const result: ImportResult = {
    success: true,
    imported: 0,
    updated: 0,
    errors: [],
    builderCreated: 0,
  };

  // Track builder lookups to avoid duplicate queries
  const builderCache = new Map<string, string>();

  const BATCH_SIZE = 50;
  const total = transformedRows.length;

  for (let i = 0; i < transformedRows.length; i += BATCH_SIZE) {
    const batch = transformedRows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      try {
        // Get or create builder
        const builderName = row.builder_name?.trim();
        if (builderName) {
          if (!builderCache.has(builderName)) {
            // Check if builder already exists before creating
            const existing = await db
              .select()
              .from(builderGroupsTable)
              .where(ilike(builderGroupsTable.name, builderName))
              .limit(1);
            
            let builderId: string;
            if (existing.length > 0) {
              builderId = existing[0].id;
            } else {
              // Create new builder
              builderId = await getOrCreateBuilder(builderName);
              result.builderCreated++;
            }
            
            builderCache.set(builderName, builderId);
          }
        }

        const builderId = builderName ? builderCache.get(builderName)! : null;

        // Upsert homeowner
        const action = await upsertHomeowner(row, builderId || '');
        if (action === 'created') {
          result.imported++;
        } else {
          result.updated++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Row ${i + 1}: ${errorMsg}`);
        result.success = false;
      }
    }

    // Report progress
    const current = Math.min(i + BATCH_SIZE, total);
    if (onProgress) {
      onProgress(Math.round((current / total) * 100), current, total);
    }
  }

  return result;
}

