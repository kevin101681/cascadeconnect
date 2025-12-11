
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Support both Vite (browser) and Node (migration) environments
// If the variable is missing (e.g. local dev without .env), use a placeholder to prevent 'neon()' from crashing the app immediately.
// The App.tsx component handles the connection failure gracefully and falls back to LocalStorage.
const connectionString = (import.meta as any).env?.VITE_DATABASE_URL || process.env.DATABASE_URL || "postgresql://placeholder:placeholder@placeholder.neondb.org/placeholder";

if (!connectionString || connectionString.includes('placeholder')) {
  console.warn("No valid VITE_DATABASE_URL found. App will default to Local Storage/Mock mode.");
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
