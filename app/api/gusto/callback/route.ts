import { NextRequest, NextResponse } from 'next/server';

const GUSTO_TOKEN_URL = 'https://api.gusto-demo.com/oauth/token';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  const clientId = process.env.GUSTO_CLIENT_ID;
  const clientSecret = process.env.GUSTO_CLIENT_SECRET;
  const redirectUri = process.env.GUSTO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'Gusto OAuth environment variables are not fully set' },
      { status: 500 },
    );
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

      return NextResponse.json(
        { error: 'Failed to exchange authorization code for tokens', details },
        { status: tokenResponse.status || 500 },
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token } = tokens as {
      access_token?: string;
      refresh_token?: string;
    };

    // Temporary logging so we can verify the OAuth exchange works end-to-end.
    console.log('Gusto OAuth tokens', { access_token, refresh_token });

    const redirectUrl = new URL('/integrations', req.url);
    redirectUrl.searchParams.set('gusto', 'connected');

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Gusto OAuth callback error', error);
    return NextResponse.json({ error: 'Unexpected error during Gusto OAuth callback' }, { status: 500 });
  }
}

