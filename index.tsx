import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NoAuthProvider } from './components/NoAuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { DarkModeProvider } from './components/DarkModeProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log('✅ Root element found, creating React root...');
const root = ReactDOM.createRoot(rootElement);
console.log('✅ React root created');

// Check if Better Auth is configured
const BETTER_AUTH_BASE_URL = (import.meta as any).env?.VITE_BETTER_AUTH_URL || 
                             (typeof process !== 'undefined' ? process.env.VITE_BETTER_AUTH_URL : undefined);

const hasBetterAuth = BETTER_AUTH_BASE_URL && !BETTER_AUTH_BASE_URL.includes('placeholder');

if (!hasBetterAuth) {
  console.warn("⚠️ Better Auth not configured. Running in development mode without authentication.");
  console.warn("To enable authentication, set VITE_BETTER_AUTH_URL in your .env.local file.");
  console.warn("Better Auth will use /api/auth endpoint by default.");
}

console.log('✅ Starting app render...');
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <DarkModeProvider>
        <App />
      </DarkModeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
