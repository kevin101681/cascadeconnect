"use client";

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import Button from '../Button';

const GustoSuccessPage: React.FC = () => {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-surface dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center text-surface-on-variant dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  const handleClick = () => {
    if (isSignedIn) {
      window.location.href = '/dashboard?tab=payroll';
    } else {
      window.location.href = '/sign-in?redirect_url=/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 p-8 text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-semibold text-surface-on dark:text-gray-100">
          Gusto Connected Successfully!
        </h1>
        <p className="text-sm text-surface-on-variant dark:text-gray-300">
          Your payroll data is now syncing.
        </p>
        <div className="pt-2">
          <Button
            variant="filled"
            className="w-full"
            onClick={handleClick}
          >
            {isSignedIn ? 'Return to Dashboard' : 'Log In to View Data'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GustoSuccessPage;

