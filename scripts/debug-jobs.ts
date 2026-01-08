import fs from 'fs';
import csv from 'csv-parser';
import { db } from '../db/index'; 
import { homeowners } from '../db/schema'; 

const CSV_FILE_PATH = './claims-master.csv';

async function debugJobs() {
  console.log('🕵️‍♀️ STARTING DEBUG INSPECTION...');

  // 1. Get DB Job Names
  const allHomeowners = await db.select().from(homeowners); 
  const dbJobs = allHomeowners
    .map(h => h.jobName)
    .filter(name => name !== null) // Remove nulls
    .map(name => `"${name}"`); // Add quotes to see hidden spaces

  console.log(`\n📚 DATABASE: Found ${dbJobs.length} Job Names`);
  console.log('First 5 DB Jobs:', dbJobs.slice(0, 5));

  // 2. Get CSV Job Names
  const csvJobs: string[] = [];
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on('data', (row) => {
      if (csvJobs.length < 5) csvJobs.push(`"${row['Job']}"`);
    })
    .on('end', () => {
      console.log(`\n📄 CSV: First 5 Job Names`);
      console.log(csvJobs);
      console.log('\nCompare the two lists above. Do they match exactly?');
      process.exit(0);
    });
}

debugJobs();