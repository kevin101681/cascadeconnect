/**
 * VERIFICATION SCRIPT: Check Push Notification Columns
 * Verifies that all push notification columns exist in the database
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function verifyColumns() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verifying push notification columns in users table...\n');

    // Check if columns exist
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN (
        'notify_claim_submit',
        'notify_appt_accept_homeowner',
        'notify_appt_accept_sub',
        'notify_reschedule',
        'notify_new_task',
        'notify_new_message',
        'notify_new_enrollment'
      )
      ORDER BY column_name;
    `);

    console.log('✅ Push Notification Columns in users table:');
    console.log('─'.repeat(80));
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name.padEnd(35)} | ${row.data_type.padEnd(15)} | ${row.column_default || 'null'}`);
    });
    console.log('─'.repeat(80));
    console.log(`  Total: ${result.rows.length} / 7 columns found\n`);

    if (result.rows.length !== 7) {
      console.warn('⚠️  Some columns are missing!');
      const foundColumns = result.rows.map(r => r.column_name);
      const expectedColumns = [
        'notify_claim_submit',
        'notify_appt_accept_homeowner',
        'notify_appt_accept_sub',
        'notify_reschedule',
        'notify_new_task',
        'notify_new_message',
        'notify_new_enrollment'
      ];
      const missing = expectedColumns.filter(col => !foundColumns.includes(col));
      console.warn('   Missing columns:', missing.join(', '));
      process.exit(1);
    }

    // Check push_subscriptions table
    console.log('🔍 Checking push_subscriptions table...\n');
    
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'push_subscriptions'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ push_subscriptions table exists\n');
      
      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'push_subscriptions'
        ORDER BY ordinal_position;
      `);
      
      console.log('   Columns:');
      columns.rows.forEach(row => {
        console.log(`     - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.warn('⚠️  push_subscriptions table does NOT exist');
      process.exit(1);
    }

    console.log('\n🎉 All push notification database structures verified successfully!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyColumns()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
