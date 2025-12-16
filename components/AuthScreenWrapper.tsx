import React from 'react';
import AuthScreen from './AuthScreen';
import { useNoAuthContext } from './NoAuthProvider';
import { AlertCircle } from 'lucide-react';

/**
 * Wrapper component that renders AuthScreen
 * Better Auth works without a provider, so we can always render AuthScreen
 */
const AuthScreenWrapper: React.FC = () => {
  // Check if database is configured (Better Auth needs database)
  const databaseUrl = (import.meta as any).env?.VITE_DATABASE_URL || 
                     (typeof process !== 'undefined' ? process.env.VITE_DATABASE_URL : undefined);
  
  const hasDatabase = databaseUrl && !databaseUrl.includes('placeholder');
  
  // If database is not configured, show a message instead of the login form
  if (!hasDatabase) {
    return (
      <div className="min-h-screen bg-surface dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-2 p-8">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mb-4" />
            <h1 className="text-2xl font-normal text-surface-on dark:text-gray-100 mb-2">
              Authentication Not Configured
            </h1>
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-6">
              Better Auth is not configured. To enable authentication:
            </p>
            <div className="text-left bg-surface-container dark:bg-gray-700 rounded-lg p-4 w-full">
              <ol className="list-decimal list-inside space-y-2 text-sm text-surface-on dark:text-gray-100">
                <li>Ensure your database connection is configured in <code className="bg-surface-container-high dark:bg-gray-600 px-1.5 py-0.5 rounded">.env.local</code> file</li>
                <li>Better Auth will use the <code className="bg-surface-container-high dark:bg-gray-600 px-1.5 py-0.5 rounded">/api/auth</code> endpoint</li>
                <li>Configure OAuth providers (Google, Apple) if needed in your environment variables</li>
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
  
  // Database is configured, safe to render AuthScreen
  // Note: If you see "connection failed", make sure:
  // 1. The server is running (npm run server or npm run dev)
  // 2. The server is accessible at http://localhost:3000
  // 3. Check browser console for detailed error messages
  return <AuthScreen />;
};

export default AuthScreenWrapper;

