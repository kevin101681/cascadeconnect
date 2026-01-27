/**
 * Standalone Chat Page - PWA Route
 * 
 * Full-screen team chat interface for mobile devices.
 * Can be bookmarked/installed as a standalone PWA.
 * 
 * Route: /mobile-chat
 */

import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { MobileChatView } from '@/components/mobile/MobileChatView';
import { Navigate } from 'react-router-dom';

export const StandaloneChatPage: React.FC = () => {
  const { user, isLoaded } = useUser();

  // Wait for Clerk to load
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  // Render standalone chat (no onBack prop = PWA mode)
  return (
    <MobileChatView
      currentUserId={user.id}
      currentUserName={user.fullName || user.firstName || 'User'}
    />
  );
};

export default StandaloneChatPage;
