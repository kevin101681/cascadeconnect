import { createAuthClient } from "better-auth/react";

// Get the base URL for Better Auth API
// In development, Vite proxies /api/* to localhost:3000, so we use relative URLs
// In production, use the full URL
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin (Vite proxy handles /api/* in dev)
    // In production, this will be the actual domain
    return window.location.origin;
  }
  // Server-side: check environment
  const isLocalDev = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
  return isLocalDev 
    ? 'http://localhost:3000'
    : (process.env.VITE_APP_URL || process.env.BETTER_AUTH_URL || 'https://cascadeconnect.app');
};

// Better Auth client configuration
// Wrap in try-catch to handle initialization errors
let authClient: ReturnType<typeof createAuthClient>;
try {
  authClient = createAuthClient({
    baseURL: getBaseURL(),
    basePath: "/api/auth",
  });
  console.log("✅ Better Auth client initialized");
} catch (error) {
  console.error("❌ Failed to initialize Better Auth client:", error);
  // Create a fallback client that won't crash
  authClient = createAuthClient({
    baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    basePath: "/api/auth",
  });
}

export { authClient };

// Export types for use in components
export type { User, Session } from "better-auth/types";
