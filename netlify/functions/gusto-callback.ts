import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const GUSTO_TOKEN_URL = 'https://api.gusto-demo.com/oauth/token';

export const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code;
  const stateUserId = event.queryStringParameters?.state;

  if (!code) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing authorization code' }),
    };
  }

  if (!stateUserId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing user state; cannot link account' }),
    };
  }

  const clientId = process.env.GUSTO_CLIENT_ID;
  const clientSecret = process.env.GUSTO_CLIENT_SECRET;
  const redirectUri = process.env.GUSTO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Gusto OAuth environment variables are not fully set' }),
    };
  }

  try {
    const tokenResponse = await fetch(GUSTO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      let details: unknown = 'Token exchange failed';
      try {
        details = await tokenResponse.json();
      } catch {
        details = await tokenResponse.text();
      }

      return {
        statusCode: tokenResponse.status || 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Failed to exchange authorization code for tokens',
          details,
        }),
      };
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token } = tokens as {
      access_token?: string;
      refresh_token?: string;
    };

    console.log('Gusto OAuth tokens', { access_token, refresh_token, userId: stateUserId });

    // Persist tokens for this user if the database is configured.
    try {
      const databaseUrl =
        process.env.DATABASE_URL ||
        process.env.VITE_DATABASE_URL ||
        process.env.NETLIFY_DATABASE_URL;

      if (databaseUrl && access_token) {
        const sql = neon(databaseUrl);
        // Store tokens in a generic integration_tokens table (create separately if not present).
        await sql`
          INSERT INTO integration_tokens (user_id, provider, access_token, refresh_token, created_at, updated_at)
          VALUES (${stateUserId}, 'gusto', ${access_token}, ${refresh_token || null}, NOW(), NOW())
          ON CONFLICT (user_id, provider)
          DO UPDATE SET access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token, updated_at = NOW()
        `;
        console.log('✅ Stored Gusto tokens for user', stateUserId);
      } else {
        console.warn('⚠️ Database URL not configured; tokens not persisted');
      }
    } catch (dbError) {
      console.warn('⚠️ Failed to persist Gusto tokens; continuing redirect', dbError);
    }

    const redirectUrl = '/dashboard?tab=payroll&refresh_session=true';

    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl,
      },
      body: '',
    };
  } catch (error) {
    console.error('Gusto OAuth callback error', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unexpected error during Gusto OAuth callback' }),
    };
  }
};

