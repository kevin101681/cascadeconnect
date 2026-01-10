import { neon } from '@neondatabase/serverless';

export const handler = async (event: any) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { claimId, field, value } = JSON.parse(event.body || '{}');

    console.log(`📝 Auto-save request: claimId=${claimId}, field=${field}`);

    // Validate inputs
    if (!claimId || !field) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing claimId or field' }),
      };
    }

    // 🔒 SECURITY: Whitelist allowed fields
    // Only allow text fields that are safe for auto-save
    const allowedFields = ['description', 'internalNotes', 'internal_notes'];
    if (!allowedFields.includes(field)) {
      console.error(`❌ Invalid field attempted: ${field}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid field' }),
      };
    }

    // Convert camelCase to snake_case for DB
    const dbField = field === 'internalNotes' ? 'internal_notes' : field;

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    if (!databaseUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' }),
      };
    }

    const sql = neon(databaseUrl);

    // 🎯 PURE UPDATE - NO EMAILS, NO NOTIFICATIONS
    // This is intentionally a simple update to prevent spam while typing
    await sql`
      UPDATE claims
      SET ${sql(dbField)} = ${value}
      WHERE id = ${claimId}
    `;

    console.log(`✅ Auto-saved claim ${claimId} field ${field}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error('❌ Update claim field error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update claim',
        message: error.message 
      }),
    };
  }
};
