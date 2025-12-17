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
      const result = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      // Complete the sign-in process
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Sign-in created but not complete - might need additional steps
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          if (onSuccess) {
            onSuccess();
          }
        } else {
          setError('Sign-in incomplete. Please try again.');
        }
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
