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

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { MessageCircle, X, ArrowLeft } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { ChatSidebar } from './ChatSidebar';
import { getUserChannels, markChannelAsRead, type Channel } from '../../services/internalChatService';
import { getPusherClient } from '../../lib/pusher-client';
import PusherJS from 'pusher-js';

interface ChatWidgetProps {
  effectiveUserId?: string; // Optional - can use homeownerId instead
  effectiveUserName?: string; // Optional - can use homeownerName instead
  homeownerId?: string; // Homeowner-specific ID (used by AppShell)
  homeownerName?: string; // Homeowner-specific name (used by AppShell)
  onOpenHomeownerModal?: (homeownerId: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void; // Alternative to onOpenChange
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  currentUserId,
  currentUserName,
  homeownerId,
  homeownerName,
  onOpenHomeownerModal,
  isOpen: isOpenProp,
  onOpenChange,
  onClose,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Use homeownerId/homeownerName if provided, otherwise fall back to currentUserId/currentUserName
  const effectiveUserId = homeownerId || currentUserId;
  const effectiveUserName = homeownerName || currentUserName;

  // ⚡️ CRITICAL FIX: Use ref to access selectedChannel without causing re-subscriptions
  const selectedChannelRef = useRef<Channel | null>(null);
  
  // Keep ref synced with state
  useEffect(() => {
    selectedChannelRef.current = selectedChannel;
  }, [selectedChannel]);
  
  // Track last sync time to prevent spam
  const lastSyncTimeRef = useRef<number>(0);
  const SYNC_DEBOUNCE_MS = 2000; // Only sync once every 2 seconds

  const isOpen = isOpenProp ?? internalIsOpen;
  const setIsOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalIsOpen(next);
  };

  // Load unread counts
  const loadUnreadCounts = useCallback(async () => {
    // ⚡️ GUARD: Validate effectiveUserId before making API call
    if (!effectiveUserId || effectiveUserId === 'placeholder' || effectiveUserId.length < 10) {
      console.warn('⚠️ Badge Sync: Invalid effectiveUserId, skipping:', effectiveUserId);
      return;
    }

    // ⚡️ DEBOUNCE: Prevent spam - only run once every 2 seconds
    const now = Date.now();
    if (now - lastSyncTimeRef.current < SYNC_DEBOUNCE_MS) {
      console.log('🔒 Badge Sync: Debounced (last sync was', Math.round((now - lastSyncTimeRef.current) / 1000), 'seconds ago)');
      return;
    }
    lastSyncTimeRef.current = now;
    
    try {
      const channels = await getUserChannels(effectiveUserId);
      
      console.log('📊 Badge Sync: Loading unread counts', {
        channelCount: channels.length,
        sampleChannels: channels.slice(0, 3).map(ch => ({
          id: ch.id,
          type: ch.type,
          unreadCount: ch.unreadCount,
          dbId: ch.dbId
        }))
      });
      
      // Build individual channel counts map
      const countsMap: Record<string, number> = {};
      let total = 0;
      
      channels.forEach(ch => {
        const count = ch.unreadCount || 0;
        countsMap[ch.id] = count;
        total += count;
      });
      
      console.log('📊 Badge Sync: Counts map built', {
        totalChannels: Object.keys(countsMap).length,
        totalUnread: total,
        sampleKeys: Object.keys(countsMap).slice(0, 5)
      });
      
      // ⚡️ CRITICAL FIX: Use functional update to preserve real-time Pusher increments
      // Don't blindly overwrite - merge with existing state, keeping higher values
      setUnreadCounts(prev => {
        const merged: Record<string, number> = { ...prev };
        
        // For each channel from database:
        Object.keys(countsMap).forEach(channelId => {
          const dbCount = countsMap[channelId];
          const currentCount = prev[channelId] || 0;
          
          // Keep whichever count is higher (protects real-time increments)
          merged[channelId] = Math.max(dbCount, currentCount);
        });
        
        console.log('📊 Badge Sync: Merged counts (preserving real-time updates)', {
          before: Object.keys(prev).length,
          after: Object.keys(merged).length,
          preserved: Object.keys(prev).filter(id => merged[id] > (countsMap[id] || 0))
        });
        
        return merged;
      });
      
      // Recalculate total from the merged state
      setTotalUnreadCount(Object.values(countsMap).reduce((sum, count) => sum + count, 0));
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  }, [effectiveUserId]); // ⚡️ STABLE: Only depends on userId

  // ⚡️ Load counts ONCE on mount and set up interval
  // CRITICAL: Only depends on effectiveUserId (primitive) to prevent re-subscription loops
  useEffect(() => {
    // Guard: Skip if no valid user ID
    if (!effectiveUserId || effectiveUserId === 'placeholder' || effectiveUserId.length < 10) {
      console.warn('⚠️ ChatWidget: Invalid effectiveUserId, skipping badge sync:', effectiveUserId);
      return;
    }

    // Initial load
    loadUnreadCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(loadUnreadCounts, 30000);
    
    return () => clearInterval(interval);
  }, [effectiveUserId]); // ⚡️ STABLE: Only re-run when userId changes

  // ⚡️ STABLE PUSHER LISTENER: Listen for new messages to update unread count INSTANTLY
  // CRITICAL: Only depends on effectiveUserId - NEVER re-subscribes when selectedChannel changes
  useEffect(() => {
    // Guard: Skip if no valid user ID
    if (!effectiveUserId || effectiveUserId === 'placeholder' || effectiveUserId.length < 10) {
      console.warn('⚠️ ChatWidget: Invalid effectiveUserId, skipping Pusher subscription:', effectiveUserId);
      return;
    }

    // Subscribe to user's PUBLIC channel for targeted notifications
    const channelName = `public-user-${effectiveUserId}`;
    console.log('🔌 [ChatWidget] Setting up STABLE Pusher listener on PUBLIC channel:', channelName);
    
    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName);

    // 1. Define the handler INSIDE the effect
    const handleNewMessage = (data: { 
      channelId: string; 
      message: { 
        id: string;
        senderId: string; 
        senderName: string;
        content: string; 
        createdAt: Date;
      } 
    }) => {
      console.log('⚡️ [ChatWidget] Instant message received via Pusher (public channel):', {
        channelId: data.channelId,
        senderId: data.message.senderId,
        content: data.message.content.substring(0, 50),
        isCurrentUser: data.message.senderId === effectiveUserId
      });

      // If the message is from the current user, don't increment badge
      if (data.message.senderId === effectiveUserId) {
        console.log('⚡️ [ChatWidget] Message is from current user, skipping badge increment');
        return;
      }

      // Use REF to check if we're viewing this channel (avoids stale closure)
      const currentlyViewing = selectedChannelRef.current?.id === data.channelId;
      
      if (currentlyViewing) {
        console.log('⚡️ [ChatWidget] Currently viewing this channel, skipping badge increment');
        return;
      }

      // OPTIMISTIC UPDATE: Increment the badge count instantly using functional update
      setUnreadCounts((prev) => {
        const currentCount = prev[data.channelId] || 0;
        const newCount = currentCount + 1;
        
        console.log('⚡️ [ChatWidget] Instant badge update:', {
          channelId: data.channelId,
          previousCount: currentCount,
          newCount,
          totalBefore: Object.values(prev).reduce((sum, count) => sum + count, 0),
          totalAfter: Object.values(prev).reduce((sum, count) => sum + count, 0) + 1
        });

        return {
          ...prev,
          [data.channelId]: newCount
        };
      });

      // Update total count
      setTotalUnreadCount(prev => prev + 1);
    };

    // 2. Bind SPECIFIC handler to both event names
    channel.bind('new-message', handleNewMessage);
    channel.bind('message:new', handleNewMessage); // Bind both just in case

    return () => {
      // 3. Unbind ONLY this SPECIFIC handler (CRITICAL: Pass the exact function reference)
      console.log('🔌 [ChatWidget] Unbinding specific listener');
      channel.unbind('new-message', handleNewMessage);
      channel.unbind('message:new', handleNewMessage);
      
      // ❌ NEVER CALL: channel.unbind('new-message'); // This wipes ALL listeners!
      // ❌ NEVER CALL: pusher.unsubscribe(channelName); // This kills the connection!
    };
  }, [effectiveUserId]); // ⚡️ CRITICAL: Only depends on userId, NOT selectedChannel or loadUnreadCounts

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
      channelType: channel.type,
      channelName: channel.name,
      dbId: channel.dbId,
      previousUnreadCount: channel.unreadCount,
      storedUnreadCount: unreadCounts[channelId],
      currentTotal: totalUnreadCount,
      allUnreadKeys: Object.keys(unreadCounts).filter(k => unreadCounts[k] > 0)
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
      // ✅ CRITICAL: Use dbId (database UUID) for backend, not deterministic ID
      const backendChannelId = channel.dbId || channel.id;
      
      markChannelAsRead(effectiveUserId, backendChannelId).then(() => {
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
    const me = normalize(effectiveUserName || '');

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
            <span className="absolute -top-1 -right-1 h-6 w-6 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold shadow-sm">
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
                  effectiveUserId={effectiveUserId}
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
                  effectiveUserId={effectiveUserId}
                  effectiveUserName={effectiveUserName}
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

