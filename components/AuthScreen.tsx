
import React, { useState } from 'react';
import Button from './Button';
import { Mail, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { OAuthStrategy } from '@clerk/types';

interface AuthScreenProps {
  // Props are kept for compatibility but logic is now handled by Clerk
}

const AuthScreen: React.FC<AuthScreenProps> = () => {
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
  
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Handle Email/Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        // Handle MFA or other steps if necessary
        console.log("Login step:", result);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.errors?.[0]?.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email/Password Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName
      });

      if (result.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId });
      } else {
        // In a real app, you would redirect to an OTP verification screen here
        // For this implementation, we'll alert the user
        setError("Account created! Please check your email for a verification code (Verification UI not implemented in this demo).");
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.errors?.[0]?.message || "Could not create account.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OAuth (Google/Apple)
  const handleSocialAuth = async (strategy: OAuthStrategy) => {
    if (!isSignInLoaded) return;
    setIsLoading(true);
    setError(null);
    
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (err: any) {
      console.error("Social auth error:", err);
      setError("Connection to provider failed.");
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-surface-container-high rounded-lg px-4 py-3 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all";

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-16 w-16 bg-primary-container rounded-2xl flex items-center justify-center mb-4 shadow-elevation-1">
          <img src="/logo.png" alt="Logo" className="h-12 w-12 object-contain" onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = '<svg class="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
          }} />
        </div>
        <h1 className="text-3xl font-normal text-surface-on tracking-tight text-center">Cascade Connect</h1>
        <p className="text-surface-on-variant mt-2 text-center max-w-sm">
          The premier warranty management platform for builders and homeowners.
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-surface rounded-3xl border border-surface-outline-variant shadow-elevation-2 overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Tabs */}
        <div className="flex border-b border-surface-outline-variant">
          <button 
            onClick={() => { setMode('LOGIN'); setError(null); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${mode === 'LOGIN' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-surface-on-variant hover:bg-surface-container'}`}
          >
            Log In
          </button>
          <button 
            onClick={() => { setMode('SIGNUP'); setError(null); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${mode === 'SIGNUP' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-surface-on-variant hover:bg-surface-container'}`}
          >
            Create Account
          </button>
        </div>

        <div className="p-8 space-y-6">
          
          {error && (
            <div className="bg-error/10 border border-error/20 p-3 rounded-lg flex items-start gap-3 text-error text-sm animate-in fade-in">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={mode === 'LOGIN' ? handleLogin : handleSignup} className="space-y-4">
            {mode === 'SIGNUP' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-surface-on-variant ml-1 uppercase">First Name</label>
                    <input 
                    type="text" 
                    required 
                    className={inputClass}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    />
                </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-surface-on-variant ml-1 uppercase">Last Name</label>
                    <input 
                    type="text" 
                    required 
                    className={inputClass}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-surface-on-variant ml-1 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-outline-variant" />
                <input 
                  type="email" 
                  required 
                  placeholder="name@example.com"
                  className={`${inputClass} pl-10`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-surface-on-variant ml-1 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-outline-variant" />
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className={`${inputClass} pl-10`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            {mode === 'LOGIN' && (
              <div className="flex justify-end">
                <button type="button" className="text-xs font-medium text-primary hover:underline">Forgot Password?</button>
              </div>
            )}

            <Button 
              type="submit" 
              variant="filled" 
              className="w-full !h-12 text-base shadow-none" 
              disabled={isLoading}
              icon={isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
            >
              {mode === 'LOGIN' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-surface-outline-variant" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-surface-on-variant">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => handleSocialAuth('oauth_google')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-surface-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-medium text-surface-on">Google</span>
            </button>

            <button 
              type="button"
              onClick={() => handleSocialAuth('oauth_apple')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-surface-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              <svg className="h-5 w-5 text-surface-on" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              <span className="text-sm font-medium text-surface-on">Apple</span>
            </button>
          </div>

        </div>
        
        {/* Footer */}
        <div className="px-8 py-4 bg-surface-container text-center border-t border-surface-outline-variant">
          <p className="text-xs text-surface-on-variant">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
