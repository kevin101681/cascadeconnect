import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

// Load environment variables
const envLocalPath = resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
}

const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL in .env.local');
  process.exit(1);
}

async function runMigration() {
  console.log('\n🔄 Adding notification preference columns to users table...\n');
  
  const sql = neon(databaseUrl);
  
  try {
    // Add notify_claims column
    console.log('📝 Adding notify_claims column...');
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS notify_claims BOOLEAN DEFAULT true
    `;
    console.log('✅ notify_claims column added');
    
    // Add notify_tasks column
    console.log('📝 Adding notify_tasks column...');
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS notify_tasks BOOLEAN DEFAULT true
    `;
    console.log('✅ notify_tasks column added');
    
    // Add notify_appointments column
    console.log('📝 Adding notify_appointments column...');
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS notify_appointments BOOLEAN DEFAULT true
    `;
    console.log('✅ notify_appointments column added');
    
    // Update existing users
    console.log('\n📝 Setting defaults for existing users...');
    await sql`
      UPDATE users 
      SET 
        notify_claims = COALESCE(notify_claims, true),
        notify_tasks = COALESCE(notify_tasks, true),
        notify_appointments = COALESCE(notify_appointments, true)
      WHERE 
        notify_claims IS NULL 
        OR notify_tasks IS NULL
        OR notify_appointments IS NULL
    `;
    console.log('✅ Defaults set for existing users');
    
    // Verify the changes
    console.log('\n📊 Verifying changes...');
    const result = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN notify_claims = true THEN 1 END) as users_with_claim_notifications,
        COUNT(CASE WHEN notify_tasks = true THEN 1 END) as users_with_task_notifications,
        COUNT(CASE WHEN notify_appointments = true THEN 1 END) as users_with_appointment_notifications
      FROM users
    `;
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('Summary:');
    console.log(`  Total users: ${result[0].total_users}`);
    console.log(`  Users with claim notifications enabled: ${result[0].users_with_claim_notifications}`);
    console.log(`  Users with task notifications enabled: ${result[0].users_with_task_notifications}`);
    console.log(`  Users with appointment notifications enabled: ${result[0].users_with_appointment_notifications}`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

