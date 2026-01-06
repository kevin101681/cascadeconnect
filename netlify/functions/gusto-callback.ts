import type { Handler } from '@netlify/functions';

const GUSTO_TOKEN_URL = 'https://api.gusto-demo.com/oauth/token';

export const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code;

  if (!code) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing authorization code' }),
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

    console.log('Gusto OAuth tokens', { access_token, refresh_token });

    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    const baseUrl = host ? `${protocol}://${host}` : '';
    const redirectUrl = `${baseUrl}/dashboard?tab=PAYROLL&gusto_connected=true`;

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

