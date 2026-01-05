/**
 * Fix Builder Links Migration Script
 * 
 * Problem: "Split Brain" data
 * - homeowners.builder (text) has names like "Acme Construction"
 * - homeowners.builder_user_id is NULL
 * - The Info Card reads the text, but the Editor reads the relation
 * 
 * Solution: Link homeowners to BuilderUsers by fuzzy matching builder names
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file from project root
config({ path: resolve(process.cwd(), '.env.local') });

// Also try .env as fallback
config({ path: resolve(process.cwd(), '.env') });

// Manually set VITE_DATABASE_URL to DATABASE_URL if needed for Node scripts
if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL;
}

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { eq, isNull, and } from 'drizzle-orm';

const { homeowners, users } = schema;

// Simple fuzzy match helper
function fuzzyMatch(text1: string, text2: string): boolean {
  if (!text1 || !text2) return false;
  
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const normalized1 = normalize(text1);
  const normalized2 = normalize(text2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true;
  
  // Contains match (for cases like "Acme" matching "Acme Construction LLC")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  return false;
}

async function fixBuilderLinks() {
  console.log('🔧 Starting Builder Links Migration...\n');
  
  // Check for database URL
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ Database URL not configured');
    console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your .env.local file');
    console.error('Current env keys:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
    process.exit(1);
  }
  
  console.log('✅ Database URL found');
  console.log(`   Connection: ${databaseUrl.substring(0, 30)}...`);
  console.log('');
  
  // Initialize database connection
  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });
  
  try {
    // Step 1: Fetch all Builder Users
    console.log('📋 Step 1: Fetching Builder Users...');
    const builderUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'BUILDER'));
    
    console.log(`✅ Found ${builderUsers.length} Builder Users\n`);
    
    if (builderUsers.length === 0) {
      console.log('⚠️ No Builder Users found. Nothing to link.');
      return;
    }
    
    // Create lookup map: Name -> ID
    const builderMap = new Map<string, { id: string; name: string }>();
    builderUsers.forEach(bu => {
      builderMap.set(bu.name.toLowerCase().trim(), { id: bu.id, name: bu.name });
    });
    
    console.log('📊 Builder Map:');
    builderUsers.forEach(bu => {
      console.log(`   - ${bu.name} (${bu.id})`);
    });
    console.log('');
    
    // Step 2: Fetch ALL homeowners with builder text (including already linked ones)
    // We need to check if they're linked to the CORRECT builder
    console.log('📋 Step 2: Fetching all homeowners with builder text...');
    const allHomeowners = await db.select().from(homeowners);
    
    // Filter to only those with non-empty builder field
    const homeownersWithBuilderText = allHomeowners.filter(h => h.builder && h.builder.trim());
    
    console.log(`✅ Found ${homeownersWithBuilderText.length} homeowners with builder text\n`);
    
    if (homeownersWithBuilderText.length === 0) {
      console.log('✨ No homeowners with builder text found!');
      return;
    }
    
    // Check which ones need to be re-linked (either NULL or mismatched)
    const homeownersToLink = homeownersWithBuilderText.filter(h => {
      if (!h.builderUserId) return true; // No link at all
      
      // Check if currently linked builder matches the text
      const currentBuilder = builderUsers.find(bu => bu.id === h.builderUserId);
      if (!currentBuilder) return true; // Linked to non-existent builder
      
      // If text doesn't match current link, needs re-linking
      return !fuzzyMatch(h.builder!, currentBuilder.name);
    });
    
    console.log(`🔍 Analysis:`);
    console.log(`   - Total with builder text: ${homeownersWithBuilderText.length}`);
    console.log(`   - Already correctly linked: ${homeownersWithBuilderText.length - homeownersToLink.length}`);
    console.log(`   - Need re-linking: ${homeownersToLink.length}\n`);
    
    if (homeownersToLink.length === 0) {
      console.log('✨ All homeowners are correctly linked!');
      return;
    }
    
    // Step 3: Loop and match
    console.log('🔗 Step 3: Matching and linking...\n');
    
    let matchedCount = 0;
    let unmatchedCount = 0;
    
    for (const homeowner of homeownersToLink) {
      const builderText = homeowner.builder!.trim();
      
      // Try to find a matching builder user
      let matchedBuilder: { id: string; name: string } | null = null;
      
      // First try exact match
      const exactKey = builderText.toLowerCase().trim();
      if (builderMap.has(exactKey)) {
        matchedBuilder = builderMap.get(exactKey)!;
      } else {
        // Try fuzzy match
        for (const [_, builder] of builderMap) {
          if (fuzzyMatch(builderText, builder.name)) {
            matchedBuilder = builder;
            break;
          }
        }
      }
      
      if (matchedBuilder) {
        // Get current link status for logging
        const currentBuilder = builderUsers.find(bu => bu.id === homeowner.builderUserId);
        const wasLinked = currentBuilder ? `was "${currentBuilder.name}"` : 'was NULL';
        
        // Update the homeowner with the correct builder_user_id
        await db
          .update(homeowners)
          .set({ builderUserId: matchedBuilder.id })
          .where(eq(homeowners.id, homeowner.id));
        
        console.log(`✅ ${homeowner.name}`);
        console.log(`   Text: "${builderText}" | ${wasLinked} → NOW: "${matchedBuilder.name}"`);
        matchedCount++;
      } else {
        console.log(`⚠️ No match found for "${homeowner.name}" with builder text: "${builderText}"`);
        unmatchedCount++;
      }
    }
    
    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully linked: ${matchedCount} homeowners`);
    console.log(`⚠️ Unmatched: ${unmatchedCount} homeowners`);
    console.log(`📋 Total processed: ${homeownersToLink.length} homeowners`);
    console.log('='.repeat(60));
    console.log('\n✨ Migration complete!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixBuilderLinks()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

