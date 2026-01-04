/**
 * BUILDER IMPORT ACTION
 * 
 * Imports builders from CSV and creates user accounts with role='BUILDER'
 * 
 * Smart Matching Logic:
 * - For placeholder emails (@placeholder.local): Match by Name + Company
 * - For real emails: Use ON CONFLICT on email (standard behavior)
 */

import { db } from '../db';
import { users as usersTable } from '../db/schema';
import { sql, eq, and } from 'drizzle-orm';

export interface BuilderImportRow {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  isPlaceholderEmail?: boolean; // Flag to indicate generated placeholder
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

        const isPlaceholder = builder.email.includes('@placeholder.local');

        if (isPlaceholder) {
          // SMART MATCHING for placeholder emails: Match by Name + Company
          console.log(`🔍 Placeholder email detected for "${builder.name}" - attempting smart match`);

          // Try to find existing user by name and company
          let existingUser = null;
          
          if (builder.company) {
            // Match by name AND company
            const matches = await db
              .select()
              .from(usersTable)
              .where(
                and(
                  eq(usersTable.role, 'BUILDER'),
                  eq(usersTable.name, builder.name.trim())
                  // Note: We don't have a company column in users table yet
                  // For now, just match by name. You can add company column later.
                )
              )
              .limit(1);
            
            if (matches.length > 0) {
              existingUser = matches[0];
            }
          } else {
            // Match by name only
            const matches = await db
              .select()
              .from(usersTable)
              .where(
                and(
                  eq(usersTable.role, 'BUILDER'),
                  eq(usersTable.name, builder.name.trim())
                )
              )
              .limit(1);
            
            if (matches.length > 0) {
              existingUser = matches[0];
            }
          }

          if (existingUser) {
            // UPDATE existing user (found by name match)
            await db
              .update(usersTable)
              .set({
                name: builder.name.trim(),
                // Don't overwrite email if existing one is real
                email: existingUser.email.includes('@placeholder.local') 
                  ? builder.email.trim().toLowerCase() 
                  : existingUser.email,
              })
              .where(eq(usersTable.id, existingUser.id));
            
            skipped++;
            console.log(`🔄 Updated existing builder: ${builder.name} (matched by name)`);
          } else {
            // INSERT new user with placeholder email
            const result = await db
              .insert(usersTable)
              .values({
                name: builder.name.trim(),
                email: builder.email.trim().toLowerCase(),
                role: 'BUILDER',
                clerkId: null,
                password: null,
                internalRole: null,
                builderGroupId: null,
              })
              .returning({ id: usersTable.id });

            imported++;
            console.log(`✅ Imported builder with placeholder: ${builder.name} (${builder.email})`);
          }
        } else {
          // STANDARD LOGIC for real emails: Use ON CONFLICT
          const result = await db
            .insert(usersTable)
            .values({
              name: builder.name.trim(),
              email: builder.email.trim().toLowerCase(),
              role: 'BUILDER',
              clerkId: null,
              password: null,
              internalRole: null,
              builderGroupId: null,
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
 * 
 * If Email is missing, generates placeholder: missing_[sanitized_name]_[timestamp]@placeholder.local
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

  if (nameIndex === -1) {
    throw new Error('CSV must have "Name" column');
  }

  const builders: BuilderImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim());
    const name = values[nameIndex] || '';
    let email = emailIndex !== -1 ? values[emailIndex] : '';
    let isPlaceholderEmail = false;

    // Generate placeholder email if missing
    if (!email || email.trim() === '') {
      // Sanitize name: lowercase, remove special chars, replace spaces with underscores
      const sanitizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 30); // Limit length
      
      const timestamp = Date.now();
      email = `missing_${sanitizedName}_${timestamp}@placeholder.local`;
      isPlaceholderEmail = true;
      
      console.log(`⚠️ Generated placeholder email for "${name}": ${email}`);
    }

    builders.push({
      name,
      email,
      phone: phoneIndex !== -1 ? values[phoneIndex] : undefined,
      company: companyIndex !== -1 ? values[companyIndex] : undefined,
      isPlaceholderEmail,
    });
  }

  return builders;
}

