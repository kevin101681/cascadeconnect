/**
 * TEAM CHAT TAB (FULL PAGE)
 * Full-height chat interface for the admin dashboard
 * January 3, 2026
 * 
 * Features:
 * - Sidebar + chat window layout
 * - Responsive design
 * - Integrates with existing dashboard tabs
 */

import React, { useState } from 'react';
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
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  return (
    <div className="h-full flex bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
        <ChatSidebar
          currentUserId={currentUserId}
          selectedChannelId={selectedChannel?.id || null}
          onSelectChannel={setSelectedChannel}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
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
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
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

