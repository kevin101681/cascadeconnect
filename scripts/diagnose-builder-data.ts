import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { users, homeowners } from '../db/schema';
import { eq, isNull, and } from 'drizzle-orm';

async function diagnoseBuilderData() {
  console.log('🔍 Diagnosing Builder Data...\n');

  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ No database URL found');
    return;
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // 1. Count Builder Users
    const builderUsersList = await db.select().from(users).where(eq(users.role, 'BUILDER'));
    console.log(`📊 Total Builder Users: ${builderUsersList.length}`);
    builderUsersList.forEach(user => {
      console.log(`   - ${user.name} (ID: ${user.id.substring(0, 8)}...)`);
    });
    console.log('');

    // 2. Count All Homeowners
    const allHomeowners = await db.select().from(homeowners);
    console.log(`📊 Total Homeowners: ${allHomeowners.length}\n`);

    // 3. Check homeowners with builderUserId set
    const linkedHomeowners = allHomeowners.filter(h => h.builderUserId !== null);
    console.log(`✅ Homeowners with builderUserId set: ${linkedHomeowners.length}`);
    if (linkedHomeowners.length > 0) {
      linkedHomeowners.slice(0, 5).forEach(h => {
        console.log(`   - ${h.name} → builderUserId: ${h.builderUserId?.substring(0, 8)}...`);
      });
      if (linkedHomeowners.length > 5) console.log(`   ... and ${linkedHomeowners.length - 5} more`);
    }
    console.log('');

    // 4. Check homeowners with builder text field
    const homeownersWithBuilderText = allHomeowners.filter(h => h.builder && h.builder.trim() !== '');
    console.log(`📝 Homeowners with builder text field: ${homeownersWithBuilderText.length}`);
    if (homeownersWithBuilderText.length > 0) {
      homeownersWithBuilderText.slice(0, 5).forEach(h => {
        console.log(`   - ${h.name} → builder: "${h.builder}" (builderUserId: ${h.builderUserId ? h.builderUserId.substring(0, 8) + '...' : 'NULL'})`);
      });
      if (homeownersWithBuilderText.length > 5) console.log(`   ... and ${homeownersWithBuilderText.length - 5} more`);
    }
    console.log('');

    // 5. Homeowners with text but NO link (should be migrated)
    const needsMigration = allHomeowners.filter(h => 
      !h.builderUserId && h.builder && h.builder.trim() !== ''
    );
    console.log(`⚠️  Homeowners needing migration (text but no link): ${needsMigration.length}`);
    if (needsMigration.length > 0) {
      needsMigration.forEach(h => {
        console.log(`   - ${h.name} → builder text: "${h.builder}"`);
      });
    }
    console.log('');

    // 6. Homeowners with NO builder info at all
    const noBuilderInfo = allHomeowners.filter(h => 
      !h.builderUserId && (!h.builder || h.builder.trim() === '')
    );
    console.log(`❌ Homeowners with NO builder info: ${noBuilderInfo.length}`);
    if (noBuilderInfo.length > 0 && noBuilderInfo.length <= 10) {
      noBuilderInfo.forEach(h => {
        console.log(`   - ${h.name}`);
      });
    }
    console.log('');

    // 7. For each builder user, count linked homeowners
    console.log('🔗 Linked Homeowners by Builder User:');
    builderUsersList.forEach(user => {
      const count = linkedHomeowners.filter(h => h.builderUserId === user.id).length;
      console.log(`   - ${user.name}: ${count} homeowners`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

diagnoseBuilderData();

