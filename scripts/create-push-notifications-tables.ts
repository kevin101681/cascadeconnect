/**
 * DATABASE MIGRATION: ADD PUSH NOTIFICATION TABLES AND COLUMNS
 * Adds push_subscriptions table and notification preference columns to users table
 * Run this script to update your database schema
 * January 18, 2026
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting push notification migration...\n');

    // 1. Create push_subscriptions table
    console.log('📋 Creating push_subscriptions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh_key TEXT NOT NULL,
        auth_key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ push_subscriptions table created\n');

    // 2. Create indexes for performance
    console.log('📋 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
      ON push_subscriptions(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint 
      ON push_subscriptions(endpoint);
    `);
    console.log('✅ Indexes created\n');

    // 3. Add notification preference columns to users table
    console.log('📋 Adding notification preference columns to users table...');
    
    const columns = [
      { name: 'notify_claim_submit', default: 'true' },
      { name: 'notify_appt_accept_homeowner', default: 'true' },
      { name: 'notify_appt_accept_sub', default: 'true' },
      { name: 'notify_reschedule', default: 'true' },
      { name: 'notify_new_task', default: 'true' },
      { name: 'notify_new_message', default: 'true' },
      { name: 'notify_new_enrollment', default: 'true' },
    ];

    for (const col of columns) {
      try {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS ${col.name} BOOLEAN DEFAULT ${col.default};
        `);
        console.log(`  ✓ Added ${col.name}`);
      } catch (err: any) {
        if (err.code === '42701') {
          // Column already exists
          console.log(`  ℹ️ ${col.name} already exists`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('✅ Notification preference columns added\n');

    // 4. Update existing users to have notifications enabled by default
    console.log('📋 Updating existing users...');
    await client.query(`
      UPDATE users 
      SET 
        notify_claim_submit = COALESCE(notify_claim_submit, true),
        notify_appt_accept_homeowner = COALESCE(notify_appt_accept_homeowner, true),
        notify_appt_accept_sub = COALESCE(notify_appt_accept_sub, true),
        notify_reschedule = COALESCE(notify_reschedule, true),
        notify_new_task = COALESCE(notify_new_task, true),
        notify_new_message = COALESCE(notify_new_message, true),
        notify_new_enrollment = COALESCE(notify_new_enrollment, true)
      WHERE 
        notify_claim_submit IS NULL 
        OR notify_appt_accept_homeowner IS NULL
        OR notify_appt_accept_sub IS NULL
        OR notify_reschedule IS NULL
        OR notify_new_task IS NULL
        OR notify_new_message IS NULL
        OR notify_new_enrollment IS NULL;
    `);
    console.log('✅ Existing users updated\n');

    console.log('🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Generate VAPID keys if you haven\'t already (see PUSH-NOTIFICATIONS-SETUP.md)');
    console.log('2. Add VAPID keys to .env file');
    console.log('3. Deploy the updated schema to your database');
    console.log('4. Test push notifications in your application');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
