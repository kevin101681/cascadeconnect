/**
 * Chat Tab - Team Chat Interface
 * 
 * Full-screen team chat interface for internal communication
 * between team members. Admin-only feature.
 * 
 * Extracted from Dashboard.tsx (Phase 3)
 */

import React from 'react';
import TeamChat from '../../TeamChat';
import type { Homeowner } from '../../../types';

interface ChatTabProps {
  currentUserId: string;
  currentUserName: string;
  homeowners: Homeowner[];
  onSelectHomeowner?: (homeowner: Homeowner) => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  currentUserId,
  currentUserName,
  homeowners,
  onSelectHomeowner,
}) => {
  return (
    <TeamChat
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      onOpenHomeownerModal={(homeownerId) => {
        const homeowner = homeowners.find((h) => h.id === homeownerId);
        if (homeowner && onSelectHomeowner) {
          onSelectHomeowner(homeowner);
        }
      }}
    />
  );
};

export default ChatTab;
