/**
 * CHAT WINDOW COMPONENT
 * Core chat interface with Pusher real-time updates
 * January 6, 2026
 * 
 * Features:
 * - Real-time message updates via Pusher
 * - @ mentions with homeowner search
 * - Media attachments (Cloudinary)
 * - Typing indicators
 * - Quote reply functionality
 * - Pill-shaped modern input design
 * - Works in both full-page and popup modes
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Users,
  Hash,
  AtSign,
  Smile,
  Reply,
  CornerUpLeft,
  Mic,
  MicOff,
  Check,
  CheckCheck,
  ArrowRight,
  SendHorizontal
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
import { useSpeechToText } from '../../lib/hooks/useSpeechToText';
import { ToastContainer, Toast } from '../Toast';
import { TypingIndicator } from './TypingIndicator'; // ✅ Import typing indicator

interface ChatWindowProps {
  channelId: string;
  channelName: string;
  channelType: 'public' | 'dm';
  userId?: string; // Legacy prop
  userName?: string; // Legacy prop
  effectiveUserId?: string; // New prop from ChatWidget
  effectiveUserName?: string; // New prop from ChatWidget
  onOpenHomeownerModal?: (homeownerId: string) => void;
  onMarkAsRead?: () => void;  // ✅ Callback to notify parent when channel is marked as read
  isCompact?: boolean; // For popup mode
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  channelId,
  channelName,
  channelType,
  userId,
  userName,
  effectiveUserId,
  effectiveUserName,
  onOpenHomeownerModal,
  onMarkAsRead,
  isCompact = false,
}) => {
  // Use effectiveUserId/effectiveUserName if provided, otherwise fall back to userId/userName
  const userId = effectiveUserId || userId;
  const userName = effectiveUserName || userName;
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
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false); // ✅ Google-style single typing indicator
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingStopTimeoutRef = useRef<NodeJS.Timeout | null>(null); // ✅ Safety timeout for typing indicator
  const lastTypingSentRef = useRef<number>(0); // ✅ For throttling typing events

  // Voice-to-text integration
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    isSupported, 
    error 
  } = useSpeechToText();

  // Toast management
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Simple scroll to bottom for new messages only
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages
  const loadMessages = useCallback(async () => {
    console.log('🔄 ChatWindow loadMessages called. Channel ID:', channelId);
    if (!channelId) {
      console.warn('⚠️ No Channel ID found, aborting fetch.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('📡 Calling getChannelMessages for:', channelId);
      const msgs = await getChannelMessages(channelId);
      console.log('📥 getChannelMessages Result:', {
        count: msgs.length,
        sample: msgs.length > 0 ? {
          id: msgs[0].id,
          senderId: msgs[0].senderId,
          senderName: msgs[0].senderName,
          senderEmail: msgs[0].senderEmail,
          content: msgs[0].content?.substring(0, 50) + '...'
        } : 'No messages'
      });
      
      // ✅ Add readAt timestamp for messages older than 5 seconds (simple heuristic)
      const now = new Date();
      const messagesWithReadStatus = msgs.map(msg => ({
        ...msg,
        readAt: msg.senderId === userId && 
                (now.getTime() - new Date(msg.createdAt).getTime()) > 5000 
                  ? new Date(msg.createdAt) 
                  : null
      }));
      
      setMessages(messagesWithReadStatus);
      await markChannelAsRead(userId, channelId);
      // ✅ Notify parent to refresh unread counts
      onMarkAsRead?.();
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [channelId, userId]);

  // Load messages on mount and channel change
  useEffect(() => {
    console.log('🎬 ChatWindow MOUNTED/UPDATED. Channel ID:', channelId, 'User ID:', userId);
    loadMessages();
  }, [loadMessages]);

  // Scroll to bottom only when NEW messages arrive (not on initial load)
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Sync transcript to input value
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  // Handle voice recognition errors
  useEffect(() => {
    if (error === 'not-allowed') {
      addToast('Microphone permission denied. Please check your browser settings.', 'error');
    } else if (error === 'not-supported') {
      addToast('Voice recognition is not supported in your browser.', 'error');
    } else if (error && error !== 'aborted') {
      addToast(`Voice recognition error: ${error}`, 'error');
    }
  }, [error]);

  // Pusher: Listen for new messages on PUBLIC user channel
  useEffect(() => {
    const pusher = getPusherClient();
    const channelName = `public-user-${userId}`;
    const channel = pusher.subscribe(channelName);

    // 1. Define handlers INSIDE the effect
    const handleNewMessage = (data: { channelId: string; message: Message }) => {
      if (data.channelId === channelId) {
        setMessages((prev) => {
          // ✅ CRITICAL: Prevent duplicates with strict ID-based deduplication
          // Check if this message already exists (from optimistic update or previous broadcast)
          const existingMessage = prev.find(m => m.id === data.message.id);
          if (existingMessage) {
            console.log('🔄 Deduplication: Message already exists, skipping:', data.message.id);
            return prev;
          }
          
          console.log('📨 New message received via Pusher (private channel):', data.message.id);
          return [...prev, data.message];
        });
        
        // Mark as read if message is from someone else
        if (data.message.senderId !== userId) {
          markChannelAsRead(userId, channelId);
        }
      }
    };

    const handleTypingIndicator = (data: {
      channelId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (data.channelId === channelId && data.userId !== userId) {
        // ✅ Google-style: Simple boolean state
        setIsOtherUserTyping(data.isTyping);
        
        // ✅ Safety timeout: Auto-clear after 4 seconds if stop event is missed
        if (data.isTyping) {
          if (typingStopTimeoutRef.current) {
            clearTimeout(typingStopTimeoutRef.current);
          }
          typingStopTimeoutRef.current = setTimeout(() => {
            setIsOtherUserTyping(false);
          }, 4000);
        } else {
          // Clear safety timeout when we receive explicit stop
          if (typingStopTimeoutRef.current) {
            clearTimeout(typingStopTimeoutRef.current);
            typingStopTimeoutRef.current = null;
          }
        }
      }
    };

    const handleMessageRead = (data: any) => {
      console.log('⚡️ [ChatWindow] Read Receipt Event Received:', {
        data,
        currentChannelId: channelId,
        userId,
        matches: data.channelId === channelId,
        isNotMe: data.readBy !== userId
      });
      
      // ✅ CRITICAL: Update MY messages when someone else reads them
      // The event is sent to ME (the sender) when someone reads my messages
      setMessages((prev) => {
        const updated = prev.map((msg) => {
          // Only update MY messages that are currently unread
          if (msg.senderId === userId && !msg.readAt) {
            console.log(`📝 [ChatWindow] Marking message ${msg.id} as read`);
            return { ...msg, readAt: new Date(data.readAt) };
          }
          return msg;
        });
        return updated;
      });
    };

    // 2. Bind SPECIFIC handlers
    channel.bind('new-message', handleNewMessage);
    channel.bind('message:new', handleNewMessage); // Bind both just in case
    channel.bind('user-typing', handleTypingIndicator); // ✅ Updated to match new event name
    channel.bind('messages-read', handleMessageRead); // ✅ Updated event name

    return () => {
      // 3. Unbind ONLY these SPECIFIC handlers (CRITICAL: Pass exact function references)
      console.log('🔌 [ChatWindow] Unbinding specific listeners');
      channel.unbind('new-message', handleNewMessage);
      channel.unbind('message:new', handleNewMessage);
      channel.unbind('user-typing', handleTypingIndicator); // ✅ Updated to match new event name
      channel.unbind('messages-read', handleMessageRead); // ✅ Updated event name
      
      // Clear typing timeout on cleanup
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      
      // ❌ NEVER CALL: channel.unbind('new-message'); // This wipes ALL listeners!
      // ❌ NEVER CALL: pusher.unsubscribe(channelName); // This kills the connection!
    };
  }, [channelId, userId]);

  // Handle typing with throttling (2 second intervals)
  const handleTyping = useCallback(() => {
    const now = Date.now();
    const timeSinceLastSent = now - lastTypingSentRef.current;
    
    // ✅ Throttle: Only send if 2 seconds have passed since last send
    if (timeSinceLastSent < 2000) {
      console.log('⏱️ Typing throttled (too soon)');
      return;
    }
    
    lastTypingSentRef.current = now;
    
    sendTypingIndicator({
      channelId,
      userId: userId,
      userName: userName,
      isTyping: true,
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator({
        channelId,
        userId: userId,
        userName: userName,
        isTyping: false,
      });
    }, 2000);
  }, [channelId, userId, userName]);

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

  // ✅ Handle input blur - stop typing indicator
  const handleInputBlur = () => {
    sendTypingIndicator({
      channelId,
      userId: userId,
      userName: userName,
      isTyping: false,
    });
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

  // Toggle voice input
  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
    // 1. Prevent default behaviors (stop form submit & bubbling)
    if (e) e.preventDefault();

    // 2. Validation & Locking (CRITICAL: Check isSending first to prevent double-firing)
    if (isSending || (!inputValue.trim() && attachments.length === 0)) return;

    // Store current message for restoration on failure
    const messageToSend = inputValue.trim();
    const attachmentsToSend = [...attachments];

    try {
      setIsSending(true); // 🔒 Lock to prevent duplicate sends

      // 3. Stop voice if active
      if (isListening) {
        stopListening();
      }

      // 4. Log current user info before sending
      console.log('👤 Current User Info:', {
        userId: userId,
        userName: userName,
        messageContent: messageToSend.substring(0, 50) + '...'
      });

      // 5. Clear input optimistically (improves perceived performance)
      setInputValue('');
      setAttachments([]);
      resetTranscript();

      // 6. Send message to server
      console.log('📤 Sending message to server...');
      const newMessage = await sendMessage({
        channelId,
        senderId: userId,
        content: messageToSend,
        attachments: attachmentsToSend,
        mentions: selectedMentions.map((m) => ({
          homeownerId: m.id,
          projectName: m.projectName,
          address: m.address,
        })),
        replyTo: replyingTo?.id,
      });

      console.log('✅ Message sent successfully:', newMessage.id);
      console.log('📋 Server Response:', {
        id: newMessage.id,
        senderId: newMessage.senderId,
        senderName: newMessage.senderName,
        senderEmail: newMessage.senderEmail,
        content: newMessage.content?.substring(0, 50) + '...'
      });

      // ✅ OPTIMISTIC UPDATE: Add message immediately to local state
      // Pusher will also broadcast this message, but deduplication will prevent double-add
      setMessages((prev) => {
        // Safety check: Don't add if already exists (shouldn't happen, but defensive)
        if (prev.find(m => m.id === newMessage.id)) {
          console.log('⚠️ Optimistic update skipped: Message already exists');
          return prev;
        }
        console.log('📝 Optimistic update: Adding message to local state');
        return [...prev, newMessage];
      });

      // Clear remaining state
      setSelectedMentions([]);
      setMentionQuery(null);
      setReplyingTo(null);

      // Stop typing indicator
      sendTypingIndicator({
        channelId,
        userId: userId,
        userName: userName,
        isTyping: false,
      });

      addToast('Message sent', 'success');
    } catch (error) {
      console.error('❌ Send Error:', error);
      // Restore message and attachments on failure
      setInputValue(messageToSend);
      setAttachments(attachmentsToSend);
      addToast('Failed to send message. Please try again.', 'error');
    } finally {
      setIsSending(false); // 🔓 Unlock (always runs, even on error)
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Pass event to handleSendMessage for preventDefault
      handleSendMessage(e);
    }
  };

  // Render message with clickable mentions (adaptive styling based on sender)
  const renderMessageContent = (message: Message, isCurrentUser: boolean) => {
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

      // Add mention chip with adaptive styling
      const mentionText = match[1];
      const mentionData = message.mentions.find((m) => m.projectName === mentionText);

      parts.push(
        <span
          key={match.index}
          onClick={() => mentionData && onOpenHomeownerModal?.(mentionData.homeownerId)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm cursor-pointer transition-colors ${
            isCurrentUser
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-[#769cab]/10 text-[#769cab] hover:bg-[#769cab]/20'
          }`}
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

  // Memoized reversed messages for flex-col-reverse rendering
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Chat Skeleton Loader - mimics actual layout
  const ChatSkeleton = () => (
    <div className="flex-1 flex flex-col-reverse p-4 pb-20 gap-4 overflow-y-hidden">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div 
            className={`h-12 rounded-2xl animate-pulse ${
              i % 2 === 0 
                ? 'bg-gray-200 dark:bg-gray-700 w-1/2 rounded-br-none' 
                : 'bg-gray-100 dark:bg-gray-800 w-1/3 rounded-bl-none'
            }`} 
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 relative ${isCompact ? '' : 'border border-gray-200 dark:border-gray-700 rounded-lg'}`}>
      {/* Messages Area - Instant loading with flex-col-reverse */}
      {isLoading ? (
        <ChatSkeleton />
      ) : messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 pb-20 flex flex-col-reverse space-y-reverse space-y-4">
          {/* Scroll anchor - FIRST element (Visual Bottom) */}
          <div ref={messagesEndRef} className="h-0 w-0" />
          
          {/* Messages render in reverse (oldest at top, newest at bottom visually) */}
          {reversedMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 group ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
            >
              {/* Message content - WhatsApp style without avatars */}
              <div className={`flex flex-col max-w-[70%] ${message.senderId === userId ? 'items-end' : 'items-start'}`}>
                {/* Sender name (only show for other users' messages) */}
                {message.senderId !== userId && (
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 px-1">
                    {message.senderName || 'Unknown User'}
                  </span>
                )}

                {/* Message bubble */}
                <div
                  className={`px-3 py-2 rounded-lg shadow-sm relative ${
                    message.senderId === userId
                      ? 'bg-[#769cab] text-white rounded-br-none'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
                  }`}
                >
                  {/* Reply button - visible on hover */}
                  <button
                    onClick={() => setReplyingTo(message)}
                    className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Reply to this message"
                  >
                    <Reply className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  </button>

                  {/* Quoted message (if replying to another message) */}
                  {message.replyTo && (
                    <div className={`border-l-2 border-blue-400 bg-black/5 dark:bg-black/20 p-2 mb-2 text-xs italic rounded-r ${
                      message.senderId === userId ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      <div className="font-semibold not-italic mb-0.5">
                        {message.replyTo.senderName || 'Unknown User'}
                      </div>
                      <div className="line-clamp-2">
                        {message.replyTo.content}
                      </div>
                    </div>
                  )}

                  {renderMessageContent(message, message.senderId === userId)}

                  {/* Attachments */}
                  {message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((att, idx) => (
                        <div key={idx}>
                          {att.type === 'image' ? (
                            <img
                              src={att.url}
                              alt={att.filename || 'Image'}
                              className="max-h-[250px] w-auto rounded object-contain"
                            />
                          ) : att.type === 'video' ? (
                            <video src={att.url} controls className="max-h-[250px] w-auto rounded object-contain" />
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

                  {/* WhatsApp-style status and timestamp */}
                  <div className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${
                    message.senderId === userId ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    <span>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {/* Status ticks (only for own messages) */}
                    {message.senderId === userId && (
                      message.readAt ? (
                        <CheckCheck className="w-3 h-3 text-blue-300" />  // Double check = Read
                      ) : (
                        <Check className="w-3 h-3" />  // Single check = Sent
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Typing Indicator - FLOATING ABOVE FOOTER */}
      {isOtherUserTyping && (
        <div className="absolute bottom-24 left-6 z-50 pointer-events-none">
          <TypingIndicator />
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

      {/* Input area - Fixed at bottom with equal padding */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0 z-40">
        {/* Replying To Banner */}
        {replyingTo && (
          <div className="mx-4 mt-2 rounded-t-2xl bg-gray-100 dark:bg-gray-800 border-t border-x border-gray-200 dark:border-gray-600 p-2 text-xs text-gray-600 dark:text-gray-400 flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <CornerUpLeft className="h-3 w-3" />
                <span className="font-medium">Replying to {replyingTo.senderName}</span>
              </div>
              <p className="text-gray-500 dark:text-gray-500 truncate">
                {replyingTo.content.length > 50 
                  ? replyingTo.content.substring(0, 50) + '...'
                  : replyingTo.content
                }
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="p-4 flex items-center gap-2">
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
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50 flex-shrink-0"
            title="Attach file"
          >
            {isUploadingMedia ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </button>

          {/* Voice input button */}
          {isSupported && (
            <button
              onClick={toggleVoiceInput}
              disabled={isSending}
              className={`p-2 transition-all duration-200 disabled:opacity-50 flex-shrink-0 rounded-full ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title={isListening ? 'Stop recording' : 'Start voice input'}
            >
              {isListening ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          )}

          {/* Text input - Pill shaped */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${channelName}...`}
            rows={1}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-colors"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />

          {/* Send button - Clean ghost style */}
          <button
            onClick={handleSendMessage}
            disabled={isSending || (!inputValue.trim() && attachments.length === 0)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center"
          >
            {isSending ? (
              <Loader2 className="w-6 h-6 text-[#769cab] animate-spin" />
            ) : (
              <SendHorizontal className="w-6 h-6 text-[#769cab]" />
            )}
          </button>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

