"use client";

import React from 'react';
import { Building2 } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import Button from '../Button';

const GUSTO_AUTH_URL = 'https://api.gusto-demo.com/oauth/authorize';
const GUSTO_SCOPE = 'employees:read payrolls:read';

const clientId =
  import.meta.env.VITE_GUSTO_CLIENT_ID ??
  process.env.NEXT_PUBLIC_GUSTO_CLIENT_ID ??
  process.env.GUSTO_CLIENT_ID;
const redirectUriEnv =
  import.meta.env.VITE_GUSTO_REDIRECT_URI ??
  process.env.NEXT_PUBLIC_GUSTO_REDIRECT_URI ??
  process.env.GUSTO_REDIRECT_URI;

type Props = {
  isConnected?: boolean;
};

export function GustoConnectButton({ isConnected }: Props) {
  const { user } = useUser();

  const authUrl = React.useMemo(() => {
    const dynamicRedirectUri =
      redirectUriEnv ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/.netlify/functions/gusto-callback`
        : undefined);

    if (!clientId || !dynamicRedirectUri || !user?.id) return null;

    const url = new URL(GUSTO_AUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', dynamicRedirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GUSTO_SCOPE);
    url.searchParams.set('state', user.id);
    return url.toString();
  }, [clientId, user?.id]);

  const handleClick = React.useCallback(() => {
    if (!authUrl) {
      console.error('Missing Gusto OAuth env vars: client_id or redirect_uri');
      return;
    }
    window.location.href = authUrl;
  }, [authUrl]);

  return (
    <Button
      variant={isConnected ? 'filled' : 'outlined'}
      className={isConnected ? 'bg-green-600 text-white hover:bg-green-700 border border-green-700' : ''}
      icon={<Building2 className="h-4 w-4" aria-hidden />}
      onClick={handleClick}
      disabled={!authUrl}
    >
      {isConnected ? 'Gusto Connected' : 'Connect Gusto'}
    </Button>
  );
}

export default GustoConnectButton;

