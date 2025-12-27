import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Script to add Google Tasks-style fields to the tasks table
 * Adds: content, claim_id, created_at columns
 */
async function addTasksFields() {
  console.log('🔄 Adding Google Tasks-style fields to tasks table...');

  // Get database URL from environment
  const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.argv[2];
  
  if (!databaseUrl) {
    console.error('❌ Database URL not found.');
    console.error('   Options:');
    console.error('   1. Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file');
    console.error('   2. Pass it as an argument: npm run add-tasks-fields -- "postgresql://..."');
    process.exit(1);
  }

  try {
    const sql = neon(databaseUrl);

    // Extract database info for logging (without exposing full connection string)
    const urlObj = new URL(databaseUrl);
    const dbHost = urlObj.hostname;
    console.log(`   Database: ${dbHost}\n`);

    // Read SQL file
    const sqlPath = join(process.cwd(), 'scripts', 'add-tasks-fields.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    // Split SQL into individual statements (split by semicolon)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} statement(s) to execute\n`);

    if (statements.length === 0) {
      console.error('❌ No SQL statements found in the SQL file!');
      process.exit(1);
    }

    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || !statement.trim()) continue;

      const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
      console.log(`   Executing statement ${i + 1}/${statements.length}: ${preview}...`);
      
      try {
        await sql(statement);
        console.log(`   ✅ Success\n`);
      } catch (execError: any) {
        // Check if it's an "already exists" error (safe to ignore for IF NOT EXISTS operations)
        if (execError.message?.includes('already exists') || 
            execError.message?.includes('duplicate')) {
          console.log(`   ⚠️  Already exists (skipping)\n`);
        } else if (execError.message?.includes('constraint') || 
                   execError.message?.includes('foreign key')) {
          // Foreign key constraint errors are okay if claims table doesn't exist
          console.log(`   ⚠️  Could not add constraint (may need claims table): ${execError.message}\n`);
        } else {
          console.error(`   ❌ Error: ${execError.message}\n`);
          // For ALTER TABLE ADD COLUMN, "already exists" errors mean the column exists, which is okay
          if (statement.includes('ADD COLUMN') && execError.message?.includes('already')) {
            console.log(`   ⚠️  Column already exists (skipping)\n`);
          } else {
            throw execError;
          }
        }
      }
    }
    
    console.log('\n✅ Successfully added Google Tasks-style fields to tasks table!');
    console.log('\nAdded columns:');
    console.log('  - content (TEXT, nullable)');
    console.log('  - claim_id (UUID, nullable)');
    console.log('  - created_at (TIMESTAMP, default NOW())');
    console.log('\nCreated indexes:');
    console.log('  - idx_tasks_claim_id');
    console.log('  - idx_tasks_created_at');
    console.log('\nNote: Foreign key constraint may have failed if claims table does not exist.');
    console.log('      This is okay - you can add it later when the claims table exists.');
    
  } catch (error: any) {
    console.error('\n❌ Error adding tasks fields:');
    console.error('   Message:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.position) {
      console.error(`   Error at position: ${error.position}`);
    }
    process.exit(1);
  }
}

addTasksFields();

