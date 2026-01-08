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
      // Filter out current user
      const otherMembers = members.filter((m) => m.id !== currentUserId);
      setTeamMembers(otherMembers);
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

  // Get user IDs we already have DMs with
  const existingDmUserIds = new Set(
    channels.flatMap((ch) => ch.dmParticipants || []).filter((id) => id !== currentUserId)
  );

  // Filter team members by search
  const filteredTeamMembers = teamMembers.filter((member) =>
    (member.name || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
    (member.email || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  return (
    <div className={`flex flex-col h-full bg-surface dark:bg-gray-800 ${isCompact ? '' : 'border-r border-surface-outline-variant dark:border-gray-700'}`}>
      {/* DM Lists - No header, no search */}
      <div className="flex-1 overflow-y-auto pt-2">
        {isLoadingChannels || isLoadingTeam ? (
          <div className="px-4 py-8 flex flex-col items-center gap-2 text-surface-on-variant dark:text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm">Loading conversations...</span>
          </div>
        ) : (
          <>
            {/* Active Conversations - No "Recent" label */}
            {channels.length > 0 && (
              <div>
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-all ${
                      selectedChannelId === channel.id
                        ? 'bg-primary-container dark:bg-primary/20 text-primary-on-container dark:text-primary border-l-4 border-primary'
                        : 'text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {/* Avatar - Material 3 */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary-container dark:bg-secondary/20 flex items-center justify-center text-secondary-on-container dark:text-secondary font-medium">
                      {channel.otherUser?.name.charAt(0).toUpperCase() || 'U'}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium truncate">
                        {channel.otherUser?.name || channel.name}
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

            {/* All Team Members - No divider, no "Start New Conversation" label */}
            <div className={channels.length > 0 ? 'mt-2' : ''}>
              {filteredTeamMembers.length === 0 ? (
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
                      className="w-full px-4 py-3 flex items-center gap-3 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-700/50 transition-all disabled:opacity-50"
                    >
                      {/* Avatar - Material 3 */}
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-tertiary-container dark:bg-tertiary/20 flex items-center justify-center text-tertiary-on-container dark:text-tertiary font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      
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
