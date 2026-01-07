import fs from 'fs';
import csv from 'csv-parser';
import { db } from '../db/index';// ⚠️ Verify this path
import { claims, contractors, projects } from '../db/schema'; // ⚠️ Verify 'projects' export name
import { eq } from 'drizzle-orm';

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
  console.log('\n🚀 STARTING CLAIM IMPORT...\n');

  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ Error: Could not find file at ${CSV_FILE_PATH}`);
    process.exit(1);
  }

  // 1. CACHE SUBCONTRACTORS (Name -> ID)
  console.log('📦 Caching Subcontractors...');
  const allSubs = await db.select().from(contractors);
  const subMap = new Map<string, string>(); 
  
  for (const sub of allSubs) {
    if (sub.contractorName) {
      subMap.set(sub.contractorName.toLowerCase().trim(), sub.id);
    }
  }
  console.log(`✅ Cached ${subMap.size} subcontractors.`);

  // 2. CACHE PROJECTS (Job Name -> Homeowner ID)
  console.log('📦 Caching Projects...');
  const allProjects = await db.select().from(projects); 
  const jobMap = new Map<string, string>(); 

  for (const proj of allProjects) {
    // 🔍 UPDATED: Using 'jobName' based on your schema finding
    if (proj.jobName && proj.homeownerId) {
      jobMap.set(proj.jobName.trim(), proj.homeownerId);
    }
  }
  console.log(`✅ Cached ${jobMap.size} projects.`);

  // 3. READ CSV
  const rows: any[] = [];
  console.log(`\n📄 Reading CSV: ${CSV_FILE_PATH}...`);

  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv()) 
    .on('data', (data) => rows.push(data))
    .on('end', async () => {
      console.log(`📊 Total Rows Parsed: ${rows.length}`);
      await processBatches(rows, subMap, jobMap);
    });
}

async function processBatches(rows: any[], subMap: Map<string, string>, jobMap: Map<string, string>) {
  const batch: typeof claims.$inferInsert[] = [];
  let skippedCount = 0;

  for (const row of rows) {
    try {
      // --- A. LOOKUPS ---
      const jobName = row['Job']?.trim(); 
      const subName = row['Assigned Sub']?.trim();
      
      // Find Homeowner via Job Name
      const homeownerId = jobMap.get(jobName);
      
      if (!homeownerId) {
        skippedCount++;
        // console.warn(`Skipped: Project "${jobName}" not found in DB.`);
        continue; 
      }

      const subId = subName ? subMap.get(subName.toLowerCase()) : null;

      // --- B. DATE & STATUS LOGIC ---
      const scheduleDate = parseDate(row['Latest Schedule Date']);
      const finalDate = parseDate(row['Master Final Date']);
      const createdDate = parseDate(row['Created Date']);

      // Status Logic
      let status: 'CLOSED' | 'OPEN' | 'SUBMITTED' = 'SUBMITTED';
      
      if (finalDate) {
        status = 'CLOSED';
      } else if (scheduleDate) {
        status = 'OPEN';
      }

      // --- C. PREPARE RECORD ---
      const historyLog = row['Scheduling'] || 'No history.';
      const notes = row['Notes'] || '';

      const record: typeof claims.$inferInsert = {
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

        internalNotes: `${notes}\n\n-- LEGACY LOG --\n${historyLog}`,
      };

      batch.push(record);

    } catch (err) {
      console.error('Row Error:', err);
    }
  }

  // --- D. INSERT ---
  console.log(`\n💾 Inserting ${batch.length} claims (Skipped ${skippedCount} missing projects)...`);

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