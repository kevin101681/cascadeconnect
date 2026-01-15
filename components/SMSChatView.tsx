/**
 * SMS CHAT VIEW
 * Real-time SMS conversation interface with Pusher
 * December 29, 2025
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader2, Phone } from 'lucide-react';
import { subscribeSmsChannel } from '../lib/pusher-client';
import { sendSms, validateSmsMessage } from '../lib/services/smsService';
import { db, isDbConfigured } from '../db';
import { smsThreads, smsMessages } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { format } from 'date-fns';
import { formatPhoneNumber } from '../lib/utils';

interface SmsMessage {
  id: string;
  threadId: string;
  direction: 'inbound' | 'outbound';
  body: string;
  createdAt: Date;
}

interface SmsThread {
  id: string;
  homeownerId: string;
  phoneNumber: string;
  lastMessageAt: Date;
}

interface SMSChatViewProps {
  homeownerId: string;
  homeownerName: string;
  homeownerPhone?: string;
}

const SMSChatView: React.FC<SMSChatViewProps> = ({
  homeownerId,
  homeownerName,
  homeownerPhone,
}) => {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive (but not on initial load)
  const scrollToBottom = () => {
    if (hasInitialLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom();
    }
  }, [messages]);

  // Load messages from database
  const loadMessages = async () => {
    if (!isDbConfigured) {
      setLoading(false);
      return;
    }

    try {
      // Find thread for this homeowner
      const thread = await db
        .select()
        .from(smsThreads)
        .where(eq(smsThreads.homeownerId, homeownerId))
        .limit(1);

      if (thread.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Load messages for this thread
      const messagesList = await db
        .select()
        .from(smsMessages)
        .where(eq(smsMessages.threadId, thread[0].id))
        .orderBy(desc(smsMessages.createdAt))
        .limit(100);

      const mappedMessages: SmsMessage[] = messagesList.map((m: any) => ({
        id: m.id,
        threadId: m.threadId,
        direction: m.direction as 'inbound' | 'outbound',
        body: m.body,
        createdAt: new Date(m.createdAt),
      }));

      setMessages(mappedMessages.reverse()); // Show oldest first
      setLoading(false);
      
      // Mark initial load as complete after a short delay
      setTimeout(() => {
        setHasInitialLoad(true);
      }, 500);
    } catch (err) {
      console.error('❌ Error loading SMS messages:', err);
      setError('Failed to load messages');
      setLoading(false);
    }
  };

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [homeownerId]);

  // Subscribe to real-time updates via Pusher
  useEffect(() => {
    const unsubscribe = subscribeSmsChannel((data) => {
      // Only add message if it's for this homeowner
      if (data.homeownerId === homeownerId) {
        const newMessage: SmsMessage = {
          id: data.id,
          threadId: data.threadId,
          direction: data.direction,
          body: data.body,
          createdAt: new Date(data.createdAt),
        };

        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [homeownerId]);

  // Handle send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateSmsMessage(messageText);
    if (!validation.valid) {
      setError(validation.error || 'Invalid message');
      return;
    }

    setError(null);
    setSending(true);

    try {
      const result = await sendSms({
        homeownerId,
        message: messageText,
      });

      if (result.success) {
        setMessageText('');
        // Message will be added via Pusher event
      } else {
        setError(result.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('❌ Error sending SMS:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!homeownerPhone) {
    return (
      <div className="bg-surface dark:bg-gray-800 rounded-2xl border border-surface-outline-variant dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
          <h3 className="text-lg font-medium text-surface-on dark:text-gray-100">
            SMS Chat
          </h3>
        </div>
        <div className="text-center py-8 text-surface-on-variant dark:text-gray-400">
          <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No phone number on file for this homeowner</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-gray-800 rounded-2xl border border-surface-outline-variant dark:border-gray-700 flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-medium text-surface-on dark:text-gray-100">
              Chat
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">
              {homeownerName} • {formatPhoneNumber(homeownerPhone)}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-12 w-12 text-surface-on-variant dark:text-gray-400 opacity-50 mb-3" />
            <p className="text-surface-on-variant dark:text-gray-400">
              No messages yet
            </p>
            <p className="text-sm text-surface-on-variant dark:text-gray-500">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    msg.direction === 'outbound'
                      ? 'bg-primary text-primary-on rounded-br-sm'
                      : 'bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.body}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.direction === 'outbound'
                        ? 'text-primary-on opacity-70'
                        : 'text-surface-on-variant dark:text-gray-400'
                    }`}
                  >
                    {format(msg.createdAt, 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-surface-outline-variant dark:border-gray-700">
        {error && (
          <div className="mb-3 px-3 py-2 bg-error/10 text-error text-sm rounded-lg">
            {error}
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 rounded-lg border border-surface-outline-variant dark:border-gray-600 bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!messageText.trim() || sending}
            className="flex-shrink-0 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-on rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SMSChatView;

