import React, { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';

interface CustomSignInProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CustomSignIn: React.FC<CustomSignInProps> = ({ onSuccess, onCancel }) => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLoaded) {
      setError('Authentication system is not ready. Please try again.');
      return;
    }

    // Validate inputs
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    // Proceed with Clerk sign-in
    try {
      setIsSigningIn(true);
      
      // Create the sign-in attempt
      const result = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      // Log for debugging
      console.log('Sign-in result:', {
        resultStatus: result.status,
        signInStatus: signIn.status,
        resultSessionId: result.createdSessionId,
        signInSessionId: signIn.createdSessionId,
        result: result,
        signIn: signIn
      });

      // Check the sign-in status after creation
      // The status can be on either the result or the signIn object
      const status = result.status || signIn.status;
      const sessionId = result.createdSessionId || signIn.createdSessionId;
      
      if (status === 'complete') {
        // Sign-in is complete, activate the session
        if (sessionId) {
          await setActive({ session: sessionId });
          if (onSuccess) {
            onSuccess();
          }
        } else {
          // If no session ID but status is complete, try to proceed anyway
          // Clerk might handle session creation automatically
          console.warn('Sign-in complete but no session ID found, attempting to proceed...');
          // Wait a moment for Clerk to finalize the session
          await new Promise(resolve => setTimeout(resolve, 200));
          // Check if we now have a session
          const finalSessionId = signIn.createdSessionId;
          if (finalSessionId) {
            await setActive({ session: finalSessionId });
            if (onSuccess) {
              onSuccess();
            }
          } else {
            setError('Sign-in completed but session could not be activated. Please try again.');
          }
        }
      } else if (status === 'needs_first_factor') {
        // Additional verification required (email code, 2FA, etc.)
        // For now, show an error - in the future we could add verification UI
        setError('Additional verification required. Please check your email or contact support.');
      } else if (status === 'needs_second_factor') {
        // Two-factor authentication required
        setError('Two-factor authentication is currently required. Please contact your administrator to disable 2FA in Clerk settings, or complete the 2FA verification.');
      } else if (sessionId) {
        // If we have a session ID even if status isn't 'complete', try to use it
        console.warn('Sign-in status is not complete but session ID exists, attempting to activate...', { status, sessionId });
        try {
          await setActive({ session: sessionId });
          if (onSuccess) {
            onSuccess();
          }
        } catch (activeError) {
          console.error('Failed to activate session:', activeError);
          setError(`Sign-in incomplete (status: ${status}). Please try again or contact support.`);
        }
      } else {
        // Unknown status - log for debugging
        console.warn('Unexpected sign-in status:', status, { result, signInStatus: signIn.status });
        setError(`Sign-in incomplete (status: ${status || 'unknown'}). Please try again or contact support.`);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'Failed to sign in. Please check your credentials and try again.';
      setError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-1">
          Email <span className="text-error">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="your.email@example.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-1">
          Password <span className="text-error">*</span>
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Enter your password"
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="p-3 bg-error-container dark:bg-red-900/20 border border-error dark:border-red-800 rounded-lg">
          <p className="text-sm text-error dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-surface-container-high dark:bg-gray-700 hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on dark:text-gray-100 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSigningIn || !isLoaded}
          className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-on dark:text-white font-medium rounded-lg transition-colors"
        >
          {isSigningIn ? 'Signing In...' : 'Sign In'}
        </button>
      </div>
    </form>
  );
};

export default CustomSignIn;
