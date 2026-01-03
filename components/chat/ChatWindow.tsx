/**
 * CHAT WINDOW COMPONENT
 * Core chat interface with Pusher real-time updates
 * January 3, 2026
 * 
 * Features:
 * - Real-time message updates via Pusher
 * - @ mentions with homeowner search
 * - Media attachments (Cloudinary)
 * - Typing indicators
 * - Works in both full-page and popup modes
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Users,
  Hash,
  AtSign,
  Smile
} from 'lucide-react';
import { getPusherClient } from '../../lib/pusher-client';
import {
  getChannelMessages,
  sendMessage,
  markChannelAsRead,
  searchHomeownersForMention,
  sendTypingIndicator,
  type Message,
  type HomeownerMention,
} from '../../services/internalChatService';
import { uploadToCloudinary } from '../../services/uploadService';

interface ChatWindowProps {
  channelId: string;
  channelName: string;
  channelType: 'public' | 'dm';
  currentUserId: string;
  currentUserName: string;
  onOpenHomeownerModal?: (homeownerId: string) => void;
  isCompact?: boolean; // For popup mode
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  channelId,
  channelName,
  channelType,
  currentUserId,
  currentUserName,
  onOpenHomeownerModal,
  isCompact = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{ url: string; type: 'image' | 'video' | 'file'; filename?: string; publicId?: string }>
  >([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<HomeownerMention[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<HomeownerMention[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const msgs = await getChannelMessages(channelId);
      setMessages(msgs);
      await markChannelAsRead(currentUserId, channelId);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [channelId, currentUserId]);

  // Load messages on mount and channel change
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Pusher: Listen for new messages
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe('private-team-chat');

    channel.bind('new-message', (data: { channelId: string; message: Message }) => {
      if (data.channelId === channelId) {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
        
        // Mark as read if message is from someone else
        if (data.message.senderId !== currentUserId) {
          markChannelAsRead(currentUserId, channelId);
        }
      }
    });

    channel.bind('typing-indicator', (data: {
      channelId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (data.channelId === channelId && data.userId !== currentUserId) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            return prev.includes(data.userName) ? prev : [...prev, data.userName];
          } else {
            return prev.filter((name) => name !== data.userName);
          }
        });
      }
    });

    return () => {
      channel.unbind('new-message');
      channel.unbind('typing-indicator');
      pusher.unsubscribe('private-team-chat');
    };
  }, [channelId, currentUserId]);

  // Handle typing
  const handleTyping = useCallback(() => {
    sendTypingIndicator({
      channelId,
      userId: currentUserId,
      userName: currentUserName,
      isTyping: true,
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator({
        channelId,
        userId: currentUserId,
        userName: currentUserName,
        isTyping: false,
      });
    }, 2000);
  }, [channelId, currentUserId, currentUserName]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    handleTyping();

    // Check for @ mention
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const queryAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
      // Only show suggestions if there's no space after @
      if (!queryAfterAt.includes(' ')) {
        setMentionQuery(queryAfterAt);
      } else {
        setMentionQuery(null);
      }
    } else {
      setMentionQuery(null);
    }
  };

  // Search for homeowners when mention query changes
  useEffect(() => {
    if (mentionQuery !== null) {
      const searchMentions = async () => {
        const results = await searchHomeownersForMention(mentionQuery);
        setMentionSuggestions(results);
      };
      searchMentions();
    } else {
      setMentionSuggestions([]);
    }
  }, [mentionQuery]);

  // Insert mention
  const insertMention = (mention: HomeownerMention) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = inputValue.slice(0, cursorPosition);
    const textAfterCursor = inputValue.slice(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    const newValue =
      textBeforeCursor.slice(0, lastAtSymbol) +
      `@[${mention.projectName}] ` +
      textAfterCursor;

    setInputValue(newValue);
    setMentionQuery(null);
    setSelectedMentions((prev) => [...prev, mention]);

    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    try {
      const uploadedFiles = await Promise.all(
        Array.from(files).map(async (file) => {
          const result = await uploadToCloudinary(file, 'team-chat-media');
          const fileType = file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/')
            ? 'video'
            : 'file';

          return {
            url: result.secure_url,
            type: fileType as 'image' | 'video' | 'file',
            filename: file.name,
            publicId: result.public_id,
          };
        })
      );

      setAttachments((prev) => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploadingMedia(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    setIsSending(true);
    try {
      await sendMessage({
        channelId,
        senderId: currentUserId,
        content: inputValue.trim(),
        attachments,
        mentions: selectedMentions.map((m) => ({
          homeownerId: m.id,
          projectName: m.projectName,
          address: m.address,
        })),
      });

      // Clear input and attachments
      setInputValue('');
      setAttachments([]);
      setSelectedMentions([]);
      setMentionQuery(null);

      // Stop typing indicator
      sendTypingIndicator({
        channelId,
        userId: currentUserId,
        userName: currentUserName,
        isTyping: false,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render message with clickable mentions
  const renderMessageContent = (message: Message) => {
    let content = message.content;
    const mentionRegex = /@\[([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add mention chip
      const mentionText = match[1];
      const mentionData = message.mentions.find((m) => m.projectName === mentionText);

      parts.push(
        <span
          key={match.index}
          onClick={() => mentionData && onOpenHomeownerModal?.(mentionData.homeownerId)}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-full text-sm cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        >
          <AtSign className="h-3 w-3" />
          {mentionText}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return <div className="whitespace-pre-wrap break-words">{parts}</div>;
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${isCompact ? '' : 'border border-gray-200 dark:border-gray-700 rounded-lg'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {channelType === 'public' ? (
          <Hash className="h-5 w-5 text-gray-500" />
        ) : (
          <Users className="h-5 w-5 text-gray-500" />
        )}
        <h2 className="font-semibold text-gray-900 dark:text-white">{channelName}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.senderId === currentUserId ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                  {message.senderName.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Message content */}
              <div className={`flex flex-col ${message.senderId === currentUserId ? 'items-end' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {message.senderName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Message bubble */}
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.senderId === currentUserId
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}
                >
                  {renderMessageContent(message)}

                  {/* Attachments */}
                  {message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((att, idx) => (
                        <div key={idx}>
                          {att.type === 'image' ? (
                            <img
                              src={att.url}
                              alt={att.filename || 'Image'}
                              className="max-w-xs rounded"
                            />
                          ) : att.type === 'video' ? (
                            <video src={att.url} controls className="max-w-xs rounded" />
                          ) : (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm underline"
                            >
                              <Paperclip className="h-4 w-4" />
                              {att.filename || 'File'}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-sm text-gray-500">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Mention suggestions */}
      {mentionSuggestions.length > 0 && (
        <div className="mx-4 mb-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg max-h-48 overflow-y-auto">
          {mentionSuggestions.map((mention) => (
            <button
              key={mention.id}
              onClick={() => insertMention(mention)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="font-medium text-gray-900 dark:text-white">{mention.projectName}</div>
              <div className="text-sm text-gray-500">{mention.address}</div>
            </button>
          ))}
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-gray-200 dark:border-gray-700">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative">
              {att.type === 'image' ? (
                <img src={att.url} alt={att.filename} className="h-16 w-16 object-cover rounded" />
              ) : (
                <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                  <Paperclip className="h-6 w-6 text-gray-500" />
                </div>
              )}
              <button
                onClick={() => removeAttachment(idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-2">
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingMedia}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            {isUploadingMedia ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${channelName}...`}
            rows={1}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={isSending || (!inputValue.trim() && attachments.length === 0)}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

