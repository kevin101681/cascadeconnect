/**
 * Mobile Chat View - Standalone Team Chat Component
 * 
 * Full-screen chat interface with:
 * - Stack navigation (Channel List → Chat Window)
 * - Optional back button for dashboard mode
 * - Standalone PWA support
 */

import React, { Suspense, useState } from 'react';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import type { Channel } from '@/services/internalChatService';

// Lazy load chat components
const ChatSidebar = React.lazy(() =>
  import('../chat/ChatSidebar').then(m => ({ default: m.ChatSidebar }))
);
const ChatWindow = React.lazy(() =>
  import('../chat/ChatWindow').then(m => ({ default: m.ChatWindow }))
);

interface MobileChatViewProps {
  /** Optional back handler - if provided, shows back arrow in header */
  onBack?: () => void;
  /** Current user ID */
  currentUserId?: string;
  /** Current user name */
  currentUserName?: string;
}

export const MobileChatView: React.FC<MobileChatViewProps> = ({
  onBack,
  currentUserId = 'admin',
  currentUserName = 'Admin',
}) => {
  const [activeTeamChannelId, setActiveTeamChannelId] = useState<string | null>(null);

  const handleClose = () => {
    if (onBack) {
      // Dashboard mode - call back handler
      onBack();
    } else {
      // Standalone mode - go back in browser history
      window.history.back();
    }
  };

  const handleChannelBack = () => {
    setActiveTeamChannelId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-0 overflow-hidden">
        <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Left: Back to channels (when in chat) OR Back to dashboard (when provided) */}
            {activeTeamChannelId ? (
              <button
                type="button"
                onClick={handleChannelBack}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Back to channels"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <div className="w-9" /> /* Spacer for alignment */
            )}

            {/* Center: Title */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1 text-center">
              {activeTeamChannelId ? 'Chat' : 'Team Chat'}
            </h2>

            {/* Right: Close button (only in dashboard mode) */}
            {onBack ? (
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <div className="w-9" /> /* Spacer for alignment */
            )}
          </div>

          {/* Content - Stack Navigation */}
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            }>
              {!activeTeamChannelId ? (
                /* LIST VIEW: Channel List */
                <ChatSidebar
                  effectiveUserId={currentUserId}
                  selectedChannelId={null}
                  onSelectChannel={(channel: Channel) => {
                    console.log('Team channel selected:', channel.id);
                    setActiveTeamChannelId(channel.id);
                  }}
                  isCompact={false}
                />
              ) : (
                /* DETAIL VIEW: Chat Window */
                <ChatWindow
                  channelId={activeTeamChannelId}
                  channelName="Team Chat"
                  channelType="public"
                  effectiveUserId={currentUserId}
                  effectiveUserName={currentUserName}
                  onMarkAsRead={() => console.log('Mark as read')}
                  isCompact={false}
                />
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileChatView;
