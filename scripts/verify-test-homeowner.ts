/**
 * Quick verification script to check if Test Homeowner exists in the database
 * 
 * Usage:
 *   npx tsx scripts/verify-test-homeowner.ts
 */

// Load environment variables
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { homeowners, claims, tasks, documents, messageThreads } from '../db/schema';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not configured');
  process.exit(1);
}

const sql = neon(connectionString);
const db = drizzle(sql);

async function verifyTestHomeowner() {
  console.log('\n🔍 Verifying Test Homeowner Data\n');
  
  try {
    // Find Test Homeowner
    const testHomeowner = await db
      .select()
      .from(homeowners)
      .where(eq(homeowners.name, 'Test Homeowner'))
      .limit(1);
    
    if (testHomeowner.length === 0) {
      console.log('❌ Test Homeowner NOT found in database!');
      console.log('   Run: npx tsx scripts/seed-test-data.ts');
      return;
    }
    
    const homeowner = testHomeowner[0];
    console.log('✅ Test Homeowner found!');
    console.log(`   ID: ${homeowner.id}`);
    console.log(`   Name: ${homeowner.name}`);
    console.log(`   Email: ${homeowner.email}`);
    console.log(`   Phone: ${homeowner.phone}`);
    console.log(`   Address: ${homeowner.address}`);
    console.log(`   Builder: ${homeowner.builder}`);
    console.log(`   Job: ${homeowner.jobName}`);
    
    // Check claims
    const homeownerClaims = await db
      .select()
      .from(claims)
      .where(eq(claims.homeownerId, homeowner.id));
    
    console.log(`\n📋 Claims: ${homeownerClaims.length} found`);
    homeownerClaims.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.title} (${c.status})`);
    });
    
    // Check tasks
    const homeownerTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedToId, homeowner.id));
    
    console.log(`\n📋 Tasks: ${homeownerTasks.length} found`);
    homeownerTasks.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.title} (${t.isCompleted ? 'Done' : 'Pending'})`);
    });
    
    // Check documents
    const homeownerDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.homeownerId, homeowner.id));
    
    console.log(`\n📄 Documents: ${homeownerDocs.length} found`);
    homeownerDocs.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.name}`);
    });
    
    // Check messages
    const homeownerMessages = await db
      .select()
      .from(messageThreads)
      .where(eq(messageThreads.homeownerId, homeowner.id));
    
    console.log(`\n💬 Message Threads: ${homeownerMessages.length} found`);
    homeownerMessages.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.subject} (${m.messages?.length || 0} messages)`);
    });
    
    // Check if homeowner is searchable
    console.log('\n🔍 Searchability Test:');
    console.log(`   Searching by "test" should match: ${homeowner.name.toLowerCase().includes('test')}`);
    console.log(`   Searching by "homeowner" should match: ${homeowner.name.toLowerCase().includes('homeowner')}`);
    console.log(`   Searching by email should match: ${homeowner.email.toLowerCase().includes('test')}`);
    console.log(`   Searching by job should match: ${homeowner.jobName?.toLowerCase().includes('test')}`);
    
    console.log('\n✅ Verification Complete!\n');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

verifyTestHomeowner();
