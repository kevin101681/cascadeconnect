
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';

// Robust environment variable access for Vite/Production
// Cast import.meta to any to avoid TS errors in some environments
const PUBLISHABLE_KEY = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;

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
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}
