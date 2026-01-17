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
import { getUserChannels, markChannelAsRead, type Channel } from '../../services/internalChatService';
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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const isOpen = isOpenProp ?? internalIsOpen;
  const setIsOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalIsOpen(next);
  };

  // Load unread counts
  const loadUnreadCounts = useCallback(async () => {
    try {
      const channels = await getUserChannels(currentUserId);
      
      // Build individual channel counts map
      const countsMap: Record<string, number> = {};
      let total = 0;
      
      channels.forEach(ch => {
        const count = ch.unreadCount || 0;
        countsMap[ch.id] = count;
        total += count;
      });
      
      setUnreadCounts(countsMap);
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
    const channelId = channel.id;
    
    console.log('🔔 Badge Clear: Selecting channel', {
      channelId,
      channelName: channel.name,
      previousUnreadCount: channel.unreadCount,
      storedUnreadCount: unreadCounts[channelId],
      currentTotal: totalUnreadCount
    });
    
    // ⚡️ STEP 1: OPTIMISTIC UPDATE - Clear badge INSTANTLY (before anything else)
    const amountToClear = unreadCounts[channelId] || 0;
    
    if (amountToClear > 0) {
      // Clear this specific channel's count
      setUnreadCounts((prev) => {
        // If it's already 0, do nothing (saves a render)
        if (!prev[channelId]) return prev;
        
        // Otherwise, return a new object with this specific channel set to 0
        return {
          ...prev,
          [channelId]: 0
        };
      });
      
      // Update the Global Counter (Red Badge) immediately
      setTotalUnreadCount((prev) => {
        const newTotal = Math.max(0, prev - amountToClear);
        console.log('🔔 Badge Clear: Optimistic update', {
          previousTotal: prev,
          clearingAmount: amountToClear,
          newTotal
        });
        return newTotal;
      });
    }
    
    // ⚡️ STEP 2: Set active channel (UI update)
    setSelectedChannel(channel);
    
    // ⚡️ STEP 3: Call backend API (don't await - fire and forget)
    if (amountToClear > 0) {
      markChannelAsRead(currentUserId, channelId).then(() => {
        console.log('✅ Badge Clear: Server confirmed read');
      }).catch(err => {
        console.error('❌ Badge Clear: Server error:', err);
        // On error, refresh from server to get accurate count
        loadUnreadCounts();
      });
    }
    
    // ⚡️ STEP 4: Server confirmation (delayed sync)
    setTimeout(() => {
      console.log('🔄 Badge Clear: Confirming with server...');
      loadUnreadCounts();
    }, 500);
  };

  const handleBack = () => {
    setSelectedChannel(null);
  };

  const getRecipientLabel = (channel: Channel): string => {
    if (channel.otherUser?.name) return channel.otherUser.name;

    const raw = channel.name || '';
    const normalize = (s: string) => s.trim().toLowerCase();
    const me = normalize(currentUserName || '');

    // Common naming pattern: "Me & Recipient"
    const byAmp = raw.split('&').map((p) => p.trim()).filter(Boolean);
    if (byAmp.length === 2) {
      const [a, b] = byAmp;
      if (me && normalize(a) === me) return b;
      if (me && normalize(b) === me) return a;
    }

    // Alternative: "Me and Recipient"
    const byAnd = raw.split(/\s+and\s+/i).map((p) => p.trim()).filter(Boolean);
    if (byAnd.length === 2) {
      const [a, b] = byAnd;
      if (me && normalize(a) === me) return b;
      if (me && normalize(b) === me) return a;
    }

    return raw;
  };

  return (
    <>
      {/* Floating Action Button - Standard outline style */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="fixed bottom-4 right-4 z-[9999] h-14 w-14 bg-white hover:bg-gray-50 text-primary border-2 border-primary rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
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
        <div className="fixed inset-0 z-[9999] w-full h-full bg-surface dark:bg-gray-900 rounded-none shadow-none border-0 flex flex-col overflow-hidden sm:bottom-4 sm:right-4 sm:inset-auto sm:w-[400px] sm:h-[600px] sm:rounded-3xl sm:shadow-elevation-5 sm:border sm:border-surface-outline-variant dark:sm:border-gray-700">
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
                {selectedChannel ? getRecipientLabel(selectedChannel) : 'Team Chat'}
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
                  unreadCountsOverride={unreadCounts}
                  isCompact
                />
              </div>
            ) : (
              // Chat View
              <div className="flex-1">
                <ChatWindow
                  channelId={selectedChannel.id}
                  channelName={getRecipientLabel(selectedChannel)}
                  channelType={selectedChannel.type}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  onOpenHomeownerModal={onOpenHomeownerModal}
                  onMarkAsRead={loadUnreadCounts}
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

