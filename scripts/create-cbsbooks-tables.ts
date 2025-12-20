/**
 * Create CBS Books Tables Script
 * 
 * This script creates the invoices, expenses, and clients tables
 * in the database if they don't already exist.
 * 
 * Usage:
 *   npm run create-cbsbooks-tables
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

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in environment variables.');
  console.error('   Please set NETLIFY_DATABASE_URL or DATABASE_URL in your .env.local file.');
  process.exit(1);
}

// Helper to get database client
const getDbClient = async () => {
  let connectionString = DATABASE_URL;
  
  // Auto-fix database name if needed
  if (connectionString.includes('cbs%2Fbooks')) {
    connectionString = connectionString.replace('cbs%2Fbooks', 'cbs_books');
  }
  
  // Strip query parameters
  if (connectionString.includes('?')) {
    connectionString = connectionString.split('?')[0];
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  return client;
};

// Create tables
const createTables = async (client: Client) => {
  console.log('\n📋 Creating CBS Books tables...');

  // Create invoices table
  await client.query(`
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
  await client.query(`
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
  await client.query(`
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

// Main function
const main = async () => {
  console.log('🚀 Creating CBS Books Tables');
  console.log('============================\n');

  const client = await getDbClient();
  
  try {
    await createTables(client);
    console.log('\n✅ All tables created successfully!');
  } catch (error: any) {
    console.error('\n❌ Error creating tables:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

