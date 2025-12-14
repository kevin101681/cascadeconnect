import React from 'react';
import { X, MessageSquare, Mail, HardHat, User } from 'lucide-react';
import { Claim, MessageThread, Message } from '../types';

interface ClaimMessage {
  id: string;
  claimId: string;
  type: 'HOMEOWNER' | 'SUBCONTRACTOR';
  threadId?: string;
  subject: string;
  recipient: string;
  recipientEmail: string;
  content: string;
  timestamp: Date;
  senderName: string;
}

interface MessageSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: Claim;
  claimMessages: ClaimMessage[];
}

const MessageSummaryModal: React.FC<MessageSummaryModalProps> = ({ isOpen, onClose, claim, claimMessages }) => {
  if (!isOpen) return null;

  const sortedMessages = [...claimMessages].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="bg-surface rounded-3xl shadow-elevation-3 w-full max-w-3xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-surface-outline-variant flex justify-between items-center bg-surface-container/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-container text-primary-on-container rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-surface-on">Message Summary</h2>
              <p className="text-sm text-surface-on-variant">Claim: {claim.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
            title="Close"
          >
            <X className="h-5 w-5 text-surface-on-variant" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-surface-outline-variant mx-auto mb-4 opacity-50" />
              <p className="text-surface-on-variant">No messages sent for this claim yet.</p>
              <p className="text-sm text-surface-on-variant mt-2">
                Messages sent via the "Send Message" button or to assigned subcontractors will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-surface-container p-4 rounded-xl border border-surface-outline-variant"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {msg.type === 'HOMEOWNER' ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <HardHat className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-xs font-medium text-surface-on">
                        {msg.type === 'HOMEOWNER' ? 'To Homeowner' : 'To Subcontractor'}
                      </span>
                      <span className="text-xs text-surface-on-variant">•</span>
                      <span className="text-xs text-surface-on-variant">{msg.recipient}</span>
                    </div>
                    <span className="text-xs text-surface-on-variant">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-surface-on-variant mb-1">Subject:</p>
                    <p className="text-sm text-surface-on">{msg.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-surface-on-variant mb-1">Message:</p>
                    <p className="text-sm text-surface-on whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-surface-outline-variant/50">
                    <p className="text-xs text-surface-on-variant">
                      Sent by: {msg.senderName} • To: {msg.recipientEmail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageSummaryModal;
export type { ClaimMessage };

