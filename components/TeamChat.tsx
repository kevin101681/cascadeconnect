/**
 * TEAM CHAT TAB (FULL PAGE)
 * Full-height chat interface for the admin dashboard
 * January 3, 2026 - Updated January 13, 2026
 * 
 * Features:
 * - Sidebar + chat window layout
 * - Responsive design
 * - URL-based navigation (fixes back button loop)
 * - Integrates with existing dashboard tabs
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChatWindow } from './chat/ChatWindow';
import { ChatSidebar } from './chat/ChatSidebar';
import { type Channel } from '../services/internalChatService';
import { ChevronLeft } from 'lucide-react';

interface TeamChatProps {
  currentUserId: string;
  currentUserName: string;
  onOpenHomeownerModal?: (homeownerId: string) => void;
}

const TeamChat: React.FC<TeamChatProps> = ({
  currentUserId,
  currentUserName,
  onOpenHomeownerModal,
}) => {
  // URL-based state management (single source of truth)
  const [searchParams, setSearchParams] = useState(() => new URLSearchParams(window.location.search));
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  
  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setSearchParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Helper to update URL search params
  const updateSearchParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    
    const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState({}, '', newUrl);
      setSearchParams(newParams);
    }
  };
  
  // Get selected channel from URL
  const selectedChannelId = searchParams.get('channelId');
  const selectedChannel = useMemo(() => {
    if (!selectedChannelId) return null;
    return allChannels.find(c => c.id === selectedChannelId) || null;
  }, [selectedChannelId, allChannels]);
  
  const activeChat = !!selectedChannel;
  
  // Handle channel selection (update URL instead of local state)
  const handleSelectChannel = (channel: Channel | null) => {
    if (channel === null) {
      updateSearchParams({ channelId: null });
    } else {
      updateSearchParams({ channelId: channel.id });
    }
  };

  return (
    <div className="h-full flex bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`md:flex ${activeChat ? 'hidden' : 'flex w-full'} md:w-64 md:flex-shrink-0 border-r border-gray-200 dark:border-gray-700`}>
        <ChatSidebar
          currentUserId={currentUserId}
          selectedChannelId={selectedChannel?.id || null}
          onSelectChannel={(channel) => {
            // Update URL and track channels for lookup
            if (channel) {
              setAllChannels(prev => {
                const exists = prev.find(c => c.id === channel.id);
                if (!exists) return [...prev, channel];
                return prev;
              });
            }
            handleSelectChannel(channel);
          }}
        />
      </div>

      {/* Main chat area */}
      <div
        className={`md:flex md:static md:inset-auto md:z-auto md:bg-transparent ${activeChat ? 'flex w-full fixed inset-0 z-50 bg-background' : 'hidden'} flex-1 flex-col`}
      >
        {/* Mobile header (Back to List) */}
        {activeChat && (
          <div className="md:hidden h-14 shrink-0 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-white dark:bg-gray-900">
            <button
              type="button"
              onClick={() => handleSelectChannel(null)}
              className="inline-flex items-center gap-2 px-2 py-2 -ml-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg touch-manipulation"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
              aria-label="Back to List"
            >
              <ChevronLeft className="h-5 w-5" />
              Back to List
            </button>
            <div className="min-w-0 flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {selectedChannel?.otherUser?.name || selectedChannel?.name || 'Chat'}
            </div>
          </div>
        )}

        {selectedChannel ? (
          <ChatWindow
            channelId={selectedChannel.id}
            channelName={selectedChannel.otherUser?.name || selectedChannel.name}
            channelType={selectedChannel.type}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onOpenHomeownerModal={onOpenHomeownerModal}
          />
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">Welcome to Team Chat</h3>
              <p>Select a channel or start a direct message to begin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamChat;

