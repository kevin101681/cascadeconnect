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

import { db, isDbConfigured } from '../db';
import { homeowners, users } from '../db/schema';
import { eq, isNull, and } from 'drizzle-orm';

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
  
  if (!isDbConfigured) {
    console.error('❌ Database not configured');
    process.exit(1);
  }
  
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
    
    // Step 2: Fetch homeowners with NULL builder_user_id but non-NULL builder text
    console.log('📋 Step 2: Fetching unlinked homeowners...');
    const unlinkedHomeowners = await db
      .select()
      .from(homeowners)
      .where(
        and(
          isNull(homeowners.builderUserId),
          // Builder text field is not null/empty
        )
      );
    
    // Filter to only those with non-empty builder field
    const homeownersToLink = unlinkedHomeowners.filter(h => h.builder && h.builder.trim());
    
    console.log(`✅ Found ${homeownersToLink.length} homeowners with builder text but no link\n`);
    
    if (homeownersToLink.length === 0) {
      console.log('✨ All homeowners are already linked or have no builder text!');
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
        // Update the homeowner with the builder_user_id
        await db
          .update(homeowners)
          .set({ builderUserId: matchedBuilder.id })
          .where(eq(homeowners.id, homeowner.id));
        
        console.log(`✅ Linked "${homeowner.name}" → Builder: "${builderText}" → ${matchedBuilder.name} (${matchedBuilder.id})`);
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

