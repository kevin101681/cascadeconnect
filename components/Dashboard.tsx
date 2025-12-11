
import React, { useState, useEffect } from 'react';
import { Claim, ClaimStatus, UserRole, Homeowner, InternalEmployee, HomeownerDocument, MessageThread, Message, BuilderGroup, Task } from '../types';
import StatusBadge from './StatusBadge';
import { ArrowRight, Calendar, Plus, ClipboardList, Mail, X, Send, Sparkles, Building2, MapPin, Phone, Clock, FileText, Download, Upload, Search, Home, MoreVertical, Paperclip, Edit2, Archive, CheckSquare, Reply, Star, Trash2, ChevronLeft, ChevronRight, CornerUpLeft, Lock as LockIcon, Loader2 } from 'lucide-react';
import Button from './Button';
import { draftInviteEmail } from '../services/geminiService';
import { sendEmail, generateNotificationBody } from '../services/emailService';
import TaskList from './TaskList';

interface DashboardProps {
  claims: Claim[];
  userRole: UserRole;
  onSelectClaim: (claim: Claim) => void;
  onNewClaim: (homeownerId?: string) => void;
  homeowners: Homeowner[];
  activeHomeowner: Homeowner;
  employees: InternalEmployee[];
  currentUser: InternalEmployee;
  
  // Passed from App based on Search
  targetHomeowner: Homeowner | null;
  onClearHomeownerSelection: () => void;
  onUpdateHomeowner?: (homeowner: Homeowner) => void;
  
  // Documents
  documents: HomeownerDocument[];
  onUploadDocument: (doc: Partial<HomeownerDocument>) => void;

  // Messaging
  messages: MessageThread[];
  onSendMessage: (threadId: string, content: string) => void;
  onCreateThread: (homeownerId: string, subject: string, content: string) => void;

  // Builder Groups for Dropdown
  builderGroups?: BuilderGroup[];

  // Initial State Control (Optional)
  initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS';
  initialThreadId?: string | null;

  // Tasks Widget Support
  tasks?: Task[];
  onAddTask: (task: Partial<Task>) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onNavigate?: (view: 'DASHBOARD' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'SUBS') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  claims, 
  userRole, 
  onSelectClaim, 
  onNewClaim,
  homeowners,
  activeHomeowner,
  employees,
  currentUser,
  targetHomeowner,
  onClearHomeownerSelection,
  onUpdateHomeowner,
  documents,
  onUploadDocument,
  messages,
  onSendMessage,
  onCreateThread,
  builderGroups = [],
  initialTab = 'CLAIMS',
  initialThreadId = null,
  tasks = [],
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onNavigate
}) => {
  const isAdmin = userRole === UserRole.ADMIN;
  const isBuilder = userRole === UserRole.BUILDER;
  
  // View State for Dashboard (Claims vs Messages vs Tasks)
  const [currentTab, setCurrentTab] = useState<'CLAIMS' | 'MESSAGES' | 'TASKS'>(initialTab);
  
  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBody, setInviteBody] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  // Documents Modal State
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [isDocUploading, setIsDocUploading] = useState(false);

  // Edit Homeowner Modal State
  const [showEditHomeownerModal, setShowEditHomeownerModal] = useState(false);
  // Fields for editing
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  
  // Split Address
  const [editStreet, setEditStreet] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editZip, setEditZip] = useState('');

  const [editBuilderId, setEditBuilderId] = useState('');
  const [editJobName, setEditJobName] = useState(''); // Replaces Lot/Project
  const [editClosingDate, setEditClosingDate] = useState('');

  // Messaging State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId);
  const [replyContent, setReplyContent] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [replyExpanded, setReplyExpanded] = useState(false);

  // Sync state when props change
  useEffect(() => {
    if (initialTab) setCurrentTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialThreadId) setSelectedThreadId(initialThreadId);
  }, [initialThreadId]);

  // --- Filtering Logic ---
  const effectiveHomeowner = (isAdmin || isBuilder) ? targetHomeowner : activeHomeowner;

  // Sync state when editing starts
  const handleOpenEditHomeowner = () => {
    if (!targetHomeowner) return;
    setEditName(targetHomeowner.name);
    setEditEmail(targetHomeowner.email);
    setEditPhone(targetHomeowner.phone);
    
    // Address Split
    setEditStreet(targetHomeowner.street || '');
    setEditCity(targetHomeowner.city || '');
    setEditState(targetHomeowner.state || '');
    setEditZip(targetHomeowner.zip || '');

    setEditBuilderId(targetHomeowner.builderId || '');
    setEditJobName(targetHomeowner.jobName || '');
    setEditClosingDate(targetHomeowner.closingDate ? new Date(targetHomeowner.closingDate).toISOString().split('T')[0] : '');
    setShowEditHomeownerModal(true);
  };

  const handleSaveHomeowner = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetHomeowner && onUpdateHomeowner) {
        // Find builder name from ID
        const selectedGroup = builderGroups.find(g => g.id === editBuilderId);
        
        onUpdateHomeowner({
            ...targetHomeowner,
            name: editName,
            email: editEmail,
            phone: editPhone,
            street: editStreet,
            city: editCity,
            state: editState,
            zip: editZip,
            address: `${editStreet}, ${editCity}, ${editState} ${editZip}`,
            builder: selectedGroup ? selectedGroup.name : targetHomeowner.builder,
            builderId: editBuilderId,
            jobName: editJobName,
            closingDate: editClosingDate ? new Date(editClosingDate) : targetHomeowner.closingDate
        });
        setShowEditHomeownerModal(false);
    }
  };

  // Filter Claims
  const displayClaims = claims.filter(c => {
    if (effectiveHomeowner) {
      return c.homeownerEmail === effectiveHomeowner.email;
    }
    return true; // Admin viewing all if no specific homeowner selected
  });

  // Filter Documents
  const displayDocuments = documents.filter(d => {
    if (effectiveHomeowner) {
      return d.homeownerId === effectiveHomeowner.id;
    }
    return false; // Don't show documents if no homeowner is selected in Admin view
  });

  // Filter Messages
  const displayThreads = messages.filter(t => {
    if (effectiveHomeowner) {
      return t.homeownerId === effectiveHomeowner.id;
    }
    // If Admin/Builder and NO homeowner selected, show ALL threads
    if (isAdmin) return true;
    return false;
  });

  // Tasks Logic
  const myTasks = tasks.filter(t => t.assignedToId === currentUser.id && !t.isCompleted);

  const selectedThread = displayThreads.find(t => t.id === selectedThreadId);

  const handleDraftInvite = async () => {
    if (!inviteName) return;
    setIsDrafting(true);
    const draft = await draftInviteEmail(inviteName);
    setInviteBody(draft);
    setIsDrafting(false);
  };

  const handleSendInvite = async () => {
    setIsDrafting(true);
    await sendEmail({
      to: inviteEmail,
      subject: 'Welcome to Cascade Builder Services',
      body: inviteBody,
      fromName: 'Cascade Admin',
      fromRole: UserRole.ADMIN
    });
    alert(`Invite sent to ${inviteEmail} via Internal Mail System!`);
    setIsDrafting(false);
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setInviteBody('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Simple client-side limit for database safety
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large (>10MB). Please upload a smaller file.");
        return;
      }

      setIsDocUploading(true);
      const reader = new FileReader();
      
      reader.onloadend = () => {
        if (effectiveHomeowner) {
          onUploadDocument({
            homeownerId: effectiveHomeowner.id,
            name: file.name,
            type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
            uploadedBy: isAdmin ? 'Admin' : 'Homeowner',
            url: reader.result as string // Save Base64 Data URL
          });
        }
        setIsDocUploading(false);
      };
      
      reader.onerror = () => {
        alert("Failed to read file.");
        setIsDocUploading(false);
      };

      reader.readAsDataURL(file);
    }
  };

  const handleSendReply = async () => {
    if (selectedThreadId && replyContent.trim()) {
      onSendMessage(selectedThreadId, replyContent);
      
      // Simulate sending email notification to the other party
      const thread = messages.find(m => m.id === selectedThreadId);
      if (thread && effectiveHomeowner) {
        const recipientEmail = isAdmin ? effectiveHomeowner.email : 'info@cascadebuilderservices.com';
        const senderName = isAdmin ? currentUser.name : activeHomeowner.name;
        
        await sendEmail({
          to: recipientEmail,
          subject: `Re: ${thread.subject}`,
          body: generateNotificationBody(senderName, replyContent, 'MESSAGE', thread.id, 'https://cascadebuilderservices.com/messages'),
          fromName: senderName,
          fromRole: userRole,
          replyToId: thread.id
        });
      }
      
      setReplyContent('');
      setReplyExpanded(false);
    }
  };

  const handleCreateNewThread = async () => {
    if (!effectiveHomeowner && !isAdmin) return;
    
    if (!effectiveHomeowner && isAdmin) {
        alert("Please select a homeowner to start a message thread.");
        return;
    }
    
    // Safe-guard for TS
    const targetId = effectiveHomeowner ? effectiveHomeowner.id : activeHomeowner.id;
    const targetEmail = effectiveHomeowner ? effectiveHomeowner.email : 'info@cascadebuilderservices.com';

    if (!newMessageSubject || !newMessageContent) return;
    
    setIsSendingMessage(true);
    
    // 1. Create Internal Thread
    onCreateThread(targetId, newMessageSubject, newMessageContent);
    
    // 2. Send Email Notification
    const senderName = isAdmin ? currentUser.name : activeHomeowner.name;

    await sendEmail({
      to: targetEmail,
      subject: newMessageSubject,
      body: generateNotificationBody(senderName, newMessageContent, 'MESSAGE', 'new', 'https://cascadebuilderservices.com/messages'),
      fromName: senderName,
      fromRole: userRole
    });

    setIsSendingMessage(false);
    setShowNewMessageModal(false);
    setNewMessageSubject('');
    setNewMessageContent('');
  };

  // --- Render Helpers ---

  const renderClaimGroup = (title: string, groupClaims: Claim[], emptyMsg: string, isClosed: boolean = false) => (
    <div className="bg-surface rounded-3xl border border-surface-outline-variant overflow-hidden mb-6 last:mb-0">
      <div className="px-6 py-6 border-b border-surface-outline-variant flex justify-between items-center bg-surface-container/30">
        <h3 className={`text-lg font-bold flex items-center gap-2 ${isClosed ? 'text-surface-on-variant' : 'text-surface-on'}`}>
          {isClosed ? <Archive className="h-5 w-5 opacity-70"/> : <ClipboardList className="h-5 w-5 text-primary"/>}
          {title}
        </h3>
        <span className="text-xs text-surface-on-variant bg-surface-container px-2 py-1 rounded border border-surface-outline-variant/50">
          {groupClaims.length}
        </span>
      </div>
      <ul className="divide-y divide-surface-outline-variant">
        {groupClaims.length === 0 ? (
          <li className="p-8 text-center text-surface-on-variant text-sm italic">
            {emptyMsg}
          </li>
        ) : (
          groupClaims.map((claim) => (
            <li key={claim.id} className="hover:bg-surface-container-high transition-colors">
              <button 
                onClick={() => onSelectClaim(claim)}
                className="w-full text-left px-6 py-4 flex items-center justify-between group"
              >
                <div className={isClosed ? 'opacity-70' : ''}>
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="text-xs font-bold text-primary tracking-wide">#{claim.id}</span>
                    <StatusBadge status={claim.status} />
                  </div>
                  <h4 className="text-lg font-normal text-surface-on group-hover:text-primary transition-colors">
                    {claim.title}
                  </h4>
                  <div className="mt-1 flex items-center text-sm text-surface-on-variant space-x-3">
                    <span>{new Date(claim.dateSubmitted).toLocaleDateString()}</span>
                    <span className="w-1 h-1 bg-surface-outline rounded-full"></span>
                    <span>{claim.category}</span>
                    {/* Only show homeowner name if viewing all (admin view without filter) */}
                    {(isAdmin || isBuilder) && !effectiveHomeowner && (
                      <>
                        <span className="w-1 h-1 bg-surface-outline rounded-full"></span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {claim.homeownerName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-surface-outline-variant group-hover:text-primary" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );

  const renderClaimsList = (claimsList: Claim[]) => {
    const openClaims = claimsList.filter(c => c.status !== ClaimStatus.COMPLETED);
    const closedClaims = claimsList.filter(c => c.status === ClaimStatus.COMPLETED);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2">
          {renderClaimGroup('Active Claims', openClaims, 'No active claims.')}
          {renderClaimGroup('Closed Claims', closedClaims, 'No closed claims history.', true)}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Upcoming Schedule Card */}
          <div className="bg-secondary-container p-6 rounded-3xl text-secondary-on-container">
            <h3 className="font-medium text-lg mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-3" />
              Upcoming Schedule
            </h3>
            <div className="space-y-3">
              {claimsList
                .filter(c => c.status === ClaimStatus.SCHEDULED)
                .slice(0, 3)
                .map(c => {
                  const acceptedDate = c.proposedDates.find(d => d.status === 'ACCEPTED');
                  return (
                    <div key={c.id} className="bg-surface/50 p-4 rounded-xl text-sm backdrop-blur-sm border border-white/20">
                      <p className="font-medium">{c.title}</p>
                      <p className="opacity-80 mt-1">
                        {acceptedDate ? new Date(acceptedDate.date).toLocaleDateString() : 'N/A'} - {acceptedDate?.timeSlot}
                      </p>
                    </div>
                  )
                })}
              {claimsList.filter(c => c.status === ClaimStatus.SCHEDULED).length === 0 && (
                <p className="text-sm opacity-70">No confirmed appointments.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMessagesTab = () => (
    <div className="bg-surface rounded-3xl border border-surface-outline-variant overflow-hidden flex flex-col md:flex-row h-[700px] shadow-elevation-1">
       {/* Left Column: Inbox List (Gmail Style) */}
       <div className={`w-full md:w-96 border-b md:border-b-0 md:border-r border-surface-outline-variant flex flex-col bg-surface ${selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-surface-outline-variant bg-surface flex justify-between items-center h-16 shrink-0">
            <h3 className="text-lg font-bold text-surface-on flex items-center gap-2">
              Inbox
              <span className="text-xs font-normal text-surface-on-variant bg-surface-container px-2 py-0.5 rounded-full">{displayThreads.filter(t => !t.isRead).length} new</span>
            </h3>
            {/* Builders Read Only */}
            {!isBuilder && (
              <Button 
                variant="tonal" 
                icon={<Plus className="h-4 w-4"/>} 
                className="!h-8 !px-3 text-xs"
                onClick={() => setShowNewMessageModal(true)}
              >
                Compose
              </Button>
            )}
          </div>
          
          <div className="p-2 border-b border-surface-outline-variant/50">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant" />
                <input 
                  type="text" 
                  placeholder="Search mail..." 
                  className="w-full bg-surface-container rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder-surface-outline-variant"
                />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto">
             {displayThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant gap-2">
                  <Mail className="h-8 w-8 opacity-20" />
                  <span className="text-sm">No messages found.</span>
                </div>
             ) : (
                displayThreads.map(thread => {
                  const lastMsg = thread.messages[thread.messages.length - 1];
                  const isUnread = !thread.isRead;
                  const isSelected = selectedThreadId === thread.id;

                  return (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`w-full text-left p-4 border-b border-surface-outline-variant/30 hover:bg-surface-container transition-colors group relative ${
                        isSelected ? 'bg-primary-container/20' : isUnread ? 'bg-surface' : 'bg-surface-container/5'
                      }`}
                    >
                       {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                       
                       <div className="flex justify-between items-baseline mb-1">
                          <span className={`text-sm truncate pr-2 ${isUnread ? 'font-bold text-surface-on' : 'font-medium text-surface-on'}`}>
                            {/* In a real email client, this shows the other party. Simulating roughly here. */}
                            {isAdmin ? thread.participants.filter(p => p !== currentUser.name).join(', ') || 'Me' : thread.participants.filter(p => p !== activeHomeowner.name).join(', ') || 'Me'}
                          </span>
                          <span className={`text-xs whitespace-nowrap ${isUnread ? 'text-primary font-bold' : 'text-surface-on-variant'}`}>
                            {new Date(thread.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                       </div>
                       
                       <div className={`text-sm mb-1 truncate ${isUnread ? 'font-bold text-surface-on' : 'text-surface-on-variant'}`}>
                         {thread.subject}
                       </div>
                       
                       <div className="text-xs text-surface-on-variant/80 truncate font-normal">
                         <span className="text-surface-outline-variant mr-1">
                           {lastMsg.senderName === (isAdmin ? currentUser.name : activeHomeowner.name) ? 'You:' : ''}
                         </span>
                         {lastMsg.content}
                       </div>
                    </button>
                  );
                })
             )}
          </div>
       </div>

       {/* Right Column: Email Thread View */}
       <div className={`flex-1 flex flex-col bg-white ${!selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          {selectedThread ? (
            <>
               {/* Thread Header Toolbar */}
               <div className="h-16 shrink-0 px-6 border-b border-surface-outline-variant flex items-center justify-between bg-surface sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                     <button onClick={() => setSelectedThreadId(null)} className="md:hidden p-2 -ml-2 text-surface-on-variant hover:bg-surface-container rounded-full">
                        <ChevronLeft className="h-5 w-5" />
                     </button>
                     <div className="flex gap-2">
                        <button className="p-2 text-surface-on-variant hover:bg-surface-container rounded-full" title="Archive"><Archive className="h-4 w-4"/></button>
                        <button className="p-2 text-surface-on-variant hover:bg-surface-container rounded-full" title="Delete"><Trash2 className="h-4 w-4"/></button>
                        <div className="w-px h-6 bg-surface-outline-variant/50 mx-1 self-center"></div>
                        <button className="p-2 text-surface-on-variant hover:bg-surface-container rounded-full" title="Mark as unread"><Mail className="h-4 w-4"/></button>
                     </div>
                  </div>
                  <div className="flex gap-2 text-surface-on-variant">
                     <button className="p-2 hover:bg-surface-container rounded-full"><ChevronLeft className="h-4 w-4"/></button>
                     <button className="p-2 hover:bg-surface-container rounded-full"><ChevronRight className="h-4 w-4"/></button>
                  </div>
               </div>

               {/* Scrollable Thread Content */}
               <div className="flex-1 overflow-y-auto">
                 <div className="px-8 py-6">
                    {/* Subject Line */}
                    <div className="flex items-start justify-between mb-8">
                       <h2 className="text-2xl font-normal text-surface-on leading-tight">{selectedThread.subject}</h2>
                       <button className="p-2 -mr-2 text-surface-outline-variant hover:text-yellow-500 rounded-full">
                         <Star className="h-5 w-5" />
                       </button>
                    </div>

                    {/* Messages Loop */}
                    <div className="space-y-8">
                      {selectedThread.messages.map((msg, idx) => {
                        const isMe = isAdmin ? msg.senderRole === UserRole.ADMIN : msg.senderRole === UserRole.HOMEOWNER;
                        return (
                          <div key={msg.id} className="group">
                             <div className="flex items-start gap-4 mb-3">
                                {/* Avatar */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${
                                   isMe ? 'bg-primary text-primary-on' : 'bg-tertiary-container text-tertiary-on-container'
                                }`}>
                                   {msg.senderName.charAt(0)}
                                </div>

                                <div className="flex-1 min-w-0">
                                   <div className="flex items-baseline justify-between">
                                      <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-surface-on text-sm">{msg.senderName}</span>
                                        <span className="text-xs text-surface-on-variant">&lt;{isMe ? 'me' : msg.senderRole.toLowerCase()}&gt;</span>
                                      </div>
                                      <div className="text-xs text-surface-on-variant group-hover:text-surface-on transition-colors">
                                         {new Date(msg.timestamp).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                      </div>
                                   </div>
                                   <div className="text-xs text-surface-on-variant">to {isMe ? (effectiveHomeowner?.name || 'Homeowner') : 'Me'}</div>
                                </div>
                             </div>
                             
                             {/* Message Body - Full Width Email Style */}
                             <div className="pl-14 text-sm text-surface-on/90 whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                             </div>
                             
                             {/* Divider if not last */}
                             {idx < selectedThread.messages.length - 1 && (
                               <div className="mt-8 border-b border-surface-outline-variant/30 ml-14"></div>
                             )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Bottom Padding for Reply Box visibility */}
                    <div className="h-32"></div>
                 </div>
               </div>

               {/* Reply Box (Sticky Bottom or Inline at end) */}
               <div className="p-6 border-t border-surface-outline-variant bg-surface sticky bottom-0 z-10">
                 {/* Builders Read-Only: Cannot Reply */}
                 {isBuilder ? (
                   <div className="text-center text-sm text-surface-on-variant bg-surface-container p-4 rounded-xl border border-surface-outline-variant border-dashed">
                     <LockIcon className="h-4 w-4 mx-auto mb-2 opacity-50"/>
                     Read-only access. You cannot reply to threads.
                   </div>
                 ) : (
                    !replyExpanded ? (
                       <button 
                         onClick={() => setReplyExpanded(true)}
                         className="w-full flex items-center gap-3 p-4 rounded-full border border-surface-outline-variant text-surface-on-variant hover:shadow-elevation-1 hover:bg-surface transition-all group"
                       >
                          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                            <Reply className="h-4 w-4 text-surface-outline" />
                          </div>
                          <span className="text-sm font-medium group-hover:text-surface-on">Reply to this conversation...</span>
                       </button>
                    ) : (
                      <div className="bg-surface rounded-xl shadow-elevation-2 border border-surface-outline-variant overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                         <div className="flex items-center gap-2 p-3 border-b border-surface-outline-variant/50 bg-surface-container/20">
                            <CornerUpLeft className="h-4 w-4 text-surface-outline-variant"/>
                            <span className="text-xs font-medium text-surface-on-variant">Replying to {selectedThread.participants.filter(p => p !== (isAdmin ? currentUser.name : activeHomeowner.name)).join(', ')}</span>
                         </div>
                         <textarea
                            rows={6}
                            autoFocus
                            placeholder=""
                            className="w-full bg-transparent outline-none text-sm p-4 resize-none leading-relaxed"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                         />
                         <div className="flex justify-between items-center p-3 bg-surface-container/10">
                            <div className="flex gap-2">
                               <button className="p-2 text-surface-outline-variant hover:text-primary hover:bg-primary/5 rounded-full"><Paperclip className="h-4 w-4"/></button>
                               <button className="p-2 text-surface-outline-variant hover:text-primary hover:bg-primary/5 rounded-full"><Building2 className="h-4 w-4"/></button>
                            </div>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => setReplyExpanded(false)}
                                 className="p-2 text-surface-on-variant hover:text-surface-on text-sm font-medium"
                               >
                                 Discard
                               </button>
                               <Button 
                                 onClick={handleSendReply} 
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
                    )
                 )}
               </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-surface-on-variant gap-4 bg-surface-container/10">
               <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center">
                 <Mail className="h-10 w-10 text-surface-outline/50" />
               </div>
               <p className="text-sm font-medium">Select a conversation to read</p>
            </div>
          )}
       </div>
    </div>
  );

  // --- Main Render Logic ---

  // 1. HOMEOWNER CONTEXT VIEW (When Admin selects a homeowner)
  if ((isAdmin || isBuilder) && targetHomeowner) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
        {/* COMPACT HOMEOWNER HEADER CARD */}
        <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant shadow-elevation-1 group relative">
          <div className="flex-1 min-w-0">
             
             {/* Header Row: Name, Builder, Closing, Edit */}
             <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
                <h2 className="text-2xl font-normal text-surface-on truncate">{targetHomeowner.name}</h2>
                
                <span className="bg-primary-container text-primary-on-container text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {targetHomeowner.builder}
                </span>

                <span className="flex items-center gap-1.5 text-xs text-surface-on-variant bg-surface-container px-2.5 py-0.5 rounded-full border border-surface-outline-variant">
                   <Clock className="h-3 w-3 text-surface-outline" />
                   Closing: {targetHomeowner.closingDate ? new Date(targetHomeowner.closingDate).toLocaleDateString() : 'N/A'}
                </span>

                {/* Edit Button - Admin Only */}
                {isAdmin && (
                  <button 
                     onClick={handleOpenEditHomeowner}
                     className="ml-1 p-1.5 text-surface-outline-variant hover:text-primary bg-transparent hover:bg-primary/10 rounded-full transition-colors"
                     title="Edit Homeowner Info"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
             </div>
             
             {/* Info Grid - 2 Columns */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                
                {/* Column 1: Location */}
                <div className="space-y-1.5">
                   <div className="flex items-center gap-2.5 text-surface-on">
                      <Home className="h-4 w-4 text-surface-outline flex-shrink-0" />
                      <span className="font-medium">{targetHomeowner.jobName || 'N/A'}</span>
                   </div>
                   <a 
                     href={`https://maps.google.com/?q=${encodeURIComponent(targetHomeowner.address)}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-start gap-2.5 text-surface-on-variant pl-0.5 hover:text-primary transition-colors"
                   >
                      <MapPin className="h-4 w-4 text-surface-outline flex-shrink-0 mt-0.5" />
                      <span className="leading-tight">{targetHomeowner.address}</span>
                   </a>
                </div>

                {/* Column 2: Contact */}
                <div className="space-y-1.5">
                   <a href={`tel:${targetHomeowner.phone}`} className="flex items-center gap-2.5 text-surface-on-variant hover:text-primary transition-colors">
                      <Phone className="h-4 w-4 text-surface-outline flex-shrink-0" />
                      <span>{targetHomeowner.phone}</span>
                   </a>
                   <div className="flex items-center gap-2.5 text-surface-on-variant">
                      <Mail className="h-4 w-4 text-surface-outline flex-shrink-0" />
                      <a href={`mailto:${targetHomeowner.email}`} className="hover:text-primary transition-colors">{targetHomeowner.email}</a>
                   </div>
                </div>

             </div>

             {/* Actions Positioned Absolute Top Right or Flex End if narrow */}
             <div className="mt-6 pt-4 border-t border-surface-outline-variant/50 flex items-center justify-end gap-2 flex-wrap">
                <Button 
                  onClick={() => setShowDocsModal(true)} 
                  variant="outlined" 
                  icon={<FileText className="h-4 w-4" />}
                  className="!h-9 !px-4"
                >
                  Documents
                </Button>
                {/* Admin Only Actions */}
                {isAdmin && (
                  <>
                    <Button 
                      onClick={async () => {
                        setInviteName(targetHomeowner.name);
                        setInviteEmail(targetHomeowner.email);
                        const defaultBody = await draftInviteEmail(targetHomeowner.name);
                        setInviteBody(defaultBody);
                        setShowInviteModal(true);
                      }} 
                      variant="tonal" 
                      icon={<Mail className="h-4 w-4" />}
                      className="!h-9 !px-4"
                    >
                      Invite
                    </Button>
                    <Button 
                      variant="filled" 
                      onClick={() => onNewClaim(targetHomeowner.id)} 
                      icon={<Plus className="h-4 w-4" />}
                      className="!h-9 !px-4"
                    >
                      New Claim
                    </Button>
                  </>
                )}
              </div>
          </div>
        </div>

        {/* Navigation Tabs (Context Specific) */}
        <div className="flex gap-6 border-b border-surface-outline-variant px-4">
           <button 
              onClick={() => setCurrentTab('CLAIMS')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 px-2 ${currentTab === 'CLAIMS' ? 'border-primary text-primary' : 'border-transparent text-surface-on-variant hover:text-surface-on'}`}
            >
              <ClipboardList className="h-4 w-4" />
              Warranty
            </button>
            
            {/* TASKS TAB - Admin Only */}
            {isAdmin && (
              <button 
                onClick={() => setCurrentTab('TASKS')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 px-2 ${currentTab === 'TASKS' ? 'border-primary text-primary' : 'border-transparent text-surface-on-variant hover:text-surface-on'}`}
              >
                <CheckSquare className="h-4 w-4" />
                Tasks
              </button>
            )}

            <button 
              onClick={() => setCurrentTab('MESSAGES')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 px-2 ${currentTab === 'MESSAGES' ? 'border-primary text-primary' : 'border-transparent text-surface-on-variant hover:text-surface-on'}`}
            >
              <Mail className="h-4 w-4" />
              Messages
              {displayThreads.some(t => !t.isRead) && (
                <span className="w-2 h-2 rounded-full bg-error ml-1"></span>
              )}
            </button>
        </div>

        {/* Content Area */}
        {currentTab === 'CLAIMS' && (
          <>
            {renderClaimsList(displayClaims)}
          </>
        )}

        {currentTab === 'TASKS' && isAdmin && (
          <div className="bg-surface rounded-3xl border border-surface-outline-variant p-6 shadow-elevation-1">
            <TaskList 
              tasks={tasks}
              employees={employees}
              currentUser={currentUser}
              claims={claims}
              homeowners={homeowners}
              onAddTask={onAddTask}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
              preSelectedHomeowner={targetHomeowner}
            />
          </div>
        )}

        {currentTab === 'MESSAGES' && renderMessagesTab()}

        {/* DOCUMENTS MODAL */}
        {showDocsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="p-6 border-b border-surface-outline-variant bg-surface-container flex justify-between items-center">
                  <h2 className="text-lg font-normal text-surface-on flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Account Documents
                  </h2>
                  <button onClick={() => setShowDocsModal(false)} className="text-surface-on-variant hover:text-surface-on">
                    <X className="h-5 w-5" />
                  </button>
               </div>
               
               <div className="p-6">
                 {/* List */}
                 <div className="mb-6 space-y-2 max-h-60 overflow-y-auto pr-1">
                    {displayDocuments.length === 0 ? (
                      <div className="text-center text-sm text-surface-on-variant py-8 border border-dashed border-surface-outline-variant rounded-xl bg-surface-container/30">
                        No documents uploaded for this account.
                      </div>
                    ) : (
                      displayDocuments.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container border border-surface-outline-variant group transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-red-50 text-red-600 rounded">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-surface-on truncate">{doc.name}</p>
                              <p className="text-xs text-surface-on-variant">
                                Uploaded by {doc.uploadedBy} • {new Date(doc.uploadDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {doc.url.startsWith('data:') ? (
                            <a href={doc.url} download={doc.name} className="p-2 text-surface-outline-variant hover:text-primary rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all">
                                <Download className="h-4 w-4" />
                            </a>
                          ) : (
                             <button className="p-2 text-surface-outline-variant hover:text-primary rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all">
                                <Download className="h-4 w-4" />
                             </button>
                          )}
                        </div>
                      ))
                    )}
                 </div>
                 
                 {/* Footer Upload Action */}
                 <div className="pt-4 border-t border-surface-outline-variant flex justify-center">
                    <label className={`cursor-pointer flex items-center gap-2 px-6 py-3 rounded-full transition-colors border ${isDocUploading ? 'bg-surface-container border-primary/30 cursor-wait' : 'bg-surface-container hover:bg-surface-container-high border-surface-outline-variant text-primary font-medium'}`}>
                        {isDocUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {isDocUploading ? 'Uploading...' : 'Upload New Document'}
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={isDocUploading} />
                    </label>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* INVITE MODAL */}
        {showInviteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-surface w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-surface-outline-variant flex justify-between items-center bg-surface-container">
                  <h2 className="text-lg font-normal text-surface-on flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Invite Homeowner
                  </h2>
                  <button onClick={() => setShowInviteModal(false)} className="text-surface-on-variant hover:text-surface-on">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant mb-1">Full Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant mb-1">Email Address</label>
                    <input 
                      type="email" 
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-surface-on-variant">Invitation Message</label>
                      <Button 
                        variant="text" 
                        onClick={handleDraftInvite} 
                        disabled={isDrafting || !inviteName} 
                        className="!h-6 !text-xs !px-2"
                        icon={isDrafting ? <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"/> : <Sparkles className="h-3 w-3" />}
                      >
                        {isDrafting ? 'Drafting...' : 'Reset Template'}
                      </Button>
                    </div>
                    <textarea 
                      rows={12}
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none text-xs leading-relaxed"
                      value={inviteBody}
                      onChange={(e) => setInviteBody(e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-4 bg-surface-container flex justify-end gap-3">
                  <Button variant="text" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                  <Button variant="filled" onClick={handleSendInvite} disabled={!inviteEmail || !inviteBody || isDrafting} icon={<Send className="h-4 w-4" />}>
                    Send Invitation
                  </Button>
                </div>
             </div>
          </div>
        )}

        {/* EDIT HOMEOWNER MODAL */}
        {showEditHomeownerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-surface w-full max-w-2xl rounded-3xl shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-surface-outline-variant flex justify-between items-center bg-surface-container">
                  <h2 className="text-lg font-normal text-surface-on flex items-center gap-2">
                    <Edit2 className="h-5 w-5 text-primary" />
                    Edit Homeowner Information
                  </h2>
                  <button onClick={() => setShowEditHomeownerModal(false)} className="text-surface-on-variant hover:text-surface-on">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSaveHomeowner} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-medium text-surface-on-variant mb-1">Full Name</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-on-variant mb-1">Email</label>
                        <input 
                          type="email" 
                          required
                          className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-on-variant mb-1">Phone</label>
                        <input 
                          type="tel" 
                          required
                          className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />
                      </div>
                      
                      {/* Split Address Fields */}
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-medium text-surface-on-variant mb-1">Street Address</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editStreet}
                          onChange={(e) => setEditStreet(e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2 grid grid-cols-6 gap-2">
                         <div className="col-span-3">
                           <input type="text" placeholder="City" required className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                         </div>
                         <div className="col-span-1">
                           <input type="text" placeholder="State" required className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={editState} onChange={(e) => setEditState(e.target.value)} />
                         </div>
                         <div className="col-span-2">
                           <input type="text" placeholder="Zip" required className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={editZip} onChange={(e) => setEditZip(e.target.value)} />
                         </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-surface-on-variant mb-1">Builder</label>
                        <select 
                          required
                          className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editBuilderId}
                          onChange={(e) => setEditBuilderId(e.target.value)}
                        >
                          <option value="">Select Builder...</option>
                          {builderGroups.map(bg => (
                            <option key={bg.id} value={bg.id}>{bg.name}</option>
                          ))}
                        </select>
                      </div>
                       <div>
                        <label className="block text-xs font-medium text-surface-on-variant mb-1">Closing Date</label>
                        <input 
                          type="date" 
                          required
                          className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editClosingDate}
                          onChange={(e) => setEditClosingDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-on-variant mb-1">Job Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editJobName}
                          onChange={(e) => setEditJobName(e.target.value)}
                          placeholder="e.g. Maple Ridge - Lot 42"
                        />
                      </div>
                   </div>

                   <div className="p-4 bg-surface-container flex justify-end gap-3 -mx-6 -mb-6 mt-6">
                      <Button variant="text" onClick={() => setShowEditHomeownerModal(false)}>Cancel</Button>
                      <Button 
                        variant="filled" 
                        type="submit"
                        icon={<Edit2 className="h-4 w-4" />}
                      >
                        Save Changes
                      </Button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {/* NEW MESSAGE MODAL */}
        {showNewMessageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-surface w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-surface-outline-variant flex justify-between items-center bg-surface-container">
                  <h2 className="text-lg font-normal text-surface-on flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    New Message
                  </h2>
                  <button onClick={() => setShowNewMessageModal(false)} className="text-surface-on-variant hover:text-surface-on">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Recipient Display */}
                  <div className="bg-surface-container p-3 rounded-xl flex items-center justify-between">
                     <div>
                       <span className="text-xs font-bold text-surface-on-variant uppercase">To</span>
                       <p className="font-medium text-surface-on">
                         {isAdmin 
                           ? (effectiveHomeowner ? effectiveHomeowner.name : 'Select a Homeowner') 
                           : 'Cascade Support Team'
                         }
                       </p>
                     </div>
                     <div className="bg-surface p-2 rounded-full border border-surface-outline-variant">
                        {isAdmin ? <Home className="h-4 w-4 text-surface-outline"/> : <Building2 className="h-4 w-4 text-surface-outline"/>}
                     </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant mb-1">Subject</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      value={newMessageSubject}
                      onChange={(e) => setNewMessageSubject(e.target.value)}
                      placeholder="e.g. Question about warranty"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant mb-1">Message</label>
                    <textarea 
                      rows={6}
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      placeholder="Type your message here..."
                    />
                  </div>
                </div>

                <div className="p-4 bg-surface-container flex justify-end gap-3">
                  <Button variant="text" onClick={() => setShowNewMessageModal(false)}>Cancel</Button>
                  <Button 
                    variant="filled" 
                    onClick={handleCreateNewThread} 
                    disabled={!newMessageSubject || !newMessageContent || isSendingMessage} 
                    icon={isSendingMessage ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <Send className="h-4 w-4" />}
                  >
                    Send Message
                  </Button>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  // 2. ADMIN/BUILDER PLACEHOLDER VIEW (When no homeowner is selected)
  if ((isAdmin || isBuilder) && !targetHomeowner) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-surface-container-high p-6 rounded-full">
                <Search className="h-12 w-12 text-surface-outline" />
            </div>
            <div>
                <h2 className="text-xl font-normal text-surface-on">Select a Homeowner</h2>
                <p className="text-surface-on-variant mt-2 max-w-sm mx-auto">
                    Search for a homeowner in the top bar to view their warranty claims, tasks, and account details.
                </p>
                {isBuilder && (
                   <p className="text-surface-on-variant mt-1 text-xs">
                     You are logged in as a Builder. Access is limited to your homeowners.
                   </p>
                )}
            </div>
        </div>
    );
  }

  // 3. HOMEOWNER PORTAL VIEW (Not Admin/Builder)
  return (
    <div className="space-y-6">
      {/* Homeowner Header & Actions */}
      <div className="flex justify-between items-center bg-surface p-6 rounded-3xl border border-surface-outline-variant shadow-elevation-1">
        <div>
          <h1 className="text-2xl font-normal text-surface-on">My Home</h1>
          <p className="text-surface-on-variant text-sm mt-1">{activeHomeowner.address}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outlined" 
            onClick={() => setShowDocsModal(true)}
            icon={<FileText className="h-4 w-4" />}
          >
            Documents
          </Button>
          <Button 
            variant="filled" 
            onClick={() => onNewClaim()}
            icon={<Plus className="h-4 w-4" />}
          >
            New Claim
          </Button>
        </div>
      </div>

       {/* Navigation Tabs (Homeowner) */}
       <div className="flex gap-6 border-b border-surface-outline-variant px-4">
           <button 
              onClick={() => setCurrentTab('CLAIMS')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 px-2 ${currentTab === 'CLAIMS' ? 'border-primary text-primary' : 'border-transparent text-surface-on-variant hover:text-surface-on'}`}
            >
              <ClipboardList className="h-4 w-4" />
              My Claims
            </button>
             <button 
              onClick={() => setCurrentTab('MESSAGES')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 px-2 ${currentTab === 'MESSAGES' ? 'border-primary text-primary' : 'border-transparent text-surface-on-variant hover:text-surface-on'}`}
            >
              <Mail className="h-4 w-4" />
              Messages
              {displayThreads.some(t => !t.isRead) && (
                <span className="w-2 h-2 rounded-full bg-error ml-1"></span>
              )}
            </button>
        </div>

      {currentTab === 'CLAIMS' && renderClaimsList(displayClaims)}

      {currentTab === 'MESSAGES' && renderMessagesTab()}

      {/* NEW MESSAGE MODAL (Shared logic) */}
      {showNewMessageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-surface w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-surface-outline-variant flex justify-between items-center bg-surface-container">
                  <h2 className="text-lg font-normal text-surface-on flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    New Message
                  </h2>
                  <button onClick={() => setShowNewMessageModal(false)} className="text-surface-on-variant hover:text-surface-on">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="bg-surface-container p-3 rounded-xl flex items-center justify-between">
                     <div>
                       <span className="text-xs font-bold text-surface-on-variant uppercase">To</span>
                       <p className="font-medium text-surface-on">Cascade Support Team</p>
                     </div>
                     <div className="bg-surface p-2 rounded-full border border-surface-outline-variant">
                        <Building2 className="h-4 w-4 text-surface-outline"/>
                     </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant mb-1">Subject</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      value={newMessageSubject}
                      onChange={(e) => setNewMessageSubject(e.target.value)}
                      placeholder="e.g. Question about warranty"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant mb-1">Message</label>
                    <textarea 
                      rows={6}
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      placeholder="Type your message here..."
                    />
                  </div>
                </div>

                <div className="p-4 bg-surface-container flex justify-end gap-3">
                  <Button variant="text" onClick={() => setShowNewMessageModal(false)}>Cancel</Button>
                  <Button 
                    variant="filled" 
                    onClick={handleCreateNewThread} 
                    disabled={!newMessageSubject || !newMessageContent || isSendingMessage} 
                    icon={isSendingMessage ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <Send className="h-4 w-4" />}
                  >
                    Send Message
                  </Button>
                </div>
             </div>
          </div>
        )}
      
      {/* DOCUMENTS MODAL (Reuse for Homeowner View) */}
      {showDocsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="p-6 border-b border-surface-outline-variant bg-surface-container flex justify-between items-center">
                  <h2 className="text-lg font-normal text-surface-on flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Account Documents
                  </h2>
                  <button onClick={() => setShowDocsModal(false)} className="text-surface-on-variant hover:text-surface-on">
                    <X className="h-5 w-5" />
                  </button>
               </div>
               
               <div className="p-6">
                 {/* List */}
                 <div className="mb-6 space-y-2 max-h-60 overflow-y-auto pr-1">
                    {displayDocuments.length === 0 ? (
                      <div className="text-center text-sm text-surface-on-variant py-8 border border-dashed border-surface-outline-variant rounded-xl bg-surface-container/30">
                        No documents uploaded for this account.
                      </div>
                    ) : (
                      displayDocuments.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container border border-surface-outline-variant group transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-red-50 text-red-600 rounded">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-surface-on truncate">{doc.name}</p>
                              <p className="text-xs text-surface-on-variant">
                                Uploaded by {doc.uploadedBy} • {new Date(doc.uploadDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                           {doc.url.startsWith('data:') ? (
                            <a href={doc.url} download={doc.name} className="p-2 text-surface-outline-variant hover:text-primary rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all">
                                <Download className="h-4 w-4" />
                            </a>
                          ) : (
                             <button className="p-2 text-surface-outline-variant hover:text-primary rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all">
                                <Download className="h-4 w-4" />
                             </button>
                          )}
                        </div>
                      ))
                    )}
                 </div>
                 
                 {/* Footer Upload Action */}
                 <div className="pt-4 border-t border-surface-outline-variant flex justify-center">
                    <label className={`cursor-pointer flex items-center gap-2 px-6 py-3 rounded-full transition-colors border ${isDocUploading ? 'bg-surface-container border-primary/30 cursor-wait' : 'bg-surface-container hover:bg-surface-container-high border-surface-outline-variant text-primary font-medium'}`}>
                        {isDocUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {isDocUploading ? 'Uploading...' : 'Upload New Document'}
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={isDocUploading} />
                    </label>
                 </div>
               </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Dashboard;
