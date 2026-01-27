
import React, { useState, useRef, useEffect } from 'react';
import { Claim, UserRole, ClaimStatus, ProposedDate, Contractor, InternalEmployee } from '../types';
import Button from './Button';
import StatusBadge from './StatusBadge';
import CalendarPicker from './CalendarPicker';
import MaterialSelect from './MaterialSelect';
import { ClaimMessage } from './MessageSummaryModal';
import { Calendar, CheckCircle, FileText, Mail, MessageSquare, ArrowLeft, Clock, HardHat, Briefcase, Info, Lock, Paperclip, Video, X, Edit2, Save, ChevronDown, ChevronUp, Send, Plus, User, ExternalLink, StickyNote } from 'lucide-react';
import ImageViewerModal from './ImageViewerModal';
import { generateServiceOrderPDF } from '../services/pdfService';
import { sendEmail } from '../services/emailService';
import { useTaskStore } from '../stores/useTaskStore';

interface ClaimDetailProps {
  claim: Claim;
  currentUserRole: UserRole;
  onUpdateClaim: (updatedClaim: Claim) => void;
  onBack: () => void;
  contractors: Contractor[]; // Pass list of contractors
  onSendMessage: (claim: Claim) => void;
  startInEditMode?: boolean; // Optional prop to start in edit mode
  currentUser?: InternalEmployee; // Current admin user for note attribution
  onAddInternalNote?: (claimId: string, noteText: string, userName?: string) => Promise<void>; // Function to add internal notes
  claimMessages?: ClaimMessage[]; // Messages related to this claim
  onTrackClaimMessage?: (claimId: string, messageData: {
    type: 'HOMEOWNER' | 'SUBCONTRACTOR';
    threadId?: string;
    subject: string;
    recipient: string;
    recipientEmail: string;
    content: string;
    senderName: string;
  }) => void; // Function to track claim-related messages
  onNavigate?: (view: 'DASHBOARD' | 'TEAM' | 'DATA' | 'TASKS' | 'CALLS', config?: { initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS'; initialThreadId?: string | null }) => void; // Navigation function
  isHomeownerView?: boolean; // Whether viewing as homeowner (hide admin controls)
  onSaveRef?: React.MutableRefObject<(() => void) | null>; // Expose save function for external triggers (e.g., mobile footer)
}

const ClaimDetail: React.FC<ClaimDetailProps> = ({ claim, currentUserRole, onUpdateClaim, onBack, contractors, onSendMessage, startInEditMode = false, currentUser, onAddInternalNote, claimMessages = [], onTrackClaimMessage, onNavigate, isHomeownerView = false, onSaveRef }) => {
  // Ensure claimMessages is always an array
  const safeClaimMessages = claimMessages || [];
  
  const [proposeDate, setProposeDate] = useState('');
  const [proposeTime, setProposeTime] = useState<'AM' | 'PM' | 'All Day'>('AM');
  
  // Collapsible state - default to collapsed for inline editor
  const [isInternalNotesExpanded, setIsInternalNotesExpanded] = useState(false);
  const [isMessageSummaryExpanded, setIsMessageSummaryExpanded] = useState(false);

  // Edit Mode State (Admin Only) - Start in edit mode if prop is true
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [editTitle, setEditTitle] = useState(claim.title);
  const [editDescription, setEditDescription] = useState(claim.description);
  const [editInternalNotes, setEditInternalNotes] = useState(claim.internalNotes || '');
  const [newNote, setNewNote] = useState('');
  
  // Reset edit state when claim changes - respect startInEditMode prop
  useEffect(() => {
    setIsEditing(startInEditMode);
    setEditTitle(claim.title);
    setEditDescription(claim.description);
    setEditInternalNotes(claim.internalNotes || '');
    setNewNote('');
  }, [claim.id, startInEditMode]);

  // Expose save function to parent via ref (for mobile footer)
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = handleSaveDetails;
    }
  }, [onSaveRef, editTitle, editDescription, editInternalNotes]);

  // Service Order Email Modal State
  const [showSOModal, setShowSOModal] = useState(false);
  const [soPdfUrl, setSoPdfUrl] = useState<string | null>(null);
  const [soSubject, setSoSubject] = useState('');
  const [soBody, setSoBody] = useState('');
  const [isSendingSO, setIsSendingSO] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const isAdmin = currentUserRole === UserRole.ADMIN;
  const isScheduled = claim.status === ClaimStatus.SCHEDULED && claim.proposedDates.length > 0;
  const scheduledDate = isScheduled ? claim.proposedDates[0] : null;

  const handleSaveDetails = () => {
    onUpdateClaim({
      ...claim,
      title: editTitle,
      description: editDescription,
      internalNotes: editInternalNotes
    });
    setIsEditing(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const now = new Date();
    // Format: MM/DD/YYYY at HH:MM AM/PM by User Name (no brackets - will be displayed as pill)
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
    // Format: timestamp\nnote content (will be displayed with timestamp as pill)
    const noteWithTimestamp = `${timestamp}\n${newNote.trim()}`;
    
    // Get current notes (from edit state if editing, otherwise from claim)
    const currentNotes = isEditing ? editInternalNotes : (claim.internalNotes || '');
    const updatedNotes = currentNotes 
      ? `${currentNotes}\n\n${noteWithTimestamp}`
      : noteWithTimestamp;
    
    // Update edit state to keep it in sync
    setEditInternalNotes(updatedNotes);
    setNewNote('');
    
    // Auto-save the note immediately
    onUpdateClaim({
      ...claim,
      internalNotes: updatedNotes
    });
  };
  
  // Sync editInternalNotes with claim when claim changes (but not when we're actively editing)
  useEffect(() => {
    if (!isEditing) {
      setEditInternalNotes(claim.internalNotes || '');
    }
  }, [claim.internalNotes, isEditing]);

  const handleCancelEdit = () => {
    setEditTitle(claim.title);
    setEditDescription(claim.description);
    setIsEditing(false);
  };

  const handlePrepareServiceOrder = async () => {
    if (!claim.contractorId) return;

    // 1. Generate PDF Blob URL directly using description as summary
    const url = generateServiceOrderPDF(claim, claim.description, true);
    if (typeof url === 'string') {
        setSoPdfUrl(url);
    }

    // 2. Pre-fill Email Details
    setSoSubject(`Service Order: ${claim.builderName} - ${claim.jobName} - ${claim.title}`);
    const senderName = currentUser?.name || 'Admin';
    setSoBody(`Hello,
 
This is ${senderName} with Cascade Builder Services and I have a warranty repair that needs to be scheduled. The details are described on the attached service order which also includes the homeowner's information, builder, project and lot number.  Pictures of the claim are attached and are also on the service order PDF.  Please let me know your next availability and I'll coordinate with the homeowner.  Once we have a date and time frame set, you will receive a notification requesting to accept the appointment.  Please do so as it helps with our tracking and also makes the homeowner aware that you've committed to the confirmed appointment. 

Once you've completed the assigned work, please have the homeowner sign and date the attached service order and send the signed copy back to me.
 
If this repair work is billable, please let me know prior to scheduling.`);
    
    setShowSOModal(true);
  };

  const handleSendServiceOrder = async () => {
    setIsSendingSO(true);
    if (claim.contractorEmail) {
        try {
          // Import PDF generation function
          const { generateServiceOrderPDFBlob } = await import('../services/pdfService');
          
          // Generate PDF blob
          const pdfBlob = await generateServiceOrderPDFBlob(claim, claim.description);
          
          // Convert PDF blob to base64
          const pdfBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(pdfBlob);
          });
          
          // Get claim number for filename
          const claimNumber = claim.claimNumber || claim.id.substring(0, 8).toUpperCase();
          const pdfFilename = `ServiceOrder_${claimNumber}.pdf`;
          
          // Get image attachments and convert to base64
          const imageAttachments = (claim.attachments || []).filter(att => att.type === 'IMAGE' && att.url);
          const imageAttachmentsBase64 = await Promise.all(
            imageAttachments.map(async (attachment) => {
              try {
                const response = await fetch(attachment.url);
                const blob = await response.blob();
                const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                  };
                  reader.readAsDataURL(blob);
                });
                
                // Determine content type from URL or blob
                const contentType = blob.type || (attachment.url.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' : 'image/png');
                const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
                const filename = attachment.name || `image_${attachment.id || Date.now()}.${extension}`;
                
                return {
                  filename,
                  content: base64,
                  contentType
                };
              } catch (error) {
                console.error(`Failed to convert image ${attachment.name} to base64:`, error);
                return null;
              }
            })
          );
          
          // Filter out any failed conversions
          const validImageAttachments = imageAttachmentsBase64.filter(att => att !== null) as Array<{ filename: string; content: string; contentType: string }>;
          
          // Combine PDF and image attachments
          const allAttachments = [
            {
              filename: pdfFilename,
              content: pdfBase64,
              contentType: 'application/pdf'
            },
            ...validImageAttachments
          ];
          
          await sendEmail({
            to: claim.contractorEmail,
            subject: soSubject,
            body: soBody,
            fromName: 'Cascade Admin',
            fromRole: UserRole.ADMIN,
            attachments: allAttachments
          });
          
          // Track service order message to subcontractor
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
      proposedDates: [newDate] // Overwrite with the single confirmed date
    });
    
    setProposeDate('');
  };

  const handleReschedule = () => {
    onUpdateClaim({
      ...claim,
      status: ClaimStatus.SCHEDULING,
      proposedDates: []
    });
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

  return (
    <div className="flex flex-col h-full relative max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="text" onClick={onBack} icon={<ArrowLeft className="h-5 w-5" />} className="!px-2" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              {isEditing ? (
                 <input 
                   type="text" 
                   value={editTitle}
                   onChange={e => setEditTitle(e.target.value)}
                   className="text-xl font-normal bg-surface-container dark:bg-gray-700 border border-primary rounded px-2 py-1 text-surface-on dark:text-gray-100 focus:outline-none"
                 />
              ) : (
                 <h2 className="text-2xl font-normal text-surface-on dark:text-gray-100">{claim.title}</h2>
              )}
            </div>
            <div className="text-sm text-surface-on-variant dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              <Clock className="h-4 w-4" />
              <span>{new Date(claim.dateSubmitted).toLocaleDateString()}</span>
              <span className="text-surface-outline dark:text-gray-600">|</span>
              <span>{claim.category}</span>
              <span className="text-surface-outline dark:text-gray-600">|</span>
              <span className="font-medium text-primary">{claim.builderName}</span>
              <span className="text-surface-outline dark:text-gray-600">•</span>
              <span>{claim.jobName}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 claim-detail-header-actions">
          <Button 
            variant="outlined" 
            onClick={() => {
              // Open the TasksSheet with claim context
              const claimNumber = claim.claimNumber || claim.id.substring(0, 8);
              const project = claim.jobName || claim.address;
              const contextLabel = `${claim.title || 'Untitled'} • Claim #${claimNumber} • ${project}`;
              
              useTaskStore.getState().openTasks(
                claim.id,
                contextLabel,
                'claim'
              );
            }}
            icon={<StickyNote className="h-4 w-4" />}
            title={`Add a note for ${claim.claimNumber || 'this claim'}`}
          >
             +Note
           </Button>
           <Button 
             variant="tonal" 
             onClick={() => onSendMessage(claim)} 
             icon={<MessageSquare className="h-4 w-4" />}
           >
             Send Message
           </Button>

           {isAdmin && !isHomeownerView && (
              <>
                {isEditing ? (
                   <div className="flex items-center gap-3">
                     <button
                       onClick={handleCancelEdit}
                       className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 rounded-xl font-medium transition-all duration-200"
                     >
                       Cancel
                     </button>
                     <button
                       onClick={handleSaveDetails}
                       className="px-6 py-2.5 bg-gray-900 text-white hover:bg-black hover:shadow-lg hover:-translate-y-0.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                     >
                       <Save className="h-4 w-4" />
                       Save
                     </button>
                   </div>
                ) : (
                   <Button variant="outlined" onClick={() => setIsEditing(true)} icon={<Edit2 className="h-4 w-4" />}>Edit Claim</Button>
                )}
              </>
           )}
        </div>
      </div>

      <div className={`grid gap-6 ${isEditing ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Description Card */}
        <div className={`bg-surface dark:bg-gray-800 p-6 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-sm ${isEditing ? 'lg:col-span-2' : ''}`}>
          <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 mb-4">Description</h3>
          {isEditing ? (
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={6}
                className="w-full bg-surface-container dark:bg-gray-700 border border-primary rounded-lg p-3 text-surface-on dark:text-gray-100 focus:outline-none"
              />
          ) : (
              <p className="text-surface-on-variant dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {claim.description}
              </p>
          )}
          
          {/* Rich Attachments */}
          {claim.attachments && claim.attachments.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-surface-on mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </p>
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
                            src={attachmentUrl.includes('cloudinary.com') 
                              ? attachmentUrl.replace('/upload/', '/upload/w_200,h_200,c_fill,q_auto,f_auto/')
                              : attachmentUrl
                            }
                            alt={attachmentName} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              // Fallback if image fails to load
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
            </div>
          )}
        </div>

        {/* Warranty Assessment Card */}
        <div className="bg-surface dark:bg-gray-800 p-6 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-normal text-surface-on mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Warranty Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-surface-on-variant mb-1">Classification</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                claim.classification === 'Non-Warranty' ? 'bg-error-container text-error-on-container' : 'bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100'
              }`}>
                {claim.classification}
              </span>
            </div>
            <div>
              <p className="text-xs text-surface-on-variant mb-1">Date Evaluated</p>
              <p className="text-sm text-surface-on">
                {claim.dateEvaluated ? new Date(claim.dateEvaluated).toLocaleDateString() : 'Pending Evaluation'}
              </p>
            </div>
            {claim.classification === 'Non-Warranty' && (
              <div className="md:col-span-2 bg-error/5 border border-error/20 p-3 rounded-xl">
                <p className="text-xs text-error font-bold mb-1">Non-Warranty Explanation</p>
                <p className="text-sm text-surface-on">{claim.nonWarrantyExplanation || 'No explanation provided.'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Internal Notes (Admin Only) */}
        {isAdmin && (
            <div className="bg-secondary-container p-6 rounded-3xl border border-secondary-container">
              <button
                onClick={() => setIsInternalNotesExpanded(!isInternalNotesExpanded)}
                className="w-full flex items-center justify-between mb-4 text-left"
              >
                <h3 className="text-lg font-normal text-secondary-on-container flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Internal Notes <span className="text-xs font-normal opacity-70">(Not visible to Homeowner)</span>
                </h3>
                {isInternalNotesExpanded ? (
                  <ChevronUp className="h-5 w-5 text-secondary-on-container" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-secondary-on-container" />
                )}
              </button>
              
              {/* Display existing notes */}
              {isInternalNotesExpanded && (
              <div className="mb-4">
                {isEditing ? (
                  <textarea
                    value={editInternalNotes}
                    onChange={e => setEditInternalNotes(e.target.value)}
                    rows={6}
                    className="w-full bg-surface dark:bg-gray-700 border border-primary rounded-lg p-3 text-sm text-surface-on dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary mb-4"
                  />
                ) : (
                  <div className="mb-4">
                    <div className="text-sm text-secondary-on-container dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-surface/30 dark:bg-gray-700/30 rounded-lg p-4 border border-secondary-container-high dark:border-gray-600">
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
                
                {/* Add new note section - Always visible for admins */}
                <div className="border-t border-secondary-container-high pt-4">
                  <label className="block text-xs font-medium text-secondary-on-container mb-2">
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
              </div>
              )}
            </div>
        )}

        {/* Message Summary (Admin Only) */}
        {isAdmin && (
            <div className="bg-secondary-container p-6 rounded-3xl border border-secondary-container">
              <button
                onClick={() => setIsMessageSummaryExpanded(!isMessageSummaryExpanded)}
                className="w-full flex items-center justify-between mb-4 text-left"
              >
                <h3 className="text-lg font-normal text-secondary-on-container flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message Summary <span className="text-xs font-normal opacity-70">(Not visible to Homeowner)</span>
                </h3>
                {isMessageSummaryExpanded ? (
                  <ChevronUp className="h-5 w-5 text-secondary-on-container" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-secondary-on-container" />
                )}
              </button>
              
              {/* Display message summaries */}
              {isMessageSummaryExpanded && (
              <div className="mb-4">
                {safeClaimMessages.length === 0 ? (
                  <p className="text-sm text-secondary-on-container whitespace-pre-wrap leading-relaxed bg-surface/30 rounded-lg p-4 border border-secondary-container-high">
                    No messages sent for this claim yet. Messages sent via the "Send Message" button or to assigned subcontractors will appear here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...safeClaimMessages].sort((a, b) => 
                      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    ).map((msg) => (
                      <div
                        key={msg.id}
                        className="bg-surface/30 dark:bg-gray-700/30 rounded-lg p-4 border border-secondary-container-high dark:border-gray-600 group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {msg.type === 'HOMEOWNER' ? (
                              <User className="h-4 w-4 text-primary" />
                            ) : (
                              <HardHat className="h-4 w-4 text-primary" />
                            )}
                            <span className="text-xs font-medium text-secondary-on-container">
                              {msg.type === 'HOMEOWNER' ? 'To Homeowner' : 'To Subcontractor'}
                            </span>
                            <span className="text-xs text-secondary-on-container opacity-70">•</span>
                            <span className="text-xs text-secondary-on-container opacity-70">{msg.recipient}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // Open the TasksSheet with message context
                                const contextLabel = `${msg.subject} • ${claim.jobName || claim.address}`;
                                
                                useTaskStore.getState().openTasks(
                                  claim.id,
                                  contextLabel,
                                  'message'
                                );
                              }}
                              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                              title={`Add a note about: ${msg.subject}`}
                            >
                              <StickyNote className="h-3.5 w-3.5" />
                              <span>+Note</span>
                            </button>
                            <span className="text-xs text-secondary-on-container opacity-70">
                              {new Date(msg.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <p className="text-xs font-medium text-secondary-on-container opacity-70 mb-1">Subject:</p>
                          <p className="text-sm text-secondary-on-container">{msg.subject}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-secondary-on-container opacity-70 mb-1">Message:</p>
                          <p className="text-sm text-secondary-on-container whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-secondary-container-high flex items-center justify-between">
                          <p className="text-xs text-secondary-on-container opacity-70">
                            Sent by: {msg.senderName} • To: {msg.recipientEmail}
                          </p>
                          {msg.threadId && onNavigate && (
                            <button
                              onClick={() => {
                                onNavigate('DASHBOARD', { initialTab: 'MESSAGES', initialThreadId: msg.threadId });
                              }}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                              title="View in Message Center"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Message
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
        )}

        {/* Sub Assignment (Admin Only) */}
        {isAdmin && (
          <div className="bg-surface dark:bg-gray-800 p-6 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-normal text-surface-on mb-4 flex items-center gap-2">
              <HardHat className="h-5 w-5 text-primary" />
              Sub Assignment
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-full sm:flex-1 relative">
                <div className="relative">
                  <select 
                    className="w-full bg-surface-container dark:bg-gray-700 rounded-lg pl-4 pr-10 py-3 appearance-none border-r-8 border-transparent outline outline-1 outline-surface-outline-variant dark:outline-gray-600 focus:outline-primary cursor-pointer text-sm text-surface-on dark:text-gray-100"
                    value={claim.contractorId || ""}
                    onChange={(e) => handleAssignContractor(e.target.value)}
                  >
                    <option value="" disabled>Select a sub...</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.specialty})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-on-variant pointer-events-none" />
                </div>
              </div>
              {claim.contractorId && (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-3 bg-secondary-container px-4 py-3 rounded-xl text-secondary-on-container flex-1 w-full sm:w-auto">
                      <Briefcase className="h-5 w-5 flex-shrink-0" />
                      <div className="text-sm overflow-hidden">
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
                  </div>
                )}
              </div>
            </div>
        )}

        {/* Scheduling Card */}
        <div className="bg-surface dark:bg-gray-800 p-6 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-normal text-surface-on flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Scheduling
            </h3>
          </div>

          {isScheduled && scheduledDate ? (
            // Active Schedule View
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-700">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-800 uppercase tracking-wide mb-1">Appointment Confirmed</p>
                    <div className="text-xl font-medium text-surface-on">
                      {new Date(scheduledDate.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <p className="text-surface-on-variant mt-1 font-medium">
                      Time Slot: {scheduledDate.timeSlot}
                    </p>
                    {claim.contractorName && (
                      <p className="text-xs text-surface-on-variant mt-2 flex items-center gap-1">
                        <HardHat className="h-3 w-3" />
                        Sub: {claim.contractorName}
                      </p>
                    )}
                  </div>
                </div>
                
                {isAdmin && (
                  <Button variant="outlined" onClick={handleReschedule} className="!border-green-300 text-green-800 hover:bg-green-100">
                    Reschedule / Edit
                  </Button>
                )}
            </div>
          ) : (
            // Scheduling Input View
            isAdmin ? (
              <div className="bg-surface-container/30 p-6 rounded-2xl border border-surface-outline-variant/50">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-surface-on">Confirm Appointment Details</h4>
                  <p className="text-xs text-surface-on-variant mt-1">
                    Enter the final date and time agreed upon with the homeowner via messaging.
                  </p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  {/* Date Picker Button */}
                  <div className="w-full flex-1">
                    <label className="block text-xs text-surface-on-variant mb-1 ml-1 font-medium">Scheduled Date</label>
                    <button
                      type="button"
                      onClick={() => setShowCalendarPicker(true)}
                      className="w-full rounded-lg border border-surface-outline bg-surface hover:border-primary hover:bg-surface-container transition-all cursor-pointer p-3 text-left flex items-center gap-3 text-sm text-surface-on"
                    >
                      <Calendar className="h-4 w-4 text-surface-on-variant flex-shrink-0" />
                      <span className={proposeDate ? 'text-surface-on' : 'text-surface-on-variant'}>
                        {proposeDate 
                          ? new Date(proposeDate).toLocaleDateString(undefined, { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })
                          : 'Add'
                        }
                      </span>
                    </button>
                  </div>

                  {/* Time Slot Select */}
                  <div className="w-full md:w-auto md:min-w-[200px]">
                    <MaterialSelect
                      label="Time Slot"
                      value={proposeTime}
                      onChange={(value) => setProposeTime(value as 'AM' | 'PM' | 'All Day')}
                      options={[
                        { value: 'AM', label: 'AM (8am - 12pm)' },
                        { value: 'PM', label: 'PM (12pm - 4pm)' },
                        { value: 'All Day', label: 'All Day' }
                      ]}
                    />
                  </div>

                  <Button 
                    variant="filled" 
                    onClick={handleConfirmSchedule} 
                    disabled={!proposeDate} 
                    className="w-full md:w-auto h-[46px]"
                    icon={<CheckCircle className="h-4 w-4" />}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-surface-on-variant bg-surface-container/20 rounded-2xl border border-dashed border-surface-outline-variant">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Scheduling is currently pending coordination.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Service Order Email Modal */}
      {showSOModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
           <div className="bg-surface dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out]">
              <div className="p-6 border-b border-surface-outline-variant flex justify-between items-center bg-surface-container">
                <h2 className="text-lg font-normal text-surface-on flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Send Service Order
                </h2>
                <button onClick={() => { setShowSOModal(false); setSoPdfUrl(null); }} className="text-surface-on-variant hover:text-surface-on">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Recipient Display */}
                <div className="bg-surface-container p-3 rounded-xl flex items-center justify-between">
                   <div>
                     <span className="text-xs font-bold text-surface-on-variant uppercase">To Sub</span>
                     <p className="font-medium text-surface-on">{claim.contractorName}</p>
                     <p className="text-xs text-surface-on-variant">{claim.contractorEmail}</p>
                   </div>
                   <div className="bg-surface p-2 rounded-full border border-surface-outline-variant">
                      <HardHat className="h-4 w-4 text-surface-outline"/>
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on-variant mb-1">Subject</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={soSubject}
                    onChange={(e) => setSoSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-on-variant mb-1">Message</label>
                  <textarea 
                    rows={6}
                    className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                    value={soBody}
                    onChange={(e) => setSoBody(e.target.value)}
                  />
                </div>

                {/* Simulated Attachment Display */}
                {soPdfUrl && (
                  <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium truncate flex-1">ServiceOrder_{claim.claimNumber || claim.id.substring(0, 8).toUpperCase()}.pdf</span>
                      <a href={soPdfUrl} target="_blank" rel="noreferrer" className="text-xs underline hover:text-primary-on-container">Preview</a>
                  </div>
                )}
              </div>

              <div className="p-4 bg-surface-container backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => { setShowSOModal(false); setSoPdfUrl(null); }}
                  className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 rounded-xl font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendServiceOrder}
                  disabled={isSendingSO}
                  className="px-6 py-2.5 bg-gray-900 text-white hover:bg-black hover:shadow-lg hover:-translate-y-0.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingSO ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Order
                    </>
                  )}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Calendar Picker Modal */}
      <CalendarPicker
        isOpen={showCalendarPicker}
        selectedDate={proposeDate ? new Date(proposeDate) : null}
        onSelectDate={(date) => {
          setProposeDate(date.toISOString().split('T')[0]);
          setShowCalendarPicker(false);
        }}
        onClose={() => setShowCalendarPicker(false)}
        minDate={new Date()}
      />

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

export default ClaimDetail;
