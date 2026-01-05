import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { users, homeowners } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

// Simple fuzzy match helper
function fuzzyMatch(text1: string, text2: string): boolean {
  if (!text1 || !text2) return false;
  
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const normalized1 = normalize(text1);
  const normalized2 = normalize(text2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true;
  
  // Contains match
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  return false;
}

// Generate email from builder name (e.g., "JBX Homes" -> "jbxhomes@builder.cascadeconnect.app")
function generateBuilderEmail(builderName: string): string {
  const normalized = builderName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${normalized}@builder.cascadeconnect.app`;
}

// Generate a secure random password
function generateSecurePassword(): string {
  return crypto.randomBytes(16).toString('hex');
}

async function createMissingBuilders() {
  console.log('🏗️  Creating Missing Builder Users...\n');

  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ No database URL found');
    return;
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // 1. Fetch all Builder Users
    console.log('📋 Step 1: Fetching existing builder users...');
    const builderUsers = await db.select().from(users).where(eq(users.role, 'BUILDER'));
    console.log(`✅ Found ${builderUsers.length} existing builder users\n`);

    // 2. Fetch all homeowners with builder text
    console.log('📋 Step 2: Analyzing homeowner builder data...');
    const allHomeowners = await db.select().from(homeowners);
    const homeownersWithBuilderText = allHomeowners.filter(h => h.builder && h.builder.trim());

    // 3. Find unique builder text values that don't match any builder user
    const unmatchedBuilderTexts = new Map<string, string[]>(); // Builder Text -> [homeowner IDs]

    for (const homeowner of homeownersWithBuilderText) {
      const builderText = homeowner.builder!.trim();
      
      // Try to find a matching builder user
      let hasMatch = false;
      for (const builderUser of builderUsers) {
        if (fuzzyMatch(builderText, builderUser.name)) {
          hasMatch = true;
          break;
        }
      }

      if (!hasMatch) {
        if (!unmatchedBuilderTexts.has(builderText)) {
          unmatchedBuilderTexts.set(builderText, []);
        }
        unmatchedBuilderTexts.get(builderText)!.push(homeowner.id);
      }
    }

    console.log(`✅ Found ${unmatchedBuilderTexts.size} unmatched builder names\n`);

    if (unmatchedBuilderTexts.size === 0) {
      console.log('✨ All builder names are already matched!');
      return;
    }

    // 4. Create builder users for each unmatched name
    console.log('🔨 Step 3: Creating new builder users...\n');
    
    const createdBuilders = new Map<string, string>(); // Builder Name -> User ID
    let createdCount = 0;

    for (const [builderName, homeownerIds] of unmatchedBuilderTexts.entries()) {
      const email = generateBuilderEmail(builderName);
      const password = generateSecurePassword();

      try {
        // Check if email already exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (existingUser.length > 0) {
          console.log(`⚠️  Email ${email} already exists, using existing user for "${builderName}"`);
          createdBuilders.set(builderName, existingUser[0].id);
        } else {
          // Create new builder user
          const [newUser] = await db.insert(users).values({
            name: builderName,
            email: email,
            role: 'BUILDER',
            password: password, // In production, this should be hashed
            clerkId: null,
            builderGroupId: null,
          }).returning();

          createdBuilders.set(builderName, newUser.id);
          createdCount++;
          
          console.log(`✅ Created: "${builderName}"`);
          console.log(`   Email: ${email}`);
          console.log(`   Homeowners to link: ${homeownerIds.length}`);
          console.log(`   Temp Password: ${password}`);
          console.log('');
        }
      } catch (error) {
        console.error(`❌ Failed to create builder user for "${builderName}":`, error);
      }
    }

    console.log(`\n📊 Created ${createdCount} new builder users\n`);

    // 5. Link homeowners to the newly created builders
    console.log('🔗 Step 4: Linking homeowners to new builders...\n');
    
    let linkedCount = 0;

    for (const [builderName, homeownerIds] of unmatchedBuilderTexts.entries()) {
      const builderId = createdBuilders.get(builderName);
      
      if (!builderId) {
        console.log(`⚠️  No builder ID found for "${builderName}", skipping...`);
        continue;
      }

      // Update all homeowners with this builder text
      for (const homeownerId of homeownerIds) {
        await db
          .update(homeowners)
          .set({ builderUserId: builderId })
          .where(eq(homeowners.id, homeownerId));
        
        linkedCount++;
      }

      console.log(`✅ Linked ${homeownerIds.length} homeowners to "${builderName}"`);
    }

    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ New builder users created: ${createdCount}`);
    console.log(`🔗 Homeowners linked: ${linkedCount}`);
    console.log(`📋 Unique builder names processed: ${unmatchedBuilderTexts.size}`);
    console.log('='.repeat(60));
    console.log('\n✨ Migration complete!\n');
    
    console.log('⚠️  IMPORTANT: The temporary passwords shown above should be changed.');
    console.log('   Consider sending password reset emails to the new builder users.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
createMissingBuilders()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

