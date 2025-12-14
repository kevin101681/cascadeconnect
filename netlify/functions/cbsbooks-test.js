const { Client } = require('pg');

const getDbClient = async () => {
  let connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!connectionString) {
    throw new Error("Database configuration is missing. Please set NETLIFY_DATABASE_URL, DATABASE_URL, or VITE_DATABASE_URL.");
  }
  if (connectionString.includes('cbs%2Fbooks')) {
    connectionString = connectionString.replace('cbs%2Fbooks', 'cbs_books');
  }
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

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  try {
    const client = await getDbClient();
    const result = await client.query('SELECT COUNT(*) as count FROM invoices');
    await client.end();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        invoiceCount: parseInt(result.rows[0].count),
        hasDatabaseUrl: !!(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL),
        envVars: {
          hasNetlifyDb: !!process.env.NETLIFY_DATABASE_URL,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasViteDb: !!process.env.VITE_DATABASE_URL
        },
        path: event.path
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message,
        hasDatabaseUrl: !!(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL),
        envVars: {
          hasNetlifyDb: !!process.env.NETLIFY_DATABASE_URL,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasViteDb: !!process.env.VITE_DATABASE_URL
        },
        path: event.path
      })
    };
  }
};


