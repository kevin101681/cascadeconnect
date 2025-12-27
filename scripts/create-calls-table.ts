import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function createCallsTable() {
  try {
    // Try to get database URL from environment
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.argv[2];
    
    if (!databaseUrl) {
      console.error('❌ Database URL not found.');
      console.error('   Options:');
      console.error('   1. Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file');
      console.error('   2. Pass it as an argument: npm run create-calls-table -- "postgresql://..."');
      process.exit(1);
    }

    const sql = neon(databaseUrl);
    
    // Extract database host from URL for display (without exposing credentials)
    const urlObj = new URL(databaseUrl);
    const dbHost = urlObj.hostname;
    console.log(`🔄 Creating calls table...`);
    console.log(`   Database: ${dbHost}\n`);
    
    // Read SQL file
    const sqlPath = join(process.cwd(), 'scripts', 'create-calls-table.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    // Execute each statement (split by semicolon)
    // Remove comment lines first, then split by semicolon
    const cleanedContent = sqlContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('--'))
      .join('\n');
    
    const statements = cleanedContent
      .split(';')
      .map(s => s.trim().replace(/\s+/g, ' '))
      .filter(s => s.length > 0);
    
    console.log(`   Found ${statements.length} statement(s) to execute\n`);
    
    if (statements.length === 0) {
      console.error('❌ No SQL statements found in the SQL file!');
      process.exit(1);
    }
    
    for (const statement of statements) {
      if (statement.trim()) {
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
        console.log(`   Executing: ${preview}...`);
        try {
          await sql(statement);
          console.log(`   ✅ Success\n`);
        } catch (err: any) {
          // Check if it's a "already exists" error (safe to ignore)
          if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
            console.log(`   ⚠️  Already exists (skipping)\n`);
          } else {
            console.error(`   ❌ Error: ${err.message}\n`);
            throw err;
          }
        }
      }
    }
    
    console.log('✅ Calls table created successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the table in your Neon dashboard');
    console.log('2. The webhook will now be able to save call records');
    
  } catch (error: any) {
    console.error('\n❌ Error creating calls table:');
    console.error('   Message:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  }
}

createCallsTable();

