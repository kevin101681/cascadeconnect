/**
 * SMS SYSTEM REBUILD MIGRATION SCRIPT
 * Executes the SQL migration to create new SMS tables
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function runMigration() {
  console.log('🔄 Starting SMS System Rebuild Migration...\n');

  // Get database URL
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    console.error('\n📝 Please add your Neon database URL to .env:');
    console.error('   VITE_DATABASE_URL=postgresql://...\n');
    console.error('💡 You can find this in:');
    console.error('   - Neon Console → Your Project → Connection Details');
    console.error('   - Or copy from your Netlify environment variables\n');
    process.exit(1);
  }

  // Validate URL format
  if (!databaseUrl.includes('postgresql://') && !databaseUrl.includes('postgres://')) {
    console.error('❌ Invalid database URL format');
    console.error('   Expected: postgresql://user:pass@host/database');
    console.error(`   Got: ${databaseUrl.substring(0, 30)}...\n`);
    process.exit(1);
  }

  try {
    // Create SQL client
    const sql = neon(databaseUrl);
    console.log('✅ Connected to Neon database\n');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'scripts', 'migrations', 'sms-system-rebuild.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let stepNum = 1;

    // Execute each statement
    for (const statement of statements) {
      try {
        // Skip comment-only statements
        if (statement.startsWith('COMMENT')) {
          console.log(`${stepNum}. Adding table comments...`);
        } else if (statement.includes('DROP TABLE')) {
          console.log(`${stepNum}. Dropping old sms_messages table...`);
        } else if (statement.includes('CREATE TABLE IF NOT EXISTS sms_threads')) {
          console.log(`${stepNum}. Creating sms_threads table...`);
        } else if (statement.includes('CREATE TABLE IF NOT EXISTS sms_messages')) {
          console.log(`${stepNum}. Creating sms_messages table...`);
        } else if (statement.includes('CREATE INDEX')) {
          const indexName = statement.match(/idx_\w+/)?.[0] || 'index';
          console.log(`${stepNum}. Creating index: ${indexName}...`);
        }

        await sql(statement);
        console.log(`   ✅ Success\n`);
        stepNum++;
      } catch (error: any) {
        // Check if error is because table/index already exists
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️  Already exists (skipping)\n`);
          stepNum++;
          continue;
        }
        console.error(`   ❌ Failed: ${error.message}\n`);
        throw error;
      }
    }

    // Verify tables were created
    console.log('🔍 Verifying tables...\n');
    
    const threadsCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sms_threads'
      );
    `;
    
    const messagesCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sms_messages'
      );
    `;

    if (threadsCheck[0].exists && messagesCheck[0].exists) {
      console.log('✅ sms_threads table exists');
      console.log('✅ sms_messages table exists\n');

      // Count indexes
      const indexCount = await sql`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename IN ('sms_threads', 'sms_messages');
      `;
      console.log(`✅ Created ${indexCount[0].count} indexes for performance\n`);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✨ SMS SYSTEM MIGRATION COMPLETE! ✨');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📱 Your SMS system is ready for real-time messaging!');
      console.log('\n📋 Next Steps:');
      console.log('   1. Configure Twilio webhook URL');
      console.log('   2. Set Pusher environment variables in Netlify');
      console.log('   3. Test inbound/outbound SMS flow\n');
    } else {
      throw new Error('Tables were not created successfully');
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run migration
runMigration();

