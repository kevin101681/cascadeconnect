#!/usr/bin/env tsx
/**
 * Restore CBS Books Data from Backup
 * 
 * Restores invoices, expenses, and clients from backup.json.json
 * Maps camelCase keys to snake_case database columns
 * Handles JSONB for invoice items
 * Uses chunking for large datasets
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: resolve(__dirname, '..', '.env') });
dotenv.config();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

// Get database client
async function getDbClient(): Promise<Client> {
  const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error(`${colors.red}❌ Error: DATABASE_URL not found in environment variables.${colors.reset}`);
    console.error(`   Please set NETLIFY_DATABASE_URL or DATABASE_URL in your .env.local file.`);
    throw new Error('DATABASE_URL or VITE_DATABASE_URL not found in environment');
  }

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
    connectionString,
    ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  console.log(`${colors.green}✓ Connected to database${colors.reset}\n`);
  
  return client;
}

// Helper: Convert date string to Date object or null
function safeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Helper: Chunk array into smaller arrays
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper: Ensure CBS Books tables exist
async function ensureTables(client: Client) {
  console.log(`${colors.cyan}📋 Ensuring CBS Books tables exist...${colors.reset}`);

  try {
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
    console.log(`   ${colors.green}✓ invoices table ready${colors.reset}`);

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
    console.log(`   ${colors.green}✓ expenses table ready${colors.reset}`);

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
    console.log(`   ${colors.green}✓ clients table ready${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}❌ Error creating tables:${colors.reset}`, error);
    throw error;
  }
}

// Restore Clients
async function restoreClients(client: Client, clients: any[]) {
  console.log(`${colors.bright}${colors.blue}👥 RESTORING CLIENTS${colors.reset}`);
  console.log(`${colors.cyan}Total: ${clients.length} clients${colors.reset}\n`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const clientData of clients) {
    try {
      await client.query(`
        INSERT INTO clients (
          id, company_name, check_payor_name, email, 
          address, address_line1, address_line2, 
          city, state, zip
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (id) DO NOTHING
      `, [
        clientData.id,
        clientData.companyName || clientData.company_name,
        clientData.checkPayorName || clientData.check_payor_name || null,
        clientData.email || null,
        clientData.address || null,
        clientData.addressLine1 || clientData.address_line1 || null,
        clientData.addressLine2 || clientData.address_line2 || null,
        clientData.city || null,
        clientData.state || null,
        clientData.zip || null
      ]);
      inserted++;
    } catch (error: any) {
      if (error.code === '23505') {
        // Duplicate key
        skipped++;
      } else {
        failed++;
        console.error(`${colors.red}   ✗ Failed to insert client ${clientData.id}:${colors.reset}`, error.message);
      }
    }
  }

  console.log(`${colors.green}✓ Clients Restored:${colors.reset}`);
  console.log(`   Inserted: ${colors.green}${inserted}${colors.reset}`);
  console.log(`   Skipped:  ${colors.yellow}${skipped}${colors.reset} (duplicates)`);
  if (failed > 0) console.log(`   Failed:   ${colors.red}${failed}${colors.reset}`);
  console.log();
}

// Restore Expenses
async function restoreExpenses(client: Client, expenses: any[]) {
  console.log(`${colors.bright}${colors.blue}💰 RESTORING EXPENSES${colors.reset}`);
  console.log(`${colors.cyan}Total: ${expenses.length} expenses${colors.reset}\n`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  // Process in chunks to avoid memory issues
  const chunks = chunk(expenses, 100);
  let processedCount = 0;

  for (const expenseChunk of chunks) {
    for (const expense of expenseChunk) {
      try {
        await client.query(`
          INSERT INTO expenses (
            id, date, payee, category, amount, description
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          )
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
        if (error.code === '23505') {
          skipped++;
        } else {
          failed++;
          console.error(`${colors.red}   ✗ Failed to insert expense ${expense.id}:${colors.reset}`, error.message);
        }
      }
    }

    processedCount += expenseChunk.length;
    if (chunks.length > 1) {
      process.stdout.write(`   Progress: ${processedCount}/${expenses.length} (${Math.round(processedCount / expenses.length * 100)}%)\r`);
    }
  }

  if (chunks.length > 1) {
    console.log(); // New line after progress
  }

  console.log(`${colors.green}✓ Expenses Restored:${colors.reset}`);
  console.log(`   Inserted: ${colors.green}${inserted}${colors.reset}`);
  console.log(`   Skipped:  ${colors.yellow}${skipped}${colors.reset} (duplicates)`);
  if (failed > 0) console.log(`   Failed:   ${colors.red}${failed}${colors.reset}`);
  console.log();
}

// Restore Invoices
async function restoreInvoices(client: Client, invoices: any[]) {
  console.log(`${colors.bright}${colors.blue}📄 RESTORING INVOICES${colors.reset}`);
  console.log(`${colors.cyan}Total: ${invoices.length} invoices${colors.reset}\n`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  // Process in chunks to avoid packet size limits
  const chunks = chunk(invoices, 100);
  let processedCount = 0;

  for (const invoiceChunk of chunks) {
    for (const invoice of invoiceChunk) {
      try {
        // Prepare items as JSON string
        const itemsJson = JSON.stringify(invoice.items || []);

        await client.query(`
          INSERT INTO invoices (
            id, invoice_number, client_name, client_email, 
            project_details, payment_link, check_number, 
            date, due_date, date_paid, 
            total, status, items
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
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
          itemsJson
        ]);
        inserted++;
      } catch (error: any) {
        if (error.code === '23505') {
          skipped++;
        } else {
          failed++;
          console.error(`${colors.red}   ✗ Failed to insert invoice ${invoice.invoiceNumber || invoice.id}:${colors.reset}`, error.message);
        }
      }
    }

    processedCount += invoiceChunk.length;
    if (chunks.length > 1) {
      process.stdout.write(`   Progress: ${processedCount}/${invoices.length} (${Math.round(processedCount / invoices.length * 100)}%)\r`);
    }
  }

  if (chunks.length > 1) {
    console.log(); // New line after progress
  }

  console.log(`${colors.green}✓ Invoices Restored:${colors.reset}`);
  console.log(`   Inserted: ${colors.green}${inserted}${colors.reset}`);
  console.log(`   Skipped:  ${colors.yellow}${skipped}${colors.reset} (duplicates)`);
  if (failed > 0) console.log(`   Failed:   ${colors.red}${failed}${colors.reset}`);
  console.log();
}

// Main restore function
async function main() {
  console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}📦 CBS BOOKS BACKUP RESTORE${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════${colors.reset}\n`);

  // Find backup file
  const possiblePaths = [
    path.join(process.cwd(), 'backup.json'),
    path.join(process.cwd(), 'backup.json.json'),
  ];

  let backupPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      backupPath = p;
      break;
    }
  }

  if (!backupPath) {
    console.error(`${colors.red}❌ Backup file not found!${colors.reset}`);
    console.log(`${colors.yellow}Checked paths:${colors.reset}`);
    possiblePaths.forEach(p => console.log(`  - ${p}`));
    process.exit(1);
  }

  console.log(`${colors.green}✓ Found backup:${colors.reset} ${backupPath}\n`);

  // Read and parse backup
  let backup: any;
  try {
    const fileContent = fs.readFileSync(backupPath, 'utf-8');
    backup = JSON.parse(fileContent);
    console.log(`${colors.green}✓ Backup parsed successfully${colors.reset}`);
    console.log(`   Timestamp: ${backup.timestamp || 'N/A'}`);
    console.log(`   Version: ${backup.version || 'N/A'}\n`);
  } catch (error) {
    console.error(`${colors.red}❌ Failed to parse backup file:${colors.reset}`, error);
    process.exit(1);
  }

  // Extract data (handle nested structure)
  const data = backup.data || backup;
  const clients = data.clients || [];
  const expenses = data.expenses || [];
  const invoices = data.invoices || [];

  console.log(`${colors.cyan}📊 Backup Contents:${colors.reset}`);
  console.log(`   Clients:   ${colors.bright}${clients.length}${colors.reset}`);
  console.log(`   Expenses:  ${colors.bright}${expenses.length}${colors.reset}`);
  console.log(`   Invoices:  ${colors.bright}${invoices.length}${colors.reset}\n`);

  // Connect to database
  const client = await getDbClient();

  try {
    // Ensure tables exist
    await ensureTables(client);

    // Restore in order (clients first, then expenses, then invoices)
    // Step 1: Clients
    if (clients.length > 0) {
      await restoreClients(client, clients);
    } else {
      console.log(`${colors.yellow}⚠️  No clients to restore${colors.reset}\n`);
    }

    // Step 2: Expenses
    if (expenses.length > 0) {
      await restoreExpenses(client, expenses);
    } else {
      console.log(`${colors.yellow}⚠️  No expenses to restore${colors.reset}\n`);
    }

    // Step 3: Invoices
    if (invoices.length > 0) {
      await restoreInvoices(client, invoices);
    } else {
      console.log(`${colors.yellow}⚠️  No invoices to restore${colors.reset}\n`);
    }

    console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.green}✅ RESTORE COMPLETE!${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}❌ Restore failed:${colors.reset}`, error);
    throw error;
  } finally {
    await client.end();
    console.log(`${colors.green}✓ Database connection closed${colors.reset}`);
  }
}

// Run the restore
main()
  .then(() => {
    console.log(`${colors.green}Done!${colors.reset}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });

