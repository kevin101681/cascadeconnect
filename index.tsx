
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StackProvider, StackClientApp } from '@stackframe/react';
import { NoAuthProvider } from './components/NoAuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { DarkModeProvider } from './components/DarkModeProvider';

// Robust environment variable access for Vite/Production
// Cast import.meta to any to avoid TS errors in some environments
let NEON_AUTH_BASE_URL: string | undefined;
let STACK_PUBLISHABLE_CLIENT_KEY: string | undefined;
try {
  NEON_AUTH_BASE_URL = (import.meta as any).env?.VITE_NEON_AUTH_URL || 
                       (typeof process !== 'undefined' ? process.env.VITE_NEON_AUTH_URL : undefined);
  // Publishable client key might be provided separately or need to be fetched
  STACK_PUBLISHABLE_CLIENT_KEY = (import.meta as any).env?.VITE_STACK_PUBLISHABLE_CLIENT_KEY || 
                                  (typeof process !== 'undefined' ? process.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY : undefined);
} catch (e) {
  console.warn("Error accessing environment variables:", e);
  NEON_AUTH_BASE_URL = undefined;
  STACK_PUBLISHABLE_CLIENT_KEY = undefined;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log('✅ Root element found, creating React root...');
const root = ReactDOM.createRoot(rootElement);
console.log('✅ React root created');

// BYPASS NEON AUTH CHECK FOR DEVELOPMENT - App will work without authentication
// If you want to enable Neon Auth, set VITE_NEON_AUTH_URL (base URL) in .env.local
// Optionally also set VITE_STACK_PUBLISHABLE_CLIENT_KEY if available in Neon dashboard
try {
  const hasValidBaseUrl = NEON_AUTH_BASE_URL && !NEON_AUTH_BASE_URL.includes('placeholder');
  
  if (!hasValidBaseUrl) {
    console.warn("Running in development mode without Neon Auth. Set VITE_NEON_AUTH_URL to enable auth.");
  }
  
  // Extract project ID from the base URL
  // Neon Auth base URL formats:
  // 1. https://api.stack-auth.com/api/v1/projects/{projectId} (path-based)
  // 2. https://ep-{projectId}.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth (subdomain-based)
  let projectId: string | undefined;
  
  if (hasValidBaseUrl && NEON_AUTH_BASE_URL) {
    try {
      const urlObj = new URL(NEON_AUTH_BASE_URL);
      
      // Try path-based format first (e.g., /api/v1/projects/proj-xxx)
      const pathMatch = urlObj.pathname.match(/\/projects\/([^\/]+)/);
      if (pathMatch) {
        projectId = pathMatch[1];
      } else {
        // Try subdomain-based format (e.g., ep-quiet-tree-afi2a9ur.neonauth...)
        const hostname = urlObj.hostname;
        const subdomainMatch = hostname.match(/^ep-([^.]+)\.neonauth/);
        if (subdomainMatch) {
          projectId = subdomainMatch[1];
        }
      }
    } catch (e) {
      console.warn("Could not parse Neon Auth base URL:", e);
    }
  }
  
  // Use publishableClientKey from environment if provided, otherwise use projectId as fallback
  // Note: StackProvider requires a StackClientApp instance
  // The publishableClientKey should be available in Neon dashboard (check API keys section)
  const publishableClientKey = STACK_PUBLISHABLE_CLIENT_KEY || projectId;
  
  // Create StackClientApp instance if we have the required credentials
  let stackApp: StackClientApp | undefined;
  if (hasValidBaseUrl && projectId && publishableClientKey) {
    try {
      stackApp = new StackClientApp({
        projectId,
        publishableClientKey,
        tokenStore: "memory",
      });
    } catch (e) {
      console.error("Failed to create StackClientApp:", e);
    }
  } else if (hasValidBaseUrl && projectId) {
    // Try with projectId as publishableClientKey (some setups allow this)
    try {
      stackApp = new StackClientApp({
        projectId,
        publishableClientKey: projectId,
        tokenStore: "memory",
      });
      console.warn("Neon Auth configured with project ID:", projectId);
      console.warn("If authentication doesn't work, add VITE_STACK_PUBLISHABLE_CLIENT_KEY to .env.local");
    } catch (e) {
      console.error("Failed to create StackClientApp:", e);
    }
  }
  
  console.log('✅ Starting app render...');
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <DarkModeProvider>
          {stackApp ? (
            <StackProvider app={stackApp}>
              <App />
            </StackProvider>
          ) : hasValidBaseUrl && !projectId ? (
            // If we have base URL but couldn't extract project ID, log for debugging
            (() => {
              console.warn("Neon Auth base URL provided but couldn't extract project ID. URL:", NEON_AUTH_BASE_URL);
              console.warn("Supported URL formats:");
              console.warn("  1. Path-based: https://api.stack-auth.com/api/v1/projects/{projectId}");
              console.warn("  2. Subdomain-based: https://ep-{projectId}.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth");
              return (
                <NoAuthProvider>
                  <App />
                </NoAuthProvider>
              );
            })()
          ) : hasValidBaseUrl && projectId && !stackApp ? (
            // If we have base URL and project ID but couldn't create app, log for debugging
            (() => {
              console.warn("Neon Auth base URL and project ID provided but couldn't create StackClientApp. URL:", NEON_AUTH_BASE_URL);
              console.warn("Supported URL formats:");
              console.warn("  1. Path-based: https://api.stack-auth.com/api/v1/projects/{projectId}");
              console.warn("  2. Subdomain-based: https://ep-{projectId}.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth");
              console.warn("If authentication doesn't work, add VITE_STACK_PUBLISHABLE_CLIENT_KEY to .env.local");
              return (
                <NoAuthProvider>
                  <App />
                </NoAuthProvider>
              );
            })()
          ) : (
            <NoAuthProvider>
              <App />
            </NoAuthProvider>
          )}
        </DarkModeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error("❌ Failed to render app:", error);
  console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
  
  // Make sure root exists before trying to render error
  if (!rootElement) {
    document.body.innerHTML = `
      <div style="display: flex; height: 100vh; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; text-align: center;">
        <div>
          <h1 style="color: #ba1a1a;">Critical Error</h1>
          <p>Could not find root element. Check index.html.</p>
          <pre style="text-align: left; background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 10px;">${error instanceof Error ? error.toString() : String(error)}</pre>
        </div>
      </div>
    `;
  } else {
    const errorRoot = ReactDOM.createRoot(rootElement);
    errorRoot.render(
    <div style={{
      display: 'flex',
      height: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f4f6',
      color: '#171c1f',
      fontFamily: 'sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#ba1a1a' }}>Application Error</h1>
        <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>
          The application failed to load. Please check the browser console for details.
        </p>
        <details style={{ marginTop: '16px', textAlign: 'left' }}>
          <summary style={{ cursor: 'pointer', color: '#40484c', marginBottom: '8px' }}>Error details</summary>
          <pre style={{
            fontSize: '12px',
            color: '#40484c',
            backgroundColor: '#eceff1',
            padding: '12px',
            borderRadius: '8px',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            {error instanceof Error ? error.toString() : String(error)}
          </pre>
        </details>
      </div>
    </div>
    );
  }
}
