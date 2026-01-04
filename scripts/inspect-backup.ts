#!/usr/bin/env tsx
/**
 * Backup Inspector Script
 * 
 * Reads backup.json and analyzes its structure:
 * - Reports if root is Array or Object
 * - Lists all keys with types and counts
 * - Shows sample structure of invoices/expenses
 * - Recursively inspects nested objects
 */

import fs from 'fs';
import path from 'path';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function getType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'Array';
  return typeof value;
}

function inspectBackup() {
  console.log(`${colors.bright}${colors.cyan}📦 BACKUP INSPECTOR${colors.reset}\n`);

  // Try to find backup.json in root
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
    console.error(`${colors.yellow}⚠️  backup.json not found in root directory${colors.reset}`);
    console.log(`${colors.yellow}Checked paths:${colors.reset}`);
    possiblePaths.forEach(p => console.log(`  - ${p}`));
    process.exit(1);
  }

  console.log(`${colors.green}✓ Found backup file:${colors.reset} ${backupPath}\n`);

  // Read and parse the file
  const fileContent = fs.readFileSync(backupPath, 'utf-8');
  const fileSize = (fileContent.length / 1024).toFixed(2);
  console.log(`${colors.blue}File Size:${colors.reset} ${fileSize} KB\n`);

  let data: any;
  try {
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error(`${colors.yellow}❌ Failed to parse JSON:${colors.reset}`, error);
    process.exit(1);
  }

  console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════${colors.reset}\n`);

  // Check if root is Array or Object
  if (Array.isArray(data)) {
    console.log(`${colors.bright}Root Structure:${colors.reset} ${colors.green}Array${colors.reset}`);
    console.log(`${colors.bright}Item Count:${colors.reset} ${data.length}\n`);

    if (data.length > 0) {
      console.log(`${colors.cyan}First Item Type:${colors.reset} ${getType(data[0])}`);
      if (typeof data[0] === 'object' && data[0] !== null) {
        console.log(`${colors.cyan}First Item Keys:${colors.reset}`);
        Object.keys(data[0]).forEach(key => {
          console.log(`  • ${key}`);
        });
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    console.log(`${colors.bright}Root Structure:${colors.reset} ${colors.green}Object${colors.reset}\n`);

    const keys = Object.keys(data);
    console.log(`${colors.bright}Top-Level Keys:${colors.reset} ${keys.length}\n`);

    console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════${colors.reset}\n`);
    console.log(`${colors.bright}TOP-LEVEL KEY ANALYSIS:${colors.reset}\n`);

    keys.forEach(key => {
      const value = data[key];
      const type = getType(value);
      
      let info = `${colors.cyan}${key}${colors.reset} → ${colors.yellow}${type}${colors.reset}`;
      
      if (Array.isArray(value)) {
        info += ` (${colors.green}${value.length}${colors.reset} items)`;
      }
      
      console.log(info);
    });

    console.log(`\n${colors.bright}${colors.magenta}═══════════════════════════════════════════════${colors.reset}\n`);
    console.log(`${colors.bright}NESTED OBJECT INSPECTION:${colors.reset}\n`);

    // Recursively inspect nested objects
    keys.forEach(key => {
      const value = data[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        console.log(`${colors.bright}${colors.blue}[${key.toUpperCase()}] Nested Keys:${colors.reset}`);
        const nestedKeys = Object.keys(value);
        nestedKeys.forEach(nestedKey => {
          const nestedValue = value[nestedKey];
          const nestedType = getType(nestedValue);
          let info = `  • ${colors.cyan}${nestedKey}${colors.reset} → ${colors.yellow}${nestedType}${colors.reset}`;
          if (Array.isArray(nestedValue)) {
            info += ` (${colors.green}${nestedValue.length}${colors.reset} items)`;
          }
          console.log(info);
        });
        console.log();
      }
    });

    console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════${colors.reset}\n`);
    console.log(`${colors.bright}SAMPLE STRUCTURES:${colors.reset}\n`);

    // Helper function to find arrays in nested objects
    const findArrays = (obj: any, path: string = ''): Array<{path: string, array: any[]}> => {
      const results: Array<{path: string, array: any[]}> = [];
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;
        if (Array.isArray(value)) {
          results.push({ path: currentPath, array: value });
        } else if (typeof value === 'object' && value !== null) {
          results.push(...findArrays(value, currentPath));
        }
      });
      return results;
    };

    const allArrays = findArrays(data);

    // Show sample structure for invoices
    const invoicesArray = allArrays.find(a => a.path.includes('invoices'));
    if (invoicesArray && invoicesArray.array.length > 0) {
      console.log(`${colors.bright}${colors.blue}[${invoicesArray.path}] Sample Keys (${invoicesArray.array.length} items):${colors.reset}`);
      const invoiceSample = invoicesArray.array[0];
      Object.keys(invoiceSample).forEach(key => {
        const valueType = getType(invoiceSample[key]);
        console.log(`  • ${colors.cyan}${key}${colors.reset} (${valueType})`);
      });
      console.log();
    }

    // Show sample structure for expenses
    const expensesArray = allArrays.find(a => a.path.includes('expenses'));
    if (expensesArray && expensesArray.array.length > 0) {
      console.log(`${colors.bright}${colors.blue}[${expensesArray.path}] Sample Keys (${expensesArray.array.length} items):${colors.reset}`);
      const expenseSample = expensesArray.array[0];
      Object.keys(expenseSample).forEach(key => {
        const valueType = getType(expenseSample[key]);
        console.log(`  • ${colors.cyan}${key}${colors.reset} (${valueType})`);
      });
      console.log();
    }

    // Show sample structure for clients
    const clientsArray = allArrays.find(a => a.path.includes('clients'));
    if (clientsArray && clientsArray.array.length > 0) {
      console.log(`${colors.bright}${colors.blue}[${clientsArray.path}] Sample Keys (${clientsArray.array.length} items):${colors.reset}`);
      const clientSample = clientsArray.array[0];
      Object.keys(clientSample).forEach(key => {
        const valueType = getType(clientSample[key]);
        console.log(`  • ${colors.cyan}${key}${colors.reset} (${valueType})`);
      });
      console.log();
    }

    // Show any other arrays with sample structures
    const otherArrays = allArrays.filter(
      a => !a.path.includes('invoices') && 
           !a.path.includes('expenses') && 
           !a.path.includes('clients') &&
           a.array.length > 0
    );

    otherArrays.forEach(({ path, array }) => {
      console.log(`${colors.bright}${colors.blue}[${path.toUpperCase()}] Sample Keys (${array.length} items):${colors.reset}`);
      const sample = array[0];
      if (typeof sample === 'object' && sample !== null) {
        Object.keys(sample).forEach(sampleKey => {
          const valueType = getType(sample[sampleKey]);
          console.log(`  • ${colors.cyan}${sampleKey}${colors.reset} (${valueType})`);
        });
      } else {
        console.log(`  Type: ${getType(sample)}`);
      }
      console.log();
    });

  } else {
    console.log(`${colors.bright}Root Structure:${colors.reset} ${colors.yellow}${getType(data)}${colors.reset}`);
  }

  console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════${colors.reset}\n`);
  console.log(`${colors.green}✅ Inspection complete!${colors.reset}\n`);
}

// Run the inspector
inspectBackup();
