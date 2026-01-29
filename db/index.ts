
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// SECURITY FIX: Database connection is now SERVER-SIDE ONLY
// This file should ONLY be used by Netlify Functions and Node.js scripts
// Client-side code should call Netlify Functions to access data
// 
// If you're getting errors importing this in client code, that's intentional!
// Use Netlify Functions (e.g., /.netlify/functions/*) for database access instead.

const connectionString = typeof process !== 'undefined' ? process.env?.DATABASE_URL : null;

export const isDbConfigured = !!(connectionString && connectionString.length > 0);

// Log configuration status (without exposing the actual connection string)
// Only log in server/Node environment, not in browser
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  console.log("Database configuration:", {
    isDbConfigured,
    connectionStringLength: connectionString?.length || 0,
    connectionStringPrefix: connectionString ? connectionString.substring(0, 20) + '...' : 'none'
  });
}

// Only initialize database connection if properly configured
// This prevents errors when the connection string is invalid
let sql: any = null;
let dbInstance: any = null;

if (isDbConfigured) {
  try {
    sql = neon(connectionString);
    dbInstance = drizzle(sql, { schema });
    console.log("✅ Database connection initialized");
    
    // Test the connection with a simple query (async, don't block initialization)
    // Only in server/Node environment
    if (typeof process !== 'undefined') {
      (async () => {
        try {
          // Try a simple query to verify connection works
          await dbInstance.select().from(schema.homeowners).limit(0);
          console.log("✅ Database connection verified");
        } catch (testError) {
          console.error("⚠️ Database connection test failed:", testError);
          console.error("This may indicate a connection issue. Check your DATABASE_URL.");
        }
      })();
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("❌ Failed to initialize database connection:", errorMsg);
    console.error("Full error:", e);
    // Don't export a fake db - let errors propagate so we know when DB is down
    dbInstance = null;
  }
} else {
  console.warn("⚠️ No valid DATABASE_URL found. Database features disabled.");
  console.warn("To enable database features, set DATABASE_URL in your server environment.");
}

// Export database instance - will be null if not configured or failed to initialize
// This allows callers to check isDbConfigured before using db
// CRITICAL: Provide a fallback that THROWS ERRORS instead of silently failing
// This prevents data loss from silent failures
export const db = dbInstance || {
  select: () => {
    throw new Error('❌ Database not initialized. Cannot perform SELECT operation. Set DATABASE_URL on server.');
  },
  insert: () => {
    throw new Error('❌ Database not initialized. Cannot perform INSERT operation. Set DATABASE_URL on server.');
  },
  update: () => {
    throw new Error('❌ Database not initialized. Cannot perform UPDATE operation. Set DATABASE_URL on server.');
  },
  delete: () => {
    throw new Error('❌ Database not initialized. Cannot perform DELETE operation. Set DATABASE_URL on server.');
  },
};
