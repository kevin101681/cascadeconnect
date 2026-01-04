/**
 * BUILDER IMPORT ACTION
 * 
 * Imports builders from CSV and creates user accounts with role='BUILDER'
 * Uses ON CONFLICT DO NOTHING to handle duplicate emails
 */

import { db } from '../db';
import { users as usersTable } from '../db/schema';
import { sql } from 'drizzle-orm';

export interface BuilderImportRow {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface BuilderImportResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importBuilderUsers(builders: BuilderImportRow[]): Promise<BuilderImportResult> {
  try {
    console.log(`📥 Starting builder import: ${builders.length} builders`);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const builder of builders) {
      try {
        // Validate required fields
        if (!builder.name || !builder.email) {
          errors.push(`Skipped row: Missing name or email`);
          skipped++;
          continue;
        }

        // Insert with ON CONFLICT DO NOTHING
        const result = await db
          .insert(usersTable)
          .values({
            name: builder.name.trim(),
            email: builder.email.trim().toLowerCase(),
            role: 'BUILDER',
            clerkId: null, // No Clerk auth for imported builders
            password: null, // Set via password reset flow
            internalRole: null, // Not an internal user
            builderGroupId: null, // No longer using builder groups
          })
          .onConflictDoNothing({ target: usersTable.email })
          .returning({ id: usersTable.id });

        if (result.length > 0) {
          imported++;
          console.log(`✅ Imported builder: ${builder.name} (${builder.email})`);
        } else {
          skipped++;
          console.log(`⏭️ Skipped builder (duplicate email): ${builder.email}`);
        }
      } catch (error) {
        const errorMsg = `Error importing ${builder.name}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(errorMsg);
        skipped++;
      }
    }

    return {
      success: true,
      message: `Import complete: ${imported} imported, ${skipped} skipped`,
      imported,
      skipped,
      errors,
    };
  } catch (error) {
    console.error('❌ Builder import failed:', error);
    return {
      success: false,
      message: 'Failed to import builders',
      imported: 0,
      skipped: builders.length,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Parse CSV data into BuilderImportRow objects
 * Expected headers: Name, Email, Phone (optional), Company (optional)
 */
export function parseBuilderCSV(csvText: string): BuilderImportRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIndex = headers.findIndex(h => h.includes('name'));
  const emailIndex = headers.findIndex(h => h.includes('email'));
  const phoneIndex = headers.findIndex(h => h.includes('phone'));
  const companyIndex = headers.findIndex(h => h.includes('company'));

  if (nameIndex === -1 || emailIndex === -1) {
    throw new Error('CSV must have "Name" and "Email" columns');
  }

  const builders: BuilderImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim());

    builders.push({
      name: values[nameIndex] || '',
      email: values[emailIndex] || '',
      phone: phoneIndex !== -1 ? values[phoneIndex] : undefined,
      company: companyIndex !== -1 ? values[companyIndex] : undefined,
    });
  }

  return builders;
}

