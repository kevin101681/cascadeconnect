import React, { useState, useEffect } from 'react';
import { Claim, ClaimStatus, UserRole, Homeowner, InternalEmployee, HomeownerDocument, MessageThread, Message, BuilderGroup, Task } from '../types';
import StatusBadge from './StatusBadge';
import { ArrowRight, Calendar, Plus, ClipboardList, Mail, X, Send, Sparkles, Building2, MapPin, Phone, Clock, FileText, Download, Upload, Search, Home, MoreVertical, Paperclip, Edit2, Archive, CheckSquare } from 'lucide-react';
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

  // Edit Homeowner Modal State
  const [showEditHomeownerModal, setShowEditHomeownerModal] = useState(false);
  // Fields for editing
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBuilderId, setEditBuilderId] = useState('');
  const [editLot, setEditLot] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editClosingDate, setEditClosingDate] = useState('');

  // Messaging State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId);
  const [replyContent, setReplyContent] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

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
    setEditAddress(targetHomeowner.address);
    setEditBuilderId(targetHomeowner.builderId || '');
    setEditLot(targetHomeowner.lotNumber);
    setEditProject(targetHomeowner.projectOrLlc || '');
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
            address: editAddress,
            builder: selectedGroup ? selectedGroup.name : targetHomeowner.builder,
            builderId: editBuilderId,
            lotNumber: editLot,
            projectOrLlc: editProject,
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
      // Simulate upload immediately
      if (effectiveHomeowner) {
        onUploadDocument({
          homeownerId: effectiveHomeowner.id,
          name: file.name,
          type: 'PDF', // Mock
          uploadedBy: isAdmin ? 'Admin' : 'Homeowner'
        });
      }
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
    }
  };

  const handleCreateNewThread = async () => {
    if (!effectiveHomeowner || !newMessageSubject || !newMessageContent) return;
    
    setIsSendingMessage(true);
    
    // 1. Create Internal Thread
    onCreateThread(effectiveHomeowner.id, newMessageSubject, newMessageContent);
    
    // 2. Send Email Notification
    const recipientEmail = isAdmin ? effectiveHomeowner.email : 'info@cascadebuilderservices.com';
    const senderName = isAdmin ? currentUser.name : activeHomeowner.name;

    await sendEmail({
      to: recipientEmail,
      subject: newMessageSubject,
      body: generateNotificationBody(senderName, newMessageContent, 'MESSAGE', 'new', 'https://cascadebuilderservices.com/messages'),
      fromName: senderName,
      fromRole: userRole
    });

    setIsSendingMessage(false);
    setShowNewMessageModal(false);
    setNewMessageSubject('');
    setNewMessageContent('');
    // Optionally switch to the thread, but for now we just close modal
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
          
          {/* My Tasks Widget (Admin Only) */}
          {isAdmin && (
            <div className="bg-surface rounded-3xl border border-surface-outline-variant p-6">
              <h3 className="font-medium text-lg mb-4 flex items-center text-surface-on">
                 <CheckSquare className="h-5 w-5 mr-3 text-primary" />
                 My Pending Tasks
              </h3>
              <div className="space-y-3">
                 {myTasks.length === 0 ? <p className="text-sm opacity-70 text-surface-on-variant">No pending tasks.</p> :
                    myTasks.slice(0, 3).map(t => (
                       <div key={t.id} className="bg-surface-container p-3 rounded-xl text-sm border border-surface-outline-variant/50">
                          <p className="font-medium text-surface-on">{t.title}</p>
                          <p className="text-xs text-surface-on-variant mt-1 line-clamp-1">{t.description}</p>
                       </div>
                    ))
                 }
                 {onNavigate && (
                    <Button variant="text" onClick={() => onNavigate('TASKS')} className="w-full mt-2 !h-8 !text-xs">View All Tasks</Button>
                 )}
              </div>
            </div>
          )}

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
    <div className="bg-surface rounded-3xl border border-surface-outline-variant overflow-hidden flex flex-col md:flex-row h-[600px] shadow-elevation-1">
       {/* Left Column: Thread List */}
       <div className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-surface-outline-variant flex flex-col ${selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-surface-outline-variant bg-surface-container/30 flex justify-between items-center">
            <h3 className="font-bold text-surface-on">Inbox</h3>
            {/* Builders cannot create new threads for now, only Admin/Homeowner */}
            {!isBuilder && (
              <Button 
                variant="text" 
                icon={<Plus className="h-4 w-4"/>} 
                className="!px-2"
                onClick={() => setShowNewMessageModal(true)}
              >
                New
              </Button>
            )}
          </div>
          <div className="p-2">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant" />
                <input 
                  type="text" 
                  placeholder="Search messages..." 
                  className="w-full bg-surface-container rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             {displayThreads.length === 0 ? (
                <div className="p-6 text-center text-sm text-surface-on-variant">No messages found.</div>
             ) : (
                displayThreads.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full text-left p-4 border-b border-surface-outline-variant/50 hover:bg-surface-container transition-colors flex flex-col gap-1 ${
                      selectedThreadId === thread.id ? 'bg-primary-container/20 border-l-4 border-l-primary' : ''
                    } ${!thread.isRead ? 'bg-surface-container/10' : ''}`}
                  >
                     <div className="flex justify-between items-start w-full">
                        <span className={`text-sm truncate pr-2 ${!thread.isRead ? 'font-bold text-surface-on' : 'font-medium text-surface-on/90'}`}>
                          {thread.subject}
                        </span>
                        <span className="text-[10px] text-surface-on-variant whitespace-nowrap">
                          {new Date(thread.lastMessageAt).toLocaleDateString()}
                        </span>
                     </div>
                     <p className="text-xs text-surface-on-variant line-clamp-2">
                       {thread.messages[thread.messages.length - 1].content}
                     </p>
                  </button>
                ))
             )}
          </div>
       </div>

       {/* Right Column: Conversation View */}
       <div className={`flex-1 flex flex-col bg-surface-container-high/10 ${!selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          {selectedThread ? (
            <>
               {/* Thread Header */}
               <div className="p-4 border-b border-surface-outline-variant bg-surface flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setSelectedThreadId(null)} className="md:hidden text-surface-on-variant">
                        <ArrowRight className="h-5 w-5 rotate-180" />
                     </button>
                     <div>
                        <h3 className="font-bold text-surface-on text-lg">{selectedThread.subject}</h3>
                        <p className="text-xs text-surface-on-variant">
                          Participants: {selectedThread.participants.join(', ')}
                        </p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button className="p-2 text-surface-on-variant hover:bg-surface-container rounded-full"><MoreVertical className="h-5 w-5"/></button>
                  </div>
               </div>

               {/* Messages Area */}
               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {selectedThread.messages.map(msg => {
                    const isMe = isAdmin ? msg.senderRole === UserRole.ADMIN : msg.senderRole === UserRole.HOMEOWNER;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                         <div className="flex items-end gap-2 max-w-[80%]">
                            {!isMe && (
                              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-xs font-bold text-secondary-on-container mb-1">
                                {msg.senderName.charAt(0)}
                              </div>
                            )}
                            <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                              isMe 
                                ? 'bg-primary text-primary-on rounded-br-none' 
                                : 'bg-surface text-surface-on border border-surface-outline-variant rounded-bl-none'
                            }`}>
                               <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                         </div>
                         <span className="text-[10px] text-surface-on-variant mt-1 px-12">
                           {msg.senderName} • {new Date(msg.timestamp).toLocaleString()}
                         </span>
                      </div>
                    );
                  })}
               </div>

               {/* Reply Box */}
               <div className="p-4 bg-surface border-t border-surface-outline-variant">
                 {/* Builders Read-Only: Cannot Reply */}
                 {isBuilder ? (
                   <div className="text-center text-sm text-surface-on-variant bg-surface-container p-3 rounded-xl">
                     Read-only access. You cannot reply to threads.
                   </div>
                 ) : (
                    <div className="flex flex-col gap-2 bg-surface-container rounded-xl p-2 border border-surface-outline-variant focus-within:ring-1 focus-within:ring-primary">
                      <textarea
                        rows={3}
                        placeholder="Write a reply..."
                        className="w-full bg-transparent outline-none text-sm px-2 py-1 resize-none"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                      />
                      <div className="flex justify-between items-center px-2 pb-1">
                          <div className="flex gap-2">
                            <button className="text-surface-outline-variant hover:text-primary"><Paperclip className="h-4 w-4"/></button>
                          </div>
                          <Button 
                            onClick={handleSendReply} 
                            disabled={!replyContent.trim()} 
                            variant="filled" 
                            className="!h-8 !px-4 text-xs"
                            icon={<Send className="h-3 w-3" />}
                          >
                            Send
                          </Button>
                      </div>
                    </div>
                 )}
               </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-surface-on-variant gap-4">
               <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center">
                 <Mail className="h-8 w-8 text-surface-outline" />
               </div>
               <p>Select a conversation to start messaging.</p>
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
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
             {/* Identity & Info Block */}
             <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                   <h2 className="text-2xl font-normal text-surface-on truncate">{targetHomeowner.name}</h2>
                   <span className="bg-primary-container text-primary-on-container text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                     <Building2 className="h-3 w-3" />
                     {targetHomeowner.builder}
                   </span>
                   {/* Edit Button - Admin Only */}
                   {isAdmin && (
                     <button 
                        onClick={handleOpenEditHomeowner}
                        className="ml-2 p-1.5 text-surface-outline-variant hover:text-primary bg-transparent hover:bg-primary/10 rounded-full transition-colors"
                        title="Edit Homeowner Info"
                     >
                       <Edit2 className="h-4 w-4" />
                     </button>
                   )}
                </div>
                
                {/* Compact Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-y-1 gap-x-6 text-sm text-surface-on-variant mt-3">
                   <div className="flex items-center gap-2 min-w-0">
                      <Home className="h-4 w-4 text-surface-outline flex-shrink-0" />
                      <span className="truncate">{targetHomeowner.projectOrLlc || 'N/A'} (Lot {targetHomeowner.lotNumber})</span>
                   </div>
                   <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex items-center gap-2" title={targetHomeowner.address}>
                      <MapPin className="h-4 w-4 text-surface-outline flex-shrink-0" />
                      <span className="whitespace-normal">{targetHomeowner.address}</span>
                   </div>
                   <div className="flex items-center gap-2 min-w-0">
                      <Phone className="h-4 w-4 text-surface-outline flex-shrink-0" />
                      <span className="truncate">{targetHomeowner.phone}</span>
                   </div>
                   <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-4 w-4 text-surface-outline flex-shrink-0" />
                      <span className="truncate">{targetHomeowner.email}</span>
                   </div>
                   <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-4 w-4 text-surface-outline flex-shrink-0" />
                      <span className="truncate">Closing: {targetHomeowner.closingDate ? new Date(targetHomeowner.closingDate).toLocaleDateString() : 'N/A'}</span>
                   </div>
                </div>
             </div>

             {/* Actions */}
             <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
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
                <span className="w-2 h-2 rounded-full bg-error"></span>
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
                          <button className="p-2 text-surface-outline-variant hover:text-primary rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                 </div>
                 
                 {/* Footer Upload Action */}
                 <div className="pt-4 border-t border-surface-outline-variant flex justify-center">
                    <label className="cursor-pointer flex items-center gap-2 px-6 py-3 bg-surface-container hover:bg-surface-container-high text-primary font-medium rounded-full transition-colors border border-surface-outline-variant">
                        <Upload className="h-4 w-4" />
                        Upload New Document
                        <input type="file" className="hidden" onChange={handleFileUpload} />
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
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-medium text-surface-on-variant mb-1">Address</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                        />
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
                        <label className="block text-xs font-medium text-surface-on-variant mb-1">Project / LLC</label>
                        <input 
                          type="text" 
                          className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editProject}
                          onChange={(e) => setEditProject(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-on-variant mb-1">Lot Number</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editLot}
                          onChange={(e) => setEditLot(e.target.value)}
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
                <span className="w-2 h-2 rounded-full bg-error"></span>
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
                          <button className="p-2 text-surface-outline-variant hover:text-primary rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                 </div>
                 
                 {/* Footer Upload Action */}
                 <div className="pt-4 border-t border-surface-outline-variant flex justify-center">
                    <label className="cursor-pointer flex items-center gap-2 px-6 py-3 bg-surface-container hover:bg-surface-container-high text-primary font-medium rounded-full transition-colors border border-surface-outline-variant">
                        <Upload className="h-4 w-4" />
                        Upload New Document
                        <input type="file" className="hidden" onChange={handleFileUpload} />
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