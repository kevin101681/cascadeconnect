import { neon } from '@neondatabase/serverless';
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

async function checkBetterAuthUser() {
  try {
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ Database URL not found. Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file.');
      process.exit(1);
    }

    const sql = neon(databaseUrl);

    console.log('🔍 Check Better Auth User Account\n');

    const email = await question('Email to check: ');

    if (!email) {
      console.error('❌ Email is required');
      process.exit(1);
    }

    // Check if Better Auth tables exist
    try {
      const tablesCheck = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('user', 'account', 'session')
      `;

      if (tablesCheck.length === 0) {
        console.log('\n⚠️  Better Auth tables not found!');
        console.log('   Better Auth tables need to be created first.');
        console.log('\n💡 Solution:');
        console.log('   1. Make sure Better Auth is configured correctly');
        console.log('   2. Try signing up through the app - Better Auth will create tables automatically');
        console.log('   3. Or run: npx @better-auth/cli@latest migrate');
        rl.close();
        return;
      }

      console.log('✅ Better Auth tables found');

      // Check if user exists in Better Auth
      const betterAuthUser = await sql`
        SELECT id, email, name, "emailVerified", "createdAt" 
        FROM "user" 
        WHERE email = ${email.toLowerCase().trim()}
      `;

      if (betterAuthUser.length > 0) {
        console.log('\n✅ User found in Better Auth:');
        console.log(`   User ID: ${betterAuthUser[0].id}`);
        console.log(`   Email: ${betterAuthUser[0].email}`);
        console.log(`   Name: ${betterAuthUser[0].name || 'Not set'}`);
        console.log(`   Email Verified: ${betterAuthUser[0].emailVerified}`);
        console.log(`   Created: ${betterAuthUser[0].createdAt}`);

        // Check for account records
        const accounts = await sql`
          SELECT id, "providerId", "accountId", "createdAt"
          FROM account
          WHERE "userId" = ${betterAuthUser[0].id}
        `;

        if (accounts.length > 0) {
          console.log('\n📋 Authentication Methods:');
          accounts.forEach((acc: any) => {
            console.log(`   - ${acc.providerId} (${acc.accountId})`);
          });
        } else {
          console.log('\n⚠️  No authentication methods found for this user');
          console.log('   User exists but has no way to login');
        }

        console.log('\n💡 To login:');
        console.log('   1. Use the LOGIN form (not signup)');
        console.log('   2. Enter your email and password');
        console.log('   3. If password doesn\'t work, you may need to reset it');

      } else {
        console.log(`\n❌ User NOT found in Better Auth`);
        console.log('\n💡 Solution:');
        console.log('   1. Use the SIGNUP form in the app');
        console.log('   2. Enter your email and a password');
        console.log('   3. Better Auth will create the user account');
        console.log('   4. The app will then match it to your admin account by email');
      }

      // Check if user exists in internal users table
      const internalUser = await sql`
        SELECT id, email, name, role 
        FROM users 
        WHERE email = ${email.toLowerCase().trim()}
      `;

      if (internalUser.length > 0) {
        console.log('\n✅ User found in internal users table:');
        console.log(`   User ID: ${internalUser[0].id}`);
        console.log(`   Email: ${internalUser[0].email}`);
        console.log(`   Name: ${internalUser[0].name}`);
        console.log(`   Role: ${internalUser[0].role}`);
      } else {
        console.log('\n⚠️  User NOT found in internal users table');
      }

    } catch (error: any) {
      if (error.code === '42P01') {
        console.log('\n❌ Better Auth tables do not exist!');
        console.log('\n💡 Solution:');
        console.log('   1. Better Auth will create tables automatically on first use');
        console.log('   2. Try signing up through the app');
        console.log('   3. Or ensure Better Auth is properly configured');
      } else {
        throw error;
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
checkBetterAuthUser();
