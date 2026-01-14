import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { DarkModeProvider } from './components/DarkModeProvider';
import { PostHogProvider } from './components/providers/PostHogProvider';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';
import HomeownerSignUpPage from './components/pages/homeowner-sign-up';
import MaintenancePage from './src/pages/MaintenancePage';

// Initialize Sentry before any other code runs
import { initializeSentry } from './sentry.config';
initializeSentry();

// Load fonts locally (avoids render-blocking Google Fonts CSS)
// Use latin-only subsets to avoid shipping dozens of font files.
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/outfit/latin-300.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-500.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log('✅ Root element found, creating React root...');
const root = ReactDOM.createRoot(rootElement);
console.log('✅ React root created');

function Root() {
  // 1. Define the check & bypass
  const isMaintenance = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  // Allow bypass if ?admin=true is in URL OR if localStorage key exists
  const bypass =
    window.location.search.includes('admin=true') ||
    localStorage.getItem('cascade_maintenance_bypass');

  // 2. Persist bypass key if found in URL (so they don't lose it on reload)
  if (window.location.search.includes('admin=true')) {
    localStorage.setItem('cascade_maintenance_bypass', 'true');
  }

  // 3. The Guard Clause (Return EARLY)
  if (isMaintenance && !bypass) {
    return <MaintenancePage />;
  }

  // 4. The rest of the app...
  // Get Clerk publishable key from environment variables
  // Vite automatically loads .env.local with highest priority
  // This will use the production key from .env.local if present
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!PUBLISHABLE_KEY) {
    throw new Error(
      'Missing Clerk Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your .env.local file.'
    );
  }

  // Log that we're using Clerk (without exposing the key)
  console.log('✅ Clerk configured with publishable key from environment');

  return (
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
          formFieldInput:
            'bg-surface-container dark:bg-gray-700 border-surface-outline-variant text-surface-on',
          footerActionLink: 'text-primary',
          socialButtonsBlockButton: 'hidden', // Hide social login buttons
          dividerLine: 'hidden', // Hide divider
          dividerText: 'hidden', // Hide divider text
        },
      }}
    >
      <DarkModeProvider>
        <BrowserRouter>
          <PostHogProvider>
            <Routes>
              {/* Public routes */}
              <Route
                path="/sign-in/*"
                element={<SignIn routing="path" path="/sign-in" />}
              />
              <Route path="/sign-up/*" element={<HomeownerSignUpPage />} />

              {/* Protected / main app */}
              <Route path="/*" element={<App />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/sign-in" replace />} />
            </Routes>
          </PostHogProvider>
        </BrowserRouter>
      </DarkModeProvider>
    </ClerkProvider>
  );
}

console.log('✅ Starting app render...');
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
);

// Delay Service Worker registration to reduce startup main-thread work.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Delay by ~1.5s so the UI paints first.
    window.setTimeout(() => {
      import('virtual:pwa-register')
        .then(({ registerSW }) => {
          registerSW({ immediate: true });
        })
        .catch((err) => {
          console.warn('PWA registration skipped:', err);
        });
    }, 1500);
  });
}
