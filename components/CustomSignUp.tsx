import React, { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { db, isDbConfigured } from '../db';
import { homeowners as homeownersTable, users as usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

interface CustomSignUpProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CustomSignUp: React.FC<CustomSignUpProps> = ({ onSuccess, onCancel }) => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Link Clerk account to existing Cascade Connect account
  const linkClerkAccount = async (clerkUserId: string, emailToLink: string): Promise<void> => {
    if (!isDbConfigured) {
      console.log('Database not configured, skipping account linking');
      return;
    }

    try {
      const emailLower = emailToLink.toLowerCase().trim();
      
      // Check homeowners table first
      const homeowners = await db
        .select()
        .from(homeownersTable)
        .where(eq(homeownersTable.email, emailLower))
        .limit(1);
      
      if (homeowners.length > 0) {
        // Update homeowner with Clerk ID
        await db
          .update(homeownersTable)
          .set({ clerkId: clerkUserId })
          .where(eq(homeownersTable.email, emailLower));
        console.log(`✅ Linked Clerk account to homeowner: ${emailLower}`);
        return;
      }

      // Check users table (employees and builders)
      const users = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, emailLower))
        .limit(1);
      
      if (users.length > 0) {
        // Update user with Clerk ID
        await db
          .update(usersTable)
          .set({ clerkId: clerkUserId })
          .where(eq(usersTable.email, emailLower));
        console.log(`✅ Linked Clerk account to user: ${emailLower}`);
        return;
      }

      console.log(`ℹ️ No existing Cascade Connect account found for ${emailLower}, proceeding with new account`);
    } catch (err) {
      console.error('Error linking Clerk account:', err);
      // Don't throw - allow sign-up to proceed even if linking fails
    }
  };

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

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    // Proceed with Clerk sign-up
    // Note: We allow sign-up even if email exists in Cascade Connect - we'll link accounts after sign-up
    try {
      setIsCreating(true);
      await signUp.create({
        emailAddress: email.trim(),
        password: password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      // Complete the sign-up process
      // If email verification is required, Clerk will handle it
      // Otherwise, we can activate the session directly
      if (signUp.status === 'missing_requirements') {
        // If email verification is needed, prepare it
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setError('Please check your email for a verification code.');
        // You could add a verification code input here
        return;
      }

      // If sign-up is complete, link to Cascade Connect account if email exists
      if (signUp.status === 'complete') {
        // Get the Clerk user ID
        const clerkUserId = signUp.createdUserId;
        
        if (clerkUserId) {
          // Link Clerk account to existing Cascade Connect account (if email exists)
          await linkClerkAccount(clerkUserId, email.trim());
        }
        
        // Set the active session
        await setActive({ session: signUp.createdSessionId });
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error('Sign-up error:', err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'Failed to create account. Please try again.';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-1">
          First Name (Optional)
        </label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label htmlFor="lastName" className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-1">
          Last Name (Optional)
        </label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

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
          minLength={8}
          className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="At least 8 characters"
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
          disabled={isCreating || !isLoaded}
          className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-on dark:text-white font-medium rounded-lg transition-colors"
        >
          {isCreating ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};

export default CustomSignUp;
