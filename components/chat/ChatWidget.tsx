/**
 * CHAT WIDGET (FLOATING POPUP)
 * Persistent bottom-right chat widget - Material 3 Design
 * January 6, 2026
 * 
 * Features:
 * - Collapsible FAB (Floating Action Button)
 * - Shows user list when opened
 * - Opens chat on user selection
 * - Material 3 color scheme
 * - Responsive: Full screen on mobile, popover on desktop
 */

import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, X, ArrowLeft } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { ChatSidebar } from './ChatSidebar';
import { getUserChannels, type Channel } from '../../services/internalChatService';
import { getPusherClient } from '../../lib/pusher-client';

interface ChatWidgetProps {
  currentUserId: string;
  currentUserName: string;
  onOpenHomeownerModal?: (homeownerId: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  currentUserId,
  currentUserName,
  onOpenHomeownerModal,
  isOpen: isOpenProp,
  onOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const isOpen = isOpenProp ?? internalIsOpen;
  const setIsOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalIsOpen(next);
  };

  // Load unread counts
  const loadUnreadCounts = useCallback(async () => {
    try {
      const channels = await getUserChannels(currentUserId);
      const total = channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0);
      setTotalUnreadCount(total);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadUnreadCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(loadUnreadCounts, 30000);
    
    return () => clearInterval(interval);
  }, [loadUnreadCounts]);

  // Listen for new messages to update unread count
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe('team-chat');

    channel.bind('new-message', () => {
      loadUnreadCounts();
    });

    return () => {
      channel.unbind('new-message');
      pusher.unsubscribe('team-chat');
    };
  }, [loadUnreadCounts]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSelectedChannel(null); // Reset selection when opening
      loadUnreadCounts();
    }
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    // ✅ Immediately refresh counts (ChatWindow will call markChannelAsRead)
    // Add a small delay to allow markChannelAsRead to complete
    setTimeout(loadUnreadCounts, 500);
  };

  const handleBack = () => {
    setSelectedChannel(null);
  };

  return (
    <>
      {/* Floating Action Button - Standard outline style */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="fixed bottom-4 right-4 z-50 h-14 w-14 bg-white hover:bg-gray-50 text-primary border-2 border-primary rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <MessageCircle className="h-6 w-6" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-sm">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Popup - Responsive: Full screen mobile, popover desktop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 w-full h-full bg-surface dark:bg-gray-900 rounded-none shadow-none border-0 flex flex-col overflow-hidden sm:bottom-4 sm:right-4 sm:inset-auto sm:w-[400px] sm:h-[600px] sm:rounded-3xl sm:shadow-elevation-5 sm:border sm:border-surface-outline-variant dark:sm:border-gray-700">
          {/* Header - Material 3 surface colors */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container dark:bg-gray-800 border-b border-surface-outline-variant dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              {selectedChannel && (
                <button
                  onClick={handleBack}
                  className="p-1.5 hover:bg-surface-container-high dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Back to users"
                >
                  <ArrowLeft className="h-5 w-5 text-surface-on dark:text-gray-200" />
                </button>
              )}
              <MessageCircle className="h-5 w-5 text-primary" />
              <span className="font-semibold text-surface-on dark:text-gray-100">
                {selectedChannel ? (selectedChannel.otherUser?.name || selectedChannel.name) : 'Team Chat'}
              </span>
            </div>
            <button
              onClick={handleToggle}
              className="p-2 hover:bg-surface-container-high dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Close chat"
            >
              <X className="h-6 w-6 text-surface-on-variant dark:text-gray-400 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {!selectedChannel ? (
              // User List View
              <div className="w-full">
                <ChatSidebar
                  currentUserId={currentUserId}
                  selectedChannelId={null}
                  onSelectChannel={handleSelectChannel}
                  isCompact
                />
              </div>
            ) : (
              // Chat View
              <div className="flex-1">
                <ChatWindow
                  channelId={selectedChannel.id}
                  channelName={selectedChannel.otherUser?.name || selectedChannel.name}
                  channelType={selectedChannel.type}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  onOpenHomeownerModal={onOpenHomeownerModal}
                  isCompact
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

