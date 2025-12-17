import React from 'react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/clerk-react';

interface AuthScreenProps {
  // Props are kept for compatibility
}

const AuthScreen: React.FC<AuthScreenProps> = () => {
  // Clerk handles authentication - this component shows sign in/up options

  return (
    <div className="min-h-screen bg-surface dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-20 w-20 bg-primary-container dark:bg-primary/20 rounded-2xl flex items-center justify-center mb-4 shadow-elevation-1 p-4">
          <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = '<svg class="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
          }} />
        </div>
        <h1 className="text-3xl font-normal text-surface-on dark:text-gray-100 tracking-tight text-center">CASCADE CONNECT</h1>
        <p className="text-surface-on-variant dark:text-gray-400 mt-2 text-center max-w-sm">
          The premier warranty management platform for builders and homeowners.
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-2 overflow-hidden animate-in zoom-in-95 duration-300 p-8">
        
        <div className="space-y-6">
          <SignedOut>
            <div className="flex flex-col gap-4">
              <SignInButton mode="modal">
                <button className="w-full bg-primary hover:bg-primary/90 text-primary-on dark:text-white font-medium py-3 px-4 rounded-lg transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="w-full bg-surface-container-high dark:bg-gray-700 hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on dark:text-gray-100 font-medium py-3 px-4 rounded-lg transition-colors border border-surface-outline-variant dark:border-gray-600">
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </SignedOut>
          
          <SignedIn>
            <div className="flex flex-col items-center gap-4">
              <p className="text-surface-on dark:text-gray-100">You are signed in!</p>
              <UserButton />
            </div>
          </SignedIn>
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-surface-outline-variant text-center">
          <p className="text-xs text-surface-on-variant dark:text-gray-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
