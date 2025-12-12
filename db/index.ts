
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Support both Vite (browser) and Node (migration) environments
// If the variable is missing (e.g. local dev without .env), use a placeholder.
const envUrl = (import.meta as any).env?.VITE_DATABASE_URL;
const processUrl = typeof process !== 'undefined' ? process.env?.DATABASE_URL : undefined;

const connectionString = envUrl || processUrl || "postgresql://placeholder:placeholder@placeholder.neondb.org/placeholder";

export const isDbConfigured = !!(connectionString && !connectionString.includes('placeholder'));

// Only initialize database connection if properly configured
// This prevents errors when the connection string is invalid
let sql: any = null;
let dbInstance: any = null;

if (isDbConfigured) {
  try {
    sql = neon(connectionString);
    dbInstance = drizzle(sql, { schema });
    console.log("✅ Database connection initialized");
  } catch (e) {
    console.error("❌ Failed to initialize database connection:", e);
    // Don't export a fake db - let errors propagate so we know when DB is down
    dbInstance = null;
  }
} else {
  console.warn("⚠️ No valid VITE_DATABASE_URL found. App will default to Local Storage/Mock mode.");
}

// Export database instance - will be null if not configured or failed to initialize
// This allows callers to check isDbConfigured before using db
// Provide a safe fallback that won't crash the app
export const db = dbInstance || {
  select: () => ({ 
    from: () => Promise.resolve([]),
    orderBy: () => ({ from: () => Promise.resolve([]) })
  }),
  insert: () => ({ 
    values: () => Promise.resolve({}) 
  }),
  update: () => ({ 
    set: () => ({ 
      where: () => Promise.resolve({}) 
    }) 
  }),
  delete: () => ({ 
    where: () => Promise.resolve({}) 
  }),
};
