import React, { useState, useEffect, useRef } from 'react';
import { Claim, UserRole, ClaimStatus, ProposedDate, Contractor, InternalEmployee, ClaimClassification, Attachment } from '../types';
import Button from './Button';
import StatusBadge from './StatusBadge';
import CalendarPicker from './CalendarPicker';
import MaterialSelect from './MaterialSelect';
import { ClaimMessage } from './MessageSummaryModal';
import ImageViewerModal from './ImageViewerModal';
import { Calendar, CheckCircle, FileText, Mail, MessageSquare, Clock, HardHat, Info, Lock, Paperclip, Video, X, Edit2, Save, ChevronDown, ChevronUp, Send, Plus, User, ExternalLink, Upload, FileEdit, Trash2, StickyNote, Calendar as CalendarIcon, Tag, Bot, Sparkles } from 'lucide-react';
import { generateServiceOrderPDF } from '../services/pdfService';
import { sendEmail } from '../services/emailService';
import { CLAIM_CLASSIFICATIONS } from '../constants';
import { generatePDFThumbnail } from '../lib/pdfThumbnail';
import { useTaskStore } from '../stores/useTaskStore';
import { uploadMultipleFiles } from '../lib/services/uploadService';
import { NonWarrantyInput } from './claims/NonWarrantyInput';
import { AutoSaveTextarea } from './ui/AutoSaveTextarea';
import { AutoSaveInput } from './ui/AutoSaveInput';

interface ClaimInlineEditorProps {
  claim: Claim;
  onUpdateClaim: (claim: Claim) => void | Promise<void>;
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
  onCancel?: () => void;
  onNavigate?: (view: 'DASHBOARD' | 'TEAM' | 'DATA' | 'TASKS' | 'INVOICES' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND' | 'CALLS', config?: { initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS' | 'NOTES'; initialThreadId?: string | null }) => void;
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
  onCancel,
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
  const [editNonWarrantyExplanation, setEditNonWarrantyExplanation] = useState(claim.nonWarrantyExplanation || '');
  const [editDateEvaluated, setEditDateEvaluated] = useState(
    claim.dateEvaluated ? new Date(claim.dateEvaluated).toISOString().split('T')[0] : ''
  );
  const [isReviewed, setIsReviewed] = useState(claim.reviewed || false);
  const [newNote, setNewNote] = useState('');
  const [contractorSearch, setContractorSearch] = useState('');
  const [selectedContractorId, setSelectedContractorId] = useState<string>(claim.contractorId || '');
  const [showClassificationSelect, setShowClassificationSelect] = useState(false);
  const classificationSelectRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  
  // Scheduling state
  const [proposeDate, setProposeDate] = useState('');
  const [proposeTime, setProposeTime] = useState<'AM' | 'PM' | 'All Day'>('AM');
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  
  // Calendar picker state for Material 3 components
  const [showDateEvaluatedPicker, setShowDateEvaluatedPicker] = useState(false);
  const [showScheduledDatePicker, setShowScheduledDatePicker] = useState(false);
  
  // Service Order state
  const [showSOModal, setShowSOModal] = useState(false);
  const [soSubject, setSoSubject] = useState('');
  const [soBody, setSoBody] = useState('');
  const [isSendingSO, setIsSendingSO] = useState(false);
  const [soPdfUrl, setSoPdfUrl] = useState<string | null>(null);
  const [attachmentThumbnails, setAttachmentThumbnails] = useState<Array<{ type: 'image' | 'pdf'; url: string; name: string; thumbnail: string }>>([]);
  
  // Email Templates state
  interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
  }
  // AI Review state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReview, setAiReview] = useState<{
    status: 'Approved' | 'Denied' | 'Needs Info';
    reasoning: string;
    responseDraft: string;
  } | null>(null);
  const [showAiReview, setShowAiReview] = useState(false);

  // Reset AI analysis state when claim changes
  useEffect(() => {
    setAiReview(null);
    setShowAiReview(false);
    setIsAnalyzing(false);
  }, [claim.id]);

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('cascade_service_order_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateEditSubject, setTemplateEditSubject] = useState('');
  const [templateEditBody, setTemplateEditBody] = useState('');
  
  // Load templates from localStorage
  const loadTemplates = () => {
    try {
      const saved = localStorage.getItem('cascade_service_order_templates');
      if (saved) {
        const templates = JSON.parse(saved);
        setEmailTemplates(templates);
        return templates;
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
    return [];
  };
  
  // Save templates to localStorage
  const saveTemplates = (templates: EmailTemplate[]) => {
    try {
      localStorage.setItem('cascade_service_order_templates', JSON.stringify(templates));
      setEmailTemplates(templates);
    } catch (e) {
      console.error('Failed to save templates:', e);
    }
  };
  
  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSoSubject(template.subject);
      setSoBody(template.body);
      setSelectedTemplateId(templateId);
    }
  };
  
  // Open template creator
  const handleOpenTemplateCreator = (template?: EmailTemplate) => {
    if (template) {
      // Editing existing template - use template's values
      setEditingTemplateId(template.id);
      setTemplateName(template.name);
      setTemplateEditSubject(template.subject);
      setTemplateEditBody(template.body);
    } else {
      // Creating new template - use current soSubject/soBody
      setEditingTemplateId(null);
      setTemplateName('');
      setTemplateEditSubject(soSubject);
      setTemplateEditBody(soBody);
    }
    setShowTemplateModal(true);
  };
  
  // Save template
  const handleSaveTemplate = () => {
    const subjectToSave = editingTemplateId ? templateEditSubject : soSubject;
    const bodyToSave = editingTemplateId ? templateEditBody : soBody;
    
    if (!templateName.trim() || !subjectToSave.trim() || !bodyToSave.trim()) {
      alert('Please fill in template name, subject, and body.');
      return;
    }
    
    const templates = [...emailTemplates];
    if (editingTemplateId) {
      const index = templates.findIndex(t => t.id === editingTemplateId);
      if (index >= 0) {
        templates[index] = {
          id: editingTemplateId,
          name: templateName.trim(),
          subject: subjectToSave,
          body: bodyToSave
        };
      }
    } else {
      templates.push({
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        name: templateName.trim(),
        subject: subjectToSave,
        body: bodyToSave
      });
    }
    saveTemplates(templates);
    setShowTemplateModal(false);
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateEditSubject('');
    setTemplateEditBody('');
  };
  
  // Delete template
  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const templates = emailTemplates.filter(t => t.id !== templateId);
      saveTemplates(templates);
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
      }
    }
  };
  
  // Use default template if available
  const applyDefaultTemplate = () => {
    const templates = loadTemplates();
    const defaultTemplate = templates.find(t => t.id === 'default') || templates[0];
    if (defaultTemplate) {
      handleTemplateSelect(defaultTemplate.id);
    }
  };
  
  // Sub Assignment Modal state
  const [showSubModal, setShowSubModal] = useState(false);
  
  // Collapsible state - default to collapsed
  const [isInternalNotesExpanded, setIsInternalNotesExpanded] = useState(false);
  const [isMessageSummaryExpanded, setIsMessageSummaryExpanded] = useState(false);
  const [isNonWarrantyExpanded, setIsNonWarrantyExpanded] = useState(false);
  
  const scheduledDate = claim.proposedDates.find(d => d.status === 'ACCEPTED');
  const isScheduled = claim.status === ClaimStatus.SCHEDULED && claim.proposedDates.length > 0;
  
  useEffect(() => {
    setEditTitle(claim.title);
    setEditDescription(claim.description);
    setEditClassification(claim.classification);
    setEditInternalNotes(claim.internalNotes || '');
    setEditNonWarrantyExplanation(claim.nonWarrantyExplanation || '');
    setEditDateEvaluated(claim.dateEvaluated ? new Date(claim.dateEvaluated).toISOString().split('T')[0] : '');
    // Initialize proposeDate with scheduled date if available
    if (scheduledDate) {
      // Convert date to YYYY-MM-DD format for date input
      // Handle both Date objects and ISO strings
      let dateStr: string;
      // Store the date value in a variable to check its runtime type
      const dateValue: unknown = scheduledDate.date;
      // Type guard to check if value is a Date object
      const isDateObject = (value: unknown): value is Date => {
        return typeof value === 'object' && value !== null && value instanceof Date;
      };
      
      if (isDateObject(dateValue)) {
        dateStr = dateValue.toISOString().split('T')[0];
      } else if (typeof dateValue === 'string') {
        // If it's already a string, try to parse it or use it directly
        if (dateValue.includes('T')) {
          dateStr = dateValue.split('T')[0];
        } else {
          // Already in YYYY-MM-DD format
          dateStr = dateValue;
        }
      } else {
        // Fallback: try to create a Date from whatever it is
        const date = new Date(dateValue as any);
        dateStr = isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
      }
      setProposeDate(dateStr);
      setProposeTime(scheduledDate.timeSlot);
    } else {
      setProposeDate('');
      setProposeTime('AM');
    }
  }, [claim, scheduledDate]);
  
  const handleSaveDetails = () => {
    // Classifications that automatically close the claim
    const closingClassifications: ClaimClassification[] = [
      'Non-Warranty',
      'Service Complete',
      'Courtesy Repair (Non-Warranty)',
      'Duplicate'
    ];
    
    // Automatically set status to COMPLETED if classification is a closing classification
    const shouldClose = closingClassifications.includes(editClassification);
    const newStatus = shouldClose ? ClaimStatus.COMPLETED : claim.status;
    
    onUpdateClaim({
      ...claim,
      title: editTitle,
      description: editDescription,
      classification: editClassification,
      status: newStatus,
      internalNotes: editInternalNotes,
      nonWarrantyExplanation: editNonWarrantyExplanation,
      dateEvaluated: editDateEvaluated ? new Date(editDateEvaluated) : undefined,
      reviewed: isReviewed
    });
    setIsEditing(false); // Collapse editor after saving
    
    // Close the modal if onCancel is provided (when used in modal context)
    if (onCancel) {
      onCancel();
    }
  };
  
  const handleToggleReviewed = async () => {
    // Optimistic UI update for instant feedback
    const previousReviewedStatus = isReviewed;
    const newReviewedStatus = !isReviewed;
    setIsReviewed(newReviewedStatus);
    
    try {
      // Call the update function (which is async in the parent)
      await onUpdateClaim({
        ...claim,
        reviewed: newReviewedStatus
      });
    } catch (error) {
      // Revert on error
      console.error('Failed to update reviewed status:', error);
      setIsReviewed(previousReviewedStatus);
      // Show error feedback (could add toast here if available)
      alert('Failed to update reviewed status. Please try again.');
    }
  };
  
  const handleCancelEdit = () => {
    if (onCancel) {
      onCancel();
    } else {
    setEditTitle(claim.title);
    setEditDescription(claim.description);
    setEditClassification(claim.classification);
    setEditInternalNotes(claim.internalNotes || '');
    setEditNonWarrantyExplanation(claim.nonWarrantyExplanation || '');
    setEditDateEvaluated(claim.dateEvaluated ? new Date(claim.dateEvaluated).toISOString().split('T')[0] : '');
    setIsEditing(false);
    }
  };

  // AI Review Handler
  const handleAiReview = async () => {
    if (!claim.title || !claim.description) {
      alert('Claim must have a title and description to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setShowAiReview(true);
    setAiReview(null);

    try {
      console.log('🤖 Requesting AI analysis...');
      
      // Extract image URLs from attachments
      const imageUrls: string[] = [];
      if (claim.attachments && Array.isArray(claim.attachments)) {
        claim.attachments.forEach((att: any) => {
          if (att.url && att.type === 'IMAGE') {
            imageUrls.push(att.url);
          }
        });
      }
      
      console.log(`📸 Sending ${imageUrls.length} images for vision analysis`);
      
      // Call secure Netlify function with vision support
      const response = await fetch('/.netlify/functions/analyze-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimTitle: claim.title,
          claimDescription: claim.description,
          imageUrls: imageUrls, // Include images for vision analysis
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setAiReview(result);
      console.log('✅ AI analysis complete:', result.status);
    } catch (error) {
      console.error('❌ Error analyzing claim:', error);
      setAiReview({
        status: 'Needs Info',
        reasoning: 'AI analysis failed. Please review manually.',
        responseDraft: 'We are currently reviewing your warranty claim and will respond within 2-3 business days. Thank you for your patience.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy draft to clipboard
  const handleCopyDraft = () => {
    if (aiReview?.responseDraft) {
      navigator.clipboard.writeText(aiReview.responseDraft);
      alert('Response draft copied to clipboard!');
    }
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
      setSelectedContractorId(contractor.id);
    }
  };
  
  // Filter contractors for search
  const filteredContractors = contractorSearch.trim() 
    ? contractors.filter(c => (c.companyName || "").toLowerCase().includes((contractorSearch || "").toLowerCase()) || (c.specialty || "").toLowerCase().includes((contractorSearch || "").toLowerCase()))
    : [];
  
  // Close classification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (classificationSelectRef.current && !classificationSelectRef.current.contains(event.target as Node)) {
        setShowClassificationSelect(false);
      }
    };
    
    if (showClassificationSelect) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClassificationSelect]);
  
  const handlePrepareServiceOrder = async () => {
    if (!claim.contractorId || !claim.contractorName) {
      alert('Please assign a contractor first.');
      return;
    }
    
    // Try to use default template first
    const templates = loadTemplates();
    const defaultTemplate = templates.find(t => t.id === 'default') || templates[0];
    
    if (defaultTemplate) {
      // Replace placeholders with actual values
      const senderName = currentUser?.name || 'Admin';
      let subject = defaultTemplate.subject.replace(/\{claimTitle\}/g, claim.title).replace(/\{address\}/g, claim.address);
      let body = defaultTemplate.body.replace(/\{senderName\}/g, senderName).replace(/\{claimTitle\}/g, claim.title).replace(/\{address\}/g, claim.address);
      setSoSubject(subject || `Service Order: ${claim.title} - ${claim.address}`);
      setSoBody(body || '');
      setSelectedTemplateId(defaultTemplate.id);
    } else {
      // Use default template
      setSoSubject(`Service Order: ${claim.title} - ${claim.address}`);
      const senderName = currentUser?.name || 'Admin';
      setSoBody(`Hello,
 
This is ${senderName} with Cascade Builder Services and I have a warranty repair that needs to be scheduled. The details are described on the attached service order which also includes the homeowner's information, builder, project and lot number.  Pictures of the claim are attached and are also on the service order PDF.  Please let me know your next availability and I'll coordinate with the homeowner.  Once we have a date and time frame set, you will receive a notification requesting to accept the appointment.  Please do so as it helps with our tracking and also makes the homeowner aware that you've committed to the confirmed appointment. 

Once you've completed the assigned work, please have the homeowner sign and date the attached service order and send the signed copy back to me.
 
If this repair work is billable, please let me know prior to scheduling.`);
      setSelectedTemplateId('');
    }
    setShowSOModal(true);
    
    // Generate PDF and thumbnails
    try {
      const summary = `Service Order: ${claim.title} - ${claim.address}`;
      const pdfUrl = await generateServiceOrderPDF(claim, summary, true);
      if (pdfUrl && typeof pdfUrl === 'string') {
        setSoPdfUrl(pdfUrl);
        
        // Generate thumbnails for attachments
        const thumbnails: Array<{ type: 'image' | 'pdf'; url: string; name: string; thumbnail: string }> = [];
        
        // Generate PDF thumbnail
        try {
          const pdfThumbnail = await generatePDFThumbnail(pdfUrl, 200, 200);
          const claimNumber = claim.claimNumber || claim.id.substring(0, 8).toUpperCase();
          thumbnails.push({
            type: 'pdf',
            url: pdfUrl,
            name: `ServiceOrder_${claimNumber}.pdf`,
            thumbnail: pdfThumbnail
          });
        } catch (error) {
          console.error('Failed to generate PDF thumbnail:', error);
        }
        
        // Generate image thumbnails
        const imageAttachments = (claim.attachments || []).filter(att => att.type === 'IMAGE' && att.url);
        for (const attachment of imageAttachments) {
          try {
            // Create thumbnail from image URL
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const thumbnail = await new Promise<string>((resolve, reject) => {
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 200;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                  if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                  }
                } else {
                  if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                  }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', 0.8));
                } else {
                  reject(new Error('Failed to get canvas context'));
                }
              };
              img.onerror = () => reject(new Error('Failed to load image'));
              img.src = attachment.url;
            });
            
            thumbnails.push({
              type: 'image',
              url: attachment.url,
              name: attachment.name || 'image',
              thumbnail
            });
          } catch (error) {
            console.error(`Failed to generate thumbnail for ${attachment.name}:`, error);
          }
        }
        
        setAttachmentThumbnails(thumbnails);
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };
  
  const handleSendServiceOrder = async () => {
    if (!soSubject || !soBody || !claim.contractorEmail) return;
    
    setIsSendingSO(true);
    try {
      // Import PDF generation function
      const { generateServiceOrderPDFBlob } = await import('../services/pdfService');
      
      // Generate PDF blob
      const summary = `Service Order: ${claim.title} - ${claim.address}`;
      const pdfBlob = await generateServiceOrderPDFBlob(claim, summary);
      
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
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable Body - Takes full space */}
      <div className="flex-1 overflow-y-auto px-0 py-4 md:p-6 space-y-6 min-h-0">
          {/* Title and Description Card */}
          <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-lg border border-surface-outline-variant dark:border-gray-600">
            <div className="space-y-4">
              <div>
                {isEditing && !isReadOnly ? (
                  <AutoSaveInput
                    value={editTitle}
                    onSave={async (newTitle) => {
                      setEditTitle(newTitle);
                      await onUpdateClaim({
                        ...claim,
                        title: newTitle,
                      });
                    }}
                    label="Claim Title"
                    placeholder="Enter claim title..."
                  />
                ) : (
                  <>
                    <label className="block text-sm font-bold text-surface-on dark:text-gray-100 mb-3">Claim Title</label>
                    <p className="text-surface-on dark:text-gray-100 font-medium">{claim.title}</p>
                  </>
                )}
              </div>
              <div>
                {isEditing && !isReadOnly ? (
                  <AutoSaveTextarea
                    value={editDescription}
                    onSave={async (newDescription) => {
                      setEditDescription(newDescription);
                      await onUpdateClaim({
                        ...claim,
                        description: newDescription,
                      });
                    }}
                    label="Description"
                    placeholder="Enter description..."
                    rows={6}
                  />
                ) : (
                  <>
                    <label className="block text-sm font-bold text-surface-on dark:text-gray-100 mb-3">Description</label>
                    <div className="w-full rounded-input border border-secondary-container dark:border-gray-600 bg-transparent px-3 py-2 text-sm text-surface-on-variant dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                      {claim.description}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* AI Review Button - Admin Only */}
            {isAdmin && !isReadOnly && (
              <div className="mt-4 pt-4 border-t border-surface-outline-variant dark:border-gray-600">
                <Button
                  onClick={handleAiReview}
                  disabled={isAnalyzing}
                  variant="outlined"
                  className="!h-9 !w-9 !min-w-0 !rounded-full !p-0 flex items-center justify-center"
                  title="AI Review with Gemini"
                >
                  {isAnalyzing ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* AI Review Results */}
          {showAiReview && aiReview && isAdmin && (
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-surface-outline-variant dark:border-gray-700 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">AI Warranty Analysis</h4>
                <button
                  onClick={() => setShowAiReview(false)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Close AI Review"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="mb-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm ${
                  aiReview.status === 'Approved' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                    : aiReview.status === 'Denied'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                }`}>
                  {aiReview.status === 'Approved' && <CheckCircle className="h-4 w-4" />}
                  {aiReview.status === 'Denied' && <X className="h-4 w-4" />}
                  {aiReview.status === 'Needs Info' && <Info className="h-4 w-4" />}
                  <span>Recommendation: {aiReview.status}</span>
                </div>
              </div>

              {/* Reasoning */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Reasoning
                  </h5>
                  <button
                    onClick={() => {
                      const reasoningText = aiReview.status === 'Denied' 
                        ? `${aiReview.reasoning}\n\nNo warranty action required.`
                        : aiReview.reasoning;
                      navigator.clipboard.writeText(reasoningText);
                      alert('Reasoning copied to clipboard!');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary hover:bg-primary/90 text-white text-sm rounded-md transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {aiReview.reasoning}
                  {aiReview.status === 'Denied' && (
                    <span className="block mt-3 font-medium text-red-700 dark:text-red-400">
                      No warranty action required.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Attachments Section */}
          <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-lg border border-surface-outline-variant dark:border-gray-600">
            <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-3">
              Attachments
            </h4>
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
                              src={attachmentUrl.includes('cloudinary.com') 
                                ? attachmentUrl.replace('/upload/', '/upload/w_200,h_200,c_fill,q_auto,f_auto/')
                                : attachmentUrl
                              }
                              alt={attachmentName} 
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.parentElement?.querySelector('.image-fallback');
                                if (fallback) {
                                  (fallback as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                            <div className="image-fallback hidden absolute inset-0 w-full h-full flex-col items-center justify-center p-2 text-center bg-surface-container dark:bg-gray-700">
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
                <div className="border-t border-surface-outline-variant dark:border-gray-600 pt-4 mt-4">
                  <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-2">
                    Upload Images or Documents
                  </label>
                  <label className={`cursor-pointer flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-colors ${
                    isUploading ? 'bg-surface-container dark:bg-gray-700 border-primary/30 cursor-wait' : 'bg-surface-container/30 dark:bg-gray-700/30 border-surface-outline-variant dark:border-gray-600 hover:border-primary hover:bg-surface-container/50 dark:hover:bg-gray-700/50'
                  }`}>
                    {isUploading ? (
                      <>
                        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                        {uploadProgress.total > 0 && (
                          <span className="text-sm text-surface-on-variant dark:text-gray-400">
                            Uploading {uploadProgress.current}/{uploadProgress.total}...
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-surface-outline-variant dark:text-gray-500" />
                      </>
                    )}
                    <span className="text-xs text-surface-on-variant dark:text-gray-400 font-medium">
                      {isUploading ? 'Optimized for mobile uploads' : 'Multiple files supported'}
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
                        
                        const fileArray = Array.from(files);
                        setIsUploading(true);
                        setUploadProgress({ current: 0, total: fileArray.length });
                        
                        try {
                          console.log(`📤 Starting upload of ${fileArray.length} file(s) on ${/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop'}`);
                          
                          // Use centralized upload service with smart concurrency control
                          const { successes, failures } = await uploadMultipleFiles(fileArray, {
                            maxRetries: 3,
                            timeoutMs: 120000, // 2 minutes for mobile compatibility
                            maxFileSizeMB: 10,
                          });
                          
                          // Handle successes
                          if (successes.length > 0) {
                            const updatedAttachments = [...(claim.attachments || []), ...successes];
                            
                            console.log(`💾 Saving ${successes.length} attachment(s) to database`);
                            await onUpdateClaim({
                              ...claim,
                              attachments: updatedAttachments
                            });
                            console.log(`✅ Saved to database`);
                            
                            alert(`✓ Successfully uploaded ${successes.length} file${successes.length > 1 ? 's' : ''}`);
                          }
                          
                          // Handle failures with detailed info
                          if (failures.length > 0) {
                            console.error('Upload failures:', failures);
                            
                            // Show detailed error message with file names and reasons
                            let errorMessage = `⚠️ ${failures.length} of ${fileArray.length} file(s) failed:\n\n`;
                            failures.forEach((f, idx) => {
                              const sizeMB = (f.file.size / 1024 / 1024).toFixed(1);
                              errorMessage += `${idx + 1}. ${f.file.name} (${sizeMB}MB)\n   Error: ${f.error}\n\n`;
                            });
                            errorMessage += `💡 Tip: Try uploading files one at a time, or check your connection.`;
                            
                            alert(errorMessage);
                            
                            // Log detailed error info to console
                            failures.forEach(f => {
                              console.error(`❌ ${f.file.name} (${(f.file.size / 1024 / 1024).toFixed(2)}MB): ${f.error}`);
                            });
                          }
                        } catch (error: unknown) {
                          const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
                          console.error('❌ Upload error:', errorMessage);
                          alert(`Upload failed: ${errorMessage}`);
                        } finally {
                          setIsUploading(false);
                          setUploadProgress({ current: 0, total: 0 });
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Warranty Assessment (Admin Only) */}
          {isAdmin && (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4">
              <h3 className="font-semibold leading-none tracking-tight">Warranty Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Classification Field - Material 3 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">Classification</label>
                  {isEditing && !isReadOnly ? (
                    <MaterialSelect
                      value={editClassification || ""}
                      onChange={(value) => setEditClassification(value as ClaimClassification)}
                      options={[
                        { value: '11-Month', label: '11 Month' },
                        { value: 'Structural', label: 'Structural' },
                        { value: 'Plumbing', label: 'Plumbing' },
                        { value: 'Electrical', label: 'Electrical' },
                        { value: 'Exterior', label: 'Exterior' },
                        { value: 'Non-Warranty', label: 'Non-Warranty' },
                        { value: 'Service Complete', label: 'Service Complete' },
                        { value: 'Manufacturer Defect', label: 'Manufacturer Defect' }
                      ]}
                    />
                  ) : (
                    <span className="text-sm text-surface-on dark:text-gray-100">{claim.classification}</span>
                  )}
                </div>

                {/* Date Evaluated Field - Material 3 */}
                <div className="space-y-2 relative">
                  <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">Date Evaluated</label>
                  {isEditing && !isReadOnly && isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowDateEvaluatedPicker(true)}
                        className="w-full h-9 flex items-center px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container hover:bg-surface-container-highest dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <CalendarIcon className="h-4 w-4 text-surface-on-variant dark:text-gray-400 mr-2" />
                        <span className="text-surface-on dark:text-gray-100">
                          {editDateEvaluated ? new Date(editDateEvaluated).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Select date...'}
                        </span>
                      </button>

                      <CalendarPicker
                        isOpen={showDateEvaluatedPicker}
                        onClose={() => setShowDateEvaluatedPicker(false)}
                        onSelectDate={(date) => {
                          setEditDateEvaluated(date.toISOString());
                          setShowDateEvaluatedPicker(false);
                        }}
                        selectedDate={editDateEvaluated ? new Date(editDateEvaluated) : null}
                      />
                    </>
                  ) : (
                    <span className="text-sm text-surface-on dark:text-gray-100">
                      {claim.dateEvaluated ? new Date(claim.dateEvaluated).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Not evaluated'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Non-Warranty Explanation - Admin Only - Default Collapsed */}
          {isAdmin && (
            <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-lg border border-surface-outline-variant dark:border-gray-600">
              <button
                onClick={() => setIsNonWarrantyExpanded(!isNonWarrantyExpanded)}
                className="w-full flex items-center justify-between mb-3 text-left"
              >
                <h4 className="text-sm font-bold text-surface-on dark:text-gray-100">
                  Non-Warranty Explanation
                </h4>
                {isNonWarrantyExpanded ? (
                  <ChevronUp className="h-4 w-4 text-surface-on dark:text-gray-100" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-surface-on dark:text-gray-100" />
                )}
              </button>
              
              {isNonWarrantyExpanded && (
                <>
                  {isEditing && !isReadOnly ? (
                    <NonWarrantyInput
                      value={editNonWarrantyExplanation}
                      onChange={setEditNonWarrantyExplanation}
                      disabled={false}
                      placeholder="Select a template or enter explanation for non-warranty classification..."
                      rows={6}
                    />
                  ) : (
                    <div className="w-full rounded-input border border-surface-outline-variant dark:border-gray-600 bg-transparent px-3 py-2 text-sm text-surface-on-variant dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                      {claim.nonWarrantyExplanation || 'No explanation provided.'}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Messages - Visible to All Users */}
          <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-lg border border-surface-outline-variant dark:border-gray-600">
            <button
              onClick={() => setIsMessageSummaryExpanded(!isMessageSummaryExpanded)}
              className="w-full flex items-center justify-between mb-3 text-left"
            >
              <h4 className="text-sm font-bold text-surface-on dark:text-gray-100">
                Messages
              </h4>
              {isMessageSummaryExpanded ? (
                <ChevronUp className="h-4 w-4 text-surface-on dark:text-gray-100" />
              ) : (
                <ChevronDown className="h-4 w-4 text-surface-on dark:text-gray-100" />
              )}
            </button>
            
            {isMessageSummaryExpanded && (
              <>
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
                            <div className="flex flex-wrap items-center gap-2">
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
                            <div className="flex items-center gap-2">
                              {!isHomeowner && (
                                <button
                                  onClick={() => {
                                    // Navigate to the Notes tab with message context and pre-filled body
                                    const project = claim.jobName || claim.address;
                                    const contextLabel = `${msg.subject} • ${project}`;
                                    const prefilledBody = `Message ${project} back.`;
                                    
                                    useTaskStore.getState().openTasks(
                                      claim.id,
                                      contextLabel,
                                      'message',
                                      prefilledBody
                                    );
                                  }}
                                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                                  title={`Add a note about: ${msg.subject}`}
                                >
                                  <StickyNote className="h-3.5 w-3.5" />
                                  <span>Note</span>
                                </button>
                              )}
                              <span className="text-xs text-secondary-on-container dark:text-gray-400 opacity-70">
                                {new Date(msg.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="mb-2">
                            <p className="text-xs font-medium text-secondary-on-container dark:text-gray-400 opacity-70 mb-1">Subject:</p>
                            <p className="text-sm text-secondary-on-container dark:text-gray-200">{msg.subject}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-secondary-on-container dark:text-gray-400 opacity-70 mb-1">Message:</p>
                            <p className="text-sm text-secondary-on-container dark:text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className="mt-2 pt-2 border-t border-secondary-container-high dark:border-gray-600 flex flex-wrap items-center justify-between gap-2">
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
                
                {/* Send Message Button */}
                <div className="mt-4 pt-4 border-t border-surface-outline-variant dark:border-gray-600">
                  <Button 
                    type="button" 
                    variant="filled"
                    onClick={() => onSendMessage(claim)}
                    className="w-full"
                  >
                    Send Message
                  </Button>
                </div>
              </>
            )}
          </div>
          {/* Sub Assignment (Admin Only) */}
          {isAdmin && (
            <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-lg border border-surface-outline-variant dark:border-gray-600">
              <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4">Sub Assignment</h4>
              
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Type to search subs..."
                  className="w-full rounded-md border border-surface-outline dark:border-gray-600 bg-surface dark:bg-gray-700 px-3 py-2 text-sm text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={contractorSearch}
                  onChange={(e) => setContractorSearch(e.target.value)}
                />
                      </div>

              {contractorSearch.trim().length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-surface-outline-variant dark:border-gray-600 rounded-md bg-surface dark:bg-gray-700 shadow-elevation-1">
                  {filteredContractors.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-surface-on-variant dark:text-gray-400">No subs found.</div>
                  ) : (
                    filteredContractors.map(c => (
                  <button
                        key={c.id}
                    type="button"
                        onClick={() => { 
                          handleAssignContractor(c.id);
                          setContractorSearch('');
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex justify-between hover:bg-surface-container dark:hover:bg-gray-600 ${selectedContractorId === c.id ? 'bg-primary-container text-primary-on-container' : 'text-surface-on dark:text-gray-100'}`}
                  >
                        <span>{c.companyName}</span>
                        <span className="text-xs opacity-70">{c.specialty}</span>
                  </button>
                    ))
                )}
              </div>
              )}
              
              {selectedContractorId && (
                <div className="mt-2 flex flex-row items-center gap-3">
                  <div className="flex items-center bg-secondary-container px-4 py-3 rounded-xl text-secondary-on-container flex-1 min-w-0">
                    <div className="text-sm overflow-hidden min-w-0">
                      <p className="font-bold truncate">{contractors.find(c => c.id === selectedContractorId)?.companyName}</p>
                    </div>
                  </div>
                  
                  <Button 
                    type="button"
                    variant="filled" 
                    onClick={handlePrepareServiceOrder} 
                    icon={<FileText className="h-4 w-4" />}
                    className="!h-9 whitespace-nowrap flex-shrink-0 !text-sm"
                  >
                    Email SO
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Scheduling */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4">
            <h3 className="font-semibold leading-none tracking-tight">Scheduling</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scheduled Date Field - Material 3 */}
              <div className="space-y-2 relative">
                <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">Scheduled Date</label>
                {isAdmin && isEditing && !isReadOnly ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowScheduledDatePicker(true)}
                      className="w-full h-9 flex items-center px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 hover:bg-surface-container-highest dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <CalendarIcon className="h-4 w-4 text-surface-on-variant dark:text-gray-400 mr-2" />
                      <span className="text-surface-on dark:text-gray-100">
                        {proposeDate ? new Date(proposeDate).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : scheduledDate ? new Date(scheduledDate.date).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'Select date...'}
                      </span>
                    </button>
                    
                    <CalendarPicker
                      isOpen={showScheduledDatePicker}
                      onClose={() => setShowScheduledDatePicker(false)}
                      onSelectDate={(date) => {
                        setProposeDate(date.toISOString().split('T')[0]);
                        setShowScheduledDatePicker(false);
                      }}
                      selectedDate={proposeDate ? new Date(proposeDate) : scheduledDate ? new Date(scheduledDate.date) : null}
                    />
                  </>
                ) : scheduledDate ? (
                  <span className="text-sm text-surface-on dark:text-gray-100">
                    {new Date(scheduledDate.date).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                ) : (
                  <span className="text-sm text-surface-on-variant dark:text-gray-400">No appointment scheduled</span>
                )}
              </div>

              {/* Time Slot Field - Material 3 */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">Time Slot</label>
                {isAdmin && isEditing && !isReadOnly ? (
                  <MaterialSelect
                    value={proposeTime || scheduledDate?.timeSlot || 'AM'}
                    onChange={(value) => setProposeTime(value as 'AM' | 'PM' | 'All Day')}
                    options={[
                      { value: 'AM', label: 'AM (8am - 12pm)' },
                      { value: 'PM', label: 'PM (12pm - 4pm)' },
                      { value: 'All Day', label: 'All Day' }
                    ]}
                  />
                ) : scheduledDate?.timeSlot ? (
                  <span className="text-sm text-surface-on dark:text-gray-100">{scheduledDate.timeSlot === 'AM' ? 'AM (8am-12pm)' : scheduledDate.timeSlot === 'PM' ? 'PM (12pm-4pm)' : 'All Day'}</span>
                ) : null}
              </div>
            </div>
            {isAdmin && isEditing && !isReadOnly && (proposeDate || scheduledDate) && (
              <Button
                type="button"
                variant="filled"
                onClick={handleConfirmSchedule}
                disabled={!proposeDate && !scheduledDate}
              >
                {scheduledDate ? 'Update' : 'Confirm'}
              </Button>
            )}
              
            {/* Appointment Confirmed Card - Show when scheduled date exists */}
            {scheduledDate && (
              <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center text-green-700 dark:text-green-300 flex-shrink-0">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wide mb-1">
                      {claim.status === ClaimStatus.CLOSED ? 'Work Completed' : 'Appointment Confirmed'}
                    </p>
                    <div className="text-base font-medium text-surface-on dark:text-gray-100">
                      {new Date(scheduledDate.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <p className="text-sm text-surface-on-variant dark:text-gray-300 mt-0.5 font-medium">
                      Time Slot: {scheduledDate.timeSlot}
                    </p>
                    {claim.contractorName && (
                      <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1.5 flex items-center gap-1">
                        <HardHat className="h-3 w-3" />
                        Sub: {claim.contractorName}
                      </p>
                    )}
                    {claim.completedAt && (
                      <p className="text-xs text-green-700 dark:text-green-400 mt-2 font-medium">
                        Completed: {new Date(claim.completedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Mark Completed / Reopen Button */}
                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                    {claim.status !== ClaimStatus.CLOSED ? (
                      <Button
                        type="button"
                        variant="filled"
                        onClick={() => {
                          onUpdateClaim({
                            ...claim,
                            status: ClaimStatus.CLOSED,
                            completedAt: new Date(),
                            scheduledAt: scheduledDate ? new Date(scheduledDate.date) : undefined
                          });
                        }}
                        className="w-full"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Completed
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          onUpdateClaim({
                            ...claim,
                            status: ClaimStatus.SCHEDULED,
                            completedAt: undefined
                          });
                        }}
                        className="w-full"
                      >
                        Reopen Claim
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Internal Notes - Admin Only */}
          {isAdmin && (
            <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-lg border border-surface-outline-variant dark:border-gray-600">
                  {isEditing && !isReadOnly ? (
                    <AutoSaveTextarea
                      value={editInternalNotes}
                      onSave={async (newNotes) => {
                        setEditInternalNotes(newNotes);
                        await onUpdateClaim({
                          ...claim,
                          internalNotes: newNotes,
                        });
                      }}
                      label="Internal Notes (Admin Only)"
                      placeholder="Enter internal notes..."
                      rows={6}
                    />
              ) : (
                <>
                  <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-3">Internal Notes (Admin Only)</h4>
                  <div className="w-full rounded-input border border-surface-outline-variant dark:border-gray-600 bg-transparent px-3 py-2 text-sm text-surface-on-variant dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {claim.internalNotes || 'No internal notes.'}
                  </div>
                </>
              )}
            </div>
          )}
      
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

      {/* Date Evaluated Calendar Picker */}
      {showDateEvaluatedPicker && (
        <CalendarPicker
          isOpen={showDateEvaluatedPicker}
          selectedDate={editDateEvaluated ? new Date(editDateEvaluated) : null}
          onSelectDate={(date) => {
            setEditDateEvaluated(date.toISOString().split('T')[0]);
            setShowDateEvaluatedPicker(false);
          }}
          onClose={() => setShowDateEvaluatedPicker(false)}
        />
      )}
      
      {/* Sub Assignment Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]" onClick={() => setShowSubModal(false)}>
          <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 w-full max-w-md mx-4 animate-[scale-in_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
          <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col animate-[scale-in_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Send Service Order</h2>
              <button onClick={() => {
                setShowSOModal(false);
                setAttachmentThumbnails([]);
              }} className="p-2 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 transition-colors">
                <X className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-surface dark:bg-gray-800">
              {/* Template Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400">Email Template</label>
                  <button
                    onClick={() => handleOpenTemplateCreator()}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <FileEdit className="h-3 w-3" />
                    Manage Templates
                  </button>
                </div>
                  <div className="flex gap-2">
                  <select
                    className="flex-1 bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={selectedTemplateId}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleTemplateSelect(e.target.value);
                      } else {
                        setSelectedTemplateId('');
                      }
                    }}
                  >
                    <option value="">Default Template</option>
                    {emailTemplates.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                  {selectedTemplateId && (
                    <>
                      <button
                        onClick={() => {
                          const template = emailTemplates.find(t => t.id === selectedTemplateId);
                          if (template) handleOpenTemplateCreator(template);
                        }}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit template"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(selectedTemplateId)}
                        className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                {/* Template List for Management */}
                {emailTemplates.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {emailTemplates.map(template => (
                      <div key={template.id} className="flex items-center justify-between p-2 bg-surface-container dark:bg-gray-700 rounded-lg">
                        <span className="text-sm text-surface-on dark:text-gray-100">{template.name}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenTemplateCreator(template)}
                            className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-1 text-error hover:bg-error/10 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
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
                  rows={8}
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none overflow-hidden"
                  value={soBody}
                  onChange={e => setSoBody(e.target.value)}
                />
              </div>
              
              {/* Attachment Thumbnails */}
              {attachmentThumbnails.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-3">Attachments ({attachmentThumbnails.length})</label>
                  <div className="flex flex-wrap gap-4">
                    {attachmentThumbnails.map((att, index) => (
                      <div
                        key={index}
                        className="relative"
                      >
                        <div className="w-28 h-28 rounded-lg border-2 border-surface-outline-variant dark:border-gray-600 overflow-hidden bg-surface-container dark:bg-gray-700 flex items-center justify-center shadow-sm">
                          {att.type === 'pdf' ? (
                            <img
                              src={att.thumbnail}
                              alt={att.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <img
                              src={att.thumbnail}
                              alt={att.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="mt-2 text-xs text-surface-on-variant dark:text-gray-400 truncate text-center max-w-[112px]">
                          {att.name.length > 18 ? att.name.substring(0, 15) + '...' : att.name}
                        </div>
                        {att.type === 'pdf' && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-on text-[10px] font-medium px-1.5 py-0.5 rounded">
                            PDF
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Save as Template Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleOpenTemplateCreator()}
                  className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 px-3 py-1.5 hover:bg-primary/5 rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4" />
                  Save as Template
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 flex justify-end gap-2">
              <Button variant="filled" onClick={() => {
                setShowSOModal(false);
                setAttachmentThumbnails([]);
              }}>Cancel</Button>
              <Button variant="filled" onClick={handleSendServiceOrder} disabled={isSendingSO || !soSubject || !soBody} icon={<Send className="h-4 w-4" />}>
                {isSendingSO ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Email Template Creator Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
          <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col animate-[scale-in_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">
                {editingTemplateId ? 'Edit Template' : 'Create Email Template'}
              </h2>
              <button onClick={() => {
                setShowTemplateModal(false);
                setEditingTemplateId(null);
                setTemplateName('');
                setTemplateEditSubject('');
                setTemplateEditBody('');
              }} className="p-2 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 transition-colors">
                <X className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-surface dark:bg-gray-800">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Template Name</label>
                <input
                  type="text"
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g., Standard Service Order"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Subject</label>
                <input
                  type="text"
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={editingTemplateId ? templateEditSubject : soSubject}
                  onChange={e => editingTemplateId ? setTemplateEditSubject(e.target.value) : setSoSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Message Body</label>
                <textarea 
                  rows={10}
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none overflow-hidden"
                  value={editingTemplateId ? templateEditBody : soBody}
                  onChange={e => editingTemplateId ? setTemplateEditBody(e.target.value) : setSoBody(e.target.value)}
                />
                <p className="text-xs text-surface-on-variant dark:text-gray-500 mt-1">
                  Use placeholders: {'{senderName}'} (sender name), {'{claimTitle}'} (claim title), {'{address}'} (property address)
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 flex justify-end gap-2 bg-surface-container dark:bg-gray-700">
              <Button variant="text" onClick={() => {
                setShowTemplateModal(false);
                setEditingTemplateId(null);
                setTemplateName('');
                setTemplateEditSubject('');
                setTemplateEditBody('');
              }}>Cancel</Button>
              <Button variant="filled" onClick={handleSaveTemplate} disabled={!templateName.trim() || !(editingTemplateId ? templateEditSubject : soSubject).trim() || !(editingTemplateId ? templateEditBody : soBody).trim()} icon={<Save className="h-4 w-4" />}>
                {editingTemplateId ? 'Update Template' : 'Save Template'}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
      
      {/* Footer - Fixed at bottom */}
      <div className="flex-none px-6 py-4 border-t border-surface-outline-variant dark:border-gray-700 bg-surface dark:bg-gray-800 flex justify-end space-x-3">
        <Button
          type="button"
          variant="filled"
          onClick={() => onSendMessage(claim)}
          className="!h-9"
        >
          Message
        </Button>
        {!isHomeowner && (
          <Button
            type="button"
            variant="filled"
            onClick={() => {
              const contextLabel = `${claim.title || 'Untitled'} • Claim #${claim.claimNumber || claim.id.substring(0, 8)} • ${claim.jobName || claim.address}`;
              useTaskStore.getState().openTasks(claim.id, contextLabel, 'claim');
            }}
            title={`Add a note for ${claim.claimNumber || 'this claim'}`}
            className="!h-9"
          >
            Note
          </Button>
        )}
        {!isHomeowner && (
          <Button 
            type="button" 
            variant="filled"
            onClick={handleToggleReviewed}
            className="!h-9"
          >
            {isReviewed ? 'Reviewed' : 'Process'}
          </Button>
        )}
        {onCancel && (
          <Button 
            type="button" 
            variant="filled" 
            onClick={onCancel}
            className="!h-9"
          >
            Cancel
          </Button>
        )}
        <Button 
          type="button" 
          variant="filled" 
          onClick={handleSaveDetails}
          className="!h-9"
        >
          Save
        </Button>
      </div>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        attachments={claim.attachments || []}
        initialIndex={imageViewerIndex}
        onClose={() => setImageViewerOpen(false)}
        readOnly={isReadOnly}
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

