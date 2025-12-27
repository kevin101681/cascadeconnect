import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function createSmsMessagesTable() {
  try {
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.argv[2];

    if (!databaseUrl) {
      console.error('❌ Database URL not found.');
      console.error('   Options:');
      console.error('   1. Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file');
      console.error('   2. Pass it as an argument: npm run create-sms-messages-table -- "postgresql://..."');
      process.exit(1);
    }

    const sql = neon(databaseUrl);

    const urlObj = new URL(databaseUrl);
    const dbHost = urlObj.hostname;
    console.log(`🔄 Creating 'sms_messages' table...`);
    console.log(`   Database: ${dbHost}\n`);

    const sqlPath = join(process.cwd(), 'scripts', 'create-sms-messages-table.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
        console.log(`Executing: ${preview}...`);
        try {
          await sql.query(statement);
          console.log(`✅ Statement executed successfully.`);
        } catch (execError: any) {
          if (execError.message.includes('already exists')) {
            console.warn(`⚠️ Table or index already exists, skipping: ${preview}...`);
          } else {
            console.error(`❌ Error executing statement: ${preview}...`);
            console.error(`   Error details: ${execError.message}`);
            throw execError;
          }
        }
      }
    }

    console.log('\n✅ All "sms_messages" table statements processed.');
    console.log('\nNext steps:');
    console.log('1. Verify the "sms_messages" table in your Neon dashboard.');
    console.log('2. Configure Twilio environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) in Netlify.');
    console.log('3. Set up Twilio webhook URLs in Twilio Console:');
    console.log('   - Inbound SMS: https://[your-site].netlify.app/api/webhook/sms');
    console.log('   - Status Callback: https://[your-site].netlify.app/api/webhook/sms/status');

  } catch (error: any) {
    console.error('\n❌ Failed to create "sms_messages" table:', error.message);
    process.exit(1);
  }
}

createSmsMessagesTable();

