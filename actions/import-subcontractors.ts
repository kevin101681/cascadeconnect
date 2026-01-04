/**
 * SUBCONTRACTOR IMPORT SERVER ACTION
 * 
 * Features:
 * - Imports subcontractors from CSV
 * - Upserts based on company name
 * - Ignores specialty field (leaves as null)
 * - Links to builder_user_id if needed
 */

import { db, isDbConfigured } from '../db';
import { contractors as contractorsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface SubcontractorImportRow {
  rowIndex: number;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
}

export interface SubcontractorImportResult {
  success: boolean;
  message: string;
  imported: number;
  updated: number;
  errors: string[];
}

/**
 * Import subcontractors with upsert logic
 */
export async function importSubcontractors(
  subcontractors: SubcontractorImportRow[],
  builderUserId?: string // Optional: Link to specific builder
): Promise<SubcontractorImportResult> {
  if (!isDbConfigured) {
    return {
      success: false,
      message: 'Database not configured',
      imported: 0,
      updated: 0,
      errors: ['Database not configured'],
    };
  }

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of subcontractors) {
    try {
      // Validate required field
      if (!row.companyName) {
        errors.push(`Row ${row.rowIndex}: Missing company name`);
        continue;
      }

      // Check if subcontractor already exists by company name
      // If builderUserId provided, match on both company + builder
      let existing = null;
      
      if (builderUserId) {
        const matches = await db
          .select({ id: contractorsTable.id })
          .from(contractorsTable)
          .where(
            and(
              eq(contractorsTable.companyName, row.companyName.trim()),
              eq(contractorsTable.builderUserId, builderUserId)
            )
          )
          .limit(1);
        
        if (matches.length > 0) {
          existing = matches[0];
        }
      } else {
        // Global match (no builder filter)
        const matches = await db
          .select({ id: contractorsTable.id })
          .from(contractorsTable)
          .where(eq(contractorsTable.companyName, row.companyName.trim()))
          .limit(1);
        
        if (matches.length > 0) {
          existing = matches[0];
        }
      }

      if (existing) {
        // Update existing subcontractor
        await db
          .update(contractorsTable)
          .set({
            contactName: row.contactName || null,
            email: row.email || null,
            phone: row.phone || null,
            // NOTE: specialty is intentionally NOT updated - left as-is
            // builderUserId is also left as-is
          })
          .where(eq(contractorsTable.id, existing.id));

        updated++;
        console.log(`🔄 Updated subcontractor: ${row.companyName}`);
      } else {
        // Insert new subcontractor
        await db.insert(contractorsTable).values({
          companyName: row.companyName.trim(),
          contactName: row.contactName || null,
          email: row.email || null,
          phone: row.phone || null,
          specialty: null, // Ignoring specialty during import
          builderUserId: builderUserId || null,
        });

        imported++;
        console.log(`✅ Imported subcontractor: ${row.companyName}`);
      }
    } catch (error) {
      const errorMsg = `Row ${row.rowIndex} (${row.companyName}): ${
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
    errors,
  };
}

