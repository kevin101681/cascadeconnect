
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';
import ErrorBoundary from './components/ErrorBoundary';

// Robust environment variable access for Vite/Production
// Cast import.meta to any to avoid TS errors in some environments
let PUBLISHABLE_KEY: string | undefined;
try {
  PUBLISHABLE_KEY = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || 
                    (typeof process !== 'undefined' ? process.env.VITE_CLERK_PUBLISHABLE_KEY : undefined);
} catch (e) {
  console.warn("Error accessing environment variables:", e);
  PUBLISHABLE_KEY = undefined;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

if (!PUBLISHABLE_KEY) {
  console.error("Missing Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your .env or Netlify/Vercel settings.");
  root.render(
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
        <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#ba1a1a' }}>Configuration Error</h1>
        <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>
          The Clerk Publishable Key is missing.
        </p>
        <p style={{ fontSize: '14px', color: '#40484c', backgroundColor: '#eceff1', padding: '12px', borderRadius: '8px', fontFamily: 'monospace' }}>
          VITE_CLERK_PUBLISHABLE_KEY
        </p>
        <p style={{ marginTop: '16px', fontSize: '14px', color: '#40484c' }}>
          Please add this key to your <code>.env</code> file or deployment environment variables.
        </p>
      </div>
    </div>
  );
} else {
  try {
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
            <App />
          </ClerkProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Failed to render app:", error);
    root.render(
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
