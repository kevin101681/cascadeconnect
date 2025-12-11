import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Support both Vite (browser) and Node (migration) environments
const connectionString = (import.meta as any).env?.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("Missing VITE_DATABASE_URL or DATABASE_URL environment variable.");
}

const sql = neon(connectionString!);
export const db = drizzle(sql, { schema });