import { neon } from '@neondatabase/serverless';
import * as crypto from 'crypto';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Hash password using bcrypt-like approach (Better Auth uses bcrypt)
async function hashPassword(password: string): Promise<string> {
  // Better Auth uses bcrypt with salt rounds
  // For now, we'll use a simple approach - Better Auth will handle this properly
  // This is a placeholder - Better Auth should hash passwords automatically
  return password; // Better Auth will hash this on signup
}

async function createBetterAuthUser() {
  try {
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ Database URL not found. Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file.');
      process.exit(1);
    }

    const sql = neon(databaseUrl);

    console.log('📝 Create Better Auth User Account\n');
    console.log('This script will create a user account in Better Auth\'s user table.');
    console.log('You can then login with this email/password.\n');

    const email = await question('Email: ');
    const password = await question('Password: ');
    const name = await question('Name (optional, press Enter to use email): ') || email.split('@')[0];

    if (!email || !password) {
      console.error('❌ Email and password are required');
      process.exit(1);
    }

    // Check if user already exists in Better Auth user table
    const existingUser = await sql`
      SELECT id, email FROM "user" WHERE email = ${email.toLowerCase().trim()}
    `;

    if (existingUser.length > 0) {
      console.log(`\n⚠️  User with email ${email} already exists in Better Auth.`);
      console.log(`   User ID: ${existingUser[0].id}`);
      console.log('\n💡 You can try logging in with this email and password.');
      console.log('   If login fails, the password might be different.');
      console.log('   You may need to reset the password or delete the user and recreate.');
      rl.close();
      return;
    }

    // Generate a user ID (Better Auth uses UUIDs)
    const userId = crypto.randomUUID();
    const now = new Date();

    // Create user in Better Auth's user table
    // Note: Better Auth will hash the password when you sign up properly
    // For manual creation, we need to use Better Auth's password hashing
    // This is a workaround - ideally use Better Auth's signup API
    
    console.log('\n⚠️  Note: Better Auth requires password hashing.');
    console.log('   This script creates the user record, but you should:');
    console.log('   1. Use the signup form in the app to create the account properly');
    console.log('   2. Or use Better Auth\'s API to hash the password correctly\n');

    // Insert into Better Auth user table
    await sql`
      INSERT INTO "user" (id, email, "emailVerified", name, "createdAt", "updatedAt")
      VALUES (${userId}, ${email.toLowerCase().trim()}, true, ${name}, ${now}, ${now})
    `;

    // Create account record for email/password authentication
    const accountId = crypto.randomUUID();
    // Note: Password should be hashed with bcrypt - Better Auth does this automatically
    // For manual insertion, we'll leave it null and user will need to set password via signup
    await sql`
      INSERT INTO account (id, "userId", "accountId", "providerId", "createdAt", "updatedAt")
      VALUES (${accountId}, ${userId}, ${email.toLowerCase().trim()}, 'credential', ${now}, ${now})
    `;

    console.log('✅ User account created in Better Auth!');
    console.log('\n📋 Account Details:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${email.toLowerCase()}`);
    console.log(`   Name: ${name}`);
    console.log('\n⚠️  IMPORTANT: Password needs to be set via Better Auth signup.');
    console.log('   The password you entered is NOT stored (Better Auth requires bcrypt hashing).');
    console.log('\n💡 Next Steps:');
    console.log('   1. Go to the app and use the SIGNUP form (not login)');
    console.log('   2. Enter the same email and password');
    console.log('   3. Better Auth will update the existing user with the hashed password');
    console.log('   4. Then you can login normally\n');

  } catch (error: any) {
    console.error('❌ Error creating Better Auth user:', error.message);
    if (error.code === '23505') {
      console.error('   This email is already in use in Better Auth.');
    } else if (error.code === '42P01') {
      console.error('   Better Auth tables not found. Run Better Auth migrations first:');
      console.error('   npx @better-auth/cli@latest migrate');
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createBetterAuthUser();




