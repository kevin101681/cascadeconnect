import React, { useState, useEffect } from 'react';
import { Claim, UserRole, ClaimStatus, ProposedDate, Contractor, InternalEmployee, ClaimClassification, Attachment } from '../types';
import Button from './Button';
import StatusBadge from './StatusBadge';
import CalendarPicker from './CalendarPicker';
import MaterialSelect from './MaterialSelect';
import { ClaimMessage } from './MessageSummaryModal';
import ImageViewerModal from './ImageViewerModal';
import { Calendar, CheckCircle, FileText, Mail, MessageSquare, Clock, HardHat, Briefcase, Info, Lock, Paperclip, Video, X, Edit2, Save, ChevronDown, ChevronUp, Send, Plus, User, ExternalLink, Upload } from 'lucide-react';
import { generateServiceOrderPDF } from '../services/pdfService';
import { sendEmail } from '../services/emailService';
import { CLAIM_CLASSIFICATIONS } from '../constants';

interface ClaimInlineEditorProps {
  claim: Claim;
  onUpdateClaim: (claim: Claim) => void;
  contractors: Contractor[];
  currentUser?: InternalEmployee;
  userRole: UserRole;
  onAddInternalNote?: (claimId: string, noteText: string, userName?: string) => Promise<void>;
  claimMessages: ClaimMessage[];
  onTrackClaimMessage?: (claimId: string, messageData: {
    type: 'HOMEOWNER' | 'SUBCONTRACTOR';
    threadId?: string;
    subject: string;
    recipient: string;
    recipientEmail: string;
    content: string;
    senderName: string;
  }) => void;
  onSendMessage: (claim: Claim) => void;
  onNavigate?: (view: 'DASHBOARD' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'INVOICES' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND', config?: { initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS'; initialThreadId?: string | null }) => void;
}

const ClaimInlineEditor: React.FC<ClaimInlineEditorProps> = ({
  claim,
  onUpdateClaim,
  contractors,
  currentUser,
  userRole,
  onAddInternalNote,
  claimMessages = [],
  onTrackClaimMessage,
  onSendMessage,
  onNavigate
}) => {
  const isAdmin = userRole === UserRole.ADMIN;
  const isHomeowner = userRole === UserRole.HOMEOWNER;
  const safeClaimMessages = claimMessages || [];
  
  // For homeowners, claims are read-only after submission
  // A claim is considered "submitted" if it has a dateSubmitted (meaning it was submitted)
  // or if the status is SUBMITTED or any status after SUBMITTED (REVIEWING, SCHEDULING, SCHEDULED, COMPLETED)
  const isClaimSubmitted = claim.dateSubmitted !== undefined || 
                           [ClaimStatus.SUBMITTED, ClaimStatus.REVIEWING, ClaimStatus.SCHEDULING, ClaimStatus.SCHEDULED, ClaimStatus.COMPLETED].includes(claim.status);
  const isReadOnly = isHomeowner && isClaimSubmitted;
  
  // Edit state - homeowners can't edit submitted claims
  const [isEditing, setIsEditing] = useState(!isReadOnly);
  const [editTitle, setEditTitle] = useState(claim.title);
  const [editDescription, setEditDescription] = useState(claim.description);
  const [editClassification, setEditClassification] = useState(claim.classification);
  const [editInternalNotes, setEditInternalNotes] = useState(claim.internalNotes || '');
  const [editDateEvaluated, setEditDateEvaluated] = useState(
    claim.dateEvaluated ? new Date(claim.dateEvaluated).toISOString().split('T')[0] : ''
  );
  const [newNote, setNewNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  
  // Scheduling state
  const [proposeDate, setProposeDate] = useState('');
  const [proposeTime, setProposeTime] = useState<'AM' | 'PM' | 'All Day'>('AM');
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  
  // Service Order state
  const [showSOModal, setShowSOModal] = useState(false);
  const [soSubject, setSoSubject] = useState('');
  const [soBody, setSoBody] = useState('');
  const [isSendingSO, setIsSendingSO] = useState(false);
  const [soPdfUrl, setSoPdfUrl] = useState<string | null>(null);
  
  // Sub Assignment Modal state
  const [showSubModal, setShowSubModal] = useState(false);
  
  // Collapsible state - default to collapsed
  const [isInternalNotesExpanded, setIsInternalNotesExpanded] = useState(false);
  const [isMessageSummaryExpanded, setIsMessageSummaryExpanded] = useState(false);
  
  const scheduledDate = claim.proposedDates.find(d => d.status === 'ACCEPTED');
  const isScheduled = claim.status === ClaimStatus.SCHEDULED && claim.proposedDates.length > 0;
  
  useEffect(() => {
    setEditTitle(claim.title);
    setEditDescription(claim.description);
    setEditClassification(claim.classification);
    setEditInternalNotes(claim.internalNotes || '');
    setEditDateEvaluated(claim.dateEvaluated ? new Date(claim.dateEvaluated).toISOString().split('T')[0] : '');
    // Initialize proposeDate with scheduled date if available
    if (scheduledDate) {
      // Convert ISO string to YYYY-MM-DD format for date input
      const dateStr = scheduledDate.date.split('T')[0];
      setProposeDate(dateStr);
      setProposeTime(scheduledDate.timeSlot);
    } else {
      setProposeDate('');
      setProposeTime('AM');
    }
  }, [claim, scheduledDate]);
  
  const handleSaveDetails = () => {
    onUpdateClaim({
      ...claim,
      title: editTitle,
      description: editDescription,
      classification: editClassification,
      internalNotes: editInternalNotes,
      dateEvaluated: editDateEvaluated ? new Date(editDateEvaluated) : undefined
    });
    setIsEditing(false); // Collapse editor after saving
  };
  
  const handleCancelEdit = () => {
    setEditTitle(claim.title);
    setEditDescription(claim.description);
    setEditClassification(claim.classification);
    setEditInternalNotes(claim.internalNotes || '');
    setEditDateEvaluated(claim.dateEvaluated ? new Date(claim.dateEvaluated).toISOString().split('T')[0] : '');
    setIsEditing(false);
  };
  
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const userName = currentUser?.name || 'Admin';
    const timestamp = `${dateStr} at ${timeStr} by ${userName}`;
    // Format as pill instead of brackets: timestamp as separate element
    const noteWithTimestamp = `${timestamp}\n${newNote.trim()}`;
    
    const currentNotes = isEditing ? editInternalNotes : (claim.internalNotes || '');
    const updatedNotes = currentNotes 
      ? `${currentNotes}\n\n${noteWithTimestamp}`
      : noteWithTimestamp;
    
    if (isEditing) {
      setEditInternalNotes(updatedNotes);
    }
    
    if (onAddInternalNote) {
      await onAddInternalNote(claim.id, noteWithTimestamp, currentUser?.name || 'Admin');
    }
    
    onUpdateClaim({
      ...claim,
      internalNotes: updatedNotes
    });
    
    setNewNote('');
  };
  
  const handleAssignContractor = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId);
    if (contractor) {
      onUpdateClaim({
        ...claim,
        contractorId: contractor.id,
        contractorName: contractor.companyName,
        contractorEmail: contractor.email
      });
    }
  };
  
  const handlePrepareServiceOrder = async () => {
    if (!claim.contractorId || !claim.contractorName) {
      alert('Please assign a contractor first.');
      return;
    }
    
    setSoSubject(`Service Order: ${claim.title} - ${claim.address}`);
    setSoBody(`We have a warranty claim that requires your attention.\n\nClaim Details:\n- Title: ${claim.title}\n- Address: ${claim.address}\n- Description: ${claim.description}\n\nPlease schedule a service call at your earliest convenience.`);
    setShowSOModal(true);
    
    // Generate PDF
    try {
      const summary = `Service Order: ${claim.title} - ${claim.address}`;
      const pdfUrl = generateServiceOrderPDF(claim, summary, true);
      if (pdfUrl && typeof pdfUrl === 'string') {
        setSoPdfUrl(pdfUrl);
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };
  
  const handleSendServiceOrder = async () => {
    if (!soSubject || !soBody || !claim.contractorEmail) return;
    
    setIsSendingSO(true);
    try {
      await sendEmail({
        to: claim.contractorEmail,
        subject: soSubject,
        body: soBody,
        fromName: 'Cascade Admin',
        fromRole: UserRole.ADMIN
      });
      
      if (onTrackClaimMessage && claim.contractorName && claim.contractorEmail) {
        onTrackClaimMessage(claim.id, {
          type: 'SUBCONTRACTOR',
          subject: soSubject,
          recipient: claim.contractorName,
          recipientEmail: claim.contractorEmail,
          content: soBody,
          senderName: currentUser?.name || 'Admin'
        });
      }
      
      alert('Service Order sent to Sub successfully!');
    } catch (error) {
      console.error('Failed to send service order:', error);
      alert('Failed to send service order. Please try again.');
    }
    setIsSendingSO(false);
    setShowSOModal(false);
    setSoPdfUrl(null);
  };
  
  const handleConfirmSchedule = () => {
    if (!proposeDate) return;
    
    const newDate: ProposedDate = {
      date: new Date(proposeDate).toISOString(),
      timeSlot: proposeTime,
      status: 'ACCEPTED'
    };
    
    onUpdateClaim({
      ...claim,
      status: ClaimStatus.SCHEDULED,
      proposedDates: [newDate]
    });
    
    // Don't clear proposeDate when updating - keep it so user can see the updated date
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Title and Description Combined */}
          <div className="bg-surface dark:bg-gray-800 px-6 pt-6 pb-4 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 mb-4">Claim Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-surface-on-variant dark:text-gray-400 mb-1 font-medium">Title</label>
                {isEditing && !isReadOnly ? (
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-surface-container dark:bg-gray-700 border border-primary rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 focus:outline-none"
                  />
                ) : (
                  <p className="text-surface-on dark:text-gray-100 font-medium">{claim.title}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-surface-on-variant dark:text-gray-400 mb-1 font-medium">Description</label>
                {isEditing && !isReadOnly ? (
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-surface-container dark:bg-gray-700 border border-primary rounded-lg p-3 text-surface-on dark:text-gray-100 focus:outline-none resize-y min-h-[4rem]"
                    style={{ maxHeight: '20rem' }}
                  />
                ) : (
                  <p className="text-surface-on-variant dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {claim.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="bg-surface dark:bg-gray-800 px-6 pt-6 pb-4 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary" />
              Attachments
            </h3>
            <div className="space-y-4">
              {/* Existing Attachments */}
              {claim.attachments && claim.attachments.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {claim.attachments.map((att, i) => {
                    const attachmentKey = att.id || `att-${i}`;
                    const attachmentUrl = att.url || '';
                    const attachmentName = att.name || 'Attachment';
                    const attachmentType = att.type || 'DOCUMENT';
                    
                    return (
                      <div 
                        key={attachmentKey} 
                        className={`relative w-24 h-24 bg-surface-container dark:bg-gray-700 rounded-lg overflow-hidden border border-surface-outline-variant dark:border-gray-600 hover:shadow-elevation-1 transition-all ${
                          attachmentType === 'IMAGE' && attachmentUrl ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => {
                          if (attachmentType === 'IMAGE' && attachmentUrl) {
                            const imageIndex = claim.attachments
                              .filter(a => a.type === 'IMAGE' && a.url)
                              .findIndex(a => a.url === attachmentUrl);
                            if (imageIndex !== -1) {
                              setImageViewerIndex(imageIndex);
                              setImageViewerOpen(true);
                            }
                          }
                        }}
                      >
                        {attachmentType === 'IMAGE' && attachmentUrl ? (
                          <>
                            <img 
                              src={attachmentUrl} 
                              alt={attachmentName} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.parentElement?.querySelector('.image-fallback');
                                if (fallback) {
                                  (fallback as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                            <div className="image-fallback hidden absolute inset-0 w-full h-full flex flex-col items-center justify-center p-2 text-center bg-surface-container dark:bg-gray-700">
                              <FileText className="h-8 w-8 text-primary mb-1" />
                              <span className="text-[10px] text-surface-on-variant truncate w-full px-1">{attachmentName}</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                            {attachmentType === 'VIDEO' ? (
                              <Video className="h-8 w-8 text-primary mb-2" />
                            ) : (
                              <FileText className="h-8 w-8 text-blue-600 mb-2" />
                            )}
                            <span className="text-[10px] text-surface-on-variant truncate w-full">{attachmentName}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Upload Section - Always visible */}
              {!isReadOnly && (
                <div className="border-t border-surface-outline-variant dark:border-gray-700 pt-4">
                  <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-2">
                    Upload Images or Documents
                  </label>
                  <label className={`cursor-pointer flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-colors ${
                    isUploading ? 'bg-surface-container dark:bg-gray-700 border-primary/30 cursor-wait' : 'bg-surface-container/30 dark:bg-gray-700/30 border-surface-outline-variant dark:border-gray-600 hover:border-primary hover:bg-surface-container/50 dark:hover:bg-gray-700/50'
                  }`}>
                    {isUploading ? (
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <Upload className="h-8 w-8 text-surface-outline-variant dark:text-gray-500" />
                    )}
                    <span className="text-sm text-surface-on-variant dark:text-gray-400">
                      {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-surface-on-variant dark:text-gray-500">
                      Images, PDFs, and documents (max 10MB)
                    </span>
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple
                      accept="image/*,application/pdf,.doc,.docx"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        
                        setIsUploading(true);
                        const newAttachments: Attachment[] = [];
                        
                        try {
                          for (const file of Array.from(files)) {
                            if (file.size > 10 * 1024 * 1024) {
                              alert(`File ${file.name} is too large (>10MB). Please upload a smaller file.`);
                              continue;
                            }
                            
                            try {
                              const formData = new FormData();
                              formData.append('file', file);
                              
                              const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                              const apiEndpoint = isLocalDev 
                                ? 'http://localhost:3000/api/upload'
                                : `${window.location.protocol}//${window.location.hostname.startsWith('www.') ? window.location.hostname : `www.${window.location.hostname}`}/api/upload`;
                              
                              const response = await fetch(apiEndpoint, {
                                method: 'POST',
                                body: formData
                              });
                              
                              if (!response.ok) {
                                throw new Error(`Upload failed: ${response.statusText}`);
                              }
                              
                              const result = await response.json();
                              
                              if (result.success && result.url) {
                                newAttachments.push({
                                  id: result.publicId || crypto.randomUUID(),
                                  url: result.url,
                                  name: file.name,
                                  type: result.type || 'DOCUMENT'
                                });
                              }
                            } catch (error) {
                              console.error(`Failed to upload ${file.name}:`, error);
                              alert(`Failed to upload ${file.name}. Please try again.`);
                            }
                          }
                          
                          if (newAttachments.length > 0) {
                            onUpdateClaim({
                              ...claim,
                              attachments: [...(claim.attachments || []), ...newAttachments]
                            });
                          }
                        } finally {
                          setIsUploading(false);
                          // Reset input
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Internal Notes and Message Summary - Moved below Claim Details */}
          {/* Internal Notes - Admin Only */}
          {isAdmin && (
            <div className="bg-secondary-container dark:bg-gray-800 p-6 rounded-3xl border border-secondary-container dark:border-gray-700">
              <button
                onClick={() => setIsInternalNotesExpanded(!isInternalNotesExpanded)}
                className="w-full flex items-center justify-between mb-4 text-left"
              >
                <h3 className="text-lg font-normal text-secondary-on-container dark:text-gray-100 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Internal Notes <span className="text-xs font-normal opacity-70">(Not visible to Homeowner)</span>
                </h3>
                {isInternalNotesExpanded ? (
                  <ChevronUp className="h-5 w-5 text-secondary-on-container dark:text-gray-100" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-secondary-on-container dark:text-gray-100" />
                )}
              </button>
              
              {isInternalNotesExpanded && (
                <div className="mb-4 overflow-hidden">
                  {isEditing && !isReadOnly ? (
                    <div className="mb-4">
                      <textarea
                        value={editInternalNotes}
                        onChange={e => setEditInternalNotes(e.target.value)}
                        rows={6}
                        placeholder="Add internal notes here..."
                        className="w-full bg-surface dark:bg-gray-700 border border-primary rounded-lg p-3 text-sm text-surface-on dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary resize-none overflow-hidden"
                      />
                      <div className="mt-2 text-xs text-secondary-on-container dark:text-gray-400">
                        <p>Note: When you add a new note, it will be formatted with a timestamp pill automatically.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 overflow-hidden">
                      <div className="text-sm text-secondary-on-container dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-surface/30 dark:bg-gray-700/30 rounded-lg p-4 border border-secondary-container-high dark:border-gray-600 overflow-hidden">
                        {claim.internalNotes ? (
                          <div className="space-y-3">
                            {claim.internalNotes.split('\n\n').map((noteBlock, idx) => {
                              // Parse note blocks - format: "timestamp\nnote content" or "[timestamp] note content" (legacy)
                              const lines = noteBlock.split('\n');
                              const firstLine = lines[0] || '';
                              const isLegacyFormat = firstLine.startsWith('[') && firstLine.includes(']');
                              
                              let timestamp = '';
                              let noteContent = '';
                              
                              if (isLegacyFormat) {
                                // Legacy format: [timestamp] note content
                                const match = firstLine.match(/^\[(.+?)\]\s*(.*)$/);
                                if (match) {
                                  timestamp = match[1];
                                  noteContent = match[2] + (lines.slice(1).length > 0 ? '\n' + lines.slice(1).join('\n') : '');
                                } else {
                                  noteContent = noteBlock;
                                }
                              } else {
                                // New format: timestamp\nnote content
                                timestamp = firstLine;
                                noteContent = lines.slice(1).join('\n');
                              }
                              
                              return (
                                <div key={idx} className="pb-3 border-b border-secondary-container-high dark:border-gray-600 last:border-b-0 last:pb-0">
                                  {timestamp && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-container text-primary-on-container mb-2">
                                      {timestamp}
                                    </span>
                                  )}
                                  <p className="mt-2 whitespace-pre-wrap">{noteContent || noteBlock}</p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p>No internal notes.</p>
                        )}
                      </div>
                    </div>
                  )}
                
                  {!isReadOnly && (
                    <div className="border-t border-secondary-container-high dark:border-gray-600 pt-4">
                      <label className="block text-xs font-medium text-secondary-on-container dark:text-gray-300 mb-2">
                        Add New Note
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newNote}
                          onChange={e => setNewNote(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddNote();
                            }
                          }}
                          className="flex-1 bg-surface dark:bg-gray-700 border border-secondary-container-high dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                        <Button
                          variant="filled"
                          onClick={handleAddNote}
                          disabled={!newNote.trim()}
                          icon={<Plus className="h-4 w-4" />}
                          className="!h-9 !px-4"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Message Summary - Visible to All Users */}
          <div className="bg-secondary-container dark:bg-gray-800 p-6 rounded-3xl border border-secondary-container dark:border-gray-700">
            <button
              onClick={() => setIsMessageSummaryExpanded(!isMessageSummaryExpanded)}
              className="w-full flex items-center justify-between mb-4 text-left"
            >
              <h3 className="text-lg font-normal text-secondary-on-container dark:text-gray-100 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message Summary
              </h3>
              {isMessageSummaryExpanded ? (
                <ChevronUp className="h-5 w-5 text-secondary-on-container dark:text-gray-100" />
              ) : (
                <ChevronDown className="h-5 w-5 text-secondary-on-container dark:text-gray-100" />
              )}
            </button>
            
            {isMessageSummaryExpanded && (
              <div className="mb-4">
                {safeClaimMessages.length === 0 ? (
                  <p className="text-sm text-secondary-on-container dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-surface/30 dark:bg-gray-700/30 rounded-lg p-4 border border-secondary-container-high dark:border-gray-600">
                    No messages sent for this claim yet. Messages sent via the "Send Message" button or to assigned subcontractors will appear here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...safeClaimMessages].sort((a, b) => 
                      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    ).map((msg) => (
                      <div
                        key={msg.id}
                        className="bg-surface/30 dark:bg-gray-700/30 rounded-lg p-4 border border-secondary-container-high dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {msg.type === 'HOMEOWNER' ? (
                              <User className="h-4 w-4 text-primary" />
                            ) : (
                              <HardHat className="h-4 w-4 text-primary" />
                            )}
                            <span className="text-xs font-medium text-secondary-on-container dark:text-gray-300">
                              {msg.type === 'HOMEOWNER' ? 'To Homeowner' : 'To Subcontractor'}
                            </span>
                            <span className="text-xs text-secondary-on-container dark:text-gray-500 opacity-70">•</span>
                            <span className="text-xs text-secondary-on-container dark:text-gray-400 opacity-70">{msg.recipient}</span>
                          </div>
                          <span className="text-xs text-secondary-on-container dark:text-gray-400 opacity-70">
                            {new Date(msg.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="mb-2">
                          <p className="text-xs font-medium text-secondary-on-container dark:text-gray-400 opacity-70 mb-1">Subject:</p>
                          <p className="text-sm text-secondary-on-container dark:text-gray-200">{msg.subject}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-secondary-on-container dark:text-gray-400 opacity-70 mb-1">Message:</p>
                          <p className="text-sm text-secondary-on-container dark:text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-secondary-container-high dark:border-gray-600 flex items-center justify-between">
                          <p className="text-xs text-secondary-on-container dark:text-gray-400 opacity-70">
                            Sent by: {msg.senderName} • To: {msg.recipientEmail}
                          </p>
                          {onNavigate && (
                            <button
                              onClick={() => {
                                onNavigate('DASHBOARD', { initialTab: 'MESSAGES', initialThreadId: msg.threadId || null });
                              }}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/10 dark:hover:bg-primary/20"
                              title="View in Message Center"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View in Messages
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Right Column */}
        <div className="space-y-6">
          {/* Warranty Assessment */}
          <div className="bg-surface dark:bg-gray-800 p-6 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Warranty Assessment
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1 sm:flex-initial sm:min-w-[200px]">
                <p className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Classification</p>
                {isEditing && !isReadOnly ? (
                  <div className="relative w-full">
                    <select
                      value={editClassification}
                      onChange={e => setEditClassification(e.target.value as ClaimClassification)}
                      className="w-full bg-surface-container-high dark:bg-gray-700 rounded-full pl-3 pr-12 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all h-[2.5rem] appearance-none"
                    >
                      {CLAIM_CLASSIFICATIONS.map(classification => (
                        <option key={classification} value={classification}>{classification}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="w-6 h-6 rounded-full bg-surface-container-high dark:bg-gray-600 flex items-center justify-center">
                        <ChevronDown className="h-4 w-4 text-surface-on dark:text-gray-300" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium h-[2.5rem] ${
                    claim.classification === 'Non-Warranty' ? 'bg-error-container text-error-on-container' : 'bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100'
                  }`}>
                    {claim.classification}
                  </span>
                )}
              </div>
              <div className="flex-1 sm:flex-initial">
                <p className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 text-left">Date Evaluated</p>
                {isEditing && !isReadOnly ? (
                  <input
                    type="date"
                    value={editDateEvaluated}
                    onChange={e => setEditDateEvaluated(e.target.value)}
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-full pl-3 pr-4 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all h-[2.5rem]"
                  />
                ) : (
                  <span className="inline-flex items-center justify-start px-3 py-1 rounded-full text-sm font-medium bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100 h-[2.5rem] w-full">
                    {claim.dateEvaluated ? new Date(claim.dateEvaluated).toLocaleDateString() : 'Pending Evaluation'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Sub Assignment */}
          {isAdmin && (
            <div className="bg-surface dark:bg-gray-800 p-6 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
                <HardHat className="h-5 w-5 text-primary" />
                Sub Assignment
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {claim.contractorId ? (
                  <>
                    <div className="flex items-center gap-3 bg-surface-container dark:bg-gray-700 px-4 h-12 rounded-full text-surface-on dark:text-gray-100 flex-1 w-full sm:w-auto">
                      <Briefcase className="h-5 w-5 flex-shrink-0" />
                      <div className="text-sm overflow-hidden min-w-0">
                        <p className="font-bold truncate">{claim.contractorName}</p>
                        <p className="opacity-80 text-xs truncate">{claim.contractorEmail}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outlined" 
                      onClick={handlePrepareServiceOrder} 
                      icon={<FileText className="h-4 w-4" />}
                      className="!h-12 w-full sm:w-auto whitespace-nowrap"
                    >
                      Service Order
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outlined" 
                    onClick={() => setShowSubModal(true)} 
                    icon={<Plus className="h-4 w-4" />}
                    className="!h-12 w-full sm:w-auto whitespace-nowrap"
                  >
                    + Sub
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Scheduling */}
          <div className="bg-surface dark:bg-gray-800 p-6 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Scheduling
            </h3>
            {isScheduled && scheduledDate ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
                <div className="flex items-center gap-5 mb-4">
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-700 dark:text-green-400">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-800 dark:text-green-400 uppercase tracking-wide mb-1">Appointment Confirmed</p>
                    <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                      {new Date(scheduledDate.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <p className="text-sm text-surface-on-variant dark:text-gray-200 mt-1">{scheduledDate.timeSlot}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex flex-col md:flex-row gap-4 items-end pt-4 border-t border-green-200 dark:border-green-800">
                    <div className="w-full flex-1 min-w-0">
                      <label className="block text-xs text-surface-on-variant dark:text-gray-400 mb-1 ml-1 font-medium">Edit Scheduled Date</label>
                      <button
                        type="button"
                        onClick={() => setShowCalendarPicker(true)}
                        className="w-full rounded-full border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-700 hover:border-primary hover:bg-surface-container-high dark:hover:bg-gray-600 transition-all cursor-pointer px-4 py-2 text-left flex items-center gap-3 text-sm text-surface-on dark:text-gray-100 min-h-[2.5rem]"
                      >
                        <Calendar className="h-4 w-4 text-surface-on-variant dark:text-gray-400 flex-shrink-0" />
                        <span className={`truncate ${proposeDate ? 'text-surface-on dark:text-gray-100' : 'text-surface-on-variant dark:text-gray-400'}`}>
                          {proposeDate
                            ? new Date(proposeDate).toLocaleDateString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: '2-digit'
                              })
                            : 'Pick a new date'}
                        </span>
                      </button>
                    </div>
                    <div className="w-full md:w-auto md:min-w-[200px]">
                      <MaterialSelect
                        label="Time Slot"
                        options={[
                          { value: 'AM', label: 'AM (8am - 12pm)' },
                          { value: 'PM', label: 'PM (12pm - 4pm)' },
                          { value: 'All Day', label: 'All Day' },
                        ]}
                        value={proposeTime}
                        onChange={(value) => setProposeTime(value as 'AM' | 'PM' | 'All Day')}
                      />
                    </div>
                    <Button
                      variant="filled"
                      onClick={handleConfirmSchedule}
                      disabled={!proposeDate}
                      icon={<CheckCircle className="h-4 w-4" />}
                      className="w-full md:w-auto whitespace-nowrap"
                    >
                      Update
                    </Button>
                  </div>
                )}
              </div>
            ) : isAdmin ? (
              <div className="bg-surface-container/30 dark:bg-gray-700/30 p-6 rounded-2xl border border-surface-outline-variant/50 dark:border-gray-600/50">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-surface-on dark:text-gray-100">Confirm Appointment Details</h4>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="w-full flex-1 min-w-0">
                    <label className="block text-xs text-surface-on-variant dark:text-gray-400 mb-1 ml-1 font-medium">Scheduled Date</label>
                    <button
                      type="button"
                      onClick={() => setShowCalendarPicker(true)}
                      className="w-full rounded-full border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-700 hover:border-primary hover:bg-surface-container-high dark:hover:bg-gray-600 transition-all cursor-pointer px-4 py-2 text-left flex items-center gap-3 text-sm text-surface-on dark:text-gray-100 min-h-[2.5rem]"
                    >
                      <Calendar className="h-4 w-4 text-surface-on-variant dark:text-gray-400 flex-shrink-0" />
                      <span className={`truncate ${proposeDate ? 'text-surface-on dark:text-gray-100' : 'text-surface-on-variant dark:text-gray-400'}`}>
                        {proposeDate
                          ? new Date(proposeDate).toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: '2-digit'
                            })
                          : 'Add'}
                      </span>
                    </button>
                  </div>
                  <div className="w-full md:w-auto md:min-w-[200px]">
                    <MaterialSelect
                      label="Time Slot"
                      options={[
                        { value: 'AM', label: 'AM (8am - 12pm)' },
                        { value: 'PM', label: 'PM (12pm - 4pm)' },
                        { value: 'All Day', label: 'All Day' },
                      ]}
                      value={proposeTime}
                      onChange={(value) => setProposeTime(value as 'AM' | 'PM' | 'All Day')}
                    />
                  </div>
                  <Button
                    variant="filled"
                    onClick={handleConfirmSchedule}
                    disabled={!proposeDate}
                    icon={<CheckCircle className="h-4 w-4" />}
                    className="w-full md:w-auto whitespace-nowrap"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-surface-on-variant dark:text-gray-400">No appointment scheduled yet.</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Calendar Picker */}
      {showCalendarPicker && (
        <CalendarPicker
          isOpen={showCalendarPicker}
          selectedDate={proposeDate ? new Date(proposeDate) : null}
          onSelectDate={(date) => {
            setProposeDate(date.toISOString().split('T')[0]);
            setShowCalendarPicker(false);
          }}
          onClose={() => setShowCalendarPicker(false)}
        />
      )}
      
      {/* Sub Assignment Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]" onClick={() => setShowSubModal(false)}>
          <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 w-full max-w-md mx-4 animate-[scale-in_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-medium text-surface-on dark:text-gray-100 flex items-center gap-2">
                <HardHat className="h-5 w-5 text-primary" />
                Assign Subcontractor
              </h2>
              <button onClick={() => setShowSubModal(false)} className="p-2 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 transition-colors">
                <X className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4 bg-surface dark:bg-gray-800">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-2">Select Subcontractor</label>
                <select 
                  className="w-full bg-surface-container dark:bg-gray-700 rounded-lg px-4 py-3 text-surface-on dark:text-gray-100 border border-surface-outline-variant dark:border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssignContractor(e.target.value);
                      setShowSubModal(false);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled className="bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400">
                    Select a sub...
                  </option>
                  {contractors.map(c => (
                    <option key={c.id} value={c.id} className="bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100">
                      {c.companyName} ({c.specialty})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 flex justify-end gap-2 bg-surface-container dark:bg-gray-700">
              <Button variant="text" onClick={() => setShowSubModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Service Order Modal */}
      {showSOModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]" onClick={() => setShowSOModal(false)}>
          <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col animate-[scale-in_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Send Service Order</h2>
              <button onClick={() => setShowSOModal(false)} className="p-2 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 transition-colors">
                <X className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-surface dark:bg-gray-800">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Subject</label>
                <input
                  type="text"
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={soSubject}
                  onChange={e => setSoSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Message</label>
                <textarea 
                  rows={6}
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                  value={soBody}
                  onChange={e => setSoBody(e.target.value)}
                />
              </div>
            </div>
            <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 flex justify-end gap-2 bg-surface-container dark:bg-gray-700">
              <Button variant="text" onClick={() => setShowSOModal(false)}>Cancel</Button>
              <Button variant="filled" onClick={handleSendServiceOrder} disabled={isSendingSO || !soSubject || !soBody} icon={<Send className="h-4 w-4" />}>
                {isSendingSO ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t border-surface-outline-variant dark:border-gray-700">
        <Button 
          variant="tonal" 
          onClick={() => onSendMessage(claim)} 
          icon={<MessageSquare className="h-4 w-4" />}
          className="!h-10"
        >
          Send Message
        </Button>
        {!isReadOnly && (
          isEditing ? (
            <>
              <Button variant="outlined" onClick={handleCancelEdit} className="!h-10">Cancel</Button>
              <Button variant="filled" onClick={handleSaveDetails} icon={<Save className="h-4 w-4" />} className="!h-10">Save</Button>
            </>
          ) : (
            <Button variant="outlined" onClick={() => setIsEditing(true)} icon={<Edit2 className="h-4 w-4" />} className="!h-10">Edit</Button>
          )
        )}
      </div>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        attachments={claim.attachments || []}
        initialIndex={imageViewerIndex}
        onClose={() => setImageViewerOpen(false)}
        onUpdateAttachment={(index, updatedUrl) => {
          const updatedAttachments = [...(claim.attachments || [])];
          const imageAttachments = updatedAttachments.filter(a => a.type === 'IMAGE' && a.url);
          const actualIndex = claim.attachments.findIndex(a => a.url === imageAttachments[index]?.url);
          if (actualIndex !== -1) {
            updatedAttachments[actualIndex] = {
              ...updatedAttachments[actualIndex],
              url: updatedUrl
            };
            onUpdateClaim({
              ...claim,
              attachments: updatedAttachments
            });
          }
        }}
      />
    </div>
  );
};

export default ClaimInlineEditor;

