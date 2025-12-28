import React from 'react';
import LegalRouter from './LegalRouter';
import { AlertCircle } from 'lucide-react';

/**
 * Wrapper component that renders AuthScreen
 * Clerk handles authentication via ClerkProvider in index.tsx
 */
const AuthScreenWrapper: React.FC = () => {
  // Check if Clerk is configured
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const hasClerk = publishableKey && !publishableKey.includes('placeholder') && !publishableKey.includes('YOUR_PUBLISHABLE_KEY');
  
  // If Clerk is not configured, show a message instead of the login form
  if (!hasClerk) {
    return (
      <div className="min-h-screen bg-surface dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-2 p-8">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mb-4" />
            <h1 className="text-2xl font-normal text-surface-on dark:text-gray-100 mb-2">
              Authentication Not Configured
            </h1>
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-6">
              Clerk is not configured. To enable authentication:
            </p>
            <div className="text-left bg-surface-container dark:bg-gray-700 rounded-lg p-4 w-full">
              <ol className="list-decimal list-inside space-y-2 text-sm text-surface-on dark:text-gray-100">
                <li>Get your Publishable Key from <a href="https://dashboard.clerk.com/last-active?path=api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">Clerk Dashboard</a></li>
                <li>Set <code className="bg-surface-container-high dark:bg-gray-600 px-1.5 py-0.5 rounded">VITE_CLERK_PUBLISHABLE_KEY</code> in your <code className="bg-surface-container-high dark:bg-gray-600 px-1.5 py-0.5 rounded">.env.local</code> file</li>
                <li>Restart your development server</li>
              </ol>
            </div>
            <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-6">
              The app is running in development mode without authentication.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Clerk is configured, safe to render AuthScreen with legal routing
  return <LegalRouter />;
};

export default AuthScreenWrapper;

