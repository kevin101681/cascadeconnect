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
      {/* Sidebar - Hidden on mobile when chat active, always visible on desktop */}
      <div className={`${selectedChannel ? 'hidden md:flex' : 'flex'} w-full md:w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700`}>
        <ChatSidebar
          currentUserId={currentUserId}
          selectedChannelId={selectedChannel?.id || null}
          onSelectChannel={setSelectedChannel}
        />
      </div>

      {/* Main chat area - Full screen on mobile when active, side-by-side on desktop */}
      <div className={`${selectedChannel ? 'flex fixed md:relative inset-0 md:inset-auto z-50 md:z-auto bg-white dark:bg-gray-900' : 'hidden md:flex'} flex-1 flex-col`}>
        {selectedChannel ? (
          <>
            {/* Mobile Back Button */}
            <button
              onClick={() => setSelectedChannel(null)}
              className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span className="font-medium">Back</span>
            </button>
            <ChatWindow
              channelId={selectedChannel.id}
              channelName={selectedChannel.otherUser?.name || selectedChannel.name}
              channelType={selectedChannel.type}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              onOpenHomeownerModal={onOpenHomeownerModal}
            />
          </>
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

