/**
 * Backfill Script: Generate enrollment_slug for existing builders
 * 
 * This script generates URL-safe slugs from builder names for existing records.
 * Run this AFTER the SQL migration to ensure data integrity.
 * 
 * Usage: npx tsx scripts/backfill-enrollment-slugs.ts
 */

import { db, isDbConfigured } from '../db';
import { builderGroups } from '../db/schema';
import { eq, isNull } from 'drizzle-orm';

// Helper: Convert name to URL-safe slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Remove duplicate hyphens
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
}

// Helper: Ensure slug is unique by appending numbers if needed
async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await db
      .select()
      .from(builderGroups)
      .where(eq(builderGroups.enrollmentSlug, slug));
    
    // If no conflict, or only conflict is with self (during update), we're good
    if (existing.length === 0 || (excludeId && existing[0].id === excludeId)) {
      return slug;
    }
    
    // Conflict exists, try appending a number
    counter++;
    slug = `${baseSlug}-${counter}`;
    
    // Safety check: prevent infinite loop
    if (counter > 100) {
      throw new Error(`Could not generate unique slug for: ${baseSlug}`);
    }
  }
}

async function backfillEnrollmentSlugs() {
  if (!isDbConfigured) {
    console.error('❌ Database not configured. Check your DATABASE_URL environment variable.');
    process.exit(1);
  }

  console.log('🚀 Starting enrollment slug backfill...\n');

  try {
    // Fetch all builders without enrollment_slug
    const buildersWithoutSlug = await db
      .select()
      .from(builderGroups)
      .where(isNull(builderGroups.enrollmentSlug));

    if (buildersWithoutSlug.length === 0) {
      console.log('✅ All builders already have enrollment slugs!');
      return;
    }

    console.log(`📊 Found ${buildersWithoutSlug.length} builders without slugs\n`);

    for (const builder of buildersWithoutSlug) {
      const baseSlug = generateSlug(builder.name);
      const uniqueSlug = await ensureUniqueSlug(baseSlug, builder.id);

      await db
        .update(builderGroups)
        .set({ enrollmentSlug: uniqueSlug })
        .where(eq(builderGroups.id, builder.id));

      console.log(`✓ ${builder.name} → ${uniqueSlug}`);
    }

    console.log(`\n✅ Successfully backfilled ${buildersWithoutSlug.length} enrollment slugs!`);
    
    // Display sample enrollment URLs
    console.log('\n📝 Sample enrollment URLs:');
    const sampleBuilders = await db
      .select()
      .from(builderGroups)
      .limit(5);
    
    for (const builder of sampleBuilders) {
      const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
      console.log(`   ${builder.name}: ${baseUrl}/enroll/${builder.enrollmentSlug}`);
    }
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillEnrollmentSlugs()
  .then(() => {
    console.log('\n🎉 Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
