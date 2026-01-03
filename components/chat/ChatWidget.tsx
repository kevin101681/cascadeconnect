/**
 * CHAT WIDGET (FLOATING POPUP)
 * Persistent bottom-right chat widget
 * January 3, 2026
 * 
 * Features:
 * - Collapsible FAB (Floating Action Button)
 * - Popover card with chat interface
 * - Persists across navigation
 * - Shows unread count badge
 */

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Minimize2 } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { ChatSidebar } from './ChatSidebar';
import { getUserChannels, type Channel } from '../../services/internalChatService';
import { getPusherClient } from '../../lib/pusher-client';

interface ChatWidgetProps {
  currentUserId: string;
  currentUserName: string;
  onOpenHomeownerModal?: (homeownerId: string) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  currentUserId,
  currentUserName,
  onOpenHomeownerModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);

  // Load unread counts
  const loadUnreadCounts = async () => {
    try {
      const channels = await getUserChannels(currentUserId);
      const total = channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0);
      setTotalUnreadCount(total);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  };

  useEffect(() => {
    loadUnreadCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(loadUnreadCounts, 30000);
    
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Listen for new messages to update unread count
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe('private-team-chat');

    channel.bind('new-message', () => {
      loadUnreadCounts();
    });

    return () => {
      channel.unbind('new-message');
      pusher.unsubscribe('private-team-chat');
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadUnreadCounts();
    }
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setShowSidebar(false); // Hide sidebar on mobile after selecting
    loadUnreadCounts(); // Refresh counts
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="fixed bottom-4 right-4 z-50 h-14 w-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        >
          <MessageCircle className="h-6 w-6" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-500 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">Team Chat</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedChannel && (
                <button
                  onClick={() => {
                    setSelectedChannel(null);
                    setShowSidebar(true);
                  }}
                  className="p-1 hover:bg-blue-600 rounded transition-colors"
                  title="Back to channels"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleToggle}
                className="p-1 hover:bg-blue-600 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar - only show if no channel selected or on larger screens */}
            {(!selectedChannel || showSidebar) && (
              <div className={`${selectedChannel ? 'hidden md:block' : 'block'} w-full md:w-48 border-r border-gray-200 dark:border-gray-700`}>
                <ChatSidebar
                  currentUserId={currentUserId}
                  selectedChannelId={selectedChannel?.id || null}
                  onSelectChannel={handleSelectChannel}
                  isCompact
                />
              </div>
            )}

            {/* Chat window */}
            {selectedChannel ? (
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
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Select a channel to start chatting
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

