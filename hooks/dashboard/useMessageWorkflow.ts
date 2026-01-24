/**
 * Message Workflow Hook - Complex business logic for messaging
 * Handles thread creation, replies, email notifications, and AI intent detection
 */

import { useCallback } from 'react';
import type { MessageThread, InternalEmployee, Homeowner, Claim, UserRole } from '../../types';
import { UserRole as UserRoleEnum } from '../../types';
import { sendEmail, generateNotificationBody } from '../../services/emailService';
import { detectClaimIntent } from '../../services/geminiService';

export interface UseMessageWorkflowParams {
  // User context
  currentUser: { id: string; name: string; email: string };
  userRole: UserRole;
  isAdmin: boolean;
  
  // Homeowner context
  activeHomeowner: Homeowner | null;
  effectiveHomeowner: Homeowner | null;
  
  // Data sources
  messages: MessageThread[];
  employees: InternalEmployee[];
  claims: Claim[];
  
  // Parent callbacks (from App.tsx)
  onCreateThread: (homeownerId: string, subject: string, content: string) => void;
  onSendMessage: (threadId: string, content: string) => void;
  onTrackClaimMessage?: (claimId: string, messageData: any) => void;
  
  // UI state callbacks (from useMessagesData)
  setIsSendingMessage: (sending: boolean) => void;
  setShowClaimSuggestionModal: (show: boolean) => void;
  setShowNewMessageModal: (show: boolean) => void;
  setReplyContent: (content: string) => void;
  setReplyExpanded: (expanded: boolean) => void;
  resetCompositionForm: () => void;
}

export interface UseMessageWorkflowReturn {
  /**
   * Send a reply to an existing thread
   * Handles email quoting, notifications, and claim tracking
   */
  sendReply: (threadId: string, replyContent: string) => Promise<void>;
  
  /**
   * Create a new message thread
   * Handles AI intent detection, email notifications, and claim tracking
   */
  createNewThread: (
    subject: string,
    content: string,
    recipientId?: string,
    forceSend?: boolean
  ) => Promise<void>;
  
  /**
   * Redirect homeowner to warranty claim form
   * (When AI detects claim intent)
   */
  redirectToWarranty: () => void;
}

/**
 * Hook for managing complex message workflow operations
 */
export function useMessageWorkflow({
  currentUser,
  userRole,
  isAdmin,
  activeHomeowner,
  effectiveHomeowner,
  messages,
  employees,
  claims,
  onCreateThread,
  onSendMessage,
  onTrackClaimMessage,
  setIsSendingMessage,
  setShowClaimSuggestionModal,
  setShowNewMessageModal,
  setReplyContent,
  setReplyExpanded,
  resetCompositionForm
}: UseMessageWorkflowParams): UseMessageWorkflowReturn {
  
  /**
   * Send a reply to an existing message thread
   */
  const sendReply = useCallback(async (threadId: string, replyContentText: string) => {
    if (!threadId || !replyContentText.trim()) {
      return;
    }
    
    // Get the thread and last message for quoting
    const thread = messages.find(m => m.id === threadId);
    const lastMessage = thread?.messages[thread.messages.length - 1];
    
    // Create quoted content (Gmail style)
    let fullContent = replyContentText;
    if (lastMessage) {
      const quotedDate = new Date(lastMessage.timestamp).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      fullContent = `${replyContentText}\n\n---\nOn ${quotedDate}, ${lastMessage.senderName} wrote:\n\n${lastMessage.content}`;
    }
    
    // Save message to database via App.tsx
    onSendMessage(threadId, fullContent);
    
    // Send email notification to the other party
    const senderName = isAdmin ? (currentUser?.name || 'Admin') : (activeHomeowner?.name || 'Homeowner');
    
    if (thread && effectiveHomeowner) {
      const recipientEmail = isAdmin ? effectiveHomeowner.email : 'info@cascadebuilderservices.com';
      // Use replies subdomain with thread ID so SendGrid Inbound Parse can capture homeowner replies
      const replyToEmail = isAdmin ? `${thread.id}@replies.cascadeconnect.app` : undefined;
      
      // Generate Cascade Connect messages link
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
        : 'https://www.cascadeconnect.app';
      const messagesLink = `${baseUrl}#messages${thread.id ? `?threadId=${thread.id}` : ''}`;
      
      await sendEmail({
        to: recipientEmail,
        subject: `Re: ${thread.subject}`,
        body: generateNotificationBody(senderName, fullContent, 'MESSAGE', thread.id, messagesLink),
        fromName: senderName,
        fromRole: userRole,
        replyToId: thread.id,
        replyToEmail: replyToEmail
      });
    }
    
    // Send push notification if homeowner sent message and recipient is admin with preference enabled
    if (!isAdmin && employees && employees.length > 0 && thread) {
      try {
        const { pushNotificationService } = await import('../../services/pushNotificationService');
        const permission = await pushNotificationService.requestPermission();
        if (permission === 'granted') {
          // Find admin participants in the thread and send notifications
          const adminParticipants = thread.participants || [];
          for (const participantId of adminParticipants) {
            const emp = employees.find(e => e.id === participantId);
            if (emp && emp.pushNotifyHomeownerMessage === true) {
              await pushNotificationService.notifyHomeownerMessage(
                senderName,
                replyContentText,
                thread.id
              );
              break; // Only send one notification per browser session
            }
          }
        }
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }

    // Track claim-related message if message is from admin and thread is claim-related
    if (isAdmin && thread && onTrackClaimMessage) {
      const associatedClaim = claims.find(c => c.title === thread.subject);
      if (associatedClaim && effectiveHomeowner) {
        onTrackClaimMessage(associatedClaim.id, {
          type: 'HOMEOWNER',
          threadId: thread.id,
          subject: thread.subject,
          recipient: effectiveHomeowner.name,
          recipientEmail: effectiveHomeowner.email,
          content: fullContent,
          senderName: currentUser.name
        });
      }
    }
    
    // Reset UI state
    setReplyContent('');
    setReplyExpanded(false);
  }, [
    messages,
    isAdmin,
    currentUser,
    activeHomeowner,
    effectiveHomeowner,
    employees,
    claims,
    userRole,
    onSendMessage,
    onTrackClaimMessage,
    setReplyContent,
    setReplyExpanded
  ]);

  /**
   * Create a new message thread
   */
  const createNewThread = useCallback(async (
    subject: string,
    content: string,
    recipientId?: string,
    forceSend: boolean = false
  ) => {
    // Validation
    if (!effectiveHomeowner && !isAdmin) {
      return;
    }
    
    if (!effectiveHomeowner && isAdmin) {
      alert("Please select a homeowner to start a message thread.");
      return;
    }
    
    // For homeowner view, require recipient selection
    if (!isAdmin && !recipientId) {
      alert("Please select a recipient.");
      return;
    }
    
    if (!subject || !content) {
      return;
    }
    
    // Determine target homeowner ID
    const targetId = effectiveHomeowner ? effectiveHomeowner.id : (activeHomeowner?.id || '');
    
    // Determine target email: use selected employee email in homeowner view, otherwise use homeowner email or default
    let targetEmail: string;
    if (!isAdmin && recipientId) {
      const selectedEmployee = employees.find(emp => emp.id === recipientId);
      targetEmail = selectedEmployee?.email || 'info@cascadebuilderservices.com';
    } else {
      targetEmail = effectiveHomeowner ? effectiveHomeowner.email : 'info@cascadebuilderservices.com';
    }

    // AI Intent Detection - Only for homeowners, not force-sent, and substantial messages
    if (
      userRole === UserRoleEnum.HOMEOWNER && 
      !forceSend && 
      content.length > 10
    ) {
      setIsSendingMessage(true);
      
      try {
        const isClaimIntent = await detectClaimIntent(content);
        
        if (isClaimIntent) {
          // Detected warranty claim intent - show suggestion modal
          setIsSendingMessage(false);
          setShowClaimSuggestionModal(true);
          return; // Exit early - don't create thread yet
        }
      } catch (error) {
        console.error("Intent detection error:", error);
        // On error, proceed with sending (fail open)
      }
      
      setIsSendingMessage(false);
    }
    
    setIsSendingMessage(true);
    
    // Create Internal Thread (this will also send the email notification via App.tsx)
    onCreateThread(targetId, subject, content);
    
    // Note: Email notification is handled by App.tsx handleCreateThread
    // which has access to the actual thread ID after creation

    // Track claim-related message if thread is from admin and claim-related
    if (isAdmin && onTrackClaimMessage && effectiveHomeowner) {
      const associatedClaim = claims.find(c => c.title === subject);
      if (associatedClaim) {
        onTrackClaimMessage(associatedClaim.id, {
          type: 'HOMEOWNER',
          subject: subject,
          recipient: effectiveHomeowner.name,
          recipientEmail: effectiveHomeowner.email,
          content: content,
          senderName: currentUser.name
        });
      }
    }

    // Reset UI state
    setIsSendingMessage(false);
    setShowNewMessageModal(false);
    resetCompositionForm();
  }, [
    effectiveHomeowner,
    isAdmin,
    activeHomeowner,
    employees,
    userRole,
    claims,
    currentUser,
    onCreateThread,
    onTrackClaimMessage,
    setIsSendingMessage,
    setShowClaimSuggestionModal,
    setShowNewMessageModal,
    resetCompositionForm
  ]);

  /**
   * Redirect homeowner to warranty claim form
   */
  const redirectToWarranty = useCallback(() => {
    setShowClaimSuggestionModal(false);
    setShowNewMessageModal(false);
    // Note: Caller needs to handle tab switching and claim form opening
    // This is done in Dashboard via setCurrentTab('CLAIMS') and setIsCreatingNewClaim(true)
  }, [setShowClaimSuggestionModal, setShowNewMessageModal]);

  return {
    sendReply,
    createNewThread,
    redirectToWarranty
  };
}
