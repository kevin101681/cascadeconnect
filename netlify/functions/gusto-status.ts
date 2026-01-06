import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  const userId = event.queryStringParameters?.userId;

  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing userId' }),
    };
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.VITE_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL;

  if (!databaseUrl) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isConnected: false, error: 'Database not configured' }),
    };
  }

  try {
    const sql = neon(databaseUrl);
    // Ensure table exists (idempotent)
    await sql`
      CREATE TABLE IF NOT EXISTS integration_tokens (
        user_id text NOT NULL,
        provider text NOT NULL,
        access_token text,
        refresh_token text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        PRIMARY KEY (user_id, provider)
      );
    `;

    const rows = await sql`
      SELECT 1 FROM integration_tokens
      WHERE user_id = ${userId} AND provider = 'gusto'
      LIMIT 1;
    `;

    const isConnected = rows.length > 0;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isConnected }),
    };
  } catch (error: any) {
    console.error('Failed to check Gusto connection', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isConnected: false, error: 'Lookup failed' }),
    };
  }
};

