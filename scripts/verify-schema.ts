/**
 * Verify Database Schema
 * 
 * This script connects to your app's database (using the same connection as your app)
 * and lists all tables to verify the schema is correct.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function verifySchema() {
  console.log('🔍 Connecting to database...\n');

  try {
    // Query all tables
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`✅ Found ${tables.rows.length} tables:\n`);
    tables.rows.forEach((row: any) => {
      console.log(`   - ${row.table_name}`);
    });

    // Query builder_groups specifically
    console.log('\n🔍 Checking builder_groups columns...\n');
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'builder_groups'
      ORDER BY ordinal_position;
    `);

    if (columns.rows.length > 0) {
      console.log('✅ builder_groups table exists with columns:');
      columns.rows.forEach((row: any) => {
        console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
      
      // Check specifically for enrollment_slug
      const hasEnrollmentSlug = columns.rows.some((row: any) => row.column_name === 'enrollment_slug');
      if (hasEnrollmentSlug) {
        console.log('\n✅ enrollment_slug column EXISTS!');
      } else {
        console.log('\n❌ enrollment_slug column MISSING!');
      }
    } else {
      console.log('❌ builder_groups table does NOT exist!');
    }

    // Test a simple query
    console.log('\n🔍 Testing builder_groups query...\n');
    const builders = await db.execute(sql`SELECT COUNT(*) as count FROM builder_groups;`);
    console.log(`✅ Query successful! Found ${builders.rows[0].count} builders in database.`);

    console.log('\n✅ Schema verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error verifying schema:', error);
    process.exit(1);
  }
}

verifySchema();
