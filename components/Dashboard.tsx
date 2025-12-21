
import React, { useState, useEffect, useRef, forwardRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import HTMLFlipBook from 'react-pageflip';
// Lazy load heavy libraries - only load when needed
// import Papa from 'papaparse';
// import * as XLSX from 'xlsx';
import { motion, AnimatePresence, type Transition, type Variants } from 'framer-motion';
import { Claim, ClaimStatus, UserRole, Homeowner, InternalEmployee, HomeownerDocument, MessageThread, Message, BuilderGroup, Task, Contractor } from '../types';
import { ClaimMessage } from './MessageSummaryModal';
import StatusBadge from './StatusBadge';
import { ArrowRight, Calendar, Plus, ClipboardList, Mail, X, Send, Building2, MapPin, Phone, Clock, FileText, Download, Upload, Search, Home, MoreVertical, Paperclip, Edit2, Archive, CheckSquare, Reply, Star, Trash2, ChevronLeft, ChevronRight, CornerUpLeft, Lock as LockIcon, Loader2, Eye, ChevronDown, ChevronUp, HardHat, Info, Printer, Share2, Filter, FileSpreadsheet, FileEdit, Save, CheckCircle } from 'lucide-react';
import Button from './Button';
import { draftInviteEmail } from '../services/geminiService';
import { sendEmail, generateNotificationBody } from '../services/emailService';
import TaskList from './TaskList';
import TaskDetail from './TaskDetail';
// Lazy load heavy components to improve initial load time
// Add error handling for failed dynamic imports
const PdfFlipViewer3D = React.lazy(() => import('./PdfFlipViewer3D').catch(err => {
  console.error('Failed to load PdfFlipViewer3D:', err);
  // Return a fallback component
  return { default: () => <div className="p-4 text-red-500">Failed to load PDF viewer. Please refresh the page.</div> };
}));

const ClaimInlineEditor = React.lazy(() => import('./ClaimInlineEditor').catch(err => {
  console.error('Failed to load ClaimInlineEditor:', err);
  // Return a fallback component
  return { default: () => <div className="p-4 text-red-500">Failed to load claim editor. Please refresh the page.</div> };
}));

const NewClaimForm = React.lazy(() => import('./NewClaimForm').catch(err => {
  console.error('Failed to load NewClaimForm:', err);
  // Return a fallback component
  return { default: () => <div className="p-4 text-red-500">Failed to load claim form. Please refresh the page.</div> };
}));

const PunchListApp = React.lazy(() => import('./PunchListApp').catch(err => {
  console.error('Failed to load PunchListApp:', err);
  // Return a fallback component
  return { default: () => <div className="p-4 text-red-500">Failed to load punch list. Please refresh the page.</div> };
}));
import { HOMEOWNER_MANUAL_IMAGES } from '../lib/bluetag/constants';

// PDF Thumbnail Component - Generates thumbnail on-the-fly if missing
const PDFThumbnailDisplay: React.FC<{ doc: HomeownerDocument }> = ({ doc }) => {
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(doc.thumbnailUrl || null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const hasTriedGenerate = React.useRef(false);

  React.useEffect(() => {
    // Reset when doc changes
    setThumbnailUrl(doc.thumbnailUrl || null);
    setHasError(false);
    hasTriedGenerate.current = false;
  }, [doc.id, doc.url]);

  React.useEffect(() => {
    // If thumbnail doesn't exist, generate it (only try once per doc)
    if (!thumbnailUrl && doc.url && !isGenerating && !hasError && !hasTriedGenerate.current) {
      hasTriedGenerate.current = true;
      setIsGenerating(true);
      import('../lib/pdfThumbnail')
        .then(({ generatePDFThumbnail }) => generatePDFThumbnail(doc.url))
        .then((url) => {
          setThumbnailUrl(url);
          setIsGenerating(false);
        })
        .catch((error) => {
          console.error('Failed to generate PDF thumbnail:', error);
          setHasError(true);
          setIsGenerating(false);
        });
    }
  }, [doc.url, thumbnailUrl, isGenerating, hasError]);

  if (thumbnailUrl) {
    return (
      <div className="w-full h-full overflow-hidden absolute inset-0" style={{ position: 'relative' }}>
        <img
          src={thumbnailUrl}
          alt={doc.name}
          className="w-full h-full object-contain"
          style={{ 
            pointerEvents: 'none',
            width: '100%',
            height: '100%',
            display: 'block'
          }}
          onError={() => {
            console.error('PDF thumbnail image failed to load');
            setHasError(true);
            setThumbnailUrl(null);
          }}
        />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 absolute inset-0">
        <Loader2 className="h-8 w-8 text-surface-outline-variant dark:text-gray-500 animate-spin" />
      </div>
    );
  }

  // Fallback: Show PDF icon
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 absolute inset-0">
      <FileText className="h-12 w-12 text-surface-outline-variant dark:text-gray-500" />
    </div>
  );
};

// Image page component for flipbook (wrapped in forwardRef as required by react-pageflip)
interface ManualImagePageProps {
  imageUrl: string;
  pageNumber: number;
  width: number;
  height: number;
}

const ManualImagePage = forwardRef<HTMLDivElement, ManualImagePageProps>(({ imageUrl, pageNumber, width, height }, ref) => {
  return (
    <div 
      ref={ref} 
      className="manual-image-page" 
      style={{ 
        width, 
        height, 
        padding: 0, 
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        overflow: 'hidden'
      }}
    >
      <img
        src={imageUrl}
        alt={`Manual Page ${pageNumber}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block'
        }}
        loading="eager"
        decoding="async"
      />
    </div>
  );
});

ManualImagePage.displayName = 'ManualImagePage';

// Flipbook component for manual images
interface ManualImageFlipBookProps {
  images: string[];
  width: number;
  height: number;
  flipBookRef: React.RefObject<any>;
  onDimensionsChange: (dims: { width: number; height: number }) => void;
}

const ManualImageFlipBook: React.FC<ManualImageFlipBookProps> = ({ images, width, height, flipBookRef, onDimensionsChange }) => {
  // Calculate dimensions that fit within viewport
  useEffect(() => {
    const updateDimensions = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 200; // Padding for header/footer and margins
      const maxWidth = Math.min(800, viewportWidth - padding);
      const maxHeight = Math.min(1200, viewportHeight - padding);

      // Maintain 2:3 aspect ratio (common for manual pages)
      const aspectRatio = 2 / 3;
      
      let calcWidth = maxWidth;
      let calcHeight = calcWidth / aspectRatio;

      // If height is too large, scale down based on height
      if (calcHeight > maxHeight) {
        calcHeight = maxHeight;
        calcWidth = calcHeight * aspectRatio;
      }

      onDimensionsChange({ width: Math.round(calcWidth), height: Math.round(calcHeight) });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [onDimensionsChange]);

  return (
    <div style={{ maxWidth: '100%', maxHeight: '100%', overflow: 'hidden' }}>
      <HTMLFlipBook
        ref={flipBookRef}
        width={width}
        height={height}
        size="fixed"
        showCover={false}
        className="manual-flipbook"
        {...({} as any)}
      >
        {images.map((imageUrl, index) => (
          <ManualImagePage
            key={`manual-page-${index}`}
            imageUrl={imageUrl}
            pageNumber={index + 1}
            width={width}
            height={height}
          />
        ))}
      </HTMLFlipBook>
    </div>
  );
};

interface DashboardProps {
  claims: Claim[];
  userRole: UserRole;
  onSelectClaim: (claim: Claim, startInEditMode?: boolean) => void;
  onNewClaim: (homeownerId?: string) => void;
  onCreateClaim?: (data: Partial<Claim>) => void;
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
  onDeleteDocument?: (docId: string) => void;

  // Messaging
  messages: MessageThread[];
  onSendMessage: (threadId: string, content: string) => void;
  onCreateThread: (homeownerId: string, subject: string, content: string) => void;
  onUpdateThread?: (threadId: string, updates: Partial<MessageThread>) => void;
  onAddInternalNote?: (claimId: string, noteText: string, userName?: string) => Promise<void>;
  onTrackClaimMessage?: (claimId: string, messageData: {
    type: 'HOMEOWNER' | 'SUBCONTRACTOR';
    threadId?: string;
    subject: string;
    recipient: string;
    recipientEmail: string;
    content: string;
    senderName: string;
  }) => void;
  onUpdateClaim?: (claim: Claim) => void;
  contractors?: Contractor[];
  claimMessages?: ClaimMessage[];

  // Builder Groups for Dropdown
  builderGroups?: BuilderGroup[];
  
  // Additional props for filtering
  currentBuilderId?: string | null; // Builder group ID for builder users
  currentUserEmail?: string; // Current user's email for contractor matching

  // Initial State Control (Optional)
  initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS';
  initialThreadId?: string | null;

  // Tasks Widget Support
  tasks?: Task[];
  onAddTask: (task: Partial<Task>) => Promise<void> | void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onNavigate?: (view: 'DASHBOARD' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'INVOICES' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  claims, 
  userRole, 
  onSelectClaim, 
  onNewClaim,
  onCreateClaim,
  homeowners,
  activeHomeowner,
  employees,
  currentUser,
  targetHomeowner,
  onClearHomeownerSelection,
  onUpdateHomeowner,
  documents,
  onUploadDocument,
  onDeleteDocument,
  messages,
  onSendMessage,
  onCreateThread,
  onUpdateThread,
  onAddInternalNote,
  onTrackClaimMessage,
  onUpdateClaim,
  contractors = [],
  claimMessages = [],
  builderGroups = [],
  currentBuilderId = null,
  currentUserEmail,
  initialTab = 'CLAIMS',
  initialThreadId = null,
  tasks = [],
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onNavigate
}) => {
  const isAdmin = userRole === UserRole.ADMIN;
  const isBuilder = userRole === UserRole.BUILDER;
  // Check if user is actually logged in as admin (has currentUser/activeEmployee)
  const isAdminAccount = !!currentUser;
  
  // PDF Viewer state
  const [selectedDocument, setSelectedDocument] = useState<HomeownerDocument | null>(null);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);
  
  // Manual page viewer state
  const [manualPageDimensions, setManualPageDimensions] = useState({ width: 800, height: 1200 });
  const manualFlipBookRef = useRef<any>(null);
  
  // Description expand popup state
  const [expandedDescription, setExpandedDescription] = useState<Claim | null>(null);
  
  // Selected claim for modal
  const [selectedClaimForModal, setSelectedClaimForModal] = useState<Claim | null>(null);
  
  // Selected task for modal
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  
  // Header scroll sync refs
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedClaimForModal || selectedTaskForModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedClaimForModal, selectedTaskForModal]);
  
  
  // View State for Dashboard (Claims vs Messages vs Tasks vs Documents)
  const [currentTab, setCurrentTab] = useState<'CLAIMS' | 'MESSAGES' | 'TASKS' | 'DOCUMENTS'>(initialTab || 'CLAIMS');
  
  // Carousel ref for mobile
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // Swipe gesture state for mobile (kept for desktop compatibility, but not used on mobile)
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState<number>(0); // 0 to 1, represents swipe completion
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [targetTab, setTargetTab] = useState<'CLAIMS' | 'MESSAGES' | 'TASKS' | 'DOCUMENTS' | null>(null);
  
  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;
  
  // Get available tabs in order
  const getAvailableTabs = (): Array<'CLAIMS' | 'MESSAGES' | 'TASKS' | 'DOCUMENTS'> => {
    const isHomeownerViewRole = userRole === UserRole.HOMEOWNER;
    const tabs: Array<'CLAIMS' | 'MESSAGES' | 'TASKS' | 'DOCUMENTS'> = ['CLAIMS'];
    if (isAdmin && !isHomeownerViewRole) {
      tabs.push('TASKS');
    }
    tabs.push('MESSAGES');
    if (isHomeownerViewRole) {
      tabs.push('DOCUMENTS');
    }
    return tabs;
  };
  
  // Handle swipe gestures for mobile tab navigation
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setSwipeProgress(0);
    setSwipeDirection(null);
    setTargetTab(null);
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentX = e.targetTouches[0].clientX;
    setTouchEnd(currentX);
    
    const distance = touchStart - currentX;
    const availableTabs = getAvailableTabs();
    const currentIndex = availableTabs.indexOf(currentTab);
    
    // Determine swipe direction and target tab
    if (Math.abs(distance) > 10) { // Small threshold to avoid jitter
      if (distance > 0 && currentIndex < availableTabs.length - 1) {
        // Swiping left - next tab
        setSwipeDirection('left');
        setTargetTab(availableTabs[currentIndex + 1]);
      } else if (distance < 0 && currentIndex > 0) {
        // Swiping right - previous tab
        setSwipeDirection('right');
        setTargetTab(availableTabs[currentIndex - 1]);
      } else {
        setSwipeDirection(null);
        setTargetTab(null);
      }
      
      // Calculate swipe progress (0 to 1)
      const maxDistance = window.innerWidth * 0.7; // Use 70% of screen width as max (slower animation)
      const progress = Math.min(Math.abs(distance) / maxDistance, 1);
      setSwipeProgress(progress);
    }
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeProgress(0);
      setSwipeDirection(null);
      setTargetTab(null);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      const availableTabs = getAvailableTabs();
      const currentIndex = availableTabs.indexOf(currentTab);
      
      // Complete the swipe with smooth animation
      if (isLeftSwipe && currentIndex < availableTabs.length - 1) {
        // Swipe left - go to next tab
        setSwipeProgress(1); // Complete the animation
        setTimeout(() => {
          setCurrentTab(availableTabs[currentIndex + 1]);
          setSwipeProgress(0);
          setSwipeDirection(null);
          setTargetTab(null);
        }, 100); // Small delay for smooth transition
      } else if (isRightSwipe && currentIndex > 0) {
        // Swipe right - go to previous tab
        setSwipeProgress(1); // Complete the animation
        setTimeout(() => {
          setCurrentTab(availableTabs[currentIndex - 1]);
          setSwipeProgress(0);
          setSwipeDirection(null);
          setTargetTab(null);
        }, 100); // Small delay for smooth transition
      } else {
        // Reset swipe state if not enough distance
        setSwipeProgress(0);
        setSwipeDirection(null);
        setTargetTab(null);
      }
    } else {
      // Reset swipe state if not enough distance
      setSwipeProgress(0);
      setSwipeDirection(null);
      setTargetTab(null);
    }
    
    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
  };
  
  // Claims filter state
  const [claimsFilter, setClaimsFilter] = useState<'All' | 'Open' | 'Closed'>('Open');
  
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
  
  // Sub sheet uploader state
  const [editSubFile, setEditSubFile] = useState<File | null>(null);
  const [editParsedSubs, setEditParsedSubs] = useState<any[]>([]);
  const [isParsingSubs, setIsParsingSubs] = useState(false);

  // Messaging State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId);
  const [replyContent, setReplyContent] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showSubListModal, setShowSubListModal] = useState(false);
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [replyExpanded, setReplyExpanded] = useState(false);
  
  // Message Email Templates state
  interface MessageEmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
  }
  const [messageEmailTemplates, setMessageEmailTemplates] = useState<MessageEmailTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('cascade_message_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showMessageTemplateModal, setShowMessageTemplateModal] = useState(false);
  const [editingMessageTemplateId, setEditingMessageTemplateId] = useState<string | null>(null);
  const [messageTemplateName, setMessageTemplateName] = useState('');
  const [selectedMessageTemplateId, setSelectedMessageTemplateId] = useState<string>('');
  const [messageTemplateEditSubject, setMessageTemplateEditSubject] = useState('');
  const [messageTemplateEditBody, setMessageTemplateEditBody] = useState('');
  
  // Load message templates from localStorage
  const loadMessageTemplates = () => {
    try {
      const saved = localStorage.getItem('cascade_message_templates');
      if (saved) {
        const templates = JSON.parse(saved);
        setMessageEmailTemplates(templates);
        return templates;
      }
    } catch (e) {
      console.error('Failed to load message templates:', e);
    }
    return [];
  };
  
  // Save message templates to localStorage
  const saveMessageTemplates = (templates: MessageEmailTemplate[]) => {
    try {
      localStorage.setItem('cascade_message_templates', JSON.stringify(templates));
      setMessageEmailTemplates(templates);
    } catch (e) {
      console.error('Failed to save message templates:', e);
    }
  };
  
  // Handle message template selection
  const handleMessageTemplateSelect = (templateId: string) => {
    const template = messageEmailTemplates.find(t => t.id === templateId);
    if (template) {
      setNewMessageSubject(template.subject);
      setNewMessageContent(template.body);
      setSelectedMessageTemplateId(templateId);
    }
  };
  
  // Open message template creator
  const handleOpenMessageTemplateCreator = (template?: MessageEmailTemplate) => {
    if (template) {
      setEditingMessageTemplateId(template.id);
      setMessageTemplateName(template.name);
      setMessageTemplateEditSubject(template.subject);
      setMessageTemplateEditBody(template.body);
    } else {
      setEditingMessageTemplateId(null);
      setMessageTemplateName('');
      setMessageTemplateEditSubject(newMessageSubject);
      setMessageTemplateEditBody(newMessageContent);
    }
    setShowMessageTemplateModal(true);
  };
  
  // Save message template
  const handleSaveMessageTemplate = () => {
    const subjectToSave = editingMessageTemplateId ? messageTemplateEditSubject : newMessageSubject;
    const bodyToSave = editingMessageTemplateId ? messageTemplateEditBody : newMessageContent;
    
    if (!messageTemplateName.trim() || !subjectToSave.trim() || !bodyToSave.trim()) {
      alert('Please fill in template name, subject, and body.');
      return;
    }
    
    const templates = [...messageEmailTemplates];
    if (editingMessageTemplateId) {
      const index = templates.findIndex(t => t.id === editingMessageTemplateId);
      if (index >= 0) {
        templates[index] = {
          id: editingMessageTemplateId,
          name: messageTemplateName.trim(),
          subject: subjectToSave,
          body: bodyToSave
        };
      }
    } else {
      templates.push({
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        name: messageTemplateName.trim(),
        subject: subjectToSave,
        body: bodyToSave
      });
    }
    saveMessageTemplates(templates);
    setShowMessageTemplateModal(false);
    setEditingMessageTemplateId(null);
    setMessageTemplateName('');
    setMessageTemplateEditSubject('');
    setMessageTemplateEditBody('');
  };
  
  // Delete message template
  const handleDeleteMessageTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const templates = messageEmailTemplates.filter(t => t.id !== templateId);
      saveMessageTemplates(templates);
      if (selectedMessageTemplateId === templateId) {
        setSelectedMessageTemplateId('');
      }
    }
  };

  // Mark thread as read when selected
  useEffect(() => {
    if (selectedThreadId && onUpdateThread) {
      const thread = messages.find(t => t.id === selectedThreadId);
      if (thread && !thread.isRead) {
        // Mark thread as read
        onUpdateThread(selectedThreadId, { isRead: true });
      }
    }
  }, [selectedThreadId, messages, onUpdateThread]);

  // New Claim Modal State
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);

  // New Task Modal State
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUser.id);
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);

  // Punch List App State
  const [showPunchListApp, setShowPunchListApp] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Debug: Log modal state changes
  useEffect(() => {
    console.log('showNewClaimModal changed to:', showNewClaimModal);
  }, [showNewClaimModal]);

  useEffect(() => {
    console.log('showNewTaskModal changed to:', showNewTaskModal);
  }, [showNewTaskModal]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = showNewTaskModal || showNewMessageModal || showNewClaimModal || 
                          showDocsModal || showInviteModal || showEditHomeownerModal || 
                          showSubListModal || showPunchListApp || isPDFViewerOpen;
    
    if (isAnyModalOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Lock body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showNewTaskModal, showNewMessageModal, showNewClaimModal, showDocsModal, 
      showInviteModal, showEditHomeownerModal, showSubListModal, showPunchListApp, isPDFViewerOpen]);

  // Sync state when props change
  useEffect(() => {
    if (initialTab) setCurrentTab(initialTab);
  }, [initialTab]);

  // Sync carousel scroll position with currentTab on mobile
  useEffect(() => {
    if (!carouselRef.current) return;
    const availableTabs = getAvailableTabs();
    const currentIndex = availableTabs.indexOf(currentTab);
    if (currentIndex >= 0) {
      const viewportWidth = window.innerWidth;
      const targetScroll = currentIndex * viewportWidth;
      // Use immediate scroll on initial load, smooth for tab changes
      const isInitialLoad = carouselRef.current.scrollLeft === 0 && currentIndex > 0;
      carouselRef.current.scrollTo({
        left: targetScroll,
        behavior: isInitialLoad ? 'auto' : 'smooth'
      });
    }
  }, [currentTab]);

  useEffect(() => {
    if (initialThreadId) setSelectedThreadId(initialThreadId);
  }, [initialThreadId]);

  // --- Filtering Logic ---
  const effectiveHomeowner = (isAdmin || isBuilder) ? targetHomeowner : activeHomeowner;

  // Sync state when editing starts
  const parseEditSubcontractorFile = (file: File) => {
    setIsParsingSubs(true);
    setEditParsedSubs([]);

    // Check if it's a CSV file
    const isCSV = file.type === 'text/csv' || 
                  file.type === 'application/vnd.ms-excel' ||
                  file.name.toLowerCase().endsWith('.csv');
    
    // Check if it's an Excel file
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel' ||
                    file.name.toLowerCase().endsWith('.xlsx') ||
                    file.name.toLowerCase().endsWith('.xls');

    if (isCSV) {
      // Parse CSV file directly - lazy load Papa
      import('papaparse').then((Papa) => {
        Papa.default.parse(file, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          complete: (results) => {
          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
            const criticalErrors = results.errors.filter(e => e.type !== 'Quotes' && e.type !== 'Delimiter');
            if (criticalErrors.length > 0) {
              alert(`Error parsing CSV file: ${criticalErrors[0].message || 'Please check the file format.'}`);
              setIsParsingSubs(false);
              return;
            }
          }
          if (results.data && results.data.length > 0) {
            setEditParsedSubs(results.data);
            setIsParsingSubs(false);
          } else {
            alert('No data found in CSV file. Please ensure the file contains rows of data.');
            setIsParsingSubs(false);
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          alert(`Error reading CSV file: ${error.message || 'Please try again.'}`);
          setIsParsingSubs(false);
        }
      });
      }).catch((err) => {
        console.error('Failed to load papaparse:', err);
        alert('Failed to load CSV parser. Please refresh the page.');
        setIsParsingSubs(false);
      });
    } else if (isExcel) {
      // Parse Excel file using xlsx library - lazy load XLSX
      import('xlsx').then((XLSX) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            if (!data) {
              alert('Error reading Excel file. Please try again.');
              setIsParsingSubs(false);
              return;
            }

            // Read the workbook
            const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get the first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            raw: false
          });

          if (jsonData.length === 0) {
            alert('No data found in Excel file. Please ensure the file contains rows of data.');
            setIsParsingSubs(false);
            return;
          }

          // First row is headers
          const headers = jsonData[0] as string[];
          if (!headers || headers.length === 0) {
            alert('No headers found in Excel file. Please ensure the first row contains column names.');
            setIsParsingSubs(false);
            return;
          }

          // Convert to array of objects
          const rows = jsonData.slice(1) as any[][];
          const parsedData = rows
            .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
            .map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || '';
              });
              return obj;
            });

          if (parsedData.length === 0) {
            alert('No data rows found in Excel file. Please ensure the file contains data rows.');
            setIsParsingSubs(false);
            return;
          }

          setEditParsedSubs(parsedData);
          setIsParsingSubs(false);
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          alert(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Please ensure the file is a valid Excel file.'}`);
          setIsParsingSubs(false);
        }
      };
        reader.onerror = () => {
          alert('Error reading Excel file. Please try again.');
          setIsParsingSubs(false);
        };
        reader.readAsBinaryString(file);
      }).catch((err) => {
        console.error('Failed to load xlsx:', err);
        alert('Failed to load Excel parser. Please refresh the page.');
        setIsParsingSubs(false);
      });
    } else {
      // Try to parse as CSV anyway - lazy load Papa
      import('papaparse').then((Papa) => {
        Papa.default.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('File parsing errors:', results.errors);
            const criticalErrors = results.errors.filter(e => e.type !== 'Quotes' && e.type !== 'Delimiter');
            if (criticalErrors.length > 0) {
              alert(`Error parsing file: ${criticalErrors[0].message || 'Please ensure the file is a valid CSV or Excel file.'}`);
              setIsParsingSubs(false);
              return;
            }
          }
          if (results.data && results.data.length > 0) {
            setEditParsedSubs(results.data);
            setIsParsingSubs(false);
          } else {
            alert('No data found in file. Please ensure the file contains rows of data.');
            setIsParsingSubs(false);
          }
        },
        error: (error) => {
          console.error('File parsing error:', error);
          alert(`Error reading file: ${error.message || 'Please ensure the file is a valid CSV or Excel file.'}`);
          setIsParsingSubs(false);
        }
      });
      }).catch((err) => {
        console.error('Failed to load papaparse:', err);
        alert('Failed to load CSV parser. Please refresh the page.');
        setIsParsingSubs(false);
      });
    }
  };

  const handleEditSubFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setEditSubFile(selectedFile);
      parseEditSubcontractorFile(selectedFile);
    }
  };

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
    
    // Reset sub file state
    setEditSubFile(null);
    setEditParsedSubs(targetHomeowner.subcontractorList || []);
    setIsParsingSubs(false);
    
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
            closingDate: editClosingDate ? new Date(editClosingDate) : targetHomeowner.closingDate,
            subcontractorList: editParsedSubs.length > 0 ? editParsedSubs : targetHomeowner.subcontractorList
        });
        setShowEditHomeownerModal(false);
    }
  };

  const handleSaveAndInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetHomeowner && onUpdateHomeowner) {
        // Find builder name from ID
        const selectedGroup = builderGroups.find(g => g.id === editBuilderId);

        // Save the homeowner updates
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
            closingDate: editClosingDate ? new Date(editClosingDate) : targetHomeowner.closingDate,
            subcontractorList: editParsedSubs.length > 0 ? editParsedSubs : targetHomeowner.subcontractorList
        });

        // Send invite email
        setIsDrafting(true);
        try {
          const inviteBody = await draftInviteEmail(editName);
          const subject = `A Warm Welcome to Your New Home, ${editName}! Important Information from Cascade Builder Services`;
          await sendEmail({
            to: editEmail,
            subject: subject,
            body: inviteBody,
            fromName: 'Cascade Admin',
            fromRole: UserRole.ADMIN
          });
          alert(`Homeowner information saved and invite sent to ${editEmail} via Internal Mail System!`);
        } catch (error) {
          console.error('Failed to send invite:', error);
          alert(`Homeowner information saved, but failed to send invite email. Please try sending the invite manually.`);
        } finally {
          setIsDrafting(false);
        }

        setShowEditHomeownerModal(false);
    }
  };

  // Filter Claims based on user role
  const displayClaims = claims.filter(c => {
    // 1. ADMIN: Show all claims UNLESS viewing a specific homeowner (targetHomeowner)
    // If admin has selected a homeowner to view, filter to that homeowner's claims
    if (isAdmin) {
      if (targetHomeowner) {
        // Admin viewing a specific homeowner - filter to that homeowner's claims
        // First try to match by homeownerId if available (more reliable)
        if ((c as any).homeownerId && targetHomeowner.id) {
          const matches = (c as any).homeownerId === targetHomeowner.id;
          if (!matches && process.env.NODE_ENV === 'development') {
            console.log('Admin viewing homeowner - homeownerId mismatch:', {
              claimId: c.id,
              claimTitle: c.title,
              claimHomeownerId: (c as any).homeownerId,
              targetHomeownerId: targetHomeowner.id,
              claimEmail: c.homeownerEmail,
              homeownerEmail: targetHomeowner.email
            });
          }
          return matches;
        }
        // Fallback to email comparison (case-insensitive, trimmed)
        const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
        const homeownerEmail = targetHomeowner.email?.toLowerCase().trim() || '';
        const matches = claimEmail === homeownerEmail;
        if (!matches && process.env.NODE_ENV === 'development') {
          console.log('Admin viewing homeowner - email mismatch:', {
            claimId: c.id,
            claimTitle: c.title,
            claimEmail,
            homeownerEmail,
            claimHomeownerId: (c as any).homeownerId,
            targetHomeownerId: targetHomeowner.id
          });
        }
        return matches;
      }
      // Admin viewing all - show everything
      return true;
    }
    
    // 2. HOMEOWNER: Show only claims for their user ID
    if (userRole === UserRole.HOMEOWNER && effectiveHomeowner) {
      // First try to match by homeownerId if available (more reliable)
      if ((c as any).homeownerId && effectiveHomeowner.id) {
        return (c as any).homeownerId === effectiveHomeowner.id;
      }
      // Fallback to email comparison (case-insensitive, trimmed)
      const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
      const homeownerEmail = effectiveHomeowner.email?.toLowerCase().trim() || '';
      return claimEmail === homeownerEmail;
    }
    
    // 3. BUILDER: Show only claims for homeowners in their builder group
    if (isBuilder && currentBuilderId) {
      // Find homeowners in this builder's group
      const builderHomeownerIds = new Set(
        homeowners
          .filter(h => h.builderId === currentBuilderId)
          .map(h => h.id)
      );
      
      // Match by homeownerId if available
      if ((c as any).homeownerId) {
        return builderHomeownerIds.has((c as any).homeownerId);
      }
      
      // Fallback to email matching
      const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
      return homeowners.some(h => 
        h.builderId === currentBuilderId && 
        h.email?.toLowerCase().trim() === claimEmail
      );
    }
    
    // 4. CONTRACTOR/SUB: Show only claims assigned to them
    // Check if current user's email matches a contractor's email
    if (currentUserEmail && contractors.length > 0) {
      const userEmailLower = currentUserEmail.toLowerCase().trim();
      const matchingContractor = contractors.find(contractor => 
        contractor.email?.toLowerCase().trim() === userEmailLower
      );
      
      if (matchingContractor) {
        // Show claims assigned to this contractor
        const claimContractorEmail = c.contractorEmail?.toLowerCase().trim() || '';
        const claimContractorId = c.contractorId;
        
        return claimContractorEmail === userEmailLower || 
               claimContractorId === matchingContractor.id;
      }
    }
    
    // Default: no claims (shouldn't reach here, but safe fallback)
    return false;
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

  // Animation state for homeowner card
  const [homeownerCardKey, setHomeownerCardKey] = useState(0);
  useEffect(() => {
    if (effectiveHomeowner) {
      setHomeownerCardKey(prev => prev + 1);
    }
  }, [effectiveHomeowner?.id]);

  // Framer Motion animation variants
  // Spring config: stiffness 400, damping 30, mass 0.6 for ~0.4s duration (within 0.5s constraint)
  const springTransition: Transition = {
    type: 'spring',
    stiffness: 400,
    damping: 30,
    mass: 0.6
  };

  const cardVariants: Variants = {
    hidden: { 
      opacity: 0
    },
    visible: { 
      opacity: 1,
      transition: springTransition
    }
  };

  // Stagger container variant
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.05
      }
    }
  };


  const handleSendInvite = async () => {
    setIsDrafting(true);
    const subject = `A Warm Welcome to Your New Home, ${inviteName}! Important Information from Cascade Builder Services`;
    await sendEmail({
      to: inviteEmail,
      subject: subject,
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
        
        // Generate Cascade Connect messages link
        const baseUrl = typeof window !== 'undefined' 
          ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
          : 'https://www.cascadeconnect.app';
        const messagesLink = `${baseUrl}#messages${thread.id ? `?threadId=${thread.id}` : ''}`;
        
        await sendEmail({
          to: recipientEmail,
          subject: `Re: ${thread.subject}`,
          body: generateNotificationBody(senderName, replyContent, 'MESSAGE', thread.id, messagesLink),
          fromName: senderName,
          fromRole: userRole,
          replyToId: thread.id
        });
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
            content: replyContent,
            senderName: currentUser.name
          });
        }
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

    // Generate Cascade Connect messages link
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
      : 'https://www.cascadeconnect.app';
    const messagesLink = `${baseUrl}#messages`;

    await sendEmail({
      to: targetEmail,
      subject: newMessageSubject,
      body: generateNotificationBody(senderName, newMessageContent, 'MESSAGE', 'new', messagesLink),
      fromName: senderName,
      fromRole: userRole
    });

    // Track claim-related message if thread is from admin and claim-related
    if (isAdmin && onTrackClaimMessage && effectiveHomeowner) {
      const associatedClaim = claims.find(c => c.title === newMessageSubject);
      if (associatedClaim) {
        onTrackClaimMessage(associatedClaim.id, {
          type: 'HOMEOWNER',
          subject: newMessageSubject,
          recipient: effectiveHomeowner.name,
          recipientEmail: effectiveHomeowner.email,
          content: newMessageContent,
          senderName: currentUser.name
        });
      }
    }

    setIsSendingMessage(false);
    setShowNewMessageModal(false);
    setNewMessageSubject('');
    setNewMessageContent('');
  };

  // --- Render Helpers ---

  const renderClaimGroup = (title: string, groupClaims: Claim[], emptyMsg: string, isClosed: boolean = false, showNewClaimButton: boolean = false, filter?: 'All' | 'Open' | 'Closed', setFilter?: (filter: 'All' | 'Open' | 'Closed') => void, onExportExcel?: () => void, allClaims?: Claim[]) => (
    <motion.div 
      className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden mb-6 last:mb-0 flex flex-col"
      style={{ maxHeight: 'calc(100vh - 300px)' }}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="px-6 py-6 border-b border-surface-outline-variant dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface-container/30 dark:bg-gray-700/30 flex-shrink-0">
        <h3 className={`text-xl font-normal flex items-center gap-2 ${isClosed ? 'text-surface-on-variant dark:text-gray-400' : 'text-surface-on dark:text-gray-100'}`}>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-on text-xs font-medium">
            {groupClaims.length}
          </span>
          {title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Buttons - Matching TaskList style */}
          {setFilter && allClaims && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter('All');
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === 'All'
                    ? 'bg-primary text-primary-on'
                    : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter('Open');
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === 'Open'
                    ? 'bg-primary text-primary-on'
                    : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                }`}
              >
                Open
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter('Closed');
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === 'Closed'
                    ? 'bg-primary text-primary-on'
                    : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                }`}
              >
                Closed
              </button>
            </div>
          )}
          {/* Export to Excel Button */}
          {onExportExcel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExportExcel();
              }}
              className="hidden md:inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100 text-sm font-medium transition-all hover:bg-surface-container-high dark:hover:bg-gray-600 border border-surface-outline-variant dark:border-gray-600"
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
            </button>
          )}
          {showNewClaimButton && (
            <button
              onClick={() => {
                setShowNewClaimModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-on text-sm font-medium transition-all hover:bg-primary/90 dark:hover:bg-primary/80"
            >
              <Plus className="h-4 w-4" />
              New Claim
            </button>
          )}
        </div>
      </div>
      {groupClaims.length === 0 ? (
        <div className="p-8 text-center text-surface-on-variant dark:text-gray-400 text-sm italic flex-shrink-0">
          {emptyMsg}
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupClaims.map((claim, index) => {
                const scheduledDate = claim.proposedDates.find(d => d.status === 'ACCEPTED');
                const isCompleted = claim.status === ClaimStatus.COMPLETED;
                
                // Find the most recent service order message (SUBCONTRACTOR type with "Service Order" in subject)
                const serviceOrderMessages = claimMessages
                  .filter(m => m.claimId === claim.id && 
                               m.type === 'SUBCONTRACTOR' && 
                               m.subject.toLowerCase().includes('service order'))
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const serviceOrderDate = serviceOrderMessages.length > 0 ? serviceOrderMessages[0].timestamp : null;
                
                return (
                  <motion.div 
                    key={claim.id}
                    className={`group flex flex-col rounded-2xl border transition-all overflow-hidden cursor-pointer ${
                      isCompleted 
                        ? 'bg-surface-container/30 dark:bg-gray-800/50 border-surface-container-high dark:border-gray-600 opacity-75' 
                        : 'bg-surface-container dark:bg-gray-800 border-surface-outline-variant dark:border-gray-600 shadow-sm hover:shadow-elevation-1'
                    }`}
                    variants={cardVariants}
                    onClick={(e) => {
                      setSelectedClaimForModal(claim);
                    }}
                  >
                      <div className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                            {/* Claim # */}
                          <span className="inline-flex items-center h-6 text-xs font-medium tracking-wide bg-primary/10 dark:bg-primary/20 text-primary-on-container dark:text-primary px-3 rounded-full whitespace-nowrap w-fit">
                            #{claim.claimNumber || claim.id.substring(0, 8).toUpperCase()}
                          </span>
                          {/* Status */}
                          <div className="w-fit h-6 flex items-center"><StatusBadge status={claim.status} /></div>
                          {/* Title */}
                          {claim.title && (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on dark:text-gray-100 bg-surface-container-high dark:bg-gray-700 px-3 rounded-full border border-surface-outline-variant/50 dark:border-gray-600 whitespace-nowrap w-fit">
                              {claim.title}
                            </span>
                          )}
                          {/* Classification */}
                          <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-3 rounded-full whitespace-nowrap w-fit">
                            {claim.classification}
                          </span>
                          {/* Homeowner Name */}
                          {(isAdmin || isBuilder) && !effectiveHomeowner && (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 gap-1 bg-surface-container dark:bg-gray-700 px-3 rounded-full whitespace-nowrap w-fit">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              <span>{claim.homeownerName}</span>
                            </span>
                          )}
                          {/* Contractor */}
                          {claim.contractorName ? (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 gap-1 bg-surface-container dark:bg-gray-700 px-3 rounded-full whitespace-nowrap w-fit">
                              <HardHat className="h-3 w-3 flex-shrink-0" />
                              <span>{claim.contractorName}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant/60 dark:text-gray-400 gap-1 bg-surface-container/50 dark:bg-gray-700/50 px-3 rounded-full whitespace-nowrap border border-dashed border-surface-outline-variant dark:border-gray-600 w-fit">
                              <HardHat className="h-3 w-3 flex-shrink-0 opacity-50" />
                              <span>No Sub Assigned</span>
                            </span>
                          )}
                          {/* Date Submitted (Created) */}
                          <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-3 rounded-full whitespace-nowrap w-fit">
                            Created: {new Date(claim.dateSubmitted).toLocaleDateString()}
                          </span>
                          {/* Scheduled Date */}
                          {scheduledDate && (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 gap-1 bg-primary-container dark:bg-primary/20 text-primary-on-container dark:text-primary px-3 rounded-full whitespace-nowrap w-fit">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span>Scheduled: {new Date(scheduledDate.date).toLocaleDateString()}</span>
                            </span>
                          )}
                          {/* Service Order Date */}
                          {serviceOrderDate ? (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 gap-1 bg-surface-container dark:bg-gray-700 px-3 rounded-full whitespace-nowrap w-fit">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span>S.O. Sent: {new Date(serviceOrderDate).toLocaleDateString()}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant/60 dark:text-gray-400 gap-1 bg-surface-container/50 dark:bg-gray-700/50 px-3 rounded-full whitespace-nowrap border border-dashed border-surface-outline-variant dark:border-gray-600 w-fit">
                              <Mail className="h-3 w-3 flex-shrink-0 opacity-50" />
                              <span>No SO Sent</span>
                            </span>
                          )}
                          {/* Date Evaluated */}
                          {claim.dateEvaluated && (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-3 rounded-full whitespace-nowrap w-fit">
                              Eval: {new Date(claim.dateEvaluated).toLocaleDateString()}
                            </span>
                          )}
                          {/* Attachments count */}
                          {claim.attachments && claim.attachments.length > 0 && (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 gap-1 bg-surface-container dark:bg-gray-700 px-3 rounded-full whitespace-nowrap w-fit">
                              <Paperclip className="h-3 w-3 flex-shrink-0" />
                              {claim.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
    );

  const handleExportToExcel = async (claimsList: Claim[]) => {
    // Filter claims based on current filter
    let filteredClaims = claimsList;
    if (claimsFilter === 'Open') {
      filteredClaims = claimsList.filter(c => c.status !== ClaimStatus.COMPLETED);
    } else if (claimsFilter === 'Closed') {
      filteredClaims = claimsList.filter(c => c.status === ClaimStatus.COMPLETED);
    }

    // Prepare data for Excel
    const excelData = filteredClaims.map(claim => {
      const scheduledDate = claim.proposedDates?.find(d => d.status === 'ACCEPTED');
      return {
        'Claim #': claim.claimNumber || claim.id.substring(0, 8).toUpperCase(),
        'Status': claim.status,
        'Title': claim.title,
        'Description': claim.description || '',
        'Classification': claim.classification || '',
        'Homeowner': claim.homeownerName || '',
        'Contractor': claim.contractorName || '',
        'Scheduled Date': scheduledDate ? new Date(scheduledDate.date).toLocaleDateString() : '',
        'Date Submitted': new Date(claim.dateSubmitted).toLocaleDateString(),
        'Date Evaluated': claim.dateEvaluated ? new Date(claim.dateEvaluated).toLocaleDateString() : '',
        'Attachments': claim.attachments?.length || 0
      };
    });

    // Lazy load XLSX library
    try {
      const XLSX = await import('xlsx');
      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Claims');

      // Generate Excel file and download
      const fileName = `Warranty_Claims_${claimsFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Failed to load xlsx library:', err);
      alert('Failed to load Excel export library. Please refresh the page.');
    }
  };

  const renderClaimsList = (claimsList: Claim[], isHomeownerView: boolean = false) => {
    // Filter claims based on current filter
    let filteredClaims = claimsList;
    if (claimsFilter === 'Open') {
      filteredClaims = claimsList.filter(c => c.status !== ClaimStatus.COMPLETED);
    } else if (claimsFilter === 'Closed') {
      filteredClaims = claimsList.filter(c => c.status === ClaimStatus.COMPLETED);
    }

    const emptyMsg = claimsFilter === 'Open' 
      ? 'No open claims.' 
      : claimsFilter === 'Closed' 
      ? 'No closed claims.' 
      : 'No claims found.';

    return (
      <div>
        {renderClaimGroup('Warranty Claims', filteredClaims, emptyMsg, false, isHomeownerView, claimsFilter, setClaimsFilter, () => handleExportToExcel(claimsList), claimsList)}
      </div>
    );
  };

  const renderDocumentsTab = () => (
    <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden shadow-elevation-1">
      <div className="p-6">
        <div className="mb-6 space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {displayDocuments.length === 0 ? (
            <div className="text-center text-sm text-surface-on-variant dark:text-gray-400 py-12 border border-dashed border-surface-outline-variant dark:border-gray-600 rounded-xl bg-surface-container/30 dark:bg-gray-700/30">
              No documents uploaded for this account.
            </div>
          ) : (
            displayDocuments.map(doc => {
              const isPDF = doc.type === 'PDF' || doc.name.toLowerCase().endsWith('.pdf') || 
                           doc.url.startsWith('data:application/pdf') || 
                           doc.url.includes('pdf');
              
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 group transition-all">
                  <div 
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      if (isPDF) {
                        setSelectedDocument(doc);
                        setIsPDFViewerOpen(true);
                      }
                    }}
                  >
                    <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-on dark:text-gray-100 truncate">{doc.name}</p>
                      <p className="text-xs text-surface-on-variant dark:text-gray-400">
                        Uploaded by {doc.uploadedBy} • {new Date(doc.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isPDF && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedDocument(doc);
                          setIsPDFViewerOpen(true);
                        }}
                        className="p-2 text-surface-outline-variant dark:text-gray-400 hover:text-primary rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 transition-all z-10 relative"
                        title="View PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {doc.url.startsWith('data:') ? (
                      <a 
                        href={doc.url} 
                        download={doc.name} 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-surface-outline-variant dark:text-gray-400 hover:text-primary rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    ) : (
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-surface-outline-variant dark:text-gray-400 hover:text-primary rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Upload Action */}
        <div className="pt-4 border-t border-surface-outline-variant dark:border-gray-700 flex justify-center">
          <label className={`cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full transition-colors ${isDocUploading ? 'bg-primary/50 border-primary/30 cursor-wait' : 'bg-primary text-primary-on hover:bg-primary/90 dark:hover:bg-primary/80'} text-sm font-medium`}>
            {isDocUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isDocUploading ? 'Uploading...' : 'Upload New Document'}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isDocUploading} />
          </label>
        </div>
      </div>
    </div>
  );

  const renderMessagesTab = () => (
    <div className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden flex flex-col md:flex-row h-[calc(100vh-300px)] md:h-[700px] shadow-elevation-1">
       {/* Left Column: Inbox List (Gmail Style) */}
       <div className={`w-full md:w-96 border-b md:border-b-0 md:border-r border-surface-outline-variant dark:border-gray-700 flex flex-col bg-primary/10 dark:bg-gray-800 ${selectedThreadId ? 'hidden md:flex' : 'flex'} overflow-hidden`}>
          <div className="px-6 py-6 md:p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:h-16 shrink-0">
            <div className="flex items-center justify-between w-full md:w-auto">
              <h3 className="text-xl font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                {displayThreads.filter(t => !t.isRead).length > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-on text-xs font-medium">
                    {displayThreads.filter(t => !t.isRead).length}
                  </span>
                )}
                Inbox
              </h3>
              <Button
                variant="filled"
                onClick={() => {
                  setShowNewMessageModal(true);
                }}
                icon={<Plus className="h-4 w-4" />}
                className="!h-9 !px-4 md:!h-8 md:!px-3 md:text-xs"
              >
                Compose
              </Button>
            </div>
            {/* Search box - in header on mobile, separate on desktop */}
            <div className="md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search mail..." 
                  className="w-full bg-surface-container dark:bg-gray-700 rounded-full pl-9 pr-3 py-2 text-sm text-surface-on dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary placeholder-surface-outline-variant dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>
          
          <div className="hidden md:block p-2 border-b border-surface-outline-variant/50 dark:border-gray-700/50">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search mail..." 
                  className="w-full bg-surface-container dark:bg-gray-700 rounded-full pl-9 pr-3 py-2 text-sm text-surface-on dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary placeholder-surface-outline-variant dark:placeholder-gray-500"
                />
             </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto p-6 min-h-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
             {displayThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant dark:text-gray-400 gap-2">
                  <Mail className="h-8 w-8 opacity-20 dark:opacity-40 text-surface-on dark:text-gray-400" />
                  <span className="text-sm">No messages found.</span>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayThreads.map((thread, index) => {
                    const lastMsg = thread.messages[thread.messages.length - 1];
                    const isUnread = !thread.isRead;
                    const isSelected = selectedThreadId === thread.id;
                    const participants = isAdmin 
                      ? thread.participants.filter(p => p !== currentUser.name).join(', ') || 'Me'
                      : thread.participants.filter(p => p !== activeHomeowner.name).join(', ') || 'Me';

                    return (
                      <motion.div
                        key={thread.id}
                        onClick={() => setSelectedThreadId(thread.id)}
                        className={`group flex flex-col rounded-2xl border transition-all overflow-hidden cursor-pointer ${
                          isSelected
                            ? 'bg-primary-container/20 dark:bg-primary/20 border-primary ring-1 ring-primary'
                            : isUnread
                            ? 'bg-white dark:bg-white border-surface-outline-variant dark:border-gray-600 shadow-sm hover:shadow-elevation-1'
                            : 'bg-white dark:bg-white border-surface-outline-variant dark:border-gray-600 shadow-sm hover:shadow-elevation-1 opacity-75'
                        }`}
                        variants={cardVariants}
                        layout
                      >
                        <div className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {/* Subject/Title */}
                            <span className={`inline-flex items-center h-6 text-xs font-medium px-3 rounded-full whitespace-nowrap w-fit ${
                              isUnread
                                ? 'bg-primary text-primary-on'
                                : 'bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100'
                            }`}>
                              {thread.subject}
                            </span>
                            
                            {/* Participants */}
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-3 rounded-full whitespace-nowrap w-fit">
                              {participants}
                            </span>
                            
                            {/* Date */}
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-3 rounded-full whitespace-nowrap w-fit">
                              {new Date(thread.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                            
                            {/* Unread indicator */}
                            {isUnread && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-on text-xs font-medium">
                                !
                              </span>
                            )}
                            
                            {/* Last message preview */}
                            {lastMsg.content && (
                              <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant/80 dark:text-gray-400 bg-surface-container/50 dark:bg-gray-700/50 px-3 rounded-full whitespace-nowrap w-fit">
                                {lastMsg.senderName === (isAdmin ? currentUser.name : activeHomeowner.name) ? 'You: ' : ''}
                                {lastMsg.content.substring(0, 30)}{lastMsg.content.length > 30 ? '...' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
             )}
          </div>
       </div>

       {/* Right Column: Email Thread View */}
       <div className={`flex-1 flex flex-col bg-surface dark:bg-gray-800 ${!selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          {selectedThread ? (
            <>
               {/* Thread Header Toolbar */}
               <div className="h-16 shrink-0 px-6 border-b border-surface-outline-variant dark:border-gray-700 flex items-center justify-between bg-surface dark:bg-gray-800 sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                     <button onClick={() => setSelectedThreadId(null)} className="md:hidden p-2 -ml-2 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full">
                        <ChevronLeft className="h-5 w-5" />
                     </button>
                  </div>
                  <div className="flex gap-2 text-surface-on-variant dark:text-gray-400">
                     <button className="p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full"><ChevronLeft className="h-4 w-4"/></button>
                     <button className="p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full"><ChevronRight className="h-4 w-4"/></button>
                  </div>
               </div>

               {/* Scrollable Thread Content */}
               <div className="flex-1 overflow-y-auto">
                 <div className="px-8 py-6">
                    {/* Subject Line */}
                    <div className="flex items-start justify-between mb-8">
                       <h2 className="text-2xl font-normal text-surface-on dark:text-gray-100 leading-tight">{selectedThread.subject}</h2>
                       <button className="p-2 -mr-2 text-surface-outline-variant dark:text-gray-500 hover:text-yellow-500 rounded-full">
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
                                        <span className="font-bold text-surface-on dark:text-gray-100 text-sm">{msg.senderName}</span>
                                        <span className="text-xs text-surface-on-variant dark:text-gray-400">&lt;{isMe ? 'me' : msg.senderRole.toLowerCase()}&gt;</span>
                                      </div>
                                      <div className="text-xs text-surface-on-variant dark:text-gray-400 group-hover:text-surface-on dark:group-hover:text-gray-100 transition-colors">
                                         {new Date(msg.timestamp).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                      </div>
                                   </div>
                                   <div className="text-xs text-surface-on-variant dark:text-gray-400">to {isMe ? (effectiveHomeowner?.name || 'Homeowner') : 'Me'}</div>
                                </div>
                             </div>
                             
                             {/* Message Body - Full Width Email Style */}
                             <div className="pl-14 text-sm text-surface-on/90 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                             </div>
                             
                             {/* Divider if not last */}
                             {idx < selectedThread.messages.length - 1 && (
                               <div className="mt-8 border-b border-surface-outline-variant/30 dark:border-gray-700/30 ml-14"></div>
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
               <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 bg-surface dark:bg-gray-800 sticky bottom-0 z-10">
                 {/* Builders Read-Only: Cannot Reply */}
                 {isBuilder ? (
                   <div className="text-center text-sm text-surface-on-variant dark:text-gray-400 bg-surface-container dark:bg-gray-700 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600 border-dashed">
                     <LockIcon className="h-4 w-4 mx-auto mb-2 opacity-50"/>
                     Read-only access. You cannot reply to threads.
                   </div>
                 ) : (
                    !replyExpanded ? (
                       <button 
                         onClick={() => setReplyExpanded(true)}
                         className="w-full flex items-center gap-3 p-4 rounded-full border border-surface-outline-variant dark:border-gray-600 text-surface-on-variant dark:text-gray-400 hover:shadow-elevation-1 hover:bg-surface dark:hover:bg-gray-700 transition-all group"
                       >
                          <div className="w-8 h-8 rounded-full bg-surface-container dark:bg-gray-700 flex items-center justify-center">
                            <Reply className="h-4 w-4 text-surface-outline dark:text-gray-500" />
                          </div>
                          <span className="text-sm font-medium group-hover:text-surface-on dark:group-hover:text-gray-100">Reply to this conversation...</span>
                       </button>
                    ) : (
                      <div className="bg-surface dark:bg-gray-800 rounded-xl shadow-elevation-2 border border-surface-outline-variant dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                         <div className="flex items-center gap-2 p-3 border-b border-surface-outline-variant/50 dark:border-gray-700/50 bg-surface-container/20 dark:bg-gray-700/20">
                            <CornerUpLeft className="h-4 w-4 text-surface-outline-variant dark:text-gray-500"/>
                            <span className="text-xs font-medium text-surface-on-variant dark:text-gray-400">Replying to {selectedThread.participants.filter(p => p !== (isAdmin ? currentUser.name : activeHomeowner.name)).join(', ')}</span>
                         </div>
                         <textarea
                            rows={6}
                            autoFocus
                            className="w-full bg-transparent dark:bg-transparent outline-none text-sm p-4 resize-none leading-relaxed text-surface-on dark:text-gray-100"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                         />
                         <div className="flex justify-between items-center p-3 bg-surface-container/10 dark:bg-gray-700/10">
                            <div className="flex gap-2">
                               <button className="p-2 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full"><Paperclip className="h-4 w-4"/></button>
                               <button className="p-2 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full"><Building2 className="h-4 w-4"/></button>
                            </div>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => setReplyExpanded(false)}
                                 className="p-2 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 text-sm font-medium"
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
            <div className="flex flex-col items-center justify-center h-full text-surface-on-variant dark:text-gray-400 gap-4 bg-surface-container/10 dark:bg-gray-700/10">
               <div className="w-20 h-20 bg-surface-container dark:bg-gray-700 rounded-full flex items-center justify-center">
                 <Mail className="h-10 w-10 text-surface-outline/50 dark:text-gray-500/50" />
               </div>
               <p className="text-sm font-medium">Select a conversation to read</p>
            </div>
          )}
       </div>
    </div>
  );

  // --- Main Render Logic ---

  // Helper function to render modals using Portal
  const renderModals = () => (
    <>
      {/* TASK DETAIL MODAL */}
      {selectedTaskForModal && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out] overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[fade-in_0.2s_ease-out] my-auto flex flex-col max-h-[90vh]">
            <div className="overflow-y-auto overflow-x-hidden flex-1">
              <div className="p-4">
                <TaskDetail
                  task={selectedTaskForModal}
                  employees={employees}
                  currentUser={currentUser}
                  claims={claims}
                  homeowners={homeowners}
                  preSelectedHomeowner={targetHomeowner}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onToggleTask={onToggleTask}
                  onBack={() => setSelectedTaskForModal(null)}
                  onSelectClaim={(claim) => {
                    setSelectedTaskForModal(null);
                    setSelectedClaimForModal(claim);
                  }}
                  startInEditMode={true}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CLAIM DETAIL MODAL */}
      {selectedClaimForModal && onUpdateClaim && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out] overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[fade-in_0.2s_ease-out] my-auto flex flex-col max-h-[90vh]">
            <div className="overflow-y-auto overflow-x-hidden flex-1">
              <div className="p-4">
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  <ClaimInlineEditor
                  claim={selectedClaimForModal}
                  onUpdateClaim={(updatedClaim) => {
                    if (onUpdateClaim) {
                      onUpdateClaim(updatedClaim);
                    }
                    setSelectedClaimForModal(updatedClaim);
                  }}
                  contractors={contractors}
                  currentUser={currentUser}
                  userRole={userRole}
                  onAddInternalNote={onAddInternalNote}
                  claimMessages={claimMessages.filter(m => m.claimId === selectedClaimForModal.id)}
                  onTrackClaimMessage={onTrackClaimMessage}
                  onSendMessage={() => {
                    // Pre-fill message subject with claim title and open new message modal
                    if (selectedClaimForModal) {
                      setNewMessageSubject(selectedClaimForModal.title);
                    }
                    setSelectedClaimForModal(null); // Close edit claim modal
                    setShowNewMessageModal(true);
                    setCurrentTab('MESSAGES');
                  }}
                  onCancel={() => setSelectedClaimForModal(null)}
                  onNavigate={onNavigate}
                />
                </Suspense>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* PDF VIEWER MODAL */}
      {selectedDocument && isPDFViewerOpen && createPortal(
        <Suspense fallback={
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white">Loading PDF viewer...</p>
            </div>
          </div>
        }>
          <PdfFlipViewer3D
            document={{
              url: selectedDocument.url,
              name: selectedDocument.name
            }}
            isOpen={isPDFViewerOpen}
            onClose={() => {
              console.log('Closing PDF viewer');
              setIsPDFViewerOpen(false);
              setSelectedDocument(null);
            }}
          />
        </Suspense>,
        document.body
      )}

      {/* NEW CLAIM MODAL */}
      {showNewClaimModal && createPortal(
        <div 
          data-new-claim-modal
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]"
          style={{ zIndex: 1000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewClaimModal(false);
          }}
        >
          <div className="bg-surface dark:bg-gray-800 w-full max-w-4xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8 max-h-[calc(100vh-4rem)] flex flex-col">
            <div className="p-6 bg-surface dark:bg-gray-800 overflow-y-auto flex-1">
              {onCreateClaim ? (
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  <NewClaimForm
                    onSubmit={(data) => {
                      onCreateClaim(data);
                      setShowNewClaimModal(false);
                    }}
                    onCancel={() => setShowNewClaimModal(false)}
                    onSendMessage={() => {
                      setShowNewClaimModal(false);
                      setCurrentTab('MESSAGES');
                    }}
                    contractors={contractors}
                    activeHomeowner={targetHomeowner || activeHomeowner}
                    userRole={userRole}
                  />
                </Suspense>
              ) : (
                <div className="text-center py-8">
                  <p className="text-surface-on-variant dark:text-gray-400 mb-4">Claim creation handler not available.</p>
                  <Button variant="text" onClick={() => setShowNewClaimModal(false)}>Close</Button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* NEW TASK MODAL */}
      {showNewTaskModal && createPortal(
        <div 
          data-new-task-modal
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
          style={{ zIndex: 1000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewTaskModal(false);
          }}
        >
          <div className="bg-surface dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container/30 dark:bg-gray-700/30 shrink-0">
              <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                New Task
              </h2>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await onAddTask({
                  title: newTaskTitle,
                  description: newTaskNotes,
                  assignedToId: newTaskAssignee,
                  assignedById: currentUser.id,
                  isCompleted: false,
                  dateAssigned: new Date(),
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                  relatedClaimIds: selectedClaimIds
                });
                setNewTaskTitle('');
                setNewTaskNotes('');
                setNewTaskAssignee(currentUser.id);
                setSelectedClaimIds([]);
                setShowNewTaskModal(false);
                setCurrentTab('TASKS');
              } catch (error) {
                console.error('Failed to create task:', error);
                alert('Failed to create task. Please try again.');
              }
            }} className="p-6 space-y-4 bg-surface dark:bg-gray-800 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Task Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Follow up on warranty claim"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Assign To</label>
                <select 
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Notes</label>
                <textarea 
                  rows={4}
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                />
              </div>
              {effectiveHomeowner && (
                <div>
                  <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-2">Link to Claims (Optional)</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border border-surface-outline-variant dark:border-gray-600 rounded-lg p-2">
                    {claims.filter(c => {
                      // First try to match by homeownerId if available (more reliable)
                      if ((c as any).homeownerId && effectiveHomeowner.id) {
                        return (c as any).homeownerId === effectiveHomeowner.id;
                      }
                      // Fallback to email comparison (case-insensitive, trimmed)
                      const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
                      const homeownerEmail = effectiveHomeowner.email?.toLowerCase().trim() || '';
                      return claimEmail === homeownerEmail;
                    }).map(claim => (
                      <label key={claim.id} className="flex items-center gap-2 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedClaimIds.includes(claim.id)}
                          onChange={() => {
                            setSelectedClaimIds(prev => 
                              prev.includes(claim.id) 
                                ? prev.filter(id => id !== claim.id) 
                                : [...prev, claim.id]
                            );
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-surface-on dark:text-gray-100">{claim.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-4 flex justify-end gap-3 -mx-6 -mb-6 mt-6 shrink-0">
                <Button 
                  variant="filled" 
                  type="button" 
                  onClick={() => setShowNewTaskModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="filled" 
                  type="submit"
                  icon={<CheckSquare className="h-4 w-4" />}
                >
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* HOMEOWNER MANUAL MODAL */}
      {showManualModal && createPortal(
        <div 
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            setShowManualModal(false);
          }}
        >
          <div 
            className="bg-surface dark:bg-gray-800 w-full max-w-6xl max-h-[95vh] rounded-3xl shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-surface-on dark:text-gray-100">Homeowner Manual</h2>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-surface-on dark:text-gray-100" />
              </button>
            </div>
            
            {/* Content - Manual Images with Flipbook */}
            <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4" style={{ overflow: 'hidden' }}>
              {HOMEOWNER_MANUAL_IMAGES && HOMEOWNER_MANUAL_IMAGES.length > 0 ? (
                <ManualImageFlipBook
                  images={HOMEOWNER_MANUAL_IMAGES}
                  width={manualPageDimensions.width}
                  height={manualPageDimensions.height}
                  flipBookRef={manualFlipBookRef}
                  onDimensionsChange={setManualPageDimensions}
                />
              ) : (
                <div className="w-full p-8 bg-surface-container dark:bg-gray-700 rounded-lg shadow-lg text-center">
                  <p className="text-surface-on-variant dark:text-gray-400">No manual pages available</p>
                  <p className="text-xs text-surface-on-variant dark:text-gray-500 mt-2">HOMEOWNER_MANUAL_IMAGES is empty or undefined</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );

  // 1. HOMEOWNER CONTEXT VIEW (When Admin selects a homeowner OR when admin switches to homeowner view)
  // Show admin-style card if: 
  //   - Admin/builder with selected homeowner, OR
  //   - Admin account (has currentUser) viewing as homeowner with valid homeowner (targetHomeowner or activeHomeowner)
  const shouldShowAdminStyleCard = 
    ((isAdmin || isBuilder) && targetHomeowner) || 
    (isAdminAccount && userRole === UserRole.HOMEOWNER && (targetHomeowner || (activeHomeowner && activeHomeowner.id !== 'placeholder')));
  
  if (shouldShowAdminStyleCard) {
    // Use targetHomeowner if available (preserved from admin view), otherwise use activeHomeowner for homeowner view
    const displayHomeowner = targetHomeowner || activeHomeowner;
    const isHomeownerView = userRole === UserRole.HOMEOWNER;
    // Get scheduled claims for this homeowner
    const scheduledClaims = claims
      .filter(c => {
        const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
        const homeownerEmail = displayHomeowner.email?.toLowerCase().trim() || '';
        return c.status === ClaimStatus.SCHEDULED && claimEmail === homeownerEmail;
      })
      .slice(0, 3);
    
    return (
      <>
        {renderModals()}
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 max-w-7xl mx-auto">
        {/* HOMEOWNER INFO AND SCHEDULE ROW */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch relative w-full">
          {/* COMPACT HOMEOWNER HEADER CARD */}
          <motion.div 
            key={`homeowner-${homeownerCardKey}-${displayHomeowner?.id}`}
            className="w-full lg:flex-1 lg:min-w-0 lg:flex-shrink lg:self-start bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-1 group relative flex flex-col"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            layout
          >
            <div className="flex flex-col p-6">
             
             {/* Two-Line Layout with Even Spacing - Center Aligned */}
             <div className="flex flex-col gap-3 mb-4 w-full">
                {/* Line 1: Name, Project, Address - Even Spacing */}
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {/* Name */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <h2 className="text-2xl font-normal text-surface-on dark:text-gray-100 truncate">{displayHomeowner.name}</h2>
                    {/* Edit Button - Admin Only */}
                    {isAdmin && !isHomeownerView && (
                      <button 
                         onClick={handleOpenEditHomeowner}
                         className="p-1.5 text-surface-outline-variant dark:text-gray-400 hover:text-primary bg-transparent hover:bg-primary/10 rounded-full transition-colors flex-shrink-0"
                         title="Edit Homeowner Info"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Project */}
                  <div className="flex items-center gap-1.5 text-sm flex-shrink-0">
                     <Home className="h-4 w-4 text-surface-outline dark:text-gray-500 flex-shrink-0" />
                     <span className="font-medium text-surface-on dark:text-gray-100 truncate">{displayHomeowner.jobName || 'N/A'}</span>
                  </div>
                  
                  {/* Address */}
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(displayHomeowner.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-surface-on-variant dark:text-gray-400 hover:text-primary transition-colors truncate flex-shrink-0"
                  >
                    <MapPin className="h-3.5 w-3.5 text-surface-outline dark:text-gray-500 flex-shrink-0" />
                    <span className="truncate">{displayHomeowner.address}</span>
                  </a>
                </div>

                {/* Line 2: Builder, Closing Date, Phone, Email - Even Spacing */}
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {/* Builder */}
                  <span className="flex items-center gap-1.5 text-xs text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-2.5 py-0.5 rounded-full border border-surface-outline-variant dark:border-gray-600 flex-shrink-0">
                    <Building2 className="h-3 w-3" />
                    {displayHomeowner.builder}
                  </span>
                  
                  {/* Closing Date */}
                  <span className="flex items-center gap-1.5 text-xs text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-2.5 py-0.5 rounded-full border border-surface-outline-variant dark:border-gray-600 flex-shrink-0">
                     <Clock className="h-3 w-3 text-surface-outline dark:text-gray-500" />
                     Closing: {displayHomeowner.closingDate ? new Date(displayHomeowner.closingDate).toLocaleDateString() : 'N/A'}
                  </span>
                  
                  {/* Phone */}
                  <a href={`tel:${displayHomeowner.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors flex-shrink-0 text-sm text-surface-on-variant dark:text-gray-400">
                    <Phone className="h-3.5 w-3.5 text-surface-outline dark:text-gray-500 flex-shrink-0" />
                    <span className="whitespace-nowrap">{displayHomeowner.phone}</span>
                  </a>
                  
                  {/* Email */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0 text-sm text-surface-on-variant dark:text-gray-400">
                    <Mail className="h-3.5 w-3.5 text-surface-outline dark:text-gray-500 flex-shrink-0" />
                    <a href={`mailto:${displayHomeowner.email}`} className="hover:text-primary transition-colors truncate min-w-0">{displayHomeowner.email}</a>
                  </div>
                </div>
             </div>

             {/* Actions Positioned Centered */}
             <div className="mt-4 pt-4 border-t border-surface-outline-variant/50 dark:border-gray-700/50 flex items-center justify-center gap-2 flex-wrap">
                {/* Buttons removed from homeowner view - now in tabs */}
                {!isHomeownerView && (
                  <>
                    {/* Documents Button - Admin view only */}
                    <Button
                      onClick={() => setShowDocsModal(true)}
                      variant="outlined"
                      icon={<FileText className="h-4 w-4" />}
                      className="!h-9 !px-4 !bg-surface dark:!bg-gray-800"
                    >
                      Documents {displayDocuments.length > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-on text-xs font-medium">
                          {displayDocuments.length}
                        </span>
                      )}
                    </Button>
                    {/* Sub List Button - Show if subcontractor list exists */}
                    {displayHomeowner.subcontractorList && displayHomeowner.subcontractorList.length > 0 && (
                      <Button 
                        onClick={() => setShowSubListModal(true)} 
                        variant="outlined" 
                        icon={<HardHat className="h-4 w-4" />}
                        className="!h-9 !px-4"
                      >
                        Sub List
                      </Button>
                    )}
                    {/* Punch List Button - Shows "BlueTag" on mobile, "BlueTag" or "+ Punch List" on desktop */}
                    {(() => {
                      const reportKey = `bluetag_report_${displayHomeowner.id}`;
                      const hasReport = localStorage.getItem(reportKey) !== null;
                      
                      return (
                        <Button
                          onClick={() => setShowPunchListApp(true)}
                          variant="outlined"
                          icon={<ClipboardList className="h-4 w-4" />}
                          className="!h-9 !px-4 !bg-surface dark:!bg-gray-800"
                        >
                          <span className="md:hidden">BlueTag</span>
                          <span className="hidden md:inline">{hasReport ? 'BlueTag' : '+ Punch List'}</span>
                        </Button>
                      );
                    })()}
                  </>
                )}
                {/* Admin Only Actions - Hidden in homeowner view */}
                {isAdmin && !isHomeownerView && (
                  <>
                    <Button
                      onClick={async () => {
                        // Open modal immediately
                        setInviteName(displayHomeowner.name);
                        setInviteEmail(displayHomeowner.email);
                        setShowInviteModal(true);
                        // Draft email asynchronously after modal is open
                        setIsDrafting(true);
                        try {
                          const defaultBody = await draftInviteEmail(displayHomeowner.name);
                          setInviteBody(defaultBody);
                        } catch (error) {
                          console.error('Failed to draft email:', error);
                          // Set a default body if drafting fails
                          setInviteBody(`Dear ${displayHomeowner.name},\n\nWelcome to Cascade Builder Services!`);
                        } finally {
                          setIsDrafting(false);
                        }
                      }}
                      variant="outlined"
                      icon={<Mail className="h-4 w-4" />}
                      className="!h-9 !px-4 !bg-surface dark:!bg-gray-800"
                    >
                      Invite
                    </Button>
                    <Button
                      onClick={() => {
                        console.log('New Claim button clicked, setting showNewClaimModal to true');
                        setShowNewClaimModal(true);
                        console.log('showNewClaimModal should now be true');
                      }}
                      variant="filled"
                      icon={<Plus className="h-4 w-4" />}
                      className="!h-9 !px-4"
                    >
                      New Claim
                    </Button>
                    <Button
                      onClick={() => {
                        console.log('New Task button clicked');
                        setNewTaskTitle(`Task for ${displayHomeowner.name}`);
                        setNewTaskAssignee(currentUser.id);
                        setNewTaskNotes('');
                        setSelectedClaimIds([]);
                        setShowNewTaskModal(true);
                        console.log('showNewTaskModal should now be true');
                      }}
                      variant="filled"
                      icon={<CheckSquare className="h-4 w-4" />}
                      className="!h-9 !px-4"
                    >
                      New Task
                    </Button>
                    <Button 
                      onClick={() => {
                        // Open new message modal and switch to messages tab
                        setShowNewMessageModal(true);
                        setCurrentTab('MESSAGES');
                      }}
                      variant="filled" 
                      icon={<Mail className="h-4 w-4" />}
                      className="!h-9 !px-4"
                    >
                      New Message
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Next Appointment Card - Right of Homeowner Info */}
          <motion.div 
            className="w-full lg:w-[300px] lg:flex-shrink-0 bg-primary/10 dark:bg-gray-800 rounded-3xl text-secondary-on-container dark:text-gray-100 flex flex-col relative border border-surface-outline-variant dark:border-gray-700 shadow-elevation-1 overflow-hidden"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{
              ...springTransition,
              delay: 0.1
            }}
            layout
          >
            <div className="p-6 w-full text-left flex-shrink-0 z-10 relative">
              <h3 className="font-medium text-lg mb-0 flex items-center justify-between text-secondary-on-container dark:text-gray-100">
                <span className="flex items-center">
                  <Calendar className="h-5 w-5 mr-3" />
                  Next Appointment
                </span>
              </h3>
            </div>
            
            {(() => {
              // Get the next upcoming appointment date
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              
              const upcomingClaims = scheduledClaims
                .map(c => {
                  const acceptedDate = c.proposedDates.find(d => d.status === 'ACCEPTED');
                  if (!acceptedDate) return null;
                  const appointmentDate = new Date(acceptedDate.date);
                  appointmentDate.setHours(0, 0, 0, 0);
                  if (appointmentDate < now) return null;
                  return { claim: c, date: appointmentDate, acceptedDate };
                })
                .filter(Boolean) as Array<{ claim: Claim; date: Date; acceptedDate: any }>;
              
              if (upcomingClaims.length === 0) {
                return (
                  <div className="px-6 pb-6 pt-0">
                    <p className="text-sm opacity-70 dark:opacity-60 text-secondary-on-container dark:text-gray-400">No upcoming appointments.</p>
                  </div>
                );
              }
              
              // Sort by date
              upcomingClaims.sort((a, b) => a.date.getTime() - b.date.getTime());
              
              // Get the next date
              const nextDate = upcomingClaims[0].date;
              const nextDateStr = nextDate.toISOString().split('T')[0];
              
              // Count how many claims have this same date
              const claimsOnNextDate = upcomingClaims.filter(item => {
                const itemDateStr = item.date.toISOString().split('T')[0];
                return itemDateStr === nextDateStr;
              });
              
              const firstClaim = claimsOnNextDate[0].claim;
              const acceptedDate = claimsOnNextDate[0].acceptedDate;
              
              return (
                <div className="px-6 pb-6 pt-0">
                  <div 
                    className="bg-surface/50 dark:bg-gray-700/50 p-4 rounded-xl text-sm backdrop-blur-sm border border-white/20 dark:border-gray-600/30 cursor-pointer hover:bg-surface/70 dark:hover:bg-gray-700/70 transition-colors"
                    onClick={() => setSelectedClaimForModal(firstClaim)}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <p className="font-medium text-secondary-on-container dark:text-gray-200 text-center">{firstClaim.title}</p>
                      {claimsOnNextDate.length > 1 && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-on text-xs font-medium">
                          {claimsOnNextDate.length}
                        </span>
                      )}
                    </div>
                    <p className="opacity-80 dark:opacity-70 mt-1 text-secondary-on-container dark:text-gray-300 text-center">
                      {new Date(acceptedDate.date).toLocaleDateString()} - {acceptedDate?.timeSlot}
                    </p>
                    {firstClaim.contractorName && (
                      <p className="opacity-70 dark:opacity-60 mt-1 text-secondary-on-container dark:text-gray-400 text-center text-xs">
                        {firstClaim.contractorName}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </div>

        {/* Navigation Tabs (Context Specific) */}
        <motion.div 
          className="flex gap-2 max-w-7xl mx-auto"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{
            ...springTransition,
            delay: 0.2
          }}
          layout
        >
           <button 
              onClick={() => setCurrentTab('CLAIMS')}
              className={`text-sm font-medium transition-all flex items-center gap-2 px-4 py-2 rounded-full ${currentTab === 'CLAIMS' ? 'bg-primary text-primary-on' : 'text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700'}`}
            >
              <ClipboardList className="h-4 w-4" />
              Warranty
            </button>
            
            {/* TASKS TAB - Admin Only (hidden in homeowner view) */}
            {isAdmin && !isHomeownerView && (
              <button 
                onClick={() => setCurrentTab('TASKS')}
                className={`text-sm font-medium transition-all flex items-center gap-2 px-4 py-2 rounded-full ${currentTab === 'TASKS' ? 'bg-primary text-primary-on' : 'text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700'}`}
              >
                <CheckSquare className="h-4 w-4" />
                Tasks
              </button>
            )}

            <button 
              onClick={() => setCurrentTab('MESSAGES')}
              className={`text-sm font-medium transition-all flex items-center gap-2 px-4 py-2 rounded-full ${currentTab === 'MESSAGES' ? 'bg-primary text-primary-on' : 'text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700'}`}
            >
              <Mail className="h-4 w-4" />
              Messages
              {displayThreads.some(t => !t.isRead) && (
                <span className="w-2 h-2 rounded-full bg-error ml-1"></span>
              )}
            </button>

            {/* Documents Tab - Homeowner View Only */}
            {isHomeownerView && (
              <button 
                onClick={() => setCurrentTab('DOCUMENTS')}
                className={`text-sm font-medium transition-all flex items-center gap-2 px-4 py-2 rounded-full ${currentTab === 'DOCUMENTS' ? 'bg-primary text-primary-on' : 'text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700'}`}
              >
                <FileText className="h-4 w-4" />
                Documents
                {displayDocuments.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-primary-on text-xs font-medium">
                    {displayDocuments.length}
                  </span>
                )}
              </button>
            )}
        </motion.div>

        {/* Content Area */}
        {/* Mobile Carousel - All tabs pre-loaded */}
        <div
          ref={carouselRef}
          className="md:hidden min-h-[calc(100vh-300px)] relative overflow-x-auto overflow-y-hidden snap-x snap-mandatory"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          } as React.CSSProperties}
          onScroll={(e) => {
            // Update currentTab based on scroll position
            const container = e.currentTarget;
            const scrollLeft = container.scrollLeft;
            const viewportWidth = window.innerWidth;
            const availableTabs = getAvailableTabs();
            const currentIndex = Math.round(scrollLeft / viewportWidth);
            if (currentIndex >= 0 && currentIndex < availableTabs.length && availableTabs[currentIndex] !== currentTab) {
              setCurrentTab(availableTabs[currentIndex]);
            }
          }}
        >
          <div className="flex h-full" style={{ width: `${getAvailableTabs().length * 100}vw` }}>
            {/* CLAIMS Tab */}
            <div className="w-screen flex-shrink-0 snap-start snap-always min-h-[calc(100vh-300px)]">
              <div className="max-w-7xl mx-auto min-h-[calc(100vh-300px)] px-4">
                {renderClaimsList(displayClaims, isHomeownerView)}
              </div>
            </div>

            {/* TASKS Tab - Admin Only */}
            {isAdmin && (
              <div className="w-screen flex-shrink-0 snap-start snap-always min-h-[calc(100vh-300px)]">
                <div className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden mb-6 last:mb-0 flex flex-col shadow-elevation-1 mx-4" style={{ maxHeight: 'calc(100vh - 300px)', minHeight: 'calc(100vh - 300px)' }}>
                  <TaskList 
                    tasks={tasks}
                    employees={employees}
                    currentUser={currentUser}
                    claims={claims}
                    homeowners={homeowners}
                    onAddTask={onAddTask}
                    onToggleTask={onToggleTask}
                    onDeleteTask={onDeleteTask}
                    onUpdateTask={onUpdateTask}
                    preSelectedHomeowner={targetHomeowner}
                    onSelectClaim={(claim) => setSelectedClaimForModal(claim)}
                    onSelectTask={(task) => setSelectedTaskForModal(task)}
                  />
                </div>
              </div>
            )}

            {/* MESSAGES Tab */}
            <div className="w-screen flex-shrink-0 snap-start snap-always min-h-[calc(100vh-300px)]">
              <div className="px-4">
                {renderMessagesTab()}
              </div>
            </div>

            {/* DOCUMENTS Tab - Homeowner Only */}
            {userRole === UserRole.HOMEOWNER && (
              <div className="w-screen flex-shrink-0 snap-start snap-always min-h-[calc(100vh-300px)]">
                <div className="max-w-7xl mx-auto min-h-[calc(100vh-300px)] px-4">
                  <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden shadow-elevation-1">
                    <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex justify-between items-center shrink-0">
                      <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Account Documents
                      </h2>
                    </div>
                    
                    <div className="p-6 bg-surface dark:bg-gray-800 flex-1 overflow-y-auto">
                      {/* Thumbnail Grid */}
                      {displayDocuments.length === 0 ? (
                        <div className="text-center text-sm text-surface-on-variant dark:text-gray-400 py-12 border border-dashed border-surface-outline-variant dark:border-gray-600 rounded-xl bg-surface-container/30 dark:bg-gray-700/30">
                          No documents uploaded for this account.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {displayDocuments.map(doc => {
                            const isPDF = doc.type === 'PDF' || doc.name.toLowerCase().endsWith('.pdf') || 
                                         doc.url.startsWith('data:application/pdf') || 
                                         doc.url.includes('pdf');
                            
                            return (
                              <div key={doc.id} className="flex flex-col bg-surface-container dark:bg-gray-700 rounded-xl overflow-hidden border border-surface-outline-variant dark:border-gray-600 hover:shadow-lg transition-all relative group">
                                {/* Header with Action Buttons */}
                                <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-2 flex items-center justify-end gap-1">
                                  {isPDF && (
                                    <>
                                      {/* View PDF */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedDocument(doc);
                                          setIsPDFViewerOpen(true);
                                        }}
                                        className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                                        title="View PDF"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                
                                {/* Thumbnail */}
                                <div 
                                  className="relative w-full aspect-[3/4] bg-surface-container-high dark:bg-gray-600 flex items-center justify-center cursor-pointer overflow-hidden"
                                  onClick={() => {
                                    if (isPDF) {
                                      setSelectedDocument(doc);
                                      setIsPDFViewerOpen(true);
                                    }
                                  }}
                                >
                                  {doc.thumbnailUrl ? (
                                    <img 
                                      src={doc.thumbnailUrl} 
                                      alt={doc.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="p-4 text-center">
                                      <FileText className="h-12 w-12 mx-auto text-surface-on-variant dark:text-gray-400 mb-2" />
                                      <p className="text-xs text-surface-on-variant dark:text-gray-400 truncate px-2">{doc.name}</p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Document Name */}
                                <div className="p-2 bg-surface-container dark:bg-gray-700">
                                  <p className="text-xs font-medium text-surface-on dark:text-gray-100 truncate" title={doc.name}>
                                    {doc.name}
                                  </p>
                                  <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-0.5">
                                    {new Date(doc.uploadDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Content Area - Keep existing behavior */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="hidden md:block md:touch-none min-h-[calc(100vh-300px)] md:min-h-0 relative overflow-hidden"
        >
        <AnimatePresence mode={swipeProgress > 0 ? undefined : "wait"} initial={false}>
          {currentTab === 'CLAIMS' && (
            <motion.div 
              key="claims"
              className="max-w-7xl mx-auto min-h-[calc(100vh-300px)] md:min-h-0 md:relative"
              style={{
                position: swipeProgress > 0 ? 'absolute' : 'relative',
                width: '100%',
                transform: swipeProgress > 0 && swipeDirection === 'left' 
                  ? `translateX(${-swipeProgress * 100}%)` 
                  : swipeProgress > 0 && swipeDirection === 'right'
                  ? `translateX(${swipeProgress * 100}%)`
                  : 'translateX(0)',
                zIndex: swipeProgress > 0 ? 1 : 0,
                willChange: swipeProgress > 0 ? 'transform' : 'auto'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: swipeProgress > 0 ? 0 : 0.35, ease: "easeOut" }}
            >
              {renderClaimsList(displayClaims, isHomeownerView)}
            </motion.div>
          )}
          
          {/* Target tab during swipe - CLAIMS */}
          {swipeProgress > 0 && targetTab === 'CLAIMS' && currentTab !== 'CLAIMS' && (
            <motion.div 
              key="claims-target"
              className="max-w-7xl mx-auto min-h-[calc(100vh-300px)] md:min-h-0 absolute inset-0"
              style={{
                width: '100%',
                transform: swipeDirection === 'left'
                  ? `translateX(${(1 - swipeProgress) * 100}%)`
                  : `translateX(${-(1 - swipeProgress) * 100}%)`,
                zIndex: 2,
                willChange: 'transform'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0 }}
            >
              {renderClaimsList(displayClaims, isHomeownerView)}
            </motion.div>
          )}

          {currentTab === 'TASKS' && isAdmin && (
            <motion.div 
              key="tasks"
              className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden mb-6 last:mb-0 flex flex-col shadow-elevation-1 md:relative"
              style={{ 
                maxHeight: 'calc(100vh - 300px)', 
                minHeight: 'calc(100vh - 300px)',
                position: swipeProgress > 0 ? 'absolute' : 'relative',
                width: '100%',
                transform: swipeProgress > 0 && swipeDirection === 'left' 
                  ? `translateX(${-swipeProgress * 100}%)` 
                  : swipeProgress > 0 && swipeDirection === 'right'
                  ? `translateX(${swipeProgress * 100}%)`
                  : 'translateX(0)',
                zIndex: swipeProgress > 0 ? 1 : 0
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: swipeProgress > 0 ? 0 : 0.35, ease: "easeOut" }}
            >
              <TaskList 
                tasks={tasks}
                employees={employees}
                currentUser={currentUser}
                claims={claims}
                homeowners={homeowners}
                onAddTask={onAddTask}
                onToggleTask={onToggleTask}
                onDeleteTask={onDeleteTask}
                onUpdateTask={onUpdateTask}
                preSelectedHomeowner={targetHomeowner}
                onSelectClaim={(claim) => setSelectedClaimForModal(claim)}
                onSelectTask={(task) => setSelectedTaskForModal(task)}
              />
            </motion.div>
          )}
          
          {/* Target tab during swipe - TASKS */}
          {swipeProgress > 0 && targetTab === 'TASKS' && currentTab !== 'TASKS' && isAdmin && (
            <motion.div 
              key="tasks-target"
              className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden mb-6 last:mb-0 flex flex-col shadow-elevation-1 absolute inset-0"
              style={{ 
                maxHeight: 'calc(100vh - 300px)', 
                minHeight: 'calc(100vh - 300px)',
                width: '100%',
                transform: swipeDirection === 'left'
                  ? `translateX(${(1 - swipeProgress) * 100}%)`
                  : `translateX(${-(1 - swipeProgress) * 100}%)`,
                zIndex: 2
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0 }}
            >
              <TaskList 
                tasks={tasks}
                employees={employees}
                currentUser={currentUser}
                claims={claims}
                homeowners={homeowners}
                onAddTask={onAddTask}
                onToggleTask={onToggleTask}
                onDeleteTask={onDeleteTask}
                onUpdateTask={onUpdateTask}
                preSelectedHomeowner={targetHomeowner}
                onSelectClaim={(claim) => setSelectedClaimForModal(claim)}
                onSelectTask={(task) => setSelectedTaskForModal(task)}
              />
            </motion.div>
          )}

          {currentTab === 'DOCUMENTS' && userRole === UserRole.HOMEOWNER && (
            <motion.div 
              key="documents"
              className="max-w-7xl mx-auto min-h-[calc(100vh-300px)] md:min-h-0 md:relative"
              style={{
                position: swipeProgress > 0 ? 'absolute' : 'relative',
                width: '100%',
                transform: swipeProgress > 0 && swipeDirection === 'left' 
                  ? `translateX(${-swipeProgress * 100}%)` 
                  : swipeProgress > 0 && swipeDirection === 'right'
                  ? `translateX(${swipeProgress * 100}%)`
                  : 'translateX(0)',
                zIndex: swipeProgress > 0 ? 1 : 0,
                willChange: swipeProgress > 0 ? 'transform' : 'auto'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: swipeProgress > 0 ? 0 : 0.35, ease: "easeOut" }}
            >
              <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden shadow-elevation-1">
                <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex justify-between items-center shrink-0">
                  <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Account Documents
                  </h2>
                </div>
                
                <div className="p-6 bg-surface dark:bg-gray-800 flex-1 overflow-y-auto">
                  {/* Thumbnail Grid */}
                  {displayDocuments.length === 0 ? (
                    <div className="text-center text-sm text-surface-on-variant dark:text-gray-400 py-12 border border-dashed border-surface-outline-variant dark:border-gray-600 rounded-xl bg-surface-container/30 dark:bg-gray-700/30">
                      No documents uploaded for this account.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {displayDocuments.map(doc => {
                        const isPDF = doc.type === 'PDF' || doc.name.toLowerCase().endsWith('.pdf') || 
                                     doc.url.startsWith('data:application/pdf') || 
                                     doc.url.includes('pdf');
                        
                        return (
                          <div key={doc.id} className="flex flex-col bg-surface-container dark:bg-gray-700 rounded-xl overflow-hidden border border-surface-outline-variant dark:border-gray-600 hover:shadow-lg transition-all relative group">
                            {/* Header with Action Buttons */}
                            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-2 flex items-center justify-end gap-1">
                              {isPDF && (
                                <>
                                  {/* View PDF */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedDocument(doc);
                                      setIsPDFViewerOpen(true);
                                    }}
                                    className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                                    title="View PDF"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                            
                            {/* Thumbnail */}
                            <div 
                              className="relative w-full aspect-[3/4] bg-surface-container-high dark:bg-gray-600 flex items-center justify-center cursor-pointer overflow-hidden"
                              onClick={() => {
                                if (isPDF) {
                                  setSelectedDocument(doc);
                                  setIsPDFViewerOpen(true);
                                }
                              }}
                            >
                              {doc.thumbnailUrl ? (
                                <img 
                                  src={doc.thumbnailUrl} 
                                  alt={doc.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="p-4 text-center">
                                  <FileText className="h-12 w-12 mx-auto text-surface-on-variant dark:text-gray-400 mb-2" />
                                  <p className="text-xs text-surface-on-variant dark:text-gray-400 truncate px-2">{doc.name}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Document Name */}
                            <div className="p-2 bg-surface-container dark:bg-gray-700">
                              <p className="text-xs font-medium text-surface-on dark:text-gray-100 truncate" title={doc.name}>
                                {doc.name}
                              </p>
                              <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-0.5">
                                {new Date(doc.uploadDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Target tab during swipe - DOCUMENTS */}
          {swipeProgress > 0 && targetTab === 'DOCUMENTS' && currentTab !== 'DOCUMENTS' && userRole === UserRole.HOMEOWNER && (
            <motion.div 
              key="documents-target"
              className="max-w-7xl mx-auto min-h-[calc(100vh-300px)] md:min-h-0 absolute inset-0"
              style={{
                width: '100%',
                transform: swipeDirection === 'left'
                  ? `translateX(${(1 - swipeProgress) * 100}%)`
                  : `translateX(${-(1 - swipeProgress) * 100}%)`,
                zIndex: 2,
                willChange: 'transform'
              }}
            >
              <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden shadow-elevation-1">
                <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex justify-between items-center shrink-0">
                  <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Account Documents
                  </h2>
                </div>
                
                <div className="p-6 bg-surface dark:bg-gray-800 flex-1 overflow-y-auto">
                  {/* Thumbnail Grid */}
                  {displayDocuments.length === 0 ? (
                    <div className="text-center text-sm text-surface-on-variant dark:text-gray-400 py-12 border border-dashed border-surface-outline-variant dark:border-gray-600 rounded-xl bg-surface-container/30 dark:bg-gray-700/30">
                      No documents uploaded for this account.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {displayDocuments.map(doc => {
                        const isPDF = doc.type === 'PDF' || doc.name.toLowerCase().endsWith('.pdf') || 
                                     doc.url.startsWith('data:application/pdf') || 
                                     doc.url.includes('pdf');
                        
                        return (
                          <div key={doc.id} className="flex flex-col bg-surface-container dark:bg-gray-700 rounded-xl overflow-hidden border border-surface-outline-variant dark:border-gray-600 hover:shadow-lg transition-all relative group">
                            {/* Header with Action Buttons */}
                            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-2 flex items-center justify-end gap-1">
                              {isPDF && (
                                <>
                                  {/* View PDF */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedDocument(doc);
                                      setIsPDFViewerOpen(true);
                                    }}
                                    className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                                    title="View PDF"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                            
                            {/* Thumbnail */}
                            <div 
                              className="relative w-full aspect-[3/4] bg-surface-container-high dark:bg-gray-600 flex items-center justify-center cursor-pointer overflow-hidden"
                              onClick={() => {
                                if (isPDF) {
                                  setSelectedDocument(doc);
                                  setIsPDFViewerOpen(true);
                                }
                              }}
                            >
                              {doc.thumbnailUrl ? (
                                <img 
                                  src={doc.thumbnailUrl} 
                                  alt={doc.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="p-4 text-center">
                                  <FileText className="h-12 w-12 mx-auto text-surface-on-variant dark:text-gray-400 mb-2" />
                                  <p className="text-xs text-surface-on-variant dark:text-gray-400 truncate px-2">{doc.name}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Document Name */}
                            <div className="p-2 bg-surface-container dark:bg-gray-700">
                              <p className="text-xs font-medium text-surface-on dark:text-gray-100 truncate" title={doc.name}>
                                {doc.name}
                              </p>
                              <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-0.5">
                                {new Date(doc.uploadDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentTab === 'MESSAGES' && (
            <motion.div 
              key="messages"
              className="min-h-[calc(100vh-300px)] md:min-h-0 md:relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {renderMessagesTab()}
            </motion.div>
          )}

        </AnimatePresence>
        </div>

        {/* DOCUMENTS MODAL - Admin View Only */}
        {showDocsModal && userRole !== UserRole.HOMEOWNER && createPortal(
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDocsModal(false);
            }}
          >
            <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] max-h-[90vh] flex flex-col">
               <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center shrink-0">
                  <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Account Documents
                  </h2>
                  <button onClick={() => setShowDocsModal(false)} className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100">
                    <X className="h-5 w-5" />
                  </button>
               </div>
               
               <div className="p-6 bg-surface dark:bg-gray-800 flex-1 overflow-y-auto">
                 {/* Thumbnail Grid */}
                 {displayDocuments.length === 0 ? (
                   <div className="text-center text-sm text-surface-on-variant dark:text-gray-400 py-12 border border-dashed border-surface-outline-variant dark:border-gray-600 rounded-xl bg-surface-container/30 dark:bg-gray-700/30">
                     No documents uploaded for this account.
                   </div>
                 ) : (
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {displayDocuments.map(doc => {
                       const isPDF = doc.type === 'PDF' || doc.name.toLowerCase().endsWith('.pdf') || 
                                    doc.url.startsWith('data:application/pdf') || 
                                    doc.url.includes('pdf');
                       
                       return (
                         <div key={doc.id} className="flex flex-col bg-surface-container dark:bg-gray-700 rounded-xl overflow-hidden border border-surface-outline-variant dark:border-gray-600 hover:shadow-lg transition-all relative group">
                           {/* Header with Action Buttons */}
                           <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-2 flex items-center justify-end gap-1">
                             {isPDF && (
                               <>
                                 {/* Save to Google Drive */}
                                 <button
                                   type="button"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     // Create a link that opens Google Drive
                                     const link = document.createElement('a');
                                     link.href = `https://drive.google.com/drive/folders`;
                                     link.target = '_blank';
                                     link.click();
                                     // Also trigger download as fallback
                                     if (doc.url.startsWith('data:')) {
                                       const downloadLink = document.createElement('a');
                                       downloadLink.href = doc.url;
                                       downloadLink.download = doc.name;
                                       document.body.appendChild(downloadLink);
                                       downloadLink.click();
                                       document.body.removeChild(downloadLink);
                                     }
                                   }}
                                   className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                                   title="Save to Google Drive"
                                 >
                                   <Share2 className="h-3.5 w-3.5" />
                                 </button>
                                 
                                 {/* Download */}
                                 {doc.url.startsWith('data:') ? (
                                   <a 
                                     href={doc.url} 
                                     download={doc.name} 
                                     onClick={(e) => e.stopPropagation()}
                                     className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                                     title="Download"
                                   >
                                     <Download className="h-3.5 w-3.5" />
                                   </a>
                                 ) : (
                                   <button 
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       window.open(doc.url, '_blank');
                                     }}
                                     className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                                     title="Download"
                                   >
                                     <Download className="h-3.5 w-3.5" />
                                   </button>
                                 )}
                                 
                                 {/* Print */}
                                 <button
                                   type="button"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     const printWindow = window.open('', '_blank');
                                     if (printWindow && doc.url) {
                                       printWindow.document.write(`
                                         <html>
                                           <head><title>${doc.name}</title></head>
                                           <body style="margin:0;">
                                             <iframe src="${doc.url}" style="width:100%;height:100vh;border:none;"></iframe>
                                           </body>
                                         </html>
                                       `);
                                       printWindow.document.close();
                                       printWindow.onload = () => {
                                         setTimeout(() => {
                                           printWindow.print();
                                         }, 250);
                                       };
                                     }
                                   }}
                                   className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                                   title="Print"
                                 >
                                   <Printer className="h-3.5 w-3.5" />
                                 </button>
                               </>
                             )}
                             
                             {/* Delete - Show for all document types when admin (not shown for homeowners) */}
                             {isAdminAccount && onDeleteDocument && (
                               <button
                                 type="button"
                                 onClick={(e) => {
                                   e.preventDefault();
                                   e.stopPropagation();
                                   if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
                                     onDeleteDocument(doc.id);
                                   }
                                 }}
                                 className="p-1.5 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shadow-md transition-all flex items-center justify-center"
                                 title="Delete"
                               >
                                 <Trash2 className="h-3.5 w-3.5" />
                               </button>
                             )}
                           </div>
                           
                           {/* Thumbnail */}
                           <div 
                             className="w-full aspect-[3/4] bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden cursor-pointer relative group"
                             onClick={() => {
                               if (isPDF) {
                                 setSelectedDocument(doc);
                                 setIsPDFViewerOpen(true);
                               } else if (doc.type === 'IMAGE' || doc.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || doc.url?.startsWith('data:image/')) {
                                 // Open image in new tab or image viewer
                                 window.open(doc.url, '_blank');
                               }
                             }}
                             style={{ overflow: 'hidden' }}
                           >
                             {isPDF ? (
                               <PDFThumbnailDisplay doc={doc} />
                             ) : (
                               <>
                                 {(doc.type === 'IMAGE' || doc.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || doc.url?.startsWith('data:image/')) ? (
                                   <img
                                     src={doc.thumbnailUrl || doc.url}
                                     alt={doc.name}
                                     className="w-full h-full object-cover absolute inset-0"
                                     style={{ 
                                       display: 'block',
                                       pointerEvents: 'none'
                                     }}
                                     onError={(e) => {
                                       // Fallback to icon if image fails to load
                                       const target = e.target as HTMLImageElement;
                                       target.style.display = 'none';
                                       const fallback = target.parentElement?.querySelector('.image-fallback');
                                       if (fallback) {
                                         (fallback as HTMLElement).style.display = 'flex';
                                       }
                                     }}
                                   />
                                 ) : null}
                                 <div className={`p-8 flex flex-col items-center justify-center text-center image-fallback absolute inset-0 ${(doc.type === 'IMAGE' || doc.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || doc.url?.startsWith('data:image/')) ? 'hidden' : ''}`}>
                                   <FileText className="h-12 w-12 text-surface-outline-variant dark:text-gray-500 mb-2" />
                                   <span className="text-xs text-surface-on-variant dark:text-gray-400">{doc.type || 'FILE'}</span>
                                 </div>
                               </>
                             )}
                             {isPDF && (
                               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                                 <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                               </div>
                             )}
                           </div>
                           
                           {/* Document Info */}
                           <div className="p-3">
                             <p className="text-xs font-medium text-surface-on dark:text-gray-100 truncate" title={doc.name}>
                               {doc.name}
                             </p>
                             <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                               {new Date(doc.uploadDate).toLocaleDateString()}
                             </p>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 )}
                 
                 {/* Upload Action */}
                 <div className="pt-6 mt-6 border-t border-surface-outline-variant dark:border-gray-700 flex justify-center shrink-0">
                   <label className={`cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full transition-colors ${isDocUploading ? 'bg-primary/50 border-primary/30 cursor-wait' : 'bg-primary text-primary-on hover:bg-primary/90 dark:hover:bg-primary/80'} text-sm font-medium`}>
                     {isDocUploading ? (
                       <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                       <Upload className="h-4 w-4" />
                     )}
                     {isDocUploading ? 'Uploading...' : 'Upload New Document'}
                     <input type="file" className="hidden" onChange={handleFileUpload} disabled={isDocUploading} />
                   </label>
                 </div>
               </div>
            </div>
          </div>,
          document.body
        )}

        {/* INVITE MODAL */}
        {/* Sub List Modal */}
        {showSubListModal && targetHomeowner.subcontractorList && targetHomeowner.subcontractorList.length > 0 && createPortal(
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSubListModal(false);
              }
            }}
          >
            <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl max-h-[85vh] rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center sticky top-0 z-10 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                    <HardHat className="h-6 w-6 text-primary" />
                    Subcontractor List - {targetHomeowner.name}
                  </h2>
                  <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
                    {targetHomeowner.subcontractorList.length} subcontractor{targetHomeowner.subcontractorList.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <button 
                  onClick={() => setShowSubListModal(false)} 
                  className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 p-2 rounded-full hover:bg-white/10 dark:hover:bg-gray-600/50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 min-h-0">
                <div className="bg-surface-container dark:bg-gray-700 rounded-xl border border-surface-outline-variant dark:border-gray-600 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-container-high dark:bg-gray-800 sticky top-0">
                        <tr>
                          {Object.keys(targetHomeowner.subcontractorList[0] || {}).map((header, idx) => (
                            <th 
                              key={idx}
                              className="px-4 py-3 text-left text-xs font-semibold text-surface-on-variant dark:text-gray-400 uppercase tracking-wider border-b border-surface-outline-variant dark:border-gray-600"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
                        {targetHomeowner.subcontractorList.map((row, rowIdx) => (
                          <tr 
                            key={rowIdx}
                            className="hover:bg-surface-container-high dark:hover:bg-gray-800 transition-colors"
                          >
                            {Object.values(row).map((cell: any, cellIdx) => (
                              <td 
                                key={cellIdx}
                                className="px-4 py-3 text-surface-on dark:text-gray-200 text-xs"
                              >
                                {cell || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 flex justify-end flex-shrink-0">
                <Button onClick={() => setShowSubListModal(false)} variant="filled">
                  Close
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* PUNCH LIST APP MODAL */}
        {showPunchListApp && effectiveHomeowner && createPortal(
          <div 
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPunchListApp(false);
              }
            }}
          >
            <div className="bg-surface dark:bg-gray-800 w-full h-full rounded-none shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] flex flex-col relative">
              {/* Content - BlueTag Punch List App embedded here */}
              <div className="flex-1 overflow-hidden relative" style={{ isolation: 'isolate', pointerEvents: 'auto' }}>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  <PunchListApp
                    homeowner={effectiveHomeowner}
                    onClose={() => setShowPunchListApp(false)}
                    onUpdateHomeowner={onUpdateHomeowner}
                    onSavePDF={async (pdfBlob: Blob, filename: string) => {
                    // Delete existing documents with the same name for this homeowner
                    if (onDeleteDocument && effectiveHomeowner) {
                      const existingDocs = documents.filter(
                        doc => doc.homeownerId === effectiveHomeowner.id && doc.name === filename
                      );
                      for (const doc of existingDocs) {
                        await onDeleteDocument(doc.id);
                      }
                    }
                    
                    // Convert blob to base64 for storage
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64 = reader.result as string;
                      onUploadDocument({
                        homeownerId: effectiveHomeowner.id,
                        name: filename,
                        type: 'PDF',
                        uploadedBy: 'System (Punch List)',
                        url: base64
                      });
                    };
                    reader.readAsDataURL(pdfBlob);
                  }}
                  onCreateMessage={async (homeownerId: string, subject: string, content: string, attachments?: Array<{ filename: string; content: string; contentType: string }>) => {
                    // Create a message thread for the punch list email
                    onCreateThread(homeownerId, subject, content);
                    // Note: Attachments are sent via email, but not stored in the message thread
                    // The message thread will show the email was sent
                  }}
                  onShowManual={() => setShowManualModal(true)}
                  />
                </Suspense>
              </div>
              
              {/* Close button at bottom right */}
              <button 
                onClick={() => setShowPunchListApp(false)} 
                className="absolute bottom-4 right-4 z-[200] bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>,
          document.body
        )}

        {showInviteModal && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowInviteModal(false);
            }}
          >
             <div className="bg-surface dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] max-h-[85vh] flex flex-col">
                <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700 flex-shrink-0">
                  <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Invite Homeowner
                  </h2>
                  <button onClick={() => setShowInviteModal(false)} className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 bg-surface dark:bg-gray-800 overflow-y-auto flex-1 min-h-0">
                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-300 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-300 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-300 mb-1">Invitation Message</label>
                    {isDrafting ? (
                      <div className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 flex items-center justify-center min-h-[200px]">
                        <div className="flex items-center gap-2 text-surface-on-variant dark:text-gray-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Drafting email...</span>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        rows={12}
                        className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none text-xs leading-relaxed"
                        value={inviteBody}
                        onChange={(e) => setInviteBody(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                <div className="p-4 flex justify-end gap-3 flex-shrink-0">
                  <Button variant="text" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                  <Button variant="filled" onClick={handleSendInvite} disabled={!inviteEmail || !inviteBody || isDrafting} icon={<Send className="h-4 w-4" />}>
                    Send Invitation
                  </Button>
                </div>
             </div>
          </div>,
          document.body
        )}

        {/* EDIT HOMEOWNER MODAL */}
        {showEditHomeownerModal && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowEditHomeownerModal(false);
            }}
          >
             <div className="bg-surface dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out]">
                <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700">
                  <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                    <Edit2 className="h-5 w-5 text-primary" />
                    Edit Homeowner Information
                  </h2>
                  <button onClick={() => setShowEditHomeownerModal(false)} className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSaveHomeowner} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto bg-surface dark:bg-gray-800">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Full Name</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Email</label>
                        <input 
                          type="email" 
                          required
                          className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Phone</label>
                        <input 
                          type="tel" 
                          required
                          className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />
                      </div>
                      
                      {/* Split Address Fields */}
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Street Address</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editStreet}
                          onChange={(e) => setEditStreet(e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2 grid grid-cols-6 gap-2">
                         <div className="col-span-3">
                           <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">City</label>
                           <input type="text" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                         </div>
                         <div className="col-span-1">
                           <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">State</label>
                           <input type="text" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={editState} onChange={(e) => setEditState(e.target.value)} />
                         </div>
                         <div className="col-span-2">
                           <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Zip</label>
                           <input type="text" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={editZip} onChange={(e) => setEditZip(e.target.value)} />
                         </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Builder</label>
                        <div className="relative">
                          <select 
                            required
                            className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 pr-10 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none"
                            value={editBuilderId}
                            onChange={(e) => setEditBuilderId(e.target.value)}
                          >
                            <option value="">Select Builder...</option>
                            {builderGroups.map(bg => (
                              <option key={bg.id} value={bg.id}>{bg.name}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className="w-6 h-6 rounded-full bg-surface-container dark:bg-gray-600 flex items-center justify-center">
                              <ChevronDown className="h-3.5 w-3.5 text-surface-on-variant dark:text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                       <div>
                        <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Closing Date</label>
                        <input 
                          type="date" 
                          required
                          className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editClosingDate}
                          onChange={(e) => setEditClosingDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Job Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={editJobName}
                          onChange={(e) => setEditJobName(e.target.value)}
                        />
                      </div>
                   </div>

                   {/* Sub Sheet Uploader */}
                   <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                     <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Subcontractor List (Upload)</label>
                     <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl hover:bg-surface-container dark:hover:bg-gray-700 transition-colors ${!editSubFile ? 'border-primary/50 dark:border-primary/30 bg-primary/5 dark:bg-primary/10' : 'border-surface-outline-variant dark:border-gray-600'}`}>
                       <div className="space-y-1 text-center">
                         <Upload className="mx-auto h-8 w-8 text-surface-outline-variant dark:text-gray-500" />
                         <div className="flex text-sm text-surface-on-variant dark:text-gray-400 justify-center">
                           <label className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
                             <span>{editSubFile ? 'Change file' : 'Upload a file'}</span>
                             <input 
                               type="file" 
                               className="sr-only" 
                               accept=".csv,.xlsx,.xls,.txt"
                               onChange={handleEditSubFileChange} 
                             />
                           </label>
                           {!editSubFile && <p className="pl-1">or drag and drop</p>}
                         </div>
                         <p className="text-xs text-surface-outline-variant dark:text-gray-500">
                            {editSubFile ? editSubFile.name : 'CSV, XLS, XLSX up to 10MB'}
                         </p>
                       </div>
                     </div>
                     
                     {/* Parsed Subcontractors Table */}
                     {isParsingSubs && (
                       <div className="mt-4 p-4 bg-surface-container dark:bg-gray-700 rounded-lg text-center">
                         <p className="text-sm text-surface-on-variant dark:text-gray-400">Parsing spreadsheet...</p>
                       </div>
                     )}
                     
                     {!isParsingSubs && editParsedSubs.length > 0 && (
                       <div className="mt-4 bg-surface-container dark:bg-gray-700 rounded-xl border border-surface-outline-variant dark:border-gray-600 overflow-hidden">
                         <div className="p-3 border-b border-surface-outline-variant dark:border-gray-600 bg-surface-container-high dark:bg-gray-800">
                           <h4 className="text-sm font-semibold text-surface-on dark:text-gray-100 flex items-center gap-2">
                             <HardHat className="h-4 w-4 text-primary" />
                             Subcontractors ({editParsedSubs.length})
                           </h4>
                         </div>
                         <div className="overflow-x-auto max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                           <table className="w-full text-sm">
                             <thead className="bg-surface-container-high dark:bg-gray-800 sticky top-0">
                               <tr>
                                 {Object.keys(editParsedSubs[0] || {}).map((header, idx) => (
                                   <th 
                                     key={idx}
                                     className="px-3 py-2 text-left text-xs font-semibold text-surface-on-variant dark:text-gray-400 uppercase tracking-wider border-b border-surface-outline-variant dark:border-gray-600"
                                   >
                                     {header}
                                   </th>
                                 ))}
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
                               {editParsedSubs.map((row, rowIdx) => (
                                 <tr 
                                   key={rowIdx}
                                   className="hover:bg-surface-container-high dark:hover:bg-gray-800 transition-colors"
                                 >
                                   {Object.values(row).map((cell: any, cellIdx) => (
                                     <td 
                                       key={cellIdx}
                                       className="px-3 py-2 text-surface-on dark:text-gray-200 text-xs"
                                     >
                                       {cell || '-'}
                                     </td>
                                   ))}
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>
                     )}
                   </div>

                   <div className="p-4 flex justify-end gap-3 -mx-6 -mb-6 mt-6">
                      <Button 
                        variant="filled" 
                        onClick={() => setShowEditHomeownerModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="filled" 
                        type="submit"
                        icon={<Edit2 className="h-4 w-4" />}
                      >
                        Save Changes
                      </Button>
                      <Button 
                        variant="filled" 
                        onClick={handleSaveAndInvite}
                        disabled={isDrafting}
                        icon={isDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      >
                        Save + Invite
                      </Button>
                   </div>
                </form>
             </div>
          </div>,
          document.body
        )}

        {/* NEW MESSAGE MODAL */}
        {showNewMessageModal && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNewMessageModal(false);
            }}
          >
             <div className="bg-surface dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out]">
                <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700">
                  <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    New Message
                  </h2>
                  <button onClick={() => setShowNewMessageModal(false)} className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Recipient Display */}
                  <div className="bg-surface-container dark:bg-gray-700 p-3 rounded-xl flex items-center justify-between">
                     <div>
                       <span className="text-xs font-bold text-surface-on-variant dark:text-gray-400 uppercase">To</span>
                       <p className="font-medium text-surface-on dark:text-gray-100">
                         {isAdmin 
                           ? (effectiveHomeowner ? effectiveHomeowner.name : 'Select a Homeowner') 
                           : 'Cascade Support Team'
                         }
                       </p>
                     </div>
                     <div className="bg-surface dark:bg-gray-800 p-2 rounded-full border border-surface-outline-variant dark:border-gray-600">
                        {isAdmin ? <Home className="h-4 w-4 text-surface-outline dark:text-gray-500"/> : <Building2 className="h-4 w-4 text-surface-outline dark:text-gray-500"/>}
                     </div>
                  </div>

                  {/* Template Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400">Email Template</label>
                      <button
                        onClick={() => handleOpenMessageTemplateCreator()}
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
                            handleMessageTemplateSelect(e.target.value);
                          } else {
                            setSelectedMessageTemplateId('');
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
                              if (template) handleOpenMessageTemplateCreator(template);
                            }}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit template"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessageTemplate(selectedMessageTemplateId)}
                            className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                    {/* Template List for Management */}
                    {messageEmailTemplates.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {messageEmailTemplates.map(template => (
                          <div key={template.id} className="flex items-center justify-between p-2 bg-surface-container dark:bg-gray-700 rounded-lg">
                            <span className="text-sm text-surface-on dark:text-gray-100">{template.name}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleOpenMessageTemplateCreator(template)}
                                className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessageTemplate(template.id)}
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
                      value={newMessageSubject}
                      onChange={(e) => setNewMessageSubject(e.target.value)}
                      placeholder="e.g. Question about warranty"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Message</label>
                    <textarea 
                      rows={8}
                      className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                    />
                  </div>
                  
                  {/* Save as Template Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleOpenMessageTemplateCreator()}
                      className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 px-3 py-1.5 hover:bg-primary/5 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save as Template
                    </button>
                  </div>
                </div>

                <div className="p-4 flex justify-end gap-3">
                  <Button
                    variant="filled"
                    onClick={() => setShowNewMessageModal(false)}
                  >
                    Cancel
                  </Button>
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
        
        {/* Message Email Template Creator Modal */}
        {showMessageTemplateModal && createPortal(
          <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
            <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col animate-[scale-in_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700">
                <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">
                  {editingMessageTemplateId ? 'Edit Template' : 'Create Email Template'}
                </h2>
                <button onClick={() => {
                  setShowMessageTemplateModal(false);
                  setEditingMessageTemplateId(null);
                  setMessageTemplateName('');
                  setMessageTemplateEditSubject('');
                  setMessageTemplateEditBody('');
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
                    value={messageTemplateName}
                    onChange={e => setMessageTemplateName(e.target.value)}
                    placeholder="e.g., Standard Message"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Subject</label>
                  <input
                    type="text"
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={editingMessageTemplateId ? messageTemplateEditSubject : newMessageSubject}
                    onChange={e => editingMessageTemplateId ? setMessageTemplateEditSubject(e.target.value) : setNewMessageSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Message Body</label>
                  <textarea 
                    rows={10}
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                    value={editingMessageTemplateId ? messageTemplateEditBody : newMessageContent}
                    onChange={e => editingMessageTemplateId ? setMessageTemplateEditBody(e.target.value) : setNewMessageContent(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 flex justify-end gap-2 bg-surface-container dark:bg-gray-700">
                <Button variant="text" onClick={() => {
                  setShowMessageTemplateModal(false);
                  setEditingMessageTemplateId(null);
                  setMessageTemplateName('');
                  setMessageTemplateEditSubject('');
                  setMessageTemplateEditBody('');
                }}>Cancel</Button>
                <Button variant="filled" onClick={handleSaveMessageTemplate} disabled={!messageTemplateName.trim() || !(editingMessageTemplateId ? messageTemplateEditSubject : newMessageSubject).trim() || !(editingMessageTemplateId ? messageTemplateEditBody : newMessageContent).trim()} icon={<Save className="h-4 w-4" />}>
                  {editingMessageTemplateId ? 'Update Template' : 'Save Template'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
        </div>
      </>
    );
  }

  // 2. ADMIN/BUILDER PLACEHOLDER VIEW (When no homeowner is selected)
  if ((isAdmin || isBuilder) && !targetHomeowner) {
    return (
      <>
        {renderModals()}
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-surface-container-high dark:bg-gray-700 p-6 rounded-full">
                <Search className="h-12 w-12 text-surface-outline dark:text-gray-400" />
            </div>
            <div>
                <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">Select a Homeowner</h2>
                <p className="text-surface-on-variant dark:text-gray-400 mt-2 max-w-sm mx-auto">
                    Search for a homeowner in the top bar to view their warranty claims, tasks, and account details.
                </p>
                {isBuilder && (
                   <p className="text-surface-on-variant dark:text-gray-400 mt-1 text-xs">
                     You are logged in as a Builder. Access is limited to your homeowners.
                   </p>
                )}
            </div>
        </div>
      </>
    );
  }

  // 3. HOMEOWNER VIEW WITHOUT SELECTED HOMEOWNER (Admin/Builder switched to homeowner view without selection)
  // Show prompt to select a homeowner
  if (userRole === UserRole.HOMEOWNER && isAdminAccount && !targetHomeowner && (!activeHomeowner || activeHomeowner.id === 'placeholder')) {
    return (
      <>
        {renderModals()}
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-surface-container-high dark:bg-gray-700 p-6 rounded-full">
            <Search className="h-12 w-12 text-surface-outline dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">Select a Homeowner</h2>
            <p className="text-surface-on-variant dark:text-gray-400 mt-2 max-w-sm mx-auto">
              Please select a homeowner from the search bar above before switching to homeowner view.
            </p>
          </div>
        </div>
      </>
    );
  }

  // 4. FALLBACK - Should not reach here if logic is correct
  // This handles any edge cases where we don't have a homeowner selected
  return (
    <>
      {renderModals()}
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-surface-container-high dark:bg-gray-700 p-6 rounded-full">
          <Search className="h-12 w-12 text-surface-outline dark:text-gray-400" />
        </div>
        <div>
          <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">Select a Homeowner</h2>
          <p className="text-surface-on-variant dark:text-gray-400 mt-2 max-w-sm mx-auto">
            Search for a homeowner in the top bar to view their warranty claims, tasks, and account details.
          </p>
        </div>
      </div>

    </>
  );
};

export default Dashboard;
