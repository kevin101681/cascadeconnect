/**
 * CBS Books Diagnostic Script
 * 
 * This script checks:
 * - Database connection
 * - Table existence
 * - Data in tables
 * - API endpoint availability
 * 
 * Usage:
 *   npm run diagnose:cbsbooks
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: resolve(__dirname, '..', '.env') });
dotenv.config();

const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

async function diagnose() {
  console.log('🔍 CBS Books Diagnostic Tool');
  console.log('==========================\n');

  // 1. Check database URL
  console.log('1. Checking database configuration...');
  if (!DATABASE_URL) {
    console.error('   ❌ DATABASE_URL not found!');
    console.error('   Please set NETLIFY_DATABASE_URL or DATABASE_URL in .env.local');
    return;
  }
  
  const maskedUrl = DATABASE_URL.replace(/:([^@]+)@/, ':****@');
  console.log(`   ✅ Database URL found: ${maskedUrl}\n`);

  // 2. Test database connection
  console.log('2. Testing database connection...');
  let client: Client | null = null;
  try {
    let connectionString = DATABASE_URL;
    
    if (connectionString.includes('cbs%2Fbooks')) {
      connectionString = connectionString.replace('cbs%2Fbooks', 'cbs_books');
    }
    
    if (connectionString.includes('?')) {
      connectionString = connectionString.split('?')[0];
    }

    client = new Client({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('   ✅ Database connection successful\n');
  } catch (error: any) {
    console.error('   ❌ Database connection failed:', error.message);
    return;
  }

  // 3. Check if tables exist
  console.log('3. Checking database tables...');
  try {
    const tables = ['invoices', 'expenses', 'clients'];
    for (const table of tables) {
      const result = await client!.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${table} table exists`);
        
        // Count records
        const countResult = await client!.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`      Records: ${count}`);
      } else {
        console.log(`   ❌ ${table} table does NOT exist`);
        console.log(`      Run: npm run create-cbsbooks-tables`);
      }
    }
    console.log('');
  } catch (error: any) {
    console.error('   ❌ Error checking tables:', error.message);
  }

  // 4. Check for sample data
  console.log('4. Checking for invoice data...');
  try {
    const result = await client!.query('SELECT COUNT(*) as count FROM invoices');
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      console.log(`   ✅ Found ${count} invoice(s) in database`);
      
      // Show sample
      const sample = await client!.query('SELECT invoice_number, client_name, date, total, status FROM invoices ORDER BY date DESC LIMIT 5');
      console.log('\n   Sample invoices:');
      sample.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.invoice_number} - ${row.client_name} - $${row.total} - ${row.status}`);
      });
    } else {
      console.log('   ⚠️  No invoices found in database');
      console.log('   This is normal if you haven\'t created any invoices yet.');
      console.log('   If you have invoice data in localStorage, it will migrate automatically when you open the invoice modal.');
    }
    console.log('');
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('   ❌ invoices table does not exist');
      console.log('   Run: npm run create-cbsbooks-tables');
    } else {
      console.error('   ❌ Error checking invoices:', error.message);
    }
  }

  // 5. Check localStorage (if running in browser context, this won't work)
  console.log('5. localStorage check (run in browser console):');
  console.log('   Open browser console and run:');
  console.log('   JSON.parse(localStorage.getItem("cbs_invoices") || "[]")');
  console.log('');

  // 6. Test API endpoint
  console.log('6. API endpoint check:');
  console.log('   Make sure the server is running: npm run server');
  console.log('   Then test: curl http://localhost:3000/api/cbsbooks/invoices');
  console.log('   Or open in browser: http://localhost:3000/api/cbsbooks/invoices');
  console.log('');

  // Cleanup
  if (client) {
    await client.end();
  }

  console.log('✅ Diagnostic complete!');
  console.log('\nNext steps:');
  console.log('1. If tables are missing: npm run create-cbsbooks-tables');
  console.log('2. If no data: Check localStorage or create a test invoice');
  console.log('3. If API fails: Check server is running on port 3000');
}

diagnose().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

