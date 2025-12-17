import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function createMessageThreadsTable() {
  try {
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ Database URL not found. Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file.');
      process.exit(1);
    }

    const sql = neon(databaseUrl);
    
    // Extract database host from URL for display (without exposing credentials)
    const urlObj = new URL(databaseUrl);
    const dbHost = urlObj.hostname;
    console.log(`🔄 Creating message_threads table...`);
    console.log(`   Database: ${dbHost}\n`);
    
    // Read the SQL migration file
    const sqlPath = join(process.cwd(), 'scripts', 'create-message-threads-table.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
        console.log(`Executing: ${preview}...`);
        await sql(statement);
      }
    }
    
    console.log('\n✅ Successfully created message_threads table!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error creating message_threads table:', error);
    if (error.message) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

createMessageThreadsTable();
