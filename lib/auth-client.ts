import { createAuthClient } from "better-auth/react";

// Get the Better Auth base URL from environment variables
// This should be your Neon Auth URL from the Neon dashboard
const baseURL = 
  (import.meta as any).env?.VITE_NEON_AUTH_URL || 
  (typeof process !== 'undefined' ? process.env.VITE_NEON_AUTH_URL : undefined) ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

// Create the Better Auth client
// This client will be used throughout the React app
export const authClient = createAuthClient({
  baseURL: baseURL,
});

// Better Auth client methods are accessed directly from authClient
// Example: authClient.signIn.email(), authClient.signUp.email(), authClient.signOut()
// For React hooks, use the client methods directly in components
