/**
 * DATABASE MIGRATION: Add updated_at Column to Users Table
 * 
 * This script adds the `updated_at` timestamp column to the users table.
 * Required for the User Edit Clerk Sync feature.
 * 
 * Run with: npm run tsx scripts/add-updated-at-column.ts
 * 
 * January 17, 2026
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addUpdatedAtColumn() {
  console.log('🔧 Starting migration: Add updated_at column to users table\n');

  try {
    // Check if column already exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'updated_at';
    `);

    if (result.rows && result.rows.length > 0) {
      console.log('✅ Column "updated_at" already exists. Migration not needed.\n');
      process.exit(0);
    }

    console.log('📊 Column "updated_at" does not exist. Adding now...\n');

    // Add the column
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    `);

    console.log('✅ Column "updated_at" added successfully!\n');

    // Backfill existing rows with created_at value
    console.log('🔄 Backfilling existing rows with created_at values...\n');
    
    await db.execute(sql`
      UPDATE users 
      SET updated_at = created_at 
      WHERE updated_at IS NULL;
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE updated_at IS NOT NULL;
    `);

    const count = countResult.rows?.[0]?.count || 0;
    console.log(`✅ Backfilled ${count} rows\n`);

    console.log('🎉 Migration complete!\n');
    console.log('Next steps:');
    console.log('1. Install @clerk/backend: npm install @clerk/backend');
    console.log('2. Add CLERK_SECRET_KEY to .env and Netlify environment');
    console.log('3. Test user edit functionality\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addUpdatedAtColumn();
