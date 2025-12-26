import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

const cwd = process.cwd();
const envLocalPath = resolve(cwd, '.env.local');
const envPath = resolve(cwd, '.env');

// Load environment variables from .env.local first, then .env
// Try dotenv first
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
}
if (existsSync(envPath)) {
  config({ path: envPath });
}

// Fallback: manually parse .env.local if dotenv didn't work
let databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl && existsSync(envLocalPath)) {
  try {
    const envContent = readFileSync(envLocalPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^(VITE_DATABASE_URL|DATABASE_URL)=(.*)$/);
        if (match) {
          const value = match[2].trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (cleanValue) {
            databaseUrl = cleanValue;
            // Also set it in process.env for consistency
            process.env[match[1]] = cleanValue;
            break;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading .env.local file:', err);
  }
}

if (!databaseUrl) {
  console.error('❌ Error: Database URL not found!');
  console.error('');
  console.error('Please set one of these in your .env.local file:');
  console.error('  VITE_DATABASE_URL=postgresql://...');
  console.error('  OR');
  console.error('  DATABASE_URL=postgresql://...');
  process.exit(1);
}

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
