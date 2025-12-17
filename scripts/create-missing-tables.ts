import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function createMissingTables() {
  try {
    // Try to get database URL from environment
    // For production, you can pass it as an argument or set it in .env.local
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.argv[2];
    
    if (!databaseUrl) {
      console.error('❌ Database URL not found.');
      console.error('   Options:');
      console.error('   1. Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file');
      console.error('   2. Pass it as an argument: npm run create-missing-tables -- "postgresql://..."');
      console.error('   3. For production: Copy VITE_DATABASE_URL from Netlify and set it in .env.local');
      process.exit(1);
    }

    const sql = neon(databaseUrl);
    
    // Extract database host from URL for display (without exposing credentials)
    const urlObj = new URL(databaseUrl);
    const dbHost = urlObj.hostname;
    console.log(`🔄 Creating missing tables...`);
    console.log(`   Database: ${dbHost}\n`);
    
    // Read both SQL files
    const contractorsSqlPath = join(process.cwd(), 'scripts', 'create-contractors-table.sql');
    const messageThreadsSqlPath = join(process.cwd(), 'scripts', 'create-message-threads-table.sql');
    
    const contractorsSql = readFileSync(contractorsSqlPath, 'utf-8');
    const messageThreadsSql = readFileSync(messageThreadsSqlPath, 'utf-8');
    
    // Combine and execute statements
    const allStatements = [
      ...contractorsSql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--')),
      ...messageThreadsSql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))
    ];
    
    for (const statement of allStatements) {
      if (statement.trim()) {
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
        console.log(`Executing: ${preview}...`);
        try {
          await sql(statement);
          console.log(`   ✅ Success`);
        } catch (error: any) {
          // If table already exists, that's okay
          if (error.message && error.message.includes('already exists')) {
            console.log(`   ⚠️  Table already exists (skipping)`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('\n✅ Successfully created/verified all tables!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error creating tables:', error);
    if (error.message) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

createMissingTables();
