import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { users, homeowners } from '../db/schema';
import { eq } from 'drizzle-orm';

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

async function listUnmatchedBuilders() {
  console.log('🔍 Finding Unmatched Builder Names...\n');

  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ No database URL found');
    return;
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // 1. Fetch all Builder Users
    const builderUsers = await db.select().from(users).where(eq(users.role, 'BUILDER'));
    console.log(`📊 Total Builder Users: ${builderUsers.length}\n`);

    // 2. Fetch all homeowners with builder text
    const allHomeowners = await db.select().from(homeowners);
    const homeownersWithBuilderText = allHomeowners.filter(h => h.builder && h.builder.trim());

    // 3. Find unique builder text values that don't match any builder user
    const unmatchedBuilderTexts = new Map<string, number>(); // Builder Text -> Count

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
        // Count occurrences
        const currentCount = unmatchedBuilderTexts.get(builderText) || 0;
        unmatchedBuilderTexts.set(builderText, currentCount + 1);
      }
    }

    // 4. Sort by count (most common first)
    const sortedUnmatched = Array.from(unmatchedBuilderTexts.entries())
      .sort((a, b) => b[1] - a[1]);

    console.log('🚫 Unmatched Builder Text Values:');
    console.log('='.repeat(60));
    
    if (sortedUnmatched.length === 0) {
      console.log('✅ All builder text values match a builder user!');
    } else {
      sortedUnmatched.forEach(([builderText, count]) => {
        console.log(`${count.toString().padStart(4)} homeowner${count > 1 ? 's' : ' '} → "${builderText}"`);
      });
      
      console.log('='.repeat(60));
      console.log(`Total unmatched: ${sortedUnmatched.length} unique builder names`);
      console.log(`Total homeowners affected: ${sortedUnmatched.reduce((sum, [, count]) => sum + count, 0)}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

listUnmatchedBuilders();

