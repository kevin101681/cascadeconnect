"use client";

import React from 'react';
import { Building2 } from 'lucide-react';
import Button from '../Button';

const GUSTO_AUTH_URL = 'https://api.gusto-demo.com/oauth/authorize';
const GUSTO_SCOPE = 'employees:read payrolls:read';

const clientId =
  import.meta.env.VITE_GUSTO_CLIENT_ID ??
  process.env.NEXT_PUBLIC_GUSTO_CLIENT_ID ??
  process.env.GUSTO_CLIENT_ID;
const redirectUri =
  import.meta.env.VITE_GUSTO_REDIRECT_URI ??
  process.env.NEXT_PUBLIC_GUSTO_REDIRECT_URI ??
  process.env.GUSTO_REDIRECT_URI;

export function GustoConnectButton() {
  const authUrl = React.useMemo(() => {
    if (!clientId || !redirectUri) return null;

    const url = new URL(GUSTO_AUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GUSTO_SCOPE);
    return url.toString();
  }, [clientId, redirectUri]);

  const handleClick = React.useCallback(() => {
    if (!authUrl) {
      console.error('Missing Gusto OAuth env vars: client_id or redirect_uri');
      return;
    }
    window.location.href = authUrl;
  }, [authUrl]);

  return (
    <Button
      variant="outlined"
      icon={<Building2 className="h-4 w-4" aria-hidden />}
      onClick={handleClick}
    >
      Connect Gusto
    </Button>
  );
}

export default GustoConnectButton;

