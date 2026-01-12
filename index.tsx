import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { DarkModeProvider } from './components/DarkModeProvider';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GustoSuccessPage from './components/pages/gusto-success';
import { SignIn, SignUp } from '@clerk/clerk-react';

// Load fonts locally (avoids render-blocking Google Fonts CSS)
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/outfit/300.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log('✅ Root element found, creating React root...');
const root = ReactDOM.createRoot(rootElement);
console.log('✅ React root created');

// Get Clerk publishable key from environment variables
// Vite automatically loads .env.local with highest priority
// This will use the production key from .env.local if present
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your .env.local file.");
}

// Log that we're using Clerk (without exposing the key)
console.log('✅ Clerk configured with publishable key from environment');

console.log('✅ Starting app render...');
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClerkProvider 
        publishableKey={PUBLISHABLE_KEY} 
        afterSignOutUrl="/"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        appearance={{
          elements: {
            rootBox: 'w-full',
            modalContent: 'bg-surface dark:bg-gray-800',
            formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-on',
            formFieldInput: 'bg-surface-container dark:bg-gray-700 border-surface-outline-variant text-surface-on',
            footerActionLink: 'text-primary',
            socialButtonsBlockButton: 'hidden', // Hide social login buttons
            dividerLine: 'hidden', // Hide divider
            dividerText: 'hidden', // Hide divider text
          }
        }}
      >
        <DarkModeProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route
                path="/sign-in/*"
                element={<SignIn routing="path" path="/sign-in" />}
              />
              <Route
                path="/sign-up/*"
                element={<SignUp routing="path" path="/sign-up" />}
              />
              <Route path="/gusto-success" element={<GustoSuccessPage />} />

              {/* Protected / main app */}
              <Route path="/*" element={<App />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/sign-in" replace />} />
            </Routes>
          </BrowserRouter>
        </DarkModeProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
