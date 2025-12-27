import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function addForeignKeys() {
  try {
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.argv[2];

    if (!databaseUrl) {
      console.error('❌ Database URL not found.');
      process.exit(1);
    }

    const sql = neon(databaseUrl);

    console.log(`🔄 Adding foreign key constraint for call_id...\n`);

    try {
      // Try to add the foreign key constraint (only works if calls table exists)
      await sql(`
        ALTER TABLE sms_messages 
        ADD CONSTRAINT fk_sms_messages_call_id 
        FOREIGN KEY (call_id) REFERENCES calls(id);
      `);
      console.log('   ✅ Foreign key constraint added successfully!\n');
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('duplicate constraint')) {
        console.log('   ⚠️  Foreign key constraint already exists (skipping)\n');
      } else if (err.message?.includes('does not exist')) {
        console.log('   ⚠️  Calls table does not exist yet - skipping foreign key constraint');
        console.log('   💡 Run this script again after creating the calls table to add the foreign key\n');
      } else {
        throw err;
      }
    }

    console.log('✅ Done!');

  } catch (error: any) {
    console.error('\n❌ Error:');
    console.error('   Message:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  }
}

addForeignKeys();

