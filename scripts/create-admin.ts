/**
 * Script to create an admin account in the database
 * 
 * Usage:
 *   npm run create-admin
 * 
 * Or directly:
 *   npx tsx scripts/create-admin.ts
 * 
 * Make sure DATABASE_URL or VITE_DATABASE_URL is set in your environment
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { users as usersTable } from '../db/schema';
import * as readline from 'readline';

// Get database URL from environment
const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL or VITE_DATABASE_URL environment variable is required');
  console.error('   Set it in your .env.local file or pass it as an environment variable');
  console.error('   Example: DATABASE_URL=your_db_url npm run create-admin');
  process.exit(1);
}

// Initialize database connection
const sql = neon(connectionString);
const db = drizzle(sql);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('\n🔐 Create Admin Account\n');
    console.log('This script will create an admin user in the database.');
    console.log('The user will need to sign up/sign in via Clerk with the email you provide.\n');

    // Get admin details
    const name = await question('Admin Name: ');
    if (!name.trim()) {
      console.error('❌ Name is required');
      rl.close();
      process.exit(1);
    }

    const email = await question('Admin Email (must match Clerk account): ');
    if (!email.trim()) {
      console.error('❌ Email is required');
      rl.close();
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format');
      rl.close();
      process.exit(1);
    }

    const clerkIdInput = await question('Clerk User ID (optional, can be added later): ');
    const clerkId = clerkIdInput.trim() || null;
    
    // Check if user already exists
    const existingUsers = await db.select().from(usersTable).where(
      eq(usersTable.email, email.toLowerCase())
    );
    
    if (existingUsers.length > 0) {
      console.log(`\n⚠️  User with email ${email} already exists!`);
      const update = await question('Do you want to update this user to ADMIN role? (y/n): ');
      if (update.toLowerCase() === 'y') {
        await db.update(usersTable)
          .set({
            role: 'ADMIN',
            name: name.trim(),
            ...(clerkId ? { clerkId } : {})
          } as any)
          .where(eq(usersTable.email, email.toLowerCase()));
        console.log('✅ User updated to ADMIN role');
      } else {
        console.log('❌ Cancelled');
      }
      rl.close();
      return;
    }

    // Create admin user
    console.log('\n⏳ Creating admin account...');
    
    await db.insert(usersTable).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: 'ADMIN',
      clerkId: clerkId,
      password: null, // Passwords are handled by Clerk
    } as any);

    console.log('✅ Admin account created successfully!');
    console.log('\n📋 Account Details:');
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email.toLowerCase()}`);
    console.log(`   Role: ADMIN`);
    if (clerkId) {
      console.log(`   Clerk ID: ${clerkId}`);
    } else {
      console.log(`   Clerk ID: (not set - user will be matched by email when they sign in)`);
    }
    console.log('\n💡 Next Steps:');
    console.log('   1. Make sure the user signs up/signs in via Clerk with this email');
    console.log('   2. The app will automatically match the Clerk account to this admin user');
    console.log('   3. If you need to link a Clerk ID later, you can update the user in the database\n');

  } catch (error: any) {
    console.error('❌ Error creating admin account:', error.message);
    if (error.code === '23505') {
      console.error('   This email is already in use. Use a different email or update the existing user.');
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createAdmin();

