/**
 * Script to disable MFA/2FA for a specific Clerk user
 * 
 * Usage:
 *   CLERK_SECRET_KEY=your_secret_key npx tsx scripts/disable-user-mfa.ts
 * 
 * Or set CLERK_SECRET_KEY in your .env.local file
 * 
 * Get your secret key from: https://dashboard.clerk.com → Your App → API Keys
 */

import * as readline from 'readline';

// Get Clerk secret key from environment
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  console.error('❌ Error: CLERK_SECRET_KEY environment variable is required');
  console.error('   Get your secret key from: https://dashboard.clerk.com → Your App → API Keys');
  console.error('   Set it in your .env.local file or pass it as an environment variable');
  console.error('   Example: CLERK_SECRET_KEY=sk_test_... npx tsx scripts/disable-user-mfa.ts');
  process.exit(1);
}

// Clerk API base URL
const CLERK_API_BASE = 'https://api.clerk.com/v1';

// Helper function to get user input
function question(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function disableUserMFA() {
  try {
    console.log('\n🔐 Disable User MFA/2FA\n');
    console.log('This script will disable all MFA methods for a specific Clerk user.\n');

    // Get user email or ID
    const userIdentifier = await question('User email or Clerk User ID: ');
    if (!userIdentifier.trim()) {
      console.error('❌ User identifier is required');
      process.exit(1);
    }

    // Find the user using Clerk API
    let user;
    let userId: string;
    
    if (userIdentifier.includes('@')) {
      // Search by email
      const response = await fetch(`${CLERK_API_BASE}/users?email_address=${encodeURIComponent(userIdentifier.trim())}`, {
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`❌ Error searching for user: ${response.statusText}`);
        process.exit(1);
      }
      
      const users = await response.json();
      if (users.length === 0) {
        console.error(`❌ No user found with email: ${userIdentifier}`);
        process.exit(1);
      }
      user = users[0];
      userId = user.id;
    } else {
      // Assume it's a user ID
      userId = userIdentifier.trim();
      const response = await fetch(`${CLERK_API_BASE}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`❌ User not found with ID: ${userId}`);
        process.exit(1);
      }
      user = await response.json();
    }

    console.log(`\n📋 Found user:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email_addresses?.[0]?.email_address || 'N/A'}`);
    console.log(`   Name: ${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A');
    
    // Check current MFA status
    const mfaResponse = await fetch(`${CLERK_API_BASE}/users/${userId}/mfa`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    let mfaMethods: any[] = [];
    if (mfaResponse.ok) {
      mfaMethods = await mfaResponse.json();
    }
    
    console.log(`\n🔒 Current MFA methods: ${mfaMethods.length > 0 ? mfaMethods.length : 'None'}`);
    
    if (mfaMethods.length === 0) {
      console.log('✅ User does not have MFA enabled. No action needed.');
      process.exit(0);
    }

    // Show MFA methods
    mfaMethods.forEach((method, index) => {
      console.log(`   ${index + 1}. ${method.type || 'Unknown'} (ID: ${method.id})`);
    });

    // Confirm before disabling
    const confirm = await question('\n⚠️  Do you want to disable all MFA methods for this user? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Cancelled');
      process.exit(0);
    }

    // Disable MFA using Clerk API
    console.log('\n🔄 Disabling MFA...');
    const disableResponse = await fetch(`${CLERK_API_BASE}/users/${userId}/mfa`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!disableResponse.ok) {
      const error = await disableResponse.text();
      throw new Error(`Failed to disable MFA: ${disableResponse.statusText} - ${error}`);
    }
    
    console.log('✅ Successfully disabled all MFA methods for this user!');
    console.log('\n💡 The user can now sign in without 2FA verification.\n');

  } catch (error: any) {
    console.error('❌ Error disabling MFA:', error.message);
    if (error.errors) {
      console.error('   Errors:', error.errors);
    }
    process.exit(1);
  }
}

// Run the script
disableUserMFA();
