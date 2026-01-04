/**
 * HOMEOWNER IMPORT SERVER ACTION
 * 
 * Features:
 * - Imports homeowners from CSV
 * - Matches builders by querying users table (role='BUILDER')
 * - Links homeowners to builder_user_id (new schema)
 * - SUPPORTS MULTIPLE HOMES PER USER: Matches on Email + Job Name
 */

import { db, isDbConfigured } from '../db';
import { homeowners as homeownersTable, users as usersTable } from '../db/schema';
import { ilike, or, eq, and } from 'drizzle-orm';

export interface HomeownerImportRow {
  rowIndex: number;
  name: string;
  email: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  address: string;
  builderGroup?: string;
  jobName?: string;
  closingDate?: Date;
  builderFound?: boolean;
}

export interface HomeownerImportResult {
  success: boolean;
  message: string;
  imported: number;
  updated: number;
  buildersMatched: number;
  buildersNotMatched: number;
  errors: string[];
}

/**
 * Find a builder user by name/company
 * Searches users table WHERE role='BUILDER'
 */
async function findBuilderUser(builderName: string): Promise<string | null> {
  if (!builderName || !builderName.trim() || !isDbConfigured) {
    return null;
  }

  try {
    const normalizedName = builderName.trim();

    // Query users table for BUILDER role matching name
    const matches = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        or(
          eq(usersTable.role, 'BUILDER'),
          ilike(usersTable.name, `%${normalizedName}%`)
        )
      )
      .limit(1);

    if (matches.length > 0) {
      return matches[0].id;
    }

    return null;
  } catch (error) {
    console.error(`Failed to find builder user for "${builderName}":`, error);
    return null;
  }
}

/**
 * Import homeowners with builder matching
 */
export async function importHomeowners(
  homeowners: HomeownerImportRow[]
): Promise<HomeownerImportResult> {
  if (!isDbConfigured) {
    return {
      success: false,
      message: 'Database not configured',
      imported: 0,
      updated: 0,
      buildersMatched: 0,
      buildersNotMatched: 0,
      errors: ['Database not configured'],
    };
  }

  let imported = 0;
  let updated = 0;
  let buildersMatched = 0;
  let buildersNotMatched = 0;
  const errors: string[] = [];

  for (const row of homeowners) {
    try {
      // Validate required fields
      if (!row.name || !row.email) {
        errors.push(`Row ${row.rowIndex}: Missing name or email`);
        continue;
      }

      // Match builder if provided
      let builderUserId: string | null = null;
      if (row.builderGroup) {
        builderUserId = await findBuilderUser(row.builderGroup);
        if (builderUserId) {
          buildersMatched++;
        } else {
          buildersNotMatched++;
          console.warn(`Builder not found for row ${row.rowIndex}: "${row.builderGroup}"`);
        }
      }

      // Split name into first/last if not already split
      let firstName = '';
      let lastName = '';
      const nameParts = row.name.trim().split(' ');
      if (nameParts.length > 1) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      } else {
        firstName = row.name.trim();
      }

      // MULTI-HOME SUPPORT: Check if homeowner already exists by EMAIL + JOB NAME
      // This allows one user (email) to have multiple home properties
      let existing = null;
      
      if (row.jobName) {
        // Match on both email AND job name (unique property)
        const matches = await db
          .select({ id: homeownersTable.id })
          .from(homeownersTable)
          .where(
            and(
              eq(homeownersTable.email, row.email.trim().toLowerCase()),
              eq(homeownersTable.jobName, row.jobName)
            )
          )
          .limit(1);
        
        if (matches.length > 0) {
          existing = matches[0];
        }
      } else {
        // No job name - fall back to email only (original behavior)
        const matches = await db
          .select({ id: homeownersTable.id })
          .from(homeownersTable)
          .where(eq(homeownersTable.email, row.email.trim().toLowerCase()))
          .limit(1);
        
        if (matches.length > 0) {
          existing = matches[0];
        }
      }

      if (existing) {
        // Update existing homeowner (same email + job name)
        await db
          .update(homeownersTable)
          .set({
            name: row.name,
            firstName,
            lastName,
            phone: row.phone || null,
            street: row.street || null,
            city: row.city || null,
            state: row.state || null,
            zip: row.zip || null,
            address: row.address,
            builderUserId, // NEW: Link to builder user
            jobName: row.jobName || null,
            closingDate: row.closingDate || null,
          })
          .where(eq(homeownersTable.id, existing.id));

        updated++;
        console.log(`🔄 Updated homeowner: ${row.email} - ${row.jobName || 'No job name'}`);
      } else {
        // Insert new homeowner (even if email exists with different job name)
        await db.insert(homeownersTable).values({
          name: row.name,
          firstName,
          lastName,
          email: row.email.trim().toLowerCase(),
          phone: row.phone || null,
          street: row.street || null,
          city: row.city || null,
          state: row.state || null,
          zip: row.zip || null,
          address: row.address,
          builderUserId, // NEW: Link to builder user
          builder: row.builderGroup || null, // Legacy text field
          jobName: row.jobName || null,
          closingDate: row.closingDate || null,
          password: null,
          clerkId: null,
        });

        imported++;
        console.log(`✅ Imported homeowner: ${row.email} - ${row.jobName || 'No job name'}`);
      }
    } catch (error) {
      const errorMsg = `Row ${row.rowIndex} (${row.email}): ${
        error instanceof Error ? error.message : String(error)
      }`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  return {
    success: true,
    message: `Import complete: ${imported} new, ${updated} updated`,
    imported,
    updated,
    buildersMatched,
    buildersNotMatched,
    errors,
  };
}

