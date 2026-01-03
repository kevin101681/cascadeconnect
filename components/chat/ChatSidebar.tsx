/**
 * CHAT SIDEBAR COMPONENT
 * Channel list with auto-discovery DM logic
 * January 3, 2026
 * 
 * Features:
 * - Public channels list
 * - Auto-discovered DM list (all team members)
 * - Unread counts
 * - Channel switching
 */

import React, { useState, useEffect } from 'react';
import { Hash, Users, Plus, Loader2, MessageSquare } from 'lucide-react';
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

  // Load user's channels
  const loadChannels = async () => {
    try {
      setIsLoadingChannels(true);
      const userChannels = await getUserChannels(currentUserId);
      setChannels(userChannels);
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
      
      // Check if DM channel already exists in the channels list
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
        
        // Reload channels to get the new one
        await loadChannels();
        
        // Find and select the new channel
        const newChannel = channels.find((ch) => ch.id === channelId);
        if (newChannel) {
          onSelectChannel(newChannel);
        } else {
          // If not found yet, create a temporary channel object
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

  // Separate public channels and DM channels
  const publicChannels = channels.filter((ch) => ch.type === 'public');
  const dmChannels = channels.filter((ch) => ch.type === 'dm');

  // Get DM channel IDs for users we already have channels with
  const existingDmUserIds = new Set(
    dmChannels.flatMap((ch) => ch.dmParticipants || []).filter((id) => id !== currentUserId)
  );

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-800 ${isCompact ? '' : 'border-r border-gray-200 dark:border-gray-700'}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Team Chat
        </h2>
      </div>

      {/* Channel lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Public Channels */}
        <div className="py-2">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Channels
          </div>
          {isLoadingChannels ? (
            <div className="px-4 py-2 flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : publicChannels.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No channels yet</div>
          ) : (
            publicChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={`w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  selectedChannelId === channel.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <Hash className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">{channel.name}</span>
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <span className="flex-shrink-0 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Direct Messages - Auto-Discovery */}
        <div className="py-2 border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Direct Messages
          </div>
          
          {isLoadingTeam ? (
            <div className="px-4 py-2 flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading team...
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No team members found</div>
          ) : (
            <>
              {/* Show existing DM channels first */}
              {dmChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel)}
                  className={`w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedChannelId === channel.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">
                    {channel.otherUser?.name || channel.name}
                  </span>
                  {channel.unreadCount && channel.unreadCount > 0 && (
                    <span className="flex-shrink-0 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {channel.unreadCount}
                    </span>
                  )}
                </button>
              ))}

              {/* Show all other team members (auto-discovery) */}
              {teamMembers
                .filter((member) => !existingDmUserIds.has(member.id))
                .map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleDmClick(member.id, member.name)}
                    disabled={isCreatingDm}
                    className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 disabled:opacity-50"
                  >
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{member.name}</span>
                    {member.internalRole && (
                      <span className="text-xs text-gray-500">{member.internalRole}</span>
                    )}
                  </button>
                ))}
            </>
          )}
        </div>
      </div>

      {/* Footer with create channel button (optional) */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => alert('Channel creation coming soon!')}
          className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          New Channel
        </button>
      </div>
    </div>
  );
};

