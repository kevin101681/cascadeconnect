import React, { useState, useEffect, useRef } from 'react';
import { SmsMessage } from '../types';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { db, isDbConfigured } from '../db';
import { smsMessages } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { sendMessage } from '../lib/services/messagesService';

interface CallSmsChatProps {
  homeownerId: string;
  callId?: string;
}

const CallSmsChat: React.FC<CallSmsChatProps> = ({ homeownerId, callId }) => {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages
  const loadMessages = async () => {
    if (!isDbConfigured || !homeownerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const messagesList = await db
        .select()
        .from(smsMessages)
        .where(eq(smsMessages.homeownerId, homeownerId))
        .orderBy(desc(smsMessages.createdAt))
        .limit(50);

      const mappedMessages: SmsMessage[] = messagesList.map((m: any) => ({
        id: m.id,
        homeownerId: m.homeownerId,
        callId: m.callId,
        direction: m.direction as 'inbound' | 'outbound',
        content: m.content,
        status: m.status as 'sent' | 'delivered' | 'failed',
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      }));

      setMessages(mappedMessages.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Error loading SMS messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadMessages();
  }, [homeownerId]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!isExpanded) return;
    
    const interval = setInterval(() => {
      loadMessages();
    }, 10000);

    return () => clearInterval(interval);
  }, [homeownerId, isExpanded]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      // Use centralized messages service
      const result = await sendMessage({
        homeownerId,
        text: messageText.trim(),
        callId: callId || null,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      setMessageText('');
      // Reload messages after a short delay to allow for database save
      setTimeout(() => {
        loadMessages();
      }, 500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error sending message:', errorMessage);
      alert(`Failed to send message: ${errorMessage}`);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!homeownerId) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-surface-outline-variant dark:border-gray-700 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors mb-2"
      >
        <MessageSquare className="h-4 w-4" />
        <span>SMS Chat ({messages.length})</span>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Messages Thread */}
          <div className="bg-surface dark:bg-gray-900 rounded-lg p-3 max-h-64 overflow-y-auto border border-surface-outline-variant dark:border-gray-700">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-surface-outline-variant dark:text-gray-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-sm text-surface-on-variant dark:text-gray-400">
                No messages yet. Start a conversation!
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        message.direction === 'outbound'
                          ? 'bg-primary text-primary-on'
                          : 'bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs opacity-70">
                          {formatTime(message.createdAt)}
                        </span>
                        {message.direction === 'outbound' && (
                          <span className="text-xs opacity-70">
                            {message.status === 'delivered' ? '✓✓' : message.status === 'sent' ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border border-surface-outline-variant dark:border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CallSmsChat;

