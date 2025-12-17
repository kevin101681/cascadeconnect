import React, { useEffect, useState } from 'react';
import {
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from '@clerk/clerk-react';
import CustomSignUp from './CustomSignUp';
import CustomSignIn from './CustomSignIn';

interface AuthScreenProps {
  // Props are kept for compatibility
}

const AuthScreen: React.FC<AuthScreenProps> = () => {
  // Clerk handles authentication - this component shows sign in/up options
  const { isSignedIn, isLoaded } = useUser();
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  // Bypass login for testing
  const handleBypassLogin = () => {
    if (typeof window !== 'undefined') {
      // Clear all auth flags to bypass login
      sessionStorage.removeItem('cascade_logged_out');
      sessionStorage.setItem('cascade_bypass_login', 'true');
      // Reload to trigger App.tsx to re-evaluate auth state
      window.location.reload();
    }
  };

  // Redirect to app when user signs in
  useEffect(() => {
    // Only redirect if user is signed in (isLoaded check is less critical here)
    if (isSignedIn) {
      // Clear any logout flags that might prevent access
      if (typeof window !== 'undefined') {
        // Clear all session flags that might block access
        sessionStorage.removeItem('cascade_logged_out');
        sessionStorage.removeItem('cascade_force_login');
        
        console.log('✅ User signed in, redirecting to app...', { isLoaded, isSignedIn });
        setIsRedirecting(true);
        
        // Use a short delay to ensure Clerk's state is fully synced across all components
        // Then force a reload to trigger App.tsx to re-evaluate auth state
        const redirectTimer = setTimeout(() => {
          try {
            console.log('🔄 Reloading page to enter app...');
            // Always reload to ensure App.tsx sees the updated auth state
            window.location.reload();
          } catch (error) {
            console.error('❌ Redirect error:', error);
            // Fallback: try navigation
            window.location.href = '/';
          }
        }, isLoaded ? 200 : 500); // Longer delay if Clerk isn't fully loaded yet
        
        // Cleanup timer if component unmounts
        return () => clearTimeout(redirectTimer);
      }
    }
  }, [isSignedIn, isLoaded]);

  return (
    <div className="min-h-screen bg-surface dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-primary-container dark:bg-primary/20 p-3 rounded-xl border border-surface-outline-variant dark:border-gray-600 shadow-elevation-1 flex items-center justify-center mb-4">
          <img 
            src="/logo.svg" 
            alt="CASCADE CONNECT Logo" 
            className="h-10 w-10 object-contain" 
          />
        </div>
        <img 
          src="/connect.svg" 
          alt="CASCADE CONNECT" 
          className="h-8 object-contain mb-4" 
        />
        <p className="text-surface-on-variant dark:text-gray-400 text-center max-w-sm">
          The premier warranty management platform for builders and homeowners.
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-2 overflow-hidden animate-in zoom-in-95 duration-300 p-8">
        
        <div className="space-y-6">
          <SignedOut>
            {!showSignUp && !showSignIn ? (
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setShowSignIn(true)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-on dark:text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowSignUp(true)}
                  className="w-full bg-surface-container-high dark:bg-gray-700 hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on dark:text-gray-100 font-medium py-3 px-4 rounded-lg transition-colors border border-surface-outline-variant dark:border-gray-600"
                >
                  Create Account
                </button>
                {/* Bypass Login Button for Testing */}
                <button 
                  onClick={handleBypassLogin}
                  className="w-full bg-yellow-500/10 dark:bg-yellow-500/20 hover:bg-yellow-500/20 dark:hover:bg-yellow-500/30 text-yellow-700 dark:text-yellow-400 font-medium py-2 px-4 rounded-lg transition-colors border border-yellow-500/30 dark:border-yellow-500/40 text-sm mt-2"
                >
                  Bypass Login (Testing)
                </button>
              </div>
            ) : showSignIn ? (
              <div>
                <h2 className="text-xl font-medium text-surface-on dark:text-gray-100 mb-4">Sign In</h2>
                <CustomSignIn 
                  onSuccess={() => {
                    setShowSignIn(false);
                    // Redirect will happen automatically via useEffect
                  }}
                  onCancel={() => setShowSignIn(false)}
                />
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-medium text-surface-on dark:text-gray-100 mb-4">Create Account</h2>
                <CustomSignUp 
                  onSuccess={() => {
                    setShowSignUp(false);
                    // Redirect will happen automatically via useEffect
                  }}
                  onCancel={() => setShowSignUp(false)}
                />
              </div>
            )}
          </SignedOut>
          
          <SignedIn>
            <div className="flex flex-col items-center gap-4">
              {isRedirecting ? (
                <>
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-surface-on dark:text-gray-100">Redirecting to app...</p>
                </>
              ) : (
                <>
                  <p className="text-surface-on dark:text-gray-100">You are signed in!</p>
                  <UserButton />
                </>
              )}
            </div>
          </SignedIn>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
