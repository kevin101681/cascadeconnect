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

import React, { useState, useEffect } from 'react';
import { Users, Loader2, MessageSquare, Search } from 'lucide-react';
import {
  getUserChannels,
  getAllTeamMembers,
  findOrCreateDmChannel,
  type Channel,
} from '../../services/internalChatService';

interface ChatSidebarProps {
  currentUserId: string;
  selectedChannelId: string | null;
  onSelectChannel: (channel: Channel) => void;
  isCompact?: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentUserId,
  selectedChannelId,
  onSelectChannel,
  isCompact = false,
}) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [teamMembers, setTeamMembers] = useState<
    Array<{ id: string; name: string; email: string; internalRole?: string }>
  >([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [isCreatingDm, setIsCreatingDm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load user's channels (only DMs)
  const loadChannels = async () => {
    try {
      setIsLoadingChannels(true);
      const userChannels = await getUserChannels(currentUserId);
      // Filter to only show DM channels
      setChannels(userChannels.filter(ch => ch.type === 'dm'));
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
        const channelId = await findOrCreateDmChannel(currentUserId, userId, currentUserId);
        
        // Reload channels
        await loadChannels();
        
        // Find and select the new channel
        const newChannel = channels.find((ch) => ch.id === channelId);
        if (newChannel) {
          onSelectChannel(newChannel);
        } else {
          // Temporary channel object
          onSelectChannel({
            id: channelId,
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
  // Check both id fields and use String() to handle any type mismatches
  const filteredTeamMembers = teamMembers
    .filter((member) => {
      // Aggressive filtering: exclude current user by checking ALL possible ID fields
      const memberIds = [
        String(member.id || '').toLowerCase(),
        // @ts-ignore - clerkId might not be in type but could exist
        String(member.clerkId || '').toLowerCase(),
        // @ts-ignore - email as backup identifier
        String(member.email || '').toLowerCase(),
      ];
      const currentIds = [
        String(currentUserId || '').toLowerCase(),
      ];
      
      // If any member ID matches current user ID, filter it out
      return !memberIds.some(mid => currentIds.includes(mid));
    })
    .filter((member) =>
      (member.name || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
      (member.email || "").toLowerCase().includes((searchQuery || "").toLowerCase())
    );

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
                    
                    {/* Unread badge - Material 3 */}
                    {channel.unreadCount && channel.unreadCount > 0 && (
                      <div className="flex-shrink-0 h-5 min-w-[20px] px-1.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {channel.unreadCount > 9 ? '9+' : channel.unreadCount}
                      </div>
                    )}
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
                  .map((member) => (
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
                        {member.internalRole && (
                          <div className="text-xs text-surface-on-variant dark:text-gray-400">
                            {member.internalRole}
                          </div>
                        )}
                      </div>
                      
                      <Users className="h-4 w-4 text-surface-on-variant dark:text-gray-400 flex-shrink-0" />
                    </button>
                  ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
