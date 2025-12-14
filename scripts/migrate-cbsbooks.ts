/**
 * CBS Books Migration Script
 * 
 * This script migrates CBS Books data (invoices, expenses, clients) 
 * from the standalone CBS Books database to the Cascade Connect database.
 * 
 * Usage:
 *   DATABASE_URL_SOURCE=<cbs_books_db_url> DATABASE_URL_TARGET=<cascade_connect_db_url> npm run migrate:cbsbooks
 * 
 * Or set both in .env.local and run:
 *   npm run migrate:cbsbooks
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });
// Also try .env as fallback
dotenv.config();

// Get database URLs from environment
let SOURCE_DB_URL = process.env.DATABASE_URL_SOURCE || process.env.CBS_BOOKS_DATABASE_URL;
let TARGET_DB_URL = process.env.DATABASE_URL_TARGET || process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

// Helper to check if .env.local exists
const envLocalPath = path.join(process.cwd(), '.env.local');
const envLocalExists = fs.existsSync(envLocalPath);

if (!SOURCE_DB_URL) {
  console.error('\n❌ Error: SOURCE_DATABASE_URL not found.');
  console.error('\n📝 To fix this, create a `.env.local` file in your project root with:');
  console.error('   DATABASE_URL_SOURCE=postgresql://user:password@host/cbs_books?sslmode=require');
  console.error('   DATABASE_URL_TARGET=postgresql://user:password@host/cascade_connect?sslmode=require');
  console.error('\n   Or run the script with environment variables:');
  console.error('   DATABASE_URL_SOURCE=... DATABASE_URL_TARGET=... npm run migrate:cbsbooks');
  if (!envLocalExists) {
    console.error('\n   ⚠️  Note: `.env.local` file does not exist. Create it first.');
  } else {
    console.error('\n   ℹ️  Found `.env.local` but DATABASE_URL_SOURCE is not set in it.');
  }
  process.exit(1);
}

if (!TARGET_DB_URL) {
  console.error('\n❌ Error: TARGET_DATABASE_URL not found.');
  console.error('\n📝 To fix this, add to your `.env.local` file:');
  console.error('   DATABASE_URL_TARGET=postgresql://user:password@host/cascade_connect?sslmode=require');
  console.error('\n   Or use VITE_DATABASE_URL (which should already be your Cascade Connect database)');
  if (!envLocalExists) {
    console.error('\n   ⚠️  Note: `.env.local` file does not exist. Create it first.');
  } else {
    console.error('\n   ℹ️  Found `.env.local` but DATABASE_URL_TARGET is not set in it.');
  }
  process.exit(1);
}

// Helper to create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

// Helper to get database client
const getDbClient = async (connectionString: string, label: string) => {
  // Auto-fix database name if needed
  let fixedUrl = connectionString;
  if (fixedUrl.includes('cbs%2Fbooks')) {
    fixedUrl = fixedUrl.replace('cbs%2Fbooks', 'cbs_books');
  }
  
  // Strip query parameters
  if (fixedUrl.includes('?')) {
    fixedUrl = fixedUrl.split('?')[0];
  }

  const client = new Client({
    connectionString: fixedUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log(`✅ Connected to ${label} database`);
  return client;
};

// Create tables in target database if they don't exist
const createTables = async (targetClient: Client) => {
  console.log('\n📋 Creating CBS Books tables in target database...');

  // Create invoices table
  await targetClient.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT,
      project_details TEXT,
      payment_link TEXT,
      check_number TEXT,
      date DATE NOT NULL,
      due_date DATE NOT NULL,
      date_paid DATE,
      total DECIMAL(10, 2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      items JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('   ✅ invoices table ready');

  // Create expenses table
  await targetClient.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY,
      date DATE NOT NULL,
      payee TEXT NOT NULL,
      category TEXT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('   ✅ expenses table ready');

  // Create clients table
  await targetClient.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY,
      company_name TEXT NOT NULL,
      check_payor_name TEXT,
      email TEXT,
      address TEXT,
      address_line1 TEXT,
      address_line2 TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('   ✅ clients table ready');
};

// Migrate data from source to target
const migrateData = async (sourceClient: Client, targetClient: Client) => {
  console.log('\n📦 Migrating data...');

  // Migrate invoices
  console.log('\n   Migrating invoices...');
  const invoicesResult = await sourceClient.query('SELECT * FROM invoices ORDER BY date DESC');
  const invoices = invoicesResult.rows;
  console.log(`   Found ${invoices.length} invoices`);

  if (invoices.length > 0) {
    let inserted = 0;
    let skipped = 0;
    for (const invoice of invoices) {
      try {
        // Check if invoice already exists
        const exists = await targetClient.query('SELECT id FROM invoices WHERE id = $1', [invoice.id]);
        if (exists.rows.length > 0) {
          skipped++;
          continue;
        }

        await targetClient.query(`
          INSERT INTO invoices (
            id, invoice_number, client_name, client_email, project_details, 
            payment_link, check_number, date, due_date, date_paid, 
            total, status, items
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `, [
          invoice.id,
          invoice.invoice_number,
          invoice.client_name,
          invoice.client_email || null,
          invoice.project_details || null,
          invoice.payment_link || null,
          invoice.check_number || null,
          invoice.date,
          invoice.due_date,
          invoice.date_paid || null,
          invoice.total,
          invoice.status,
          typeof invoice.items === 'string' ? invoice.items : JSON.stringify(invoice.items || [])
        ]);
        inserted++;
      } catch (error: any) {
        console.error(`   ⚠️  Failed to migrate invoice ${invoice.invoice_number}:`, error.message);
      }
    }
    console.log(`   ✅ Inserted ${inserted} invoices, skipped ${skipped} duplicates`);
  }

  // Migrate expenses
  console.log('\n   Migrating expenses...');
  const expensesResult = await sourceClient.query('SELECT * FROM expenses ORDER BY date DESC');
  const expenses = expensesResult.rows;
  console.log(`   Found ${expenses.length} expenses`);

  if (expenses.length > 0) {
    let inserted = 0;
    let skipped = 0;
    for (const expense of expenses) {
      try {
        const exists = await targetClient.query('SELECT id FROM expenses WHERE id = $1', [expense.id]);
        if (exists.rows.length > 0) {
          skipped++;
          continue;
        }

        await targetClient.query(`
          INSERT INTO expenses (id, date, payee, category, amount, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [
          expense.id,
          expense.date,
          expense.payee,
          expense.category,
          expense.amount,
          expense.description || null
        ]);
        inserted++;
      } catch (error: any) {
        console.error(`   ⚠️  Failed to migrate expense ${expense.id}:`, error.message);
      }
    }
    console.log(`   ✅ Inserted ${inserted} expenses, skipped ${skipped} duplicates`);
  }

  // Migrate clients
  console.log('\n   Migrating clients...');
  const clientsResult = await sourceClient.query('SELECT * FROM clients ORDER BY company_name ASC');
  const clients = clientsResult.rows;
  console.log(`   Found ${clients.length} clients`);

  if (clients.length > 0) {
    let inserted = 0;
    let skipped = 0;
    for (const client of clients) {
      try {
        const exists = await targetClient.query('SELECT id FROM clients WHERE id = $1', [client.id]);
        if (exists.rows.length > 0) {
          skipped++;
          continue;
        }

        await targetClient.query(`
          INSERT INTO clients (
            id, company_name, check_payor_name, email, 
            address_line1, address_line2, city, state, zip, address
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          client.id,
          client.company_name,
          client.check_payor_name || null,
          client.email || null,
          client.address_line1 || null,
          client.address_line2 || null,
          client.city || null,
          client.state || null,
          client.zip || null,
          client.address || null
        ]);
        inserted++;
      } catch (error: any) {
        console.error(`   ⚠️  Failed to migrate client ${client.company_name}:`, error.message);
      }
    }
    console.log(`   ✅ Inserted ${inserted} clients, skipped ${skipped} duplicates`);
  }
};

// Main migration function
const main = async () => {
  console.log('🚀 CBS Books Migration Script');
  console.log('================================\n');

  // Mask URLs for display (hide password)
  const maskUrl = (url: string) => {
    return url.replace(/:([^@]+)@/, ':****@');
  };

  console.log('📊 Source Database (CBS Books):');
  console.log(`   ${maskUrl(SOURCE_DB_URL)}\n`);
  console.log('📊 Target Database (Cascade Connect):');
  console.log(`   ${maskUrl(TARGET_DB_URL)}\n`);

  // Confirm with user
  const answer = await question('⚠️  This will migrate CBS Books data to Cascade Connect database.\n   Continue? (yes/no): ');
  
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('\n❌ Migration cancelled.');
    rl.close();
    process.exit(0);
  }

  let sourceClient: Client | null = null;
  let targetClient: Client | null = null;

  try {
    // Connect to both databases
    console.log('\n🔌 Connecting to databases...');
    sourceClient = await getDbClient(SOURCE_DB_URL, 'SOURCE (CBS Books)');
    targetClient = await getDbClient(TARGET_DB_URL, 'TARGET (Cascade Connect)');

    // Create tables in target
    await createTables(targetClient);

    // Migrate data
    await migrateData(sourceClient, targetClient);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your .env.local to use the Cascade Connect database URL');
    console.log('   2. Set NETLIFY_DATABASE_URL or DATABASE_URL to the Cascade Connect database');
    console.log('   3. Restart your server');
    console.log('   4. Verify CBS Books loads data correctly in Cascade Connect');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (sourceClient) {
      try {
        await sourceClient.end();
        console.log('\n🔌 Disconnected from source database');
      } catch (e) {
        /* ignore */
      }
    }
    if (targetClient) {
      try {
        await targetClient.end();
        console.log('🔌 Disconnected from target database');
      } catch (e) {
        /* ignore */
      }
    }
    rl.close();
  }
};

// Run migration
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


