
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Support both Vite (browser) and Node (migration) environments
// If the variable is missing (e.g. local dev without .env), use a placeholder.
const envUrl = (import.meta as any).env?.VITE_DATABASE_URL;
const processUrl = typeof process !== 'undefined' ? process.env?.DATABASE_URL : undefined;

const connectionString = envUrl || processUrl || "postgresql://placeholder:placeholder@placeholder.neondb.org/placeholder";

export const isDbConfigured = !!(connectionString && !connectionString.includes('placeholder'));

if (!isDbConfigured) {
  console.warn("No valid VITE_DATABASE_URL found. App will default to Local Storage/Mock mode.");
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
