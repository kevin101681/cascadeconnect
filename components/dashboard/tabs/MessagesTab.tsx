/**
 * Messages Tab - Inbox and Thread View
 * 
 * Gmail-style messaging interface with:
 * - Left column: Inbox list with unread count
 * - Right column: Thread view with messages
 * - Compose new message functionality
 * - Message templates (admin only)
 * 
 * Extracted from Dashboard.tsx (Phase 3B)
 */

import React, { Suspense } from 'react';
import { Mail, Search, X, Send, Paperclip, CornerUpLeft, Edit2, Trash2, FileEdit, Home, Loader2 } from 'lucide-react';
import type { MessageThread, Message, InternalEmployee, Homeowner, MessageEmailTemplate } from '../../../types';
import Button from '../../Button';
import MaterialSelect from '../../MaterialSelect';
import { MessageCard } from '../../ui/MessageCard';

interface MessagesTabProps {
  // Data
  threads: MessageThread[];
  selectedThreadId: string | null;
  isComposingMessage: boolean;
  currentUser: { id: string; name: string; role: string };
  effectiveHomeowner: Homeowner | null;
  employees: InternalEmployee[];
  messageEmailTemplates: MessageEmailTemplate[];
  
  // Message content state
  newMessageSubject: string;
  newMessageContent: string;
  newMessageRecipientId: string;
  selectedMessageTemplateId: string;
  replyContent: string;
  replyExpanded: boolean;
  
  // Callbacks
  onSelectThread: (threadId: string | null) => void;
  onSetIsComposingMessage: (isComposing: boolean) => void;
  onSetNewMessageSubject: (subject: string) => void;
  onSetNewMessageContent: (content: string) => void;
  onSetNewMessageRecipientId: (id: string) => void;
  onSetSelectedMessageTemplateId: (id: string) => void;
  onSetReplyContent: (content: string) => void;
  onSetReplyExpanded: (expanded: boolean) => void;
  onSendNewMessage: () => void;
  onSendReply: () => void;
  onMessageTemplateSelect: (templateId: string) => void;
  onOpenMessageTemplateCreator: (template?: MessageEmailTemplate) => void;
  onDeleteMessageTemplate: (templateId: string) => void;
  
  // User context
  isAdmin: boolean;
}

export const MessagesTab: React.FC<MessagesTabProps> = ({
  threads,
  selectedThreadId,
  isComposingMessage,
  currentUser,
  effectiveHomeowner,
  employees,
  messageEmailTemplates,
  newMessageSubject,
  newMessageContent,
  newMessageRecipientId,
  selectedMessageTemplateId,
  replyContent,
  replyExpanded,
  onSelectThread,
  onSetIsComposingMessage,
  onSetNewMessageSubject,
  onSetNewMessageContent,
  onSetNewMessageRecipientId,
  onSetSelectedMessageTemplateId,
  onSetReplyContent,
  onSetReplyExpanded,
  onSendNewMessage,
  onSendReply,
  onMessageTemplateSelect,
  onOpenMessageTemplateCreator,
  onDeleteMessageTemplate,
  isAdmin,
}) => {
  const selectedThread = threads.find(t => t.id === selectedThreadId);
  const unreadCount = threads.filter(t => !t.isRead).length;
  
  // Message filter state (Inbox/Sent/Draft)
  const [messageFilter, setMessageFilter] = React.useState<'inbox' | 'sent' | 'draft'>('inbox');
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <>
    <div className="bg-surface dark:bg-gray-800 md:rounded-3xl md:border border-surface-outline-variant dark:border-gray-700 flex flex-col overflow-hidden h-full min-h-0 md:max-h-[calc(100vh-8rem)]">
       
       {/* Single Full-Width Header with Filters & Search */}
       <div className="w-full px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex items-center justify-between shrink-0 md:rounded-t-modal gap-4">
         {/* Left: Filter Tabs */}
         <div className="flex items-center gap-2">
           <button
             onClick={() => setMessageFilter('inbox')}
             className={`transition-all duration-200 px-4 py-2 rounded-lg text-sm font-medium ${
               messageFilter === 'inbox'
                 ? 'bg-white dark:bg-gray-700 text-primary shadow-md -translate-y-0.5'
                 : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 hover:-translate-y-0.5 hover:shadow-sm'
             }`}
           >
             <div className="flex items-center gap-2">
               <span>Inbox</span>
               {messageFilter === 'inbox' && unreadCount > 0 && (
                 <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-primary text-white">
                   {unreadCount}
                 </span>
               )}
             </div>
           </button>
           <button
             onClick={() => setMessageFilter('sent')}
             className={`transition-all duration-200 px-4 py-2 rounded-lg text-sm font-medium ${
               messageFilter === 'sent'
                 ? 'bg-white dark:bg-gray-700 text-primary shadow-md -translate-y-0.5'
                 : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 hover:-translate-y-0.5 hover:shadow-sm'
             }`}
           >
             Sent
           </button>
           <button
             onClick={() => setMessageFilter('draft')}
             className={`transition-all duration-200 px-4 py-2 rounded-lg text-sm font-medium ${
               messageFilter === 'draft'
                 ? 'bg-white dark:bg-gray-700 text-primary shadow-md -translate-y-0.5'
                 : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 hover:-translate-y-0.5 hover:shadow-sm'
             }`}
           >
             Draft
           </button>
         </div>
         
         {/* Center/Right: Search Bar & Actions */}
         <div className="flex items-center gap-3 ml-auto">
           {/* Search Bar */}
           <div className="relative w-64">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
             <input
               type="text"
               placeholder="Search messages..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-9 pr-4 py-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-surface-on dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
             />
           </div>
           
           {/* Compose Button */}
           <Button
             variant="primary"
             onClick={() => {
               onSetIsComposingMessage(true);
               onSelectThread(null);
             }}
             className="!h-9 !px-4 !text-sm shrink-0 !rounded-xl"
           >
             <span className="hidden sm:inline">Compose</span>
             <span className="sm:hidden">New</span>
           </Button>
         </div>
       </div>

       {/* Content Area: Two-column layout */}
       <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
       {/* Left Column: Inbox List (Gmail Style) */}
       <div className={`w-full md:w-[350px] md:min-w-[350px] md:max-w-[350px] border-b md:border-b-0 md:border-r border-surface-outline-variant dark:border-gray-700 flex flex-col min-h-0 bg-surface dark:bg-gray-800 md:rounded-tl-3xl md:rounded-tr-none md:rounded-bl-3xl ${selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          
          <div 
            className="flex-1 overflow-y-auto p-6 min-h-0 rounded-bl-3xl md:rounded-bl-none"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              maskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)'
            }}
          >
             {threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant dark:text-gray-400 gap-2">
                  <Mail className="h-8 w-8 opacity-20 dark:opacity-40 text-surface-on dark:text-gray-400" />
                  <span className="text-sm">No messages found.</span>
                </div>
             ) : (
                <div className="grid grid-cols-1 gap-3">
                  {threads.map((thread) => {
                    const lastMsg = thread.messages[thread.messages.length - 1];
                    const participants = isAdmin 
                      ? thread.participants.filter(p => p !== currentUser.name).join(', ') || 'Me'
                      : thread.participants.filter(p => p !== effectiveHomeowner?.name).join(', ') || 'Me';
                    
                    const messagePreview = lastMsg?.content || '';
                    const messageDate = new Date(thread.lastMessageAt).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    });

                    return (
                      <MessageCard
                        key={thread.id}
                        title={thread.subject}
                        senderName={participants}
                        dateSent={messageDate}
                        messagePreview={messagePreview}
                        isRead={thread.isRead}
                        isSelected={selectedThreadId === thread.id}
                        onClick={() => {
                          onSelectThread(thread.id);
                          onSetIsComposingMessage(false);
                        }}
                      />
                    );
                  })}
                </div>
             )}
          </div>
       </div>

       {/* Right Column: Email Thread View or Compose - Desktop Only */}
       <div className={`flex-1 flex flex-col bg-surface dark:bg-gray-800 ${!selectedThreadId && !isComposingMessage ? 'hidden md:flex' : 'hidden md:flex'} rounded-tr-3xl rounded-br-3xl md:rounded-r-3xl md:rounded-l-none overflow-hidden`}>
          {isComposingMessage ? (
            // Compose New Message Form
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700 shrink-0">
                <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  New Message
                </h2>
                <button 
                  onClick={() => {
                    onSetIsComposingMessage(false);
                    onSetNewMessageSubject('');
                    onSetNewMessageContent('');
                    onSetNewMessageRecipientId('');
                    onSetSelectedMessageTemplateId('');
                  }} 
                  className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                {/* Recipient Display/Selector */}
                {isAdmin ? (
                  <div className="bg-surface-container dark:bg-gray-700 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-surface-on-variant dark:text-gray-400 uppercase">To</span>
                      <p className="font-medium text-surface-on dark:text-gray-100">
                        {effectiveHomeowner ? effectiveHomeowner.name : 'Select a Homeowner'}
                      </p>
                    </div>
                    <div className="bg-surface dark:bg-gray-800 p-2 rounded-full border border-surface-outline-variant dark:border-gray-600">
                      <Home className="h-4 w-4 text-surface-outline dark:text-gray-500"/>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">To</label>
                    <MaterialSelect
                      value={newMessageRecipientId}
                      onChange={(value) => onSetNewMessageRecipientId(value)}
                      options={[
                        { value: '', label: 'Select a team member' },
                        ...employees
                          .filter(emp => emp.role === 'Administrator')
                          .map(emp => ({
                            value: emp.id,
                            label: emp.name
                          }))
                      ]}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Template Selector - Admin Only */}
                {isAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400">Email Template</label>
                    <button
                      onClick={() => onOpenMessageTemplateCreator()}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <FileEdit className="h-3 w-3" />
                      Manage Templates
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      value={selectedMessageTemplateId}
                      onChange={(e) => {
                        if (e.target.value) {
                          onMessageTemplateSelect(e.target.value);
                        } else {
                          onSetSelectedMessageTemplateId('');
                        }
                      }}
                    >
                      <option value="">Default Template</option>
                      {messageEmailTemplates.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                    {selectedMessageTemplateId && (
                      <>
                        <button
                          onClick={() => {
                            const template = messageEmailTemplates.find(t => t.id === selectedMessageTemplateId);
                            if (template) onOpenMessageTemplateCreator(template);
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit template"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteMessageTemplate(selectedMessageTemplateId)}
                          className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Subject</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={newMessageSubject}
                    onChange={(e) => onSetNewMessageSubject(e.target.value)}
                    placeholder="e.g. Question about warranty"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Message</label>
                  <textarea 
                    rows={8}
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                    value={newMessageContent}
                    onChange={(e) => onSetNewMessageContent(e.target.value)}
                    placeholder="Type your message here..."
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 flex justify-end gap-2 bg-surface-container/30 dark:bg-gray-700/30">
                <Button 
                  onClick={() => {
                    onSetIsComposingMessage(false);
                    onSetNewMessageSubject('');
                    onSetNewMessageContent('');
                    onSetNewMessageRecipientId('');
                    onSetSelectedMessageTemplateId('');
                  }}
                  variant="outlined"
                  className="!h-10 !px-6"
                >
                  Discard
                </Button>
                <Button 
                  onClick={onSendNewMessage}
                  disabled={!newMessageSubject.trim() || !newMessageContent.trim() || (!isAdmin && !newMessageRecipientId)}
                  variant="filled"
                  className="!h-10 !px-6"
                  icon={<Send className="h-4 w-4" />}
                >
                  Send
                </Button>
              </div>
            </div>
          ) : selectedThread ? (
            // Thread View
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-surface-on dark:text-gray-100">{selectedThread.subject}</h2>
                    <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
                      {selectedThread.messages.length} message{selectedThread.messages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button 
                    onClick={() => onSelectThread(null)}
                    className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 md:hidden"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedThread.messages.map((message, idx) => (
                  <div key={idx} className="bg-surface-container dark:bg-gray-700 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-surface-on dark:text-gray-100">{message.senderName}</p>
                        <p className="text-xs text-surface-on-variant dark:text-gray-400">
                          {new Date(message.sentAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-surface-on dark:text-gray-200 whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Reply Box */}
              <div className="border-t border-surface-outline-variant dark:border-gray-700 bg-surface dark:bg-gray-800">
                {replyExpanded ? (
                  <div className="flex flex-col">
                     <textarea 
                        rows={4}
                        placeholder="Write your reply..."
                        autoFocus
                        className="w-full bg-transparent dark:bg-transparent outline-none text-sm p-4 resize-none leading-relaxed text-surface-on dark:text-gray-100"
                        value={replyContent}
                        onChange={(e) => onSetReplyContent(e.target.value)}
                     />
                     <div className="flex justify-between items-center p-3 bg-surface-container/10 dark:bg-gray-700/10">
                        <div className="flex gap-2">
                           <button className="p-2 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full">
                             <Paperclip className="h-4 w-4"/>
                           </button>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button 
                             onClick={() => onSetReplyExpanded(false)}
                             variant="outlined"
                             className="!h-9 !px-6"
                           >
                             Discard
                           </Button>
                           <Button 
                             onClick={onSendReply} 
                             disabled={!replyContent.trim()} 
                             variant="filled" 
                             className="!h-9 !px-6"
                             icon={<Send className="h-3 w-3" />}
                           >
                             Send
                           </Button>
                        </div>
                     </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onSetReplyExpanded(true)}
                    className="w-full p-4 text-left text-sm text-surface-on-variant dark:text-gray-400 hover:bg-surface-container/50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                  >
                    <CornerUpLeft className="h-4 w-4" />
                    Click to reply...
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-surface-on-variant dark:text-gray-400 gap-4 bg-surface-container/10 dark:bg-gray-700/10">
               <div className="w-20 h-20 bg-surface-container dark:bg-gray-700 rounded-full flex items-center justify-center">
                 <Mail className="h-9 w-10 text-surface-outline/50 dark:text-gray-500/50" />
               </div>
               <p className="text-sm font-medium">Select a conversation to read</p>
            </div>
          )}
       </div>
       </div>
    </div>
    
    {/* Mobile Full-Screen Overlay for Message Thread */}
    {selectedThread && (
      <div className="md:hidden fixed inset-0 z-50 bg-surface dark:bg-gray-900 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-surface-on dark:text-gray-100">{selectedThread.subject}</h2>
              <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
                {selectedThread.messages.length} message{selectedThread.messages.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button 
              onClick={() => onSelectThread(null)}
              className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {selectedThread.messages.map((message, idx) => (
            <div key={idx} className="bg-surface-container dark:bg-gray-700 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-surface-on dark:text-gray-100">{message.senderName}</p>
                  <p className="text-xs text-surface-on-variant dark:text-gray-400">
                    {new Date(message.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-sm text-surface-on dark:text-gray-200 whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          ))}
        </div>
        
        {/* Reply Box - Mobile */}
        <div className="border-t border-surface-outline-variant dark:border-gray-700 bg-surface dark:bg-gray-800">
          {replyExpanded ? (
            <div className="flex flex-col">
               <textarea 
                  rows={4}
                  placeholder="Write your reply..."
                  autoFocus
                  className="w-full bg-transparent outline-none text-sm p-4 resize-none leading-relaxed text-surface-on dark:text-gray-100"
                  value={replyContent}
                  onChange={(e) => onSetReplyContent(e.target.value)}
               />
               <div className="flex justify-between items-center p-3 bg-surface-container/10 dark:bg-gray-700/10">
                  <div className="flex gap-2">
                     <button className="p-2 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full">
                       <Paperclip className="h-4 w-4"/>
                     </button>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button 
                       onClick={() => onSetReplyExpanded(false)}
                       variant="outlined"
                       className="!h-9 !px-4"
                     >
                       Discard
                     </Button>
                     <Button 
                       onClick={onSendReply} 
                       disabled={!replyContent.trim()} 
                       variant="filled" 
                       className="!h-9 !px-4"
                       icon={<Send className="h-3 w-3" />}
                     >
                       Send
                     </Button>
                  </div>
               </div>
            </div>
          ) : (
            <button
              onClick={() => onSetReplyExpanded(true)}
              className="w-full p-4 text-left text-sm text-surface-on-variant dark:text-gray-400 hover:bg-surface-container/50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2"
            >
              <CornerUpLeft className="h-4 w-4" />
              Click to reply...
            </button>
          )}
        </div>
      </div>
    )}
    </>
  );
};

export default MessagesTab;
