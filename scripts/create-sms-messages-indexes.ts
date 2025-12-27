import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function createSmsMessagesIndexes() {
  try {
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.argv[2];

    if (!databaseUrl) {
      console.error('❌ Database URL not found.');
      console.error('   Options:');
      console.error('   1. Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file');
      console.error('   2. Pass it as an argument: npm run create-sms-messages-indexes -- "postgresql://..."');
      process.exit(1);
    }

    const sql = neon(databaseUrl);

    const urlObj = new URL(databaseUrl);
    const dbHost = urlObj.hostname;
    console.log(`🔄 Creating indexes for sms_messages table...`);
    console.log(`   Database: ${dbHost}\n`);

    const sqlPath = join(process.cwd(), 'scripts', 'create-sms-messages-indexes.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
        console.log(`   Executing: ${preview}...`);
        try {
          await sql(statement);
          console.log(`   ✅ Success\n`);
        } catch (execError: any) {
          // Check if it's a "already exists" error (safe to ignore)
          if (execError.message?.includes('already exists') || execError.message?.includes('duplicate')) {
            console.log(`   ⚠️  Already exists (skipping)\n`);
          } else {
            console.error(`   ❌ Error: ${execError.message}\n`);
            throw execError;
          }
        }
      }
    }

    console.log('✅ Indexes created successfully!');

  } catch (error: any) {
    console.error('\n❌ Error creating indexes:');
    console.error('   Message:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  }
}

createSmsMessagesIndexes();

