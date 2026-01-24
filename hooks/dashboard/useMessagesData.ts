/**
 * Custom hook for managing messages/threads state and logic
 * Handles thread selection, composition, and template management
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { MessageThread } from '../../types';

export interface MessageEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export interface UseMessagesDataParams {
  messages: MessageThread[];
  initialThreadId?: string | null;
}

export interface UseMessagesDataReturn {
  // Thread selection
  selectedThreadId: string | null;
  selectThread: (threadId: string | null) => void;
  selectedThread: MessageThread | null;
  
  // Composition state
  isComposingMessage: boolean;
  setIsComposingMessage: (isComposing: boolean) => void;
  newMessageSubject: string;
  setNewMessageSubject: (subject: string) => void;
  newMessageContent: string;
  setNewMessageContent: (content: string) => void;
  newMessageRecipientId: string;
  setNewMessageRecipientId: (recipientId: string) => void;
  showNewMessageModal: boolean;
  setShowNewMessageModal: (show: boolean) => void;
  
  // Reply state
  replyContent: string;
  setReplyContent: (content: string) => void;
  
  // Template management
  messageEmailTemplates: MessageEmailTemplate[];
  selectedMessageTemplateId: string;
  setSelectedMessageTemplateId: (id: string) => void;
  loadTemplates: () => void;
  saveTemplates: (templates: MessageEmailTemplate[]) => void;
  applyTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;
  
  // UI state
  showClaimSuggestionModal: boolean;
  setShowClaimSuggestionModal: (show: boolean) => void;
  isSendingMessage: boolean;
  setIsSendingMessage: (sending: boolean) => void;
  
  // Helper to reset composition form
  resetCompositionForm: () => void;
}

const TEMPLATES_STORAGE_KEY = 'cascade_message_templates';

/**
 * Hook for managing message threads, composition, and template state
 */
export function useMessagesData({ 
  messages,
  initialThreadId = null
}: UseMessagesDataParams): UseMessagesDataReturn {
  // Thread selection
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId);
  
  // Composition state
  const [isComposingMessage, setIsComposingMessage] = useState(false);
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [newMessageRecipientId, setNewMessageRecipientId] = useState<string>('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  
  // Reply state
  const [replyContent, setReplyContent] = useState('');
  
  // Template state
  const [messageEmailTemplates, setMessageEmailTemplates] = useState<MessageEmailTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [selectedMessageTemplateId, setSelectedMessageTemplateId] = useState<string>('');
  
  // UI state
  const [showClaimSuggestionModal, setShowClaimSuggestionModal] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Sync selectedThreadId with initialThreadId prop changes
  useEffect(() => {
    if (initialThreadId) {
      setSelectedThreadId(initialThreadId);
    }
  }, [initialThreadId]);
  
  // Find selected thread
  const selectedThread = useMemo(() => {
    return messages.find(t => t.id === selectedThreadId) || null;
  }, [messages, selectedThreadId]);
  
  // Select thread handler
  const selectThread = useCallback((threadId: string | null) => {
    setSelectedThreadId(threadId);
  }, []);
  
  // Load templates from localStorage
  const loadTemplates = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        setMessageEmailTemplates(JSON.parse(stored));
      }
    }
  }, []);
  
  // Save templates to localStorage
  const saveTemplates = useCallback((templates: MessageEmailTemplate[]) => {
    setMessageEmailTemplates(templates);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    }
  }, []);
  
  // Apply a template to the composition form
  const applyTemplate = useCallback((templateId: string) => {
    const template = messageEmailTemplates.find(t => t.id === templateId);
    if (template) {
      setNewMessageSubject(template.subject);
      setNewMessageContent(template.body);
      setSelectedMessageTemplateId(templateId);
    }
  }, [messageEmailTemplates]);
  
  // Delete a template
  const deleteTemplate = useCallback((templateId: string) => {
    const updated = messageEmailTemplates.filter(t => t.id !== templateId);
    saveTemplates(updated);
  }, [messageEmailTemplates, saveTemplates]);
  
  // Reset composition form
  const resetCompositionForm = useCallback(() => {
    setNewMessageSubject('');
    setNewMessageContent('');
    setNewMessageRecipientId('');
    setSelectedMessageTemplateId('');
    setIsComposingMessage(false);
    setShowNewMessageModal(false);
  }, []);
  
  return {
    selectedThreadId,
    selectThread,
    selectedThread,
    isComposingMessage,
    setIsComposingMessage,
    newMessageSubject,
    setNewMessageSubject,
    newMessageContent,
    setNewMessageContent,
    newMessageRecipientId,
    setNewMessageRecipientId,
    showNewMessageModal,
    setShowNewMessageModal,
    replyContent,
    setReplyContent,
    messageEmailTemplates,
    selectedMessageTemplateId,
    setSelectedMessageTemplateId,
    loadTemplates,
    saveTemplates,
    applyTemplate,
    deleteTemplate,
    showClaimSuggestionModal,
    setShowClaimSuggestionModal,
    isSendingMessage,
    setIsSendingMessage,
    resetCompositionForm
  };
}
