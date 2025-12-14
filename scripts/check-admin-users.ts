/**
 * Script to check existing admin users in the database
 * 
 * Usage:
 *   npm run check-admin-users
 * 
 * Or directly:
 *   npx tsx scripts/check-admin-users.ts
 * 
 * Make sure DATABASE_URL or VITE_DATABASE_URL is set in your environment
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { users as usersTable } from '../db/schema';

// Get database URL from environment
const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL or VITE_DATABASE_URL environment variable is required');
  console.error('   Set it in your .env.local file or pass it as an environment variable');
  process.exit(1);
}

// Initialize database connection
const sql = neon(connectionString);
const db = drizzle(sql);

async function checkAdminUsers() {
  try {
    console.log('\n🔍 Checking Admin Users in Database\n');

    // Get all admin users
    const adminUsers = await db.select().from(usersTable).where(
      eq(usersTable.role, 'ADMIN')
    );

    if (adminUsers.length === 0) {
      console.log('❌ No admin users found in the database.');
      console.log('\n💡 To create an admin user:');
      console.log('   1. Sign up through the Neon Auth login form (AuthScreen)');
      console.log('   2. The user will be created in Stack Auth automatically');
      console.log('   3. Then you can link the Stack Auth user to an admin role in the database');
      console.log('\n   OR use the create-admin script (for database-only users):');
      console.log('   npm run create-admin\n');
      return;
    }

    console.log(`✅ Found ${adminUsers.length} admin user(s):\n`);

    adminUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Stack Auth ID: ${user.clerkId || '(not linked)'}`);
      console.log(`      Created: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}`);
      console.log('');
    });

    console.log('📝 Note:');
    console.log('   - For Neon Auth (Stack Auth), users must sign up through the login form');
    console.log('   - The email in the database should match the email used in Stack Auth');
    console.log('   - If you need to test login, use the "Create Account" option in AuthScreen');
    console.log('   - Make sure VITE_NEON_AUTH_URL is set in your .env.local file\n');

  } catch (error: any) {
    console.error('❌ Error checking admin users:', error.message);
    process.exit(1);
  }
}

// Run the script
checkAdminUsers();

