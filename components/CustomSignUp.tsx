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
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Link Clerk account to existing Cascade Connect account
  const linkClerkAccount = async (clerkUserId: string, emailToLink: string, smsConsent: boolean): Promise<void> => {
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
        // Update homeowner with Clerk ID and SMS opt-in
        await db
          .update(homeownersTable)
          .set({ 
            clerkId: clerkUserId,
            smsOptIn: smsConsent
          })
          .where(eq(homeownersTable.email, emailLower));
        console.log(`✅ Linked Clerk account to homeowner: ${emailLower} (SMS opt-in: ${smsConsent})`);
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

    try {
      setIsCreating(true);
      const emailLower = email.trim().toLowerCase();

      // ✅ STEP 1: Check if this email exists in Cascade Connect database
      if (isDbConfigured) {
        let existingAccount = null;
        let accountType = '';

        // Check homeowners table
        const homeowners = await db
          .select()
          .from(homeownersTable)
          .where(eq(homeownersTable.email, emailLower))
          .limit(1);
        
        if (homeowners.length > 0) {
          existingAccount = homeowners[0];
          accountType = 'homeowner';
        } else {
          // Check users table (employees/builders)
          const users = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, emailLower))
            .limit(1);
          
          if (users.length > 0) {
            existingAccount = users[0];
            accountType = users[0].role === 'ADMIN' ? 'employee' : 'builder';
          }
        }

        // ❌ If email NOT in database, reject signup
        if (!existingAccount) {
          setError('This email address is not recognized. Please contact support or use the email address from your invitation.');
          return;
        }

        // ✅ If already linked to Clerk, they should sign in instead
        if (existingAccount.clerkId) {
          setError('This account already exists. Please use "Sign In" instead.');
          return;
        }

        console.log(`✅ Email verified in database as ${accountType}: ${emailLower}`);
      }

      // ✅ STEP 2: Create Clerk account (now that we've verified they should have access)
      await signUp.create({
        emailAddress: email.trim(),
        password: password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      // ✅ STEP 3: Handle verification if needed
      if (signUp.status === 'missing_requirements') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setError('Please check your email for a verification code.');
        return;
      }

      // ✅ STEP 4: Link Clerk account to Cascade Connect account
      if (signUp.status === 'complete') {
        const clerkUserId = signUp.createdUserId;
        
        if (clerkUserId) {
          await linkClerkAccount(clerkUserId, email.trim(), smsOptIn);
        }
        
        // Set the active session
        await setActive({ session: signUp.createdSessionId });
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error('Sign-up error:', err);
      
      // Handle specific Clerk errors
      if (err.errors && err.errors.length > 0) {
        const clerkError = err.errors[0];
        
        // If Clerk says email is taken, explain what that means
        if (clerkError.code === 'form_identifier_exists') {
          setError('This email already has an account. Please use "Sign In" instead, or contact support if you need help.');
          return;
        }
        
        setError(clerkError.message || 'Failed to create account. Please try again.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg">
        <p className="text-sm text-surface-on dark:text-gray-100">
          <strong>Creating your account?</strong> Enter the email address from your invitation to link your account.
        </p>
      </div>

      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-1">
          First Name
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
          Last Name
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
          Email from Your Invitation <span className="text-error">*</span>
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
        <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
          This must match the email address you were invited with
        </p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-1">
          Create a Password <span className="text-error">*</span>
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

      <div className="flex items-start gap-3 p-4 bg-surface-container/50 dark:bg-gray-700/50 rounded-lg border border-surface-outline-variant dark:border-gray-600">
        <input
          type="checkbox"
          id="smsOptIn"
          checked={smsOptIn}
          onChange={(e) => setSmsOptIn(e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-surface-outline dark:border-gray-600 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
        />
        <label htmlFor="smsOptIn" className="text-sm text-surface-on dark:text-gray-100 cursor-pointer select-none">
          <span className="font-medium">Receive SMS notifications</span>
          <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
            I consent to receive text messages about my warranty claims, appointments, and important updates. Message and data rates may apply. You can opt out at any time.
          </p>
        </label>
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
