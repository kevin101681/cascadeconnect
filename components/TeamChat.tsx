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
    
    // ✅ CRITICAL: Always preserve view=chat when in TeamChat component
    if (!newParams.has('view')) {
      newParams.set('view', 'chat');
    }
    
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

  // Helper to extract just the other person's name from channel name
  const getOtherPersonName = (channel: Channel | null): string => {
    if (!channel) return 'Chat';
    
    // Prefer otherUser.name if available
    if (channel.otherUser?.name) {
      return channel.otherUser.name;
    }
    
    // If channel name includes current user, extract the other person
    const channelName = channel.name || '';
    const currentName = currentUserName.trim().toLowerCase();
    
    // Try splitting by '&' or 'and'
    const parts = channelName.split(/\s*[&]\s*|\s+and\s+/i).map(p => p.trim());
    
    if (parts.length === 2) {
      const [first, second] = parts;
      // Return the name that doesn't match current user
      if (first.toLowerCase() === currentName) return second;
      if (second.toLowerCase() === currentName) return first;
    }
    
    // Fallback to full channel name
    return channelName;
  };

  return (
    <div className="h-full flex bg-white dark:bg-gray-900">
      {/* Sidebar - Full width on mobile, fixed width on desktop */}
      <div className={`${activeChat ? 'hidden' : 'flex w-full'} md:flex md:w-full md:max-w-sm md:flex-shrink-0 border-r border-gray-200 dark:border-gray-700`}>
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
        {selectedChannel ? (
          <ChatWindow
            channelId={selectedChannel.id}
            channelName={getOtherPersonName(selectedChannel)}
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

