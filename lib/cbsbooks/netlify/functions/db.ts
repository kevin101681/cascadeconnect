
import { Client } from 'pg';

// Helper to get a database connection
export const getDbClient = async () => {
  // Check for both variable names to be safe
  let connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("Missing DATABASE_URL env var");
    throw new Error("Database configuration is missing. Please set NETLIFY_DATABASE_URL in Netlify Site Settings.");
  }
  
  // --- AUTOMATIC FIXES ---

  // 1. Fix Database Name: 'cbs%2Fbooks' -> 'cbs_books'
  if (connectionString.includes('cbs%2Fbooks')) {
    console.log("Auto-correcting database name...");
    connectionString = connectionString.replace('cbs%2Fbooks', 'cbs_books');
  }

  // 2. Strip query parameters (like sslmode, channel_binding) to prevent conflicts.
  // We handle SSL explicitly in the config object below.
  if (connectionString.includes('?')) {
     connectionString = connectionString.split('?')[0];
  }

  // Log masked URL for debugging (hides password)
  const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@');
  console.log(`Connecting to database: ${maskedUrl}`);

  const client = new Client({
    connectionString: connectionString,
    // CRITICAL FIX: Set rejectUnauthorized to false to allow connection to Neon from Netlify
    ssl: { rejectUnauthorized: false }
  });

  // We do NOT try/catch here anymore. 
  // We let the connection error bubble up so the Handler can catch it 
  // and return the specific error message to the frontend.
  await client.connect();
  
  return client;
};

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
