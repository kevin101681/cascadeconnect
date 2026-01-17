/**
 * CHAT SIDEBAR COMPONENT
 * Direct messages list with auto-discovery
 * January 3, 2026
 * 
 * Features:
 * - Auto-discovered DM list (all team members)
 * - Unread counts
 * - Material 3 design
 * - No public channels (DMs only)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Users, Loader2, MessageSquare, Search } from 'lucide-react';
import {
  getUserChannels,
  getAllTeamMembers,
  findOrCreateDmChannel,
  type Channel,
} from '../../services/internalChatService';
import { getPusherClient } from '../../lib/pusher-client';

interface ChatSidebarProps {
  currentUserId: string;
  selectedChannelId: string | null;
  onSelectChannel: (channel: Channel) => void;
  isCompact?: boolean;
  unreadCountsOverride?: Record<string, number>; // ✅ For optimistic updates from parent
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentUserId,
  selectedChannelId,
  onSelectChannel,
  isCompact = false,
  unreadCountsOverride,
}) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [teamMembers, setTeamMembers] = useState<
    Array<{ id: string; name: string; email: string; internalRole?: string }>
  >([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [isCreatingDm, setIsCreatingDm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ⚡️ CRITICAL FIX: Use ref to access selectedChannelId without causing re-subscriptions
  const selectedChannelIdRef = useRef<string | null>(null);
  
  // Keep ref synced with prop
  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId]);

  // Load user's channels (only DMs)
  const loadChannels = async () => {
    try {
      setIsLoadingChannels(true);
      const userChannels = await getUserChannels(currentUserId);
      // Filter to only show DM channels and sort by most recent activity
      const dmChannels = userChannels
        .filter(ch => ch.type === 'dm')
        .sort((a, b) => {
          const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
      setChannels(dmChannels);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Load team members for DM auto-discovery
  const loadTeamMembers = async () => {
    try {
      setIsLoadingTeam(true);
      const members = await getAllTeamMembers();
      
      console.log('👥 [ChatSidebar] Team members loaded:', {
        count: members.length,
        currentUserId,
        members: members.map(m => ({ id: m.id, name: m.name }))
      });
      
      // Keep all members (including current user for name lookups), but we'll filter for display
      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  useEffect(() => {
    loadChannels();
    loadTeamMembers();
  }, [currentUserId]);

  // ⚡️ STABLE PUSHER LISTENER: Listen for new messages via Pusher
  // CRITICAL: Only depends on currentUserId - NEVER re-subscribes when channels change
  useEffect(() => {
    if (!currentUserId) return;

    // Subscribe to user's PUBLIC channel for targeted notifications
    const channelName = `public-user-${currentUserId}`;
    console.log('🔌 [ChatSidebar] Setting up STABLE Pusher listener on PUBLIC channel:', channelName);
    
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
      };
    }) => {
      console.log('⚡️ [ChatSidebar] Instant message received (public channel):', {
        channelId: data.channelId,
        senderId: data.message.senderId,
        content: data.message.content.substring(0, 50)
      });

      // Use REF to check active channel (avoids stale closure)
      const currentActiveId = selectedChannelIdRef.current;
      const isChatOpen = currentActiveId === data.channelId;

      // OPTIMISTIC UPDATE: Update the channel list instantly using functional update
      setChannels((prevChannels) => {
        const channelIndex = prevChannels.findIndex(ch => ch.id === data.channelId);
        
        if (channelIndex === -1) {
          console.log('⚡️ [ChatSidebar] Channel not in list, will be added on next load');
          return prevChannels;
        }

        const updatedChannels = [...prevChannels];
        const existingChannel = updatedChannels[channelIndex];

        // Update the channel with new last message
        updatedChannels[channelIndex] = {
          ...existingChannel,
          lastMessage: {
            content: data.message.content,
            senderName: data.message.senderName,
            createdAt: new Date(data.message.createdAt)
          }
        };

        // Sort channels by most recent message (WhatsApp style)
        updatedChannels.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        console.log('⚡️ [ChatSidebar] Channel moved to top:', {
          channelId: data.channelId,
          newPosition: updatedChannels.findIndex(ch => ch.id === data.channelId)
        });

        return updatedChannels;
      });
    };

    // 2. Bind SPECIFIC handler to both event names
    channel.bind('new-message', handleNewMessage);
    channel.bind('message:new', handleNewMessage); // Bind both just in case

    return () => {
      // 3. Unbind ONLY this SPECIFIC handler (CRITICAL: Pass the exact function reference)
      console.log('🔌 [ChatSidebar] Unbinding specific listener');
      channel.unbind('new-message', handleNewMessage);
      channel.unbind('message:new', handleNewMessage);
      
      // ❌ NEVER CALL: channel.unbind('new-message'); // This wipes ALL listeners!
      // ❌ NEVER CALL: pusher.unsubscribe(channelName); // This kills the connection!
    };
  }, [currentUserId]); // ⚡️ CRITICAL: Only depends on userId, NOT channels or selectedChannelId

  // Handle DM click: find or create channel
  const handleDmClick = async (userId: string, userName: string) => {
    try {
      setIsCreatingDm(true);
      
      // Check if DM channel already exists
      const existingDm = channels.find(
        (ch) =>
          ch.type === 'dm' &&
          ch.dmParticipants?.includes(userId) &&
          ch.dmParticipants?.includes(currentUserId)
      );

      if (existingDm) {
        onSelectChannel(existingDm);
      } else {
        // Create new DM channel
        const dbChannelId = await findOrCreateDmChannel(currentUserId, userId, currentUserId);
        
        // ✅ CRITICAL FIX: Generate deterministic ID (findOrCreateDmChannel returns database UUID)
        const deterministicId = `dm-${[currentUserId, userId].sort().join('-')}`;
        
        // Reload channels
        await loadChannels();
        
        // Find and select the new channel using deterministic ID
        const newChannel = channels.find((ch) => ch.id === deterministicId);
        if (newChannel) {
          onSelectChannel(newChannel);
        } else {
          // Temporary channel object with deterministic ID
          onSelectChannel({
            id: deterministicId,  // ✅ Use deterministic ID, not database UUID
            dbId: dbChannelId,    // ✅ Store database UUID for backend operations
            name: userName,
            type: 'dm',
            dmParticipants: [currentUserId, userId].sort(),
            createdBy: currentUserId,
            createdAt: new Date(),
            otherUser: {
              id: userId,
              name: userName,
              email: teamMembers.find((m) => m.id === userId)?.email || '',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error creating/finding DM channel:', error);
      alert('Failed to open DM. Please try again.');
    } finally {
      setIsCreatingDm(false);
    }
  };

  // Get current user's name for filtering channel names
  const currentUserName = teamMembers.find((m) => m.id === currentUserId)?.name || '';

  // Get user IDs we already have DMs with
  const existingDmUserIds = new Set(
    channels.flatMap((ch) => ch.dmParticipants || []).filter((id) => id !== currentUserId)
  );

  // Filter team members by search (exclude current user from list)
  // ✅ CRITICAL FIX: getAllTeamMembers returns clerkId as 'id', so member.id === currentUserId
  const filteredTeamMembers = teamMembers
    .filter((member) => {
      // Normalize IDs to lowercase strings for comparison
      const memberId = String(member.id || '').toLowerCase();
      const currentId = String(currentUserId || '').toLowerCase();
      
      // 🚫 BLOCK: Exclude current user from the list
      if (memberId === currentId) {
        console.log('🚫 [ChatSidebar] Filtering out self from team members:', {
          memberName: member.name,
          memberId,
          currentUserId: currentId
        });
        return false;
      }
      
      return true;
    })
    .filter((member) =>
      (member.name || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
      (member.email || "").toLowerCase().includes((searchQuery || "").toLowerCase())
    );
  
  console.log('👥 [ChatSidebar] Filtered team members:', {
    totalTeamMembers: teamMembers.length,
    filteredCount: filteredTeamMembers.length,
    currentUserId,
    sample: filteredTeamMembers.slice(0, 3).map(m => ({ id: m.id, name: m.name }))
  });

  // Filter existing channels by search (name or last message content)
  const getRecipientName = (channel: Channel): string => {
    if (channel.type !== 'dm') return channel.name || 'Conversation';

    // Prefer explicit otherUser name when available.
    if (channel.otherUser?.name && channel.otherUser.id !== currentUserId) {
      return channel.otherUser.name;
    }

    // Otherwise, derive the other participant from dmParticipants.
    const otherUserId = channel.dmParticipants?.find((id) => id !== currentUserId);
    if (otherUserId) {
      const member = teamMembers.find((m) => m.id === otherUserId);
      if (member?.name) return member.name;
    }

    // Final fallback: if channel.name contains both names, extract just the other person's name
    if (channel.name && currentUserName) {
      const parts = channel.name.split(/\s*[&]\s*|\s+and\s+/i).map(p => p.trim());
      if (parts.length === 2) {
        const [first, second] = parts;
        const currentNameLower = currentUserName.toLowerCase();
        // Return the name that doesn't match the current user
        if (first.toLowerCase() === currentNameLower) return second;
        if (second.toLowerCase() === currentNameLower) return first;
        // If neither matches exactly, just return the second name
        return second;
      }
      return channel.name;
    }

    return channel.name || 'Conversation';
  };

  // ✅ Get display unread count - Prioritize parent's real-time state
  const getDisplayUnreadCount = (channel: Channel): number => {
    // The parent (ChatWidget) manages unread counts with real-time Pusher updates
    // This "override" prop IS the source of truth for badge counts
    if (unreadCountsOverride && channel.id in unreadCountsOverride) {
      return unreadCountsOverride[channel.id];
    }
    // Fallback to channel's own count (from database polling)
    return channel.unreadCount || 0;
  };

  const filteredChannels = channels.filter((channel) => {
    const query = (searchQuery || "").toLowerCase();
    
    // Filter out channels with messy/raw UUIDs in name
    // Keep only channels that have meaningful names or proper otherUser data
    if (channel.type === 'dm') {
      // For DMs, only show if we have a proper recipient name
      const recipientName = getRecipientName(channel);
      if (!recipientName || 
          recipientName === 'Conversation' || 
          recipientName.includes('dm-') ||
          recipientName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/)) {  // Looks like UUID
        return false;  // Hide messy DMs
      }
    }
    
    if (!query) return true;
    
    const nameMatch = (getRecipientName(channel) || "").toLowerCase().includes(query);
    const messageMatch = (channel.lastMessage?.content || "").toLowerCase().includes(query);
    
    return nameMatch || messageMatch;
  });

  return (
    <div className={`flex flex-col h-full bg-surface dark:bg-gray-800 ${isCompact ? '' : 'border-r border-surface-outline-variant dark:border-gray-700'}`}>
      {/* Search Bar */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-surface-outline-variant dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-on-variant dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100 rounded-full outline-none focus:ring-2 focus:ring-primary placeholder:text-surface-on-variant dark:placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* DM Lists */}
      <div className="flex-1 overflow-y-auto pt-2">
        {isLoadingChannels || isLoadingTeam ? (
          <div className="px-4 py-8 flex flex-col items-center gap-2 text-surface-on-variant dark:text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm">Loading conversations...</span>
          </div>
        ) : (
          <>
            {/* Active Conversations */}
            {filteredChannels.length > 0 && (
              <div>
                {filteredChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-all touch-manipulation ${
                      selectedChannelId === channel.id
                        ? 'bg-primary-container dark:bg-primary/20 text-primary-on-container dark:text-primary border-l-4 border-primary'
                        : 'text-surface-on dark:text-gray-300 md:hover:bg-surface-container md:dark:hover:bg-gray-700/50'
                    }`}
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
                  >
                    {/* Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium truncate">
                        {getRecipientName(channel)}
                      </div>
                      {channel.lastMessage && (
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 truncate">
                          {channel.lastMessage.content}
                        </div>
                      )}
                    </div>
                    
                    {/* Unread badge - Material 3 with optimistic updates */}
                    {(() => {
                      const displayCount = getDisplayUnreadCount(channel);
                      return displayCount > 0 ? (
                        <div className="flex-shrink-0 h-5 min-w-[20px] px-1.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                          {displayCount > 9 ? '9+' : displayCount}
                        </div>
                      ) : null;
                    })()}
                  </button>
                ))}
              </div>
            )}

            {/* All Team Members */}
            <div className={filteredChannels.length > 0 ? 'mt-2' : ''}>
              {searchQuery && filteredChannels.length === 0 && filteredTeamMembers.filter((member) => !existingDmUserIds.has(member.id)).length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-surface-on-variant dark:text-gray-400">
                  No results found
                </div>
              ) : filteredTeamMembers.length === 0 && !searchQuery ? (
                <div className="px-4 py-8 text-center text-sm text-surface-on-variant dark:text-gray-400">
                  No other team members
                </div>
              ) : (
                filteredTeamMembers
                  .filter((member) => !existingDmUserIds.has(member.id))
                  .map((member) => {
                    // ✅ TASK 2: Handle NULL internal_role for Admins (like Kevin)
                    // If internalRole is missing, show 'Admin' as fallback
                    const displayRole = member.internalRole || 'Admin';
                    
                    return (
                      <button
                        key={member.id}
                        onClick={() => handleDmClick(member.id, member.name)}
                        disabled={isCreatingDm}
                        className="w-full px-4 py-3 flex items-center gap-3 text-surface-on dark:text-gray-300 md:hover:bg-surface-container md:dark:hover:bg-gray-700/50 transition-all disabled:opacity-50 touch-manipulation"
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
                      >
                        {/* Content */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400">
                            {displayRole}
                          </div>
                        </div>
                        
                        <Users className="h-4 w-4 text-surface-on-variant dark:text-gray-400 flex-shrink-0" />
                      </button>
                    );
                  })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
