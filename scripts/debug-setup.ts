// 1. 🔌 LOAD ENVIRONMENT VARIABLES FIRST
import 'dotenv/config'; 

import fs from 'fs';
import csv from 'csv-parser';
import { db } from '../db/index'; 
import { homeowners } from '../db/schema'; 

const CSV_FILE_PATH = './claims-master.csv';

async function runDebug() {
  console.log('\n🕵️‍♀️ DEBUG DIAGNOSTICS 🕵️‍♀️\n');

  // --- CHECK 1: DATABASE CONNECTION ---
  console.log('--- 1. DATABASE CONNECTION ---');
  // Check if the variable exists (Don't log the full key for security)
  const envKey = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
  if (envKey) {
    console.log(`✅ Environment Variable Found: ${envKey.substring(0, 15)}...`);
  } else {
    console.error('❌ CRITICAL: No Database URL found in process.env');
    console.error('   Make sure your .env file is in the root and you installed "dotenv"');
  }

  try {
    const allHomeowners = await db.select().from(homeowners);
    const dbJobs = allHomeowners.filter(h => h.jobName).length;
    console.log(`✅ SUCCESS: Connected to Neon. Found ${dbJobs} homeowners with Job Names.`);
  } catch (err) {
    console.error('❌ DB CONNECTION FAILED:', err);
  }

  // --- CHECK 2: CSV HEADERS ---
  console.log('\n--- 2. CSV HEADERS ---');
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ File not found at ${CSV_FILE_PATH}`);
    return;
  }

  const stream = fs.createReadStream(CSV_FILE_PATH).pipe(csv());
  
  // Read just the first row to get headers
  stream.on('data', (row) => {
    console.log('✅ CSV Parsed Successfully.');
    console.log('👇 HERE ARE YOUR EXACT HEADERS (Copy the one for "Job"):');
    console.log(Object.keys(row)); // Prints keys like ['Job', 'Title', 'Date']
    
    // Also print the first row data to match values
    console.log('\n👇 FIRST ROW DATA:');
    console.log(row);
    
    stream.destroy(); // Stop reading after 1 row
    process.exit(0);
  });
}

runDebug();