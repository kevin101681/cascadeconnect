// 1. 🔌 LOAD .env.local FIRST (Before anything else happens)
import dotenv from 'dotenv';
import path from 'path';

// Load the env file explicitly
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

import fs from 'fs';
import csv from 'csv-parser';
import stripBom from 'strip-bom-stream'; 

// ------------------------------------------------------------------
// 🔧 CONFIGURATION
// ------------------------------------------------------------------
const CSV_FILE_PATH = './claims-master.csv';
const BATCH_SIZE = 500;

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

// ------------------------------------------------------------------
// 🚀 MAIN SCRIPT
// ------------------------------------------------------------------
async function importClaims() {
  console.log('\n🚀 STARTING CLAIM IMPORT (STRICT MODE)...\n');

  // --- CHECK 1: VERIFY ENV VARS ---
  const envKey = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
  if (!envKey) {
    console.error('❌ CRITICAL: No Database URL found.');
    console.error('   Make sure .env.local exists in the root folder.');
    process.exit(1);
  }
  console.log('✅ Environment Variables Loaded.');

  // --- CHECK 2: DYNAMIC IMPORT (Prevents "Mock Mode" issue) ---
  console.log('🔌 Connecting to Database...');
  // We import these HERE so they use the env vars we just loaded
  const { db } = await import('../db/index');
  const { claims, contractors, homeowners } = await import('../db/schema');
  
  // --- CHECK 3: CACHE HOMEOWNERS ---
  console.log('📦 Caching Homeowners...');
  const allHomeowners = await db.select().from(homeowners);
  
  const jobMap = new Map<string, string>(); 
  
  for (const owner of allHomeowners) {
    if (owner.jobName) {
      jobMap.set(owner.jobName.trim(), owner.id);
    }
  }

  console.log(`✅ Cached ${jobMap.size} homeowners from DB.`);
  if (jobMap.size === 0) {
    console.error('❌ Error: DB returned 0 homeowners with job names.');
    process.exit(1);
  }

  // --- CHECK 4: CACHE SUBCONTRACTORS ---
  console.log('📦 Caching Subcontractors...');
  const allSubs = await db.select().from(contractors);
  const subMap = new Map<string, string>(); 
  for (const sub of allSubs) {
    if (sub.contractorName) {
      subMap.set(sub.contractorName.toLowerCase().trim(), sub.id);
    }
  }

  // --- CHECK 5: READ CSV ---
  const rows: any[] = [];
  console.log(`\n📄 Reading CSV: ${CSV_FILE_PATH}...`);

  fs.createReadStream(CSV_FILE_PATH)
    .pipe(stripBom()) 
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim() 
    })) 
    .on('data', (data) => rows.push(data))
    .on('end', async () => {
      console.log(`📊 Total Rows Parsed: ${rows.length}`);
      await processBatches(rows, subMap, jobMap, db, claims);
    });
}

// Note: We pass 'db' and 'claims' as arguments now since they are dynamic
async function processBatches(
  rows: any[], 
  subMap: Map<string, string>, 
  jobMap: Map<string, string>,
  db: any,
  claims: any
) {
  const batch: any[] = [];
  let skippedCount = 0;
  let successCount = 0;

  for (const row of rows) {
    try {
      const jobName = row['Job'] ? row['Job'].trim() : null;
      const homeownerId = jobMap.get(jobName);
      
      if (!homeownerId) {
        skippedCount++;
        if (skippedCount <= 3) {
           console.warn(`⚠️ Skipped: Job "${jobName}" not found in DB.`);
        }
        continue; 
      }

      const subName = row['Assigned Sub'];
      const subId = subName ? subMap.get(subName.toLowerCase().trim()) : null;

      const scheduleDate = parseDate(row['Latest Schedule Date']);
      const finalDate = parseDate(row['Master Final Date']);
      const createdDate = parseDate(row['Created Date']);

      let status = 'SUBMITTED';
      if (finalDate) status = 'CLOSED';
      else if (scheduleDate) status = 'OPEN';

      const record = {
        homeownerId: homeownerId,
        contractorId: subId || null,
        title: row['Title'] || 'Untitled Claim',
        description: row['Description'] || '',
        jobName: jobName, 
        claimNumber: row['Claim Number'] || '0', 
        classification: row['Class'] || 'Unclassified',
        dateSubmitted: createdDate || new Date(),
        scheduledAt: scheduleDate, 
        completedAt: finalDate,    
        dateEvaluated: finalDate,
        status: status,
        internalNotes: `${row['Notes'] || ''}\n\n-- LEGACY LOG --\n${row['Scheduling'] || ''}`,
      };

      batch.push(record);
      successCount++;

    } catch (err) {
      console.error('Row Error:', err);
    }
  }

  console.log(`\n💾 Inserting ${batch.length} claims...`);
  console.log(`   (Matched: ${successCount} | Skipped: ${skippedCount})`);

  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    try {
      await db.insert(claims).values(chunk);
      process.stdout.write('.');
    } catch (e) {
      console.error('\n❌ Batch Error:', e);
    }
  }

  console.log('\n\n✅ IMPORT COMPLETE!');
}

importClaims().catch((e) => {
  console.error('Fatal Script Error:', e);
  process.exit(1);
});