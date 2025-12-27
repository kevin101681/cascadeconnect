import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function createEmailLogsTable() {
  try {
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.argv[2];

    if (!databaseUrl) {
      console.error('❌ Database URL not found.');
      console.error('   Options:');
      console.error('   1. Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file');
      console.error('   2. Pass it as an argument: npm run create-email-logs-table -- "postgresql://..."');
      process.exit(1);
    }

    const sql = neon(databaseUrl);

    const urlObj = new URL(databaseUrl);
    const dbHost = urlObj.hostname;
    console.log(`🔄 Creating email_logs table...`);
    console.log(`   Database: ${dbHost}\n`);

    const sqlPath = join(process.cwd(), 'scripts', 'create-email-logs-table.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    // Remove comment lines and split by semicolon
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--')) // Remove comment lines
      .join('\n')
      .split(';')
      .map(s => s.trim())
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
        } catch (execError: any) {
          // Check if it's an "already exists" error (safe to ignore for IF NOT EXISTS operations)
          if (execError.message?.includes('already exists') || 
              execError.message?.includes('duplicate')) {
            console.log(`   ⚠️  Already exists (skipping)\n`);
          } else {
            console.error(`   ❌ Error: ${execError.message}\n`);
            throw execError;
          }
        }
      }
    }

    console.log('✅ Email logs table created successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the table in your Neon dashboard');
    console.log('2. Emails will now be automatically logged when sent');

  } catch (error: any) {
    console.error('\n❌ Error creating email_logs table:');
    console.error('   Message:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  }
}

createEmailLogsTable();

