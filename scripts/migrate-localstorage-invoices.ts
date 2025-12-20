/**
 * LocalStorage Invoice Data Migration Script
 * 
 * This script migrates invoice data from localStorage (cbs_invoices, cbs_expenses, cbs_clients)
 * to the database. This is useful when invoice data was created in the modal while offline
 * or when the API was unavailable.
 * 
 * Usage:
 *   This script can be run from the browser console or as a Node.js script.
 *   For browser: Copy the migrateLocalStorageToDatabase function and run it in the console
 *   For Node.js: npm run migrate:localstorage-invoices
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });
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

// Ensure tables exist
const ensureTables = async (client: Client) => {
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
};

// Migrate localStorage data to database
const migrateLocalStorageToDatabase = async (localStorageData: {
  invoices?: any[];
  expenses?: any[];
  clients?: any[];
}) => {
  const client = await getDbClient();
  
  try {
    await ensureTables(client);
    
    let invoicesMigrated = 0;
    let expensesMigrated = 0;
    let clientsMigrated = 0;
    let invoicesSkipped = 0;
    let expensesSkipped = 0;
    let clientsSkipped = 0;

    // Migrate invoices
    if (localStorageData.invoices && localStorageData.invoices.length > 0) {
      console.log(`\n📋 Migrating ${localStorageData.invoices.length} invoices...`);
      
      for (const invoice of localStorageData.invoices) {
        try {
          // Check if invoice already exists
          const exists = await client.query('SELECT id FROM invoices WHERE id = $1', [invoice.id]);
          if (exists.rows.length > 0) {
            invoicesSkipped++;
            continue;
          }

          // Ensure items is properly formatted
          let items = invoice.items || [];
          if (typeof items === 'string') {
            try {
              items = JSON.parse(items);
            } catch {
              items = [];
            }
          }

          await client.query(`
            INSERT INTO invoices (
              id, invoice_number, client_name, client_email, project_details,
              payment_link, check_number, date, due_date, date_paid,
              total, status, items
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO NOTHING
          `, [
            invoice.id,
            invoice.invoiceNumber || invoice.invoice_number,
            invoice.clientName || invoice.client_name,
            invoice.clientEmail || invoice.client_email || null,
            invoice.projectDetails || invoice.project_details || null,
            invoice.paymentLink || invoice.payment_link || null,
            invoice.checkNumber || invoice.check_number || null,
            invoice.date,
            invoice.dueDate || invoice.due_date,
            invoice.datePaid || invoice.date_paid || null,
            invoice.total,
            invoice.status || 'draft',
            JSON.stringify(items)
          ]);
          invoicesMigrated++;
        } catch (error: any) {
          console.error(`   ⚠️  Failed to migrate invoice ${invoice.invoiceNumber || invoice.id}:`, error.message);
        }
      }
      console.log(`   ✅ Migrated ${invoicesMigrated} invoices, skipped ${invoicesSkipped} duplicates`);
    }

    // Migrate expenses
    if (localStorageData.expenses && localStorageData.expenses.length > 0) {
      console.log(`\n💰 Migrating ${localStorageData.expenses.length} expenses...`);
      
      for (const expense of localStorageData.expenses) {
        try {
          const exists = await client.query('SELECT id FROM expenses WHERE id = $1', [expense.id]);
          if (exists.rows.length > 0) {
            expensesSkipped++;
            continue;
          }

          await client.query(`
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
          expensesMigrated++;
        } catch (error: any) {
          console.error(`   ⚠️  Failed to migrate expense ${expense.id}:`, error.message);
        }
      }
      console.log(`   ✅ Migrated ${expensesMigrated} expenses, skipped ${expensesSkipped} duplicates`);
    }

    // Migrate clients
    if (localStorageData.clients && localStorageData.clients.length > 0) {
      console.log(`\n👥 Migrating ${localStorageData.clients.length} clients...`);
      
      for (const client of localStorageData.clients) {
        try {
          const exists = await client.query('SELECT id FROM clients WHERE id = $1', [client.id]);
          if (exists.rows.length > 0) {
            clientsSkipped++;
            continue;
          }

          await client.query(`
            INSERT INTO clients (
              id, company_name, check_payor_name, email,
              address_line1, address_line2, city, state, zip, address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
          `, [
            client.id,
            client.companyName || client.company_name,
            client.checkPayorName || client.check_payor_name || null,
            client.email || null,
            client.addressLine1 || client.address_line1 || null,
            client.addressLine2 || client.address_line2 || null,
            client.city || null,
            client.state || null,
            client.zip || null,
            client.address || null
          ]);
          clientsMigrated++;
        } catch (error: any) {
          console.error(`   ⚠️  Failed to migrate client ${client.companyName || client.id}:`, error.message);
        }
      }
      console.log(`   ✅ Migrated ${clientsMigrated} clients, skipped ${clientsSkipped} duplicates`);
    }

    console.log('\n✅ Migration completed!');
    console.log(`   Total: ${invoicesMigrated + expensesMigrated + clientsMigrated} items migrated`);
    console.log(`   Skipped: ${invoicesSkipped + expensesSkipped + clientsSkipped} duplicates`);

    return {
      invoices: { migrated: invoicesMigrated, skipped: invoicesSkipped },
      expenses: { migrated: expensesMigrated, skipped: expensesSkipped },
      clients: { migrated: clientsMigrated, skipped: clientsSkipped }
    };
  } finally {
    await client.end();
  }
};

// Browser-compatible version (for use in browser console)
export const migrateLocalStorageToDatabaseBrowser = async () => {
  const STORAGE_KEYS = {
    INVOICES: 'cbs_invoices',
    EXPENSES: 'cbs_expenses',
    CLIENTS: 'cbs_clients',
  };

  // Get data from localStorage
  const invoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
  const expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || '[]');
  const clients = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || '[]');

  if (invoices.length === 0 && expenses.length === 0 && clients.length === 0) {
    console.log('ℹ️  No localStorage data found to migrate.');
    return { invoices: [], expenses: [], clients: [] };
  }

  console.log(`📦 Found localStorage data:`);
  console.log(`   Invoices: ${invoices.length}`);
  console.log(`   Expenses: ${expenses.length}`);
  console.log(`   Clients: ${clients.length}`);

  // Migrate to database via API
  try {
    const result = await fetch('/api/cbsbooks/migrate-localstorage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoices, expenses, clients })
    });

    if (!result.ok) {
      throw new Error(`Migration API returned ${result.status}`);
    }

    const data = await result.json();
    console.log('✅ Migration completed via API:', data);
    return data;
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('💡 Tip: Make sure the server is running and the API endpoint exists.');
    throw error;
  }
};

// Node.js main function
const main = async () => {
  console.log('🚀 LocalStorage Invoice Data Migration');
  console.log('=====================================\n');

  // For Node.js, we can't access localStorage directly
  // This script expects data to be provided via a JSON file or environment
  // In practice, this should be run from the browser console
  
  console.log('ℹ️  This script is designed to be run from the browser console.');
  console.log('   Use the migrateLocalStorageToDatabaseBrowser() function in the browser.');
  console.log('\n   Alternatively, create a migration API endpoint that calls migrateLocalStorageToDatabase().');
  
  process.exit(0);
};

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { migrateLocalStorageToDatabase };

