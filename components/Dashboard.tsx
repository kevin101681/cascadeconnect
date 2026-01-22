
import React, { useState, useEffect, useRef, forwardRef, Suspense, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { UserButton, SignOutButton, useUser } from '@clerk/clerk-react';
// Lazy load heavy libraries - only load when needed
// import Papa from 'papaparse';
// import * as XLSX from 'xlsx';
import { motion, AnimatePresence, type Transition, type Variants } from 'framer-motion';
import { Claim, ClaimStatus, UserRole, Homeowner, InternalEmployee, HomeownerDocument, MessageThread, Message, BuilderGroup, BuilderUser, Task, Contractor, Call } from '../types';
import { ClaimMessage, TaskMessage } from './MessageSummaryModal';
import StatusBadge from './StatusBadge';
import { ArrowLeft, ArrowRight, Calendar, Plus, ClipboardList, Mail, X, Send, Building2, MapPin, Phone, Clock, FileText, Download, Upload, Search, Home, MoreVertical, Paperclip, Edit2, Archive, CheckSquare, Reply, Trash2, ChevronLeft, ChevronRight, CornerUpLeft, Lock as LockIcon, Loader2, Eye, ChevronDown, ChevronUp, HardHat, Info, Printer, Share2, Filter, FileSpreadsheet, FileEdit, Save, CheckCircle, Play, StickyNote, BookOpen, DollarSign, Check, User, Receipt, MessageCircle, HelpCircle, CheckCheck, LogOut } from 'lucide-react';
import { useTaskStore } from '../stores/useTaskStore';
import { useModalStore } from '../hooks/use-modal-store';
import { calls, claims as claimsSchema } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { db, isDbConfigured } from '../db';
import Button from './Button';
import MaterialSelect from './MaterialSelect';
import { DropdownButton } from './ui/dropdown-button';
import { draftInviteEmail, detectClaimIntent } from '../services/geminiService';
import { sendEmail, generateNotificationBody } from '../services/emailService';
import TaskList from './TaskList';
import TaskDetail from './TaskDetail';
import TasksSheet from './TasksSheet';
import HomeownerDashboardMobile from './HomeownerDashboardMobile';
import { StaggerContainer, FadeIn, AnimatedTabContent } from './motion/MotionWrapper';
import { SmoothHeightWrapper } from './motion/SmoothHeightWrapper';
import { SIDEBAR_CONTENT_PADDING_LEFT } from '../constants/layout';

// Lazy-load heavy dashboard tabs / tools so they don't ship in the initial bundle.
const AIIntakeDashboard = React.lazy(() => import('./AIIntakeDashboard'));
const HomeownerManual = React.lazy(() => import('./HomeownerManual'));
const ScheduleTab = React.lazy(() => import('./ScheduleTab'));
const HomeownerWarrantyGuide = React.lazy(() =>
  import('./HomeownerWarrantyGuide').then((m) => ({ default: m.HomeownerWarrantyGuide }))
);

// Import CBS Books Page (new split-view design - no ghost headers)
const CBSBooksPageWrapper = React.lazy(() => import('./pages/CBSBooksPageWrapper'));
// Lazy load heavy components to improve initial load time
// Add error handling for failed dynamic imports
const PdfFlipViewer3D = React.lazy(() => import('./PdfFlipViewer3D').catch(err => {
  console.error('Failed to load PdfFlipViewer3D:', err);
  // Return a fallback component
  return { default: () => <div className="p-4 text-red-500">Failed to load PDF viewer. Please refresh the page.</div> };
}));

// Lazy-load react-pageflip (heavy) so it doesn't ship on initial dashboard load.
const HTMLFlipBook = React.lazy(() => import('react-pageflip'));

// Import TeamChat component for full-screen chat interface
import TeamChat from './TeamChat';

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

// REMOVED: Floating Chat Widget - Now in App.tsx at root level
// const FloatingChatWidget = React.lazy(() => import('./chat/ChatWidget').then(m => ({ default: m.ChatWidget })));

import { HOMEOWNER_MANUAL_IMAGES } from '../lib/bluetag/constants';
import { WarrantyCard } from './ui/WarrantyCard';
import { HomeownerCard } from './ui/HomeownerCard';
import { TaskCard } from './ui/TaskCard';
import { MessageCard } from './ui/MessageCard';
import { TaskCreationCard } from './TaskCreationCard';

// ============================================================================
// MEMOIZED LIST COMPONENTS (Defined at top level to avoid hooks issues)
// ============================================================================

// Memoized Claims List Component - Prevents re-render flash on selection
const ClaimsListColumn = React.memo<{
  claims: Claim[];
  filteredClaims: Claim[];
  isHomeownerView: boolean;
  emptyMsg: string;
  isCreatingNewClaim: boolean;
  claimMessages: ClaimMessage[];
  selectedClaimId: string | null;
  selectedClaimIds: string[]; // Multi-select state
  onClaimSelect: (claim: Claim) => void;
  onDeleteClaim: (claimId: string) => void;
  onToggleClaimSelection: (claimId: string) => void; // Toggle checkbox
}>(({ filteredClaims, emptyMsg, isCreatingNewClaim, claimMessages, selectedClaimId, selectedClaimIds, isHomeownerView, onClaimSelect, onDeleteClaim, onToggleClaimSelection }) => {
  return (
    <div 
      className="flex-1 overflow-y-auto px-2 py-4 md:p-4 min-h-0"
      style={{ 
        WebkitOverflowScrolling: 'touch', 
        touchAction: 'pan-y',
        maskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)'
      } as React.CSSProperties}
    >
      {filteredClaims.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant dark:text-gray-400 gap-2">
          <ClipboardList className="h-8 w-8 opacity-20 dark:opacity-40 text-surface-on dark:text-gray-400" />
          <span className="text-sm">{emptyMsg}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {/* Temporary "New Claim" card when creating */}
          {isCreatingNewClaim && (
            <div className="relative">
              <div className="w-full">
                <WarrantyCard
                  title="New Claim (Unsaved)"
                  classification="60 Day"
                  createdDate="Just now"
                  attachmentCount={0}
                  isReviewed={false}
                  isClosed={false}
                  isSelected={true}
                />
              </div>
            </div>
          )}
          
          {filteredClaims.map((claim) => {
            const scheduledDate = claim.proposedDates?.find(d => d.status === 'ACCEPTED');
            const isCompleted = claim.status === ClaimStatus.COMPLETED;
            const serviceOrderMessages = claimMessages
              .filter(m => m.claimId === claim.id && 
                           m.type === 'SUBCONTRACTOR' && 
                           m.subject?.toLowerCase().includes('service order'))
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const serviceOrderDate = serviceOrderMessages.length > 0 ? serviceOrderMessages[0]?.timestamp : null;
            const isReviewed = claim.reviewed || false;
            const isSelected = selectedClaimId === claim.id;
            const isChecked = selectedClaimIds.includes(claim.id);
            
            return (
              <div key={claim.id} className="relative">
                <button
                  type="button"
                  onClick={() => onClaimSelect(claim)}
                  className="w-full text-left cursor-pointer [-webkit-tap-highlight-color:transparent]"
                >
                  <WarrantyCard
                    title={claim.title}
                    classification={claim.classification}
                    createdDate={claim.dateSubmitted ? new Date(claim.dateSubmitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
                    scheduledDate={scheduledDate?.date ? new Date(scheduledDate.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
                    soSentDate={serviceOrderDate ? new Date(serviceOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
                    subName={claim.contractorName}
                    attachmentCount={claim.attachments?.length || 0}
                    isReviewed={isReviewed}
                    isClosed={claim.status === ClaimStatus.CLOSED}
                    isSelected={isSelected}
                    isChecked={isChecked}
                    isHomeownerView={isHomeownerView}
                    onCheckboxChange={(checked) => onToggleClaimSelection(claim.id)}
                    onDelete={() => {
                      if (confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
                        onDeleteClaim(claim.id);
                      }
                    }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
ClaimsListColumn.displayName = 'ClaimsListColumn';

// Memoized Tasks List Component - Prevents re-render flash on selection
const TasksListColumn = React.memo<{
  tasks: Task[];
  employees: InternalEmployee[];
  claims: Claim[];
  selectedTaskId: string | null;
  onTaskSelect: (task: Task) => void;
}>(({ tasks, employees, claims, selectedTaskId, onTaskSelect }) => {
  return (
    <div
      className="flex-1 overflow-y-auto p-4 min-h-0 md:h-auto h-[calc(100vh-220px)]"
      style={{ 
        WebkitOverflowScrolling: 'touch',
        maskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)'
      }}
    >
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant dark:text-gray-400 gap-2">
          <CheckSquare className="h-8 w-8 opacity-20 dark:opacity-40 text-surface-on dark:text-gray-400" />
          <span className="text-sm">No tasks found.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {tasks.map((task) => {
            const assignee = employees.find(e => e.id === task.assignedToId);
            const taskClaims = task.relatedClaimIds 
              ? claims.filter(c => task.relatedClaimIds?.includes(c.id))
              : [];
            
            return (
              <TaskCard
                key={task.id}
                title={task.title || 'Untitled Task'}
                assignedTo={assignee?.name}
                subsToScheduleCount={taskClaims.length}
                dateAssigned={task.dateAssigned ? new Date(task.dateAssigned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                isCompleted={task.isCompleted ?? false}
                isSelected={selectedTaskId === task.id}
                onClick={() => onTaskSelect(task)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});
TasksListColumn.displayName = 'TasksListColumn';

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
        background: '#fff',
        overflow: 'hidden',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
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
      <Suspense
        fallback={
          <div className="p-4 text-sm text-surface-on-variant dark:text-gray-400">
            Loading flipbook…
          </div>
        }
      >
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
      </Suspense>
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
  
  // Search Props for Homeowner Search Bar
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchResults?: Homeowner[];
  onSelectHomeowner?: (homeowner: Homeowner) => void;
  onViewAsHomeowner?: (homeowner: Homeowner) => void;
  
  // Documents
  documents: HomeownerDocument[];
  onUploadDocument: (doc: Partial<HomeownerDocument>) => void;
  onDeleteDocument?: (docId: string) => void;

  // Messaging
  messages: MessageThread[];
  onSendMessage: (threadId: string, content: string) => void;
  onCreateThread: (homeownerId: string, subject: string, content: string) => void;
  
  // Builder Users (for dropdown selections)
  builderUsers?: BuilderUser[];
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
  taskMessages?: TaskMessage[];
  onTrackTaskMessage?: (taskId: string, messageData: {
    type: 'EMPLOYEE';
    threadId?: string;
    subject: string;
    recipient: string;
    recipientEmail: string;
    content: string;
    senderName: string;
  }) => void;
  onSendTaskMessage?: (task: Task) => void;

  // Builder Groups for Dropdown
  builderGroups?: BuilderGroup[];
  
  // Additional props for filtering
  currentBuilderId?: string | null; // Builder group ID for builder users
  currentUserEmail?: string; // Current user's email for contractor matching

  // Initial State Control (Optional)
  initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS' | 'CALLS' | 'INVOICES' | 'SCHEDULE';
  initialThreadId?: string | null;

  // Tasks Widget Support
  tasks?: Task[];
  onAddTask: (task: Partial<Task>) => Promise<void> | void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onNavigate?: (view: 'DASHBOARD' | 'TEAM' | 'DATA' | 'TASKS' | 'INVOICES' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND' | 'CALLS') => void;

  // Internal Users Management (for Settings Tab)
  onAddEmployee?: (emp: InternalEmployee) => void;
  onUpdateEmployee?: (emp: InternalEmployee) => void;
  onDeleteEmployee?: (id: string) => void;
  onAddContractor?: (contractor: Contractor) => void;
  onUpdateContractor?: (contractor: Contractor) => void;
  onDeleteContractor?: (id: string) => void;
  onAddBuilderUser?: (user: BuilderUser, password?: string) => void;
  onUpdateBuilderUser?: (user: BuilderUser, password?: string) => void;
  onDeleteBuilderUser?: (id: string) => void;
  onDeleteHomeowner?: (id: string) => void;
  onDataReset?: () => void;
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
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectHomeowner,
  onViewAsHomeowner,
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
  taskMessages = [],
  onTrackTaskMessage,
  onSendTaskMessage,
  builderGroups = [],
  builderUsers = [],
  currentBuilderId = null,
  currentUserEmail,
  initialTab = 'CLAIMS',
  initialThreadId = null,
  tasks = [],
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onNavigate,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddContractor,
  onUpdateContractor,
  onDeleteContractor,
  onAddBuilderUser,
  onUpdateBuilderUser,
  onDeleteBuilderUser,
  onDeleteHomeowner,
  onDataReset
}) => {
  const isAdmin = userRole === UserRole.ADMIN;
  const isBuilder = userRole === UserRole.BUILDER;
  
  // Get the authenticated Clerk user's role from metadata
  // This persists even when viewing as homeowner (impersonation)
  const { user: clerkUser } = useUser();
  const clerkUserRole = clerkUser?.publicMetadata?.role as string | undefined;
  const isAdminAccount = clerkUserRole === 'admin' || clerkUserRole === 'ADMIN' || clerkUserRole === 'Administrator';
  
  // ✅ CRITICAL FIX: Normalize activeHomeowner ID to prevent "placeholder" UUID crash
  // If activeHomeowner.id is "placeholder", undefined, or too short, use undefined instead
  const safeActiveHomeownerId = useMemo(() => {
    const id = activeHomeowner?.id;
    if (!id || id === 'placeholder' || id.length < 30) {
      return undefined;
    }
    return id;
  }, [activeHomeowner?.id]);
  
  const currentBuilderGroupName = useMemo(() => {
    if (!isBuilder || !currentBuilderId) return null;
    const groupName = builderGroups.find(bg => bg.id === currentBuilderId)?.name;
    const normalized = groupName?.trim().toLowerCase() || null;
    return normalized && normalized.length > 0 ? normalized : null;
  }, [isBuilder, currentBuilderId, builderGroups]);

  const builderGroupUserIds = useMemo(() => {
    if (!isBuilder || !currentBuilderId) return new Set<string>();
    return new Set(
      builderUsers
        .filter(bu => bu.builderGroupId === currentBuilderId)
        .map(bu => bu.id)
    );
  }, [isBuilder, currentBuilderId, builderUsers]);

  const builderAccessibleHomeownerIds = useMemo(() => {
    if (!isBuilder || !currentBuilderId) return new Set<string>();
    return new Set(
      homeowners
        .filter(h => {
          const builderIdMatch = h.builderId === currentBuilderId;
          const builderUserMatch = h.builderUserId ? builderGroupUserIds.has(h.builderUserId) : false;
          const builderNameMatch = currentBuilderGroupName
            ? (h.builder || '').trim().toLowerCase() === currentBuilderGroupName
            : false;
          return builderIdMatch || builderUserMatch || builderNameMatch;
        })
        .map(h => h.id)
    );
  }, [isBuilder, currentBuilderId, homeowners, builderGroupUserIds, currentBuilderGroupName]);
  
  // PDF Viewer state
  const [selectedDocument, setSelectedDocument] = useState<HomeownerDocument | null>(null);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);

  // Modal store for notes
  const { onOpen: openModal } = useModalStore();

  // REMOVED: Team Chat widget state - Now managed in App.tsx
  // const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false);
  
  // Manual page viewer state
  const [manualPageDimensions, setManualPageDimensions] = useState({ width: 800, height: 1200 });
  const manualFlipBookRef = useRef<any>(null);
  
  // Description expand popup state
  const [expandedDescription, setExpandedDescription] = useState<Claim | null>(null);
  
  // Track if this is the initial load period and user interactions
  const initialLoadRef = useRef(true);
  const mountTimeRef = useRef(Date.now());
  const userInteractionRef = useRef(false);
  
  // Track user interactions (clicks, touches) to distinguish user-initiated vs auto-opens
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return; // Only track on mobile
    
    const handleUserInteraction = () => {
      userInteractionRef.current = true;
      console.log('👆 User interaction detected on mobile');
    };
    
    // Listen for any user interaction
    window.addEventListener('click', handleUserInteraction, { capture: true, once: false });
    window.addEventListener('touchstart', handleUserInteraction, { capture: true, once: false });
    
    return () => {
      window.removeEventListener('click', handleUserInteraction, { capture: true });
      window.removeEventListener('touchstart', handleUserInteraction, { capture: true });
    };
  }, []);
  
  // URL-based navigation: Read view from URL search params
  const [searchParams, setSearchParams] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });
  
  // Helper to update URL search params
  const updateSearchParams = useCallback((updates: Record<string, string | null>) => {
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const newParams = new URLSearchParams(window.location.search);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    
    const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
    // Avoid creating duplicate history entries (this breaks Back navigation on mobile by "refreshing"
    // the same list view instead of returning to the dashboard).
    if (newUrl === currentUrl) {
      // Still sync local state so dependent memos update predictably.
      setSearchParams(newParams);
      return;
    }
    window.history.pushState({}, '', newUrl);
    setSearchParams(newParams);
  }, []);
  
  // Listen to popstate (back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      setSearchParams(new URLSearchParams(window.location.search));
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Deep-link bootstrap:
  // If the app is loaded directly into a tab view (e.g. `?view=claims`), the browser's Back button
  // would otherwise exit the browser/app (no prior in-app history entry). To ensure Back from the
  // list returns to the dashboard, we insert a synthetic base (dashboard) history entry once.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const hasDeepLink =
        Boolean(params.get('view')) ||
        Boolean(params.get('claimId')) ||
        Boolean(params.get('taskId'));

      if (!hasDeepLink) return;

      // Only do this when there is effectively no "back stack" for this tab.
      // On Android/Chrome (and PWAs), this is the case that causes Back to exit the app.
      if (window.history.length > 1) return;

      // Build the "dashboard" URL by stripping tab/detail params.
      const baseParams = new URLSearchParams(window.location.search);
      baseParams.delete('view');
      baseParams.delete('claimId');
      baseParams.delete('taskId');

      const baseUrl = `${window.location.pathname}${baseParams.toString() ? `?${baseParams.toString()}` : ''}`;
      const fullUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;

      // Replace current entry with dashboard, then push the deep-linked view.
      window.history.replaceState({ __ccDeepLinkBootstrapped: true, __ccBase: true }, '', baseUrl);
      window.history.pushState({ __ccDeepLinkBootstrapped: true, __ccView: true }, '', fullUrl);

      // Sync local state to the deep-linked view (no popstate event for pushState).
      setSearchParams(params);
    } catch (e) {
      console.warn('Deep-link history bootstrap failed:', e);
    }
  }, []);
  
  // View State for Dashboard - derived from URL
  type TabType = 'CLAIMS' | 'MESSAGES' | 'TASKS' | 'CALLS' | 'DOCUMENTS' | 'MANUAL' | 'HELP' | 'INVOICES' | 'SCHEDULE' | 'PUNCHLIST' | 'CHAT' | null;

  const currentTab = useMemo<TabType>(() => {
    const view = searchParams.get('view');
    console.log("🔍 Current tab from URL:", view, "| userRole:", userRole, "| isAdmin:", isAdmin);
    if (!view) return null;

    const validTabs: TabType[] = ['CLAIMS', 'MESSAGES', 'TASKS', 'CALLS', 'DOCUMENTS', 'MANUAL', 'HELP', 'INVOICES', 'SCHEDULE', 'PUNCHLIST', 'CHAT'];
    const upperView = view.toUpperCase() as TabType;

    console.log("🔍 Uppercase view:", upperView, "| Valid?", validTabs.includes(upperView));
    return validTabs.includes(upperView) ? upperView : null;
  }, [searchParams, userRole, isAdmin]);
  
  const previousTabRef = useRef<TabType>(null);
  
  // Mobile detection state for new dashboard
  const [isMobileView, setIsMobileView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  
  // Set up responsive listener for mobile dashboard
  useEffect(() => {
    const checkMobile = () => {
      const nextIsMobile = window.innerWidth < 768;
      setIsMobileView((prev) => (prev === nextIsMobile ? prev : nextIsMobile));
    };
    
    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Responsive initialization: Open Claims tab automatically on desktop, keep closed on mobile
  useEffect(() => {
    // Only open automatically if we are on a large screen (desktop) and no view is set
    if (typeof window !== 'undefined' && window.innerWidth >= 1024 && !searchParams.get('view')) {
      updateSearchParams({ view: 'claims' });
      previousTabRef.current = 'CLAIMS';
    }
  }, []); // Run only once on mount
  
  // Auto-open "New Claim" modal when URL contains ?new=true
  useEffect(() => {
    const newParam = searchParams.get('new');
    const view = searchParams.get('view');
    
    // If navigating to claims tab with new=true, open the new claim form
    // Remove the currentTab check to avoid race condition - view parameter is sufficient
    if (view === 'claims' && newParam === 'true') {
      console.log('🔗 Auto-opening new claim form from URL parameter');
      setIsCreatingNewClaim(true);
      
      // Clean up URL to prevent re-opening on refresh
      // Use a small delay to ensure the tab has fully rendered
      setTimeout(() => {
        updateSearchParams({ new: null });
      }, 100);
    }
  }, [searchParams, updateSearchParams]);
  
  // Debug: Log when currentTab changes
  useEffect(() => {
    console.log('📍 Current tab state changed to:', currentTab);
  }, [currentTab]);
  
  // Helper function to set current tab via URL
  const setCurrentTab = useCallback((tab: TabType) => {
    if (tab === null) {
      // Close all tabs - clear view param
      updateSearchParams({ view: null, taskId: null, claimId: null });
    } else {
      // Open tab - set view param
      updateSearchParams({ view: tab.toLowerCase() });
    }
  }, [updateSearchParams]);
  
  // Get selected task/claim IDs from URL
  const selectedTaskIdFromUrl = searchParams.get('taskId');
  const selectedClaimIdFromUrl = searchParams.get('claimId');
  
  // Find selected task/claim from URL params
  const selectedTaskForModal = useMemo(() => {
    if (!selectedTaskIdFromUrl) return null;
    return tasks.find(t => t.id === selectedTaskIdFromUrl) || null;
  }, [selectedTaskIdFromUrl, tasks]);
  
  const selectedClaimForModalFromUrl = useMemo(() => {
    if (!selectedClaimIdFromUrl) return null;
    return claims.find(c => c.id === selectedClaimIdFromUrl) || null;
  }, [selectedClaimIdFromUrl, claims]);
  
  // Helper to set selected task
  const setSelectedTaskForModal = useCallback((task: Task | null) => {
    if (task === null) {
      updateSearchParams({ taskId: null });
    } else {
      updateSearchParams({ view: 'tasks', taskId: task.id });
    }
  }, [updateSearchParams]);
  
  // Helper to set selected claim
  const setSelectedClaimForModal = useCallback((claim: Claim | null) => {
    if (claim === null) {
      updateSearchParams({ claimId: null });
    } else {
      updateSearchParams({ view: 'claims', claimId: claim.id });
    }
  }, [updateSearchParams]);
  
  // Derive selectedClaimForModal from URL (used throughout the component)
  const selectedClaimForModal = selectedClaimForModalFromUrl;

  // If a portal-backed modal is open, hide legacy background UI so nothing "ghosts" behind the overlay
  const isPortalModalOpen = Boolean(
    (selectedTaskForModal && currentTab !== 'TASKS') ||
    (selectedClaimForModal && currentTab !== 'CLAIMS') ||
    currentTab === 'PUNCHLIST' ||
    currentTab === 'CHAT' ||
    (selectedDocument && isPDFViewerOpen)
  );

  // If `?view=` is being used for a modal route (e.g. `?view=claim`), hide the legacy dashboard underlay entirely.
  // Note: `currentTab` only recognizes plural tab keys (claims/tasks/messages/etc). Singular modal routes would otherwise
  // leave the tab UI visible behind the modal.
  const viewParam = (searchParams.get('view') || '').toLowerCase();
  const validTabViews = new Set([
    'claims',
    'messages',
    'tasks',
    'notes',
    'calls',
    'documents',
    'manual',
    'help',
    'invoices',
    'schedule',
    'chat',
    'punchlist',
  ]);
  const isLegacyModalView = Boolean(viewParam && !validTabViews.has(viewParam));
  const shouldHideDashboardUnderlay = isPortalModalOpen || isLegacyModalView;
  
  // Debug: Log whenever selectedClaimForModal changes
  // NOTE: This useEffect is for debugging ONLY. It does NOT interfere with browser history.
  // The modal state is STRICTLY controlled by the URL search params.
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (selectedClaimForModal) {
      console.log('📋 selectedClaimForModal state changed (Dashboard)', {
        claimId: selectedClaimForModal.id,
        claimTitle: selectedClaimForModal.title,
        isMobile,
        currentTab,
        timeSinceMount: Date.now() - mountTimeRef.current,
        willShowMobileOverlay: isMobile && currentTab === 'CLAIMS',
        hasUserInteraction: userInteractionRef.current,
        isInitialLoad: initialLoadRef.current
      });
    } else {
      console.log('📋 selectedClaimForModal cleared (Dashboard)');
    }
  }, [selectedClaimForModal, currentTab]);
  
  // Header scroll sync refs
  
  // Prevent body scroll when modal is open (mobile only - desktop uses split-screen)
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if ((selectedClaimForModal || selectedTaskForModal) && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedClaimForModal, selectedTaskForModal]);
  
  // Desktop: clear selections when leaving their split views to avoid fallback modals.
  // Mobile back-navigation is handled purely via URL params (`view`, `claimId`, `taskId`) and the
  // global popstate listener above.
  useEffect(() => {
    const previousTab = previousTabRef.current;
    const isMobile = window.innerWidth < 768;
    const isDesktop = !isMobile;
    
    // Desktop: clear selections when leaving their split views to avoid fallback modals.
    if (
      isDesktop &&
      previousTab === 'CLAIMS' &&
      currentTab &&
      currentTab !== 'CLAIMS' &&
      selectedClaimForModal
    ) {
      setSelectedClaimForModal(null);
    }
    if (
      isDesktop &&
      previousTab === 'TASKS' &&
      currentTab &&
      currentTab !== 'TASKS' &&
      selectedTaskForModal
    ) {
      setSelectedTaskForModal(null);
    }
    if (
      isDesktop &&
      previousTab === 'MESSAGES' &&
      currentTab &&
      currentTab !== 'MESSAGES' &&
      selectedThreadId
    ) {
      setSelectedThreadId(null);
    }
    
    // Update previous tab ref
    previousTabRef.current = currentTab;
  }, [currentTab, selectedClaimForModal, setSelectedClaimForModal]);
  
  // Prevent body scroll when mobile tab modal is open
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (currentTab && isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [currentTab]);
  
  // Invoices Modal State - use prop from parent if provided, otherwise use local state
  
  // Handler to open invoices modal
  
  // Note: Removed initialTab effect - tabs only open when user clicks them
  
  // Ref for tabs container  
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  
  // Swipe gesture state for desktop swipe navigation
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState<number>(0); // 0 to 1, represents swipe completion
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [targetTab, setTargetTab] = useState<TabType>(null);

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  // Get available tabs in order
  const getAvailableTabs = (): Array<Exclude<TabType, null>> => {
    const isHomeownerViewRole = userRole === UserRole.HOMEOWNER;
    const isEmployee = currentUser?.role === 'Employee';
    const tabs: Array<Exclude<TabType, null>> = ['CLAIMS']; // Warranty
    tabs.push('MESSAGES');
    if (isAdmin && !isHomeownerViewRole) {
      tabs.push('TASKS');
    }
    // Homeowner tabs - only show for homeowners
    if (isHomeownerViewRole) {
      tabs.push('DOCUMENTS'); // DOCUMENTS tab for homeowners
      tabs.push('MANUAL'); // Homeowner Manual tab
      tabs.push('SCHEDULE'); // SCHEDULE tab for homeowners (their own only)
      tabs.push('HELP'); // Help/Guide tab for homeowners
    }
    if (isAdmin && !isHomeownerViewRole) {
      tabs.push('CALLS'); // CALLS tab (admin only)
      tabs.push('SCHEDULE'); // SCHEDULE tab (admin only)
      // Only show Invoices for Administrator role, not Employee role
      if (!isEmployee) {
        tabs.push('INVOICES'); // INVOICES tab (administrator only)
      }
    }
    // DOCUMENTS tab for homeowners is now in the tabs, but for admin it's still a button in homeowner info card
    return tabs;
  };

  const availableTabs = useMemo(() => getAvailableTabs(), [userRole, isAdmin, currentUser?.role]);
  
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
  
  // Multi-select claims state
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  
  // Tasks filter state
  const [tasksFilter, setTasksFilter] = useState<'all' | 'open' | 'closed'>('open');
  
  // CRITICAL: All useMemo hooks MUST be at top level, not inside render functions
  // Memoize filtered claims to prevent recalculation
  const filteredClaimsForModal = useMemo(() => {
    if (claimsFilter === 'Open') {
      return claims.filter(c => c.status !== ClaimStatus.COMPLETED);
    } else if (claimsFilter === 'Closed') {
      return claims.filter(c => c.status === ClaimStatus.COMPLETED);
    }
    return claims;
  }, [claims, claimsFilter]);
  
  // Memoize user tasks to prevent recalculation
  const userTasks = useMemo(() => 
    tasks.filter(t => t.assignedToId === currentUser.id),
    [tasks, currentUser.id]
  );
  
  // Memoize filtered tasks to prevent recalculation
  const filteredTasksForModal = useMemo(() => {
    if (tasksFilter === 'open') {
      return userTasks.filter(t => !t.isCompleted);
    } else if (tasksFilter === 'closed') {
      return userTasks.filter(t => t.isCompleted);
    }
    return userTasks;
  }, [userTasks, tasksFilter]);
  
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
  const [isComposingMessage, setIsComposingMessage] = useState(false);
  // Removed showCallsModal - now navigates to /calls page with search filter
  const [newMessageSubject, setNewMessageSubject] = useState('');

  // Handle browser back button for nested modals that are NOT URL-driven.
  // Claims/Tasks use `?claimId` / `?taskId` in the URL, so Back should be handled by normal
  // popstate + searchParams syncing. Messages threads are local-state only, so we push a nested
  // history entry to allow: thread -> back -> list -> back -> dashboard.
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const hasNestedModal = Boolean(selectedThreadId);
    
    if (hasNestedModal && isMobile) {
      // Push a history state when modal opens
      window.history.pushState({ nestedModal: true }, '');

      const handlePopState = (e: PopStateEvent) => {
        // Close the appropriate modal when back button is pressed
        if (selectedThreadId) setSelectedThreadId(null);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [selectedThreadId]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [newMessageRecipientId, setNewMessageRecipientId] = useState<string>('');
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
  const [showClaimSuggestionModal, setShowClaimSuggestionModal] = useState(false);
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

  // Delete claim
  const handleDeleteClaim = async (claimId: string) => {
    try {
      if (!isDbConfigured) {
        console.warn('Database not configured');
        return;
      }

      // Delete from database
      await db.delete(claimsSchema).where(eq(claimsSchema.id, claimId));
      
      // If the deleted claim was selected, clear the selection
      if (selectedClaimForModal?.id === claimId) {
        setSelectedClaimForModal(null);
      }
      
      // Remove from multi-select if it was checked
      setSelectedClaimIds(prev => prev.filter(id => id !== claimId));
      
      // Refresh claims list by triggering a re-render
      // The parent component will re-fetch claims data
      console.log('Claim deleted successfully');
    } catch (error) {
      console.error('Failed to delete claim:', error);
      alert('Failed to delete claim. Please try again.');
    }
  };
  
  // Toggle claim selection for multi-select
  const handleToggleClaimSelection = (claimId: string) => {
    setSelectedClaimIds(prev => {
      if (prev.includes(claimId)) {
        return prev.filter(id => id !== claimId);
      } else {
        return [...prev, claimId];
      }
    });
  };
  
  // Bulk delete selected claims
  const handleBulkDeleteClaims = async () => {
    if (selectedClaimIds.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedClaimIds.length} claim${selectedClaimIds.length > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;
    
    try {
      if (!isDbConfigured) {
        console.warn('Database not configured');
        return;
      }

      // Delete all selected claims
      for (const claimId of selectedClaimIds) {
        await db.delete(claimsSchema).where(eq(claimsSchema.id, claimId));
      }
      
      // Clear selection
      setSelectedClaimIds([]);
      
      // If any deleted claim was the selected one, clear it
      if (selectedClaimForModal && selectedClaimIds.includes(selectedClaimForModal.id)) {
        setSelectedClaimForModal(null);
      }
      
      console.log(`${selectedClaimIds.length} claims deleted successfully`);
    } catch (error) {
      console.error('Failed to delete claims:', error);
      alert('Failed to delete claims. Please try again.');
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

  // New Claim Modal State (legacy - now using inline view)
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  
  // New Claim Inline Creation State
  const [isCreatingNewClaim, setIsCreatingNewClaim] = useState(false);
  
  // Unsaved changes confirmation dialog state
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingClaimSelection, setPendingClaimSelection] = useState<Claim | null>(null);

  // Handler for claim selection with unsaved changes warning
  const handleClaimSelection = useCallback((claim: Claim) => {
    if (isCreatingNewClaim) {
      // Show custom confirmation dialog instead of browser confirm
      setPendingClaimSelection(claim);
      setShowUnsavedWarning(true);
      return;
    }
    // Navigate to the selected claim
    setSelectedClaimForModal(claim);
  }, [isCreatingNewClaim, setSelectedClaimForModal]);

  // Handle confirmation dialog actions
  const handleConfirmNavigation = useCallback(() => {
    setShowUnsavedWarning(false);
    setIsCreatingNewClaim(false);
    if (pendingClaimSelection) {
      setSelectedClaimForModal(pendingClaimSelection);
      setPendingClaimSelection(null);
    }
  }, [pendingClaimSelection, setSelectedClaimForModal]);

  const handleCancelNavigation = useCallback(() => {
    setShowUnsavedWarning(false);
    setPendingClaimSelection(null);
  }, []);

  // New Task Modal State
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUser.id);
  const [newTaskNotes, setNewTaskNotes] = useState('');

  // Modal states
  const [showManualModal, setShowManualModal] = useState(false);

  // Debug: Log modal state changes
  useEffect(() => {
    console.log('showNewClaimModal changed to:', showNewClaimModal);
  }, [showNewClaimModal]);

  useEffect(() => {
    console.log('showNewTaskModal changed to:', showNewTaskModal);
  }, [showNewTaskModal]);

  // Lock body scroll when any modal is open (without layout shifts)
  useEffect(() => {
    const isAnyModalOpen = showNewTaskModal || showNewMessageModal || showNewClaimModal ||
                          showDocsModal || showInviteModal || showEditHomeownerModal ||
                          showSubListModal || (currentTab === 'PUNCHLIST') || (currentTab === 'CHAT') || isPDFViewerOpen;

    if (isAnyModalOpen) {
      // Use overflow hidden only to prevent scrolling without layout shifts
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        // Restore original overflow values
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [showNewTaskModal, showNewMessageModal, showNewClaimModal, showDocsModal,
      showInviteModal, showEditHomeownerModal, showSubListModal, currentTab, isPDFViewerOpen]);

  // Note: Do NOT sync initialTab - tabs should only open when user clicks them
  // The initialTab prop is only used for the default value in old code paths

  // Center the active tab over its card on mobile
  useEffect(() => {
    if (!tabsContainerRef.current || window.innerWidth >= 768) return; // Only on mobile
    const tabsContainer = tabsContainerRef.current;
    const activeTabButton = tabsContainer.querySelector(`button[data-tab="${currentTab}"]`) as HTMLElement;
    if (activeTabButton) {
      const containerRect = tabsContainer.getBoundingClientRect();
      const buttonRect = activeTabButton.getBoundingClientRect();
      const scrollLeft = tabsContainer.scrollLeft;
      const buttonCenter = scrollLeft + buttonRect.left - containerRect.left + buttonRect.width / 2;
      const containerCenter = containerRect.width / 2;
      const targetScroll = scrollLeft + (buttonCenter - containerCenter);
      
      tabsContainer.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [currentTab]);

  // Calculate container width for homeowner info card
  // Use refs to measure the actual homeowner info card container width
  const homeownerCardContainerRef = useRef<HTMLDivElement>(null);
  
  // Prevent page scroll when switching to Manual tab
  useEffect(() => {
    if (currentTab === 'MANUAL') {
      // Store current scroll position
      const scrollY = window.scrollY;
      // Restore it after a brief moment to prevent any automatic scrolling
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }
  }, [currentTab]);

  useEffect(() => {
    if (initialThreadId) setSelectedThreadId(initialThreadId);
  }, [initialThreadId]);

  // --- Filtering Logic ---
  const effectiveHomeowner = (isAdmin || isBuilder) ? targetHomeowner : activeHomeowner;
  
  // State for homeowner calls
  const [homeownerCalls, setHomeownerCalls] = useState<Call[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null); // ✅ MOVED OUTSIDE - Fix for React #310
  
  // Load calls for the effective homeowner
  useEffect(() => {
    const loadHomeownerCalls = async () => {
      if (!effectiveHomeowner?.id || !isDbConfigured) {
        setHomeownerCalls([]);
        return;
      }
      
      setCallsLoading(true);
      try {
        const callsList = await db
          .select()
          .from(calls)
          .where(eq(calls.homeownerId, effectiveHomeowner.id))
          .orderBy(desc(calls.createdAt))
          .limit(50);
        
        const mappedCalls: Call[] = callsList.map((c: any) => ({
          id: c.id,
          vapiCallId: c.vapiCallId,
          homeownerId: c.homeownerId,
          homeownerName: c.homeownerName,
          phoneNumber: c.phoneNumber,
          propertyAddress: c.propertyAddress,
          issueDescription: c.issueDescription,
          isUrgent: c.isUrgent || false,
          transcript: c.transcript,
          recordingUrl: c.recordingUrl,
          isVerified: c.isVerified || false,
          addressMatchSimilarity: c.addressMatchSimilarity,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        }));
        
        setHomeownerCalls(mappedCalls);
      } catch (error) {
        console.error('Error loading homeowner calls:', error);
        setHomeownerCalls([]);
      } finally {
        setCallsLoading(false);
      }
    };
    
    loadHomeownerCalls();
  }, [effectiveHomeowner?.id]);

  // Removed: Set initial selected call - no longer needed since we navigate to /calls page
  // (Previously used to initialize selected call when modal opened)

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

    setEditBuilderId(targetHomeowner.builderUserId || ''); // NEW: Use builderUserId
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
        // Find builder name from ID (NEW: from builderUsers instead of builderGroups)
        const selectedBuilder = builderUsers.find(bu => bu.id === editBuilderId);

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
            builder: selectedBuilder ? selectedBuilder.name : targetHomeowner.builder, // Display name
            builderUserId: editBuilderId || undefined, // NEW: Save as builderUserId
            builderId: undefined, // Clear legacy field
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
    const builderHomeownerIds = builderAccessibleHomeownerIds;
      
      // Match by homeownerId if available
      if ((c as any).homeownerId) {
        return builderHomeownerIds.has((c as any).homeownerId);
      }
      
      // Fallback to email matching
      const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
      return homeowners.some(h => 
      builderHomeownerIds.has(h.id) && 
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

  // Filter Messages - Sort newest first
  const displayThreads = messages.filter(t => {
    if (effectiveHomeowner) {
      return t.homeownerId === effectiveHomeowner.id;
    }
    // If Admin/Builder and NO homeowner selected, show ALL threads
    if (isAdmin) return true;
    return false;
  }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  // Tasks Logic
  const myTasks = tasks.filter(t => t.assignedToId === currentUser.id && !t.isCompleted);

  const selectedThread = displayThreads.find(t => t.id === selectedThreadId);

  // Animation state for homeowner card
  const [homeownerCardKey, setHomeownerCardKey] = useState(0);
  
  // Homeowner card collapse state
  const [isHomeownerCardCollapsed, setIsHomeownerCardCollapsed] = useState(false);

  // Homeowner Info Card - quick task creation controls
  const [tasksTabStartInEditMode, setTasksTabStartInEditMode] = useState(false);
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
    try {
      await sendEmail({
        to: inviteEmail,
        subject: subject,
        body: inviteBody,
        fromName: 'Cascade Admin',
        fromRole: UserRole.ADMIN
      });
      alert(`✅ Invitation email sent successfully to ${inviteEmail}`);
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      alert(`❌ Failed to send invitation email. Please try again.`);
    }
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
      // Get the last message in the thread for quoting
      const thread = messages.find(m => m.id === selectedThreadId);
      const lastMessage = thread?.messages[thread.messages.length - 1];
      
      // Create quoted content (Gmail style)
      let fullContent = replyContent;
      if (lastMessage) {
        const quotedDate = new Date(lastMessage.timestamp).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
        fullContent = `${replyContent}\n\n---\nOn ${quotedDate}, ${lastMessage.senderName} wrote:\n\n${lastMessage.content}`;
      }
      
      onSendMessage(selectedThreadId, fullContent);
      
      // Simulate sending email notification to the other party
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
          const { pushNotificationService } = await import('../services/pushNotificationService');
          const permission = await pushNotificationService.requestPermission();
          if (permission === 'granted') {
            // Find admin participants in the thread and send notifications
            const adminParticipants = thread.participants || [];
            for (const participantId of adminParticipants) {
              const emp = employees.find(e => e.id === participantId);
              if (emp && emp.pushNotifyHomeownerMessage === true) {
                await pushNotificationService.notifyHomeownerMessage(
                  senderName,
                  replyContent,
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
      
      setReplyContent('');
      setReplyExpanded(false);
    }
  };

  const handleCreateNewThread = async (forceSend: boolean = false) => {
    if (!effectiveHomeowner && !isAdmin) return;
    
    if (!effectiveHomeowner && isAdmin) {
        alert("Please select a homeowner to start a message thread.");
        return;
    }
    
    // For homeowner view, require recipient selection
    if (!isAdmin && !newMessageRecipientId) {
      alert("Please select a recipient.");
      return;
    }
    
    // Safe-guard for TS
    const targetId = effectiveHomeowner ? effectiveHomeowner.id : activeHomeowner.id;
    
    // Determine target email: use selected employee email in homeowner view, otherwise use homeowner email or default
    let targetEmail: string;
    if (!isAdmin && newMessageRecipientId) {
      const selectedEmployee = employees.find(emp => emp.id === newMessageRecipientId);
      targetEmail = selectedEmployee?.email || 'info@cascadebuilderservices.com';
    } else {
      targetEmail = effectiveHomeowner ? effectiveHomeowner.email : 'info@cascadebuilderservices.com';
    }

    if (!newMessageSubject || !newMessageContent) return;
    
    // AI Intent Detection - Only for homeowners, not force-sent, and substantial messages
    if (
      userRole === UserRole.HOMEOWNER && 
      !forceSend && 
      newMessageContent.length > 10
    ) {
      setIsSendingMessage(true);
      
      try {
        const isClaimIntent = await detectClaimIntent(newMessageContent);
        
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
    
    // 1. Create Internal Thread (this will also send the email notification)
    onCreateThread(targetId, newMessageSubject, newMessageContent);
    
    // Note: Email notification is handled by App.tsx handleCreateThread
    // which has access to the actual thread ID after creation

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
    setNewMessageRecipientId('');
  };

  // Handler to redirect homeowner to Warranty tab and open claim form
  const handleRedirectToWarranty = () => {
    setShowClaimSuggestionModal(false);
    setShowNewMessageModal(false);
    setCurrentTab('CLAIMS');
    setIsCreatingNewClaim(true);
  };

  // --- Render Helpers ---

  const renderClaimGroup = (title: string, groupClaims: Claim[], emptyMsg: string, isClosed: boolean = false, showNewClaimButton: boolean = false, filter?: 'All' | 'Open' | 'Closed', setFilter?: (filter: 'All' | 'Open' | 'Closed') => void, onExportExcel?: () => void, allClaims?: Claim[], isAdminView: boolean = false) => {
    // Calculate counts for filter pills
    const openCount = allClaims ? allClaims.filter(claim => claim.status !== 'CLOSED').length : 0;
    const closedCount = allClaims ? allClaims.filter(claim => claim.status === 'CLOSED').length : 0;
    const totalCount = allClaims ? allClaims.length : 0;

    return (
    <div 
      className="bg-surface dark:bg-gray-800 rounded-modal border border-surface-outline-variant dark:border-gray-700 mb-6 last:mb-0 flex flex-col"
    >
      <div className="px-6 py-6 border-b border-surface-outline-variant dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface-container/30 dark:bg-gray-700/30 flex-shrink-0">
        <div className="flex items-center justify-between md:justify-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <h3 className={`text-xl font-normal ${isClosed ? 'text-surface-on-variant dark:text-gray-400' : 'text-surface-on dark:text-gray-100'}`}>
              {title}
            </h3>
            {/* New Claim Button - Homeowner View Only, Next to Title */}
            {showNewClaimButton && title === 'Warranty Claims' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNewClaim();
                }}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-on text-sm font-medium transition-all hover:bg-primary/90 dark:hover:bg-primary/80"
              >
                <Plus className="h-4 w-4" />
                Add a Claim
              </button>
            )}
          </div>
          {/* New Claim Button - Admin Mobile Only */}
          {isAdminView && title === 'Warranty Claims' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNewClaimModal(true);
              }}
              className="md:hidden inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-on text-sm font-medium transition-all hover:bg-primary/90 dark:hover:bg-primary/80"
            >
              <Plus className="h-4 w-4" />
              New Claim
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Buttons - Matching TaskList style */}
          {setFilter && allClaims && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter('Open');
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all min-w-fit ${
                  filter === 'Open'
                    ? 'bg-primary text-primary-on'
                    : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Open</span>
                  {filter === 'Open' && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {openCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter('Closed');
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all min-w-fit ${
                  filter === 'Closed'
                    ? 'bg-primary text-primary-on'
                    : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Closed</span>
                  {filter === 'Closed' && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {closedCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter('All');
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all min-w-fit ${
                  filter === 'All'
                    ? 'bg-primary text-primary-on'
                    : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>All</span>
                  {filter === 'All' && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {totalCount}
                    </span>
                  )}
                </div>
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
            >
              <FileSpreadsheet className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {groupClaims.length === 0 ? (
        <div className="p-8 text-center text-surface-on-variant dark:text-gray-400 text-sm italic flex-shrink-0">
          {emptyMsg}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="p-6">
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
                
                const isReviewed = claim.reviewed || false;
                return (
                  <button
                    key={claim.id}
                    type="button"
                    className={`w-full text-left group flex flex-col rounded-2xl border transition-all overflow-hidden cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                      isCompleted 
                        ? 'bg-surface-container/30 dark:bg-gray-800/50 border-surface-container-high dark:border-gray-600 opacity-75' 
                        : isReviewed
                        ? 'bg-green-50 dark:bg-green-950/20 border-surface-outline-variant dark:border-gray-600 shadow-sm md:hover:shadow-elevation-1'
                        : 'bg-surface-container dark:bg-gray-800 border-surface-outline-variant dark:border-gray-600 shadow-sm md:hover:shadow-elevation-1'
                    }`}
                    onClick={() => {
                      handleClaimSelection(claim);
                    }}
                  >
                      <div className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                            {/* Claim # */}
                          <span className="inline-flex items-center h-6 text-xs font-medium tracking-wide border border-primary text-primary bg-primary/10 px-3 rounded-full whitespace-nowrap w-fit">
                            #{claim.claimNumber || claim.id.substring(0, 8).toUpperCase()}
                          </span>
                          {/* Status */}
                          <div className="w-fit h-6 flex items-center"><StatusBadge status={claim.status} /></div>
                          {/* Title */}
                          {claim.title && (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-3 rounded-full border border-surface-outline-variant dark:border-gray-600 whitespace-nowrap w-fit">
                              {claim.title}
                            </span>
                          )}
                          {/* Classification */}
                          <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-3 rounded-full border border-surface-outline-variant dark:border-gray-600 whitespace-nowrap w-fit">
                            {claim.classification}
                          </span>
                          {/* Homeowner Name */}
                          {(isAdmin || isBuilder) && !effectiveHomeowner && (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 gap-1 bg-surface-container dark:bg-gray-700 px-3 rounded-full border border-surface-outline-variant dark:border-gray-600 whitespace-nowrap w-fit">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              <span>{claim.homeownerName}</span>
                            </span>
                          )}
                          {/* Contractor */}
                          {claim.contractorName ? (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 gap-1 bg-surface-container dark:bg-gray-700 px-3 rounded-full border border-surface-outline-variant dark:border-gray-600 whitespace-nowrap w-fit">
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
                          <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-3 rounded-full border border-surface-outline-variant dark:border-gray-600 whitespace-nowrap w-fit">
                            Created: {new Date(claim.dateSubmitted).toLocaleDateString()}
                          </span>
                          {/* Scheduled Date */}
                          {scheduledDate && (
                            <span className="inline-flex items-center h-6 text-xs font-medium gap-1 bg-primary/20 dark:bg-primary/20 text-primary dark:text-primary px-3 rounded-full whitespace-nowrap w-fit">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span>Scheduled: {new Date(scheduledDate.date).toLocaleDateString()}</span>
                            </span>
                          )}
                          {/* Service Order Date */}
                          {serviceOrderDate ? (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 gap-1 bg-surface-container dark:bg-gray-700 px-3 rounded-full border border-surface-outline-variant dark:border-gray-600 whitespace-nowrap w-fit">
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
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700 px-3 rounded-full border border-surface-outline-variant dark:border-gray-600 whitespace-nowrap w-fit">
                              Eval: {new Date(claim.dateEvaluated).toLocaleDateString()}
                            </span>
                          )}
                          {/* Attachments count */}
                          {claim.attachments && claim.attachments.length > 0 && (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 gap-1 bg-surface-container dark:bg-gray-700 px-3 rounded-full border border-surface-outline-variant dark:border-gray-600 whitespace-nowrap w-fit">
                              <Paperclip className="h-3 w-3 flex-shrink-0" />
                              {claim.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

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

  const renderClaimsList = (claimsList: Claim[], filteredClaims: Claim[], isHomeownerView: boolean = false) => {
    const emptyMsg = claimsFilter === 'Open' 
      ? 'No open claims.' 
      : claimsFilter === 'Closed' 
      ? 'No closed claims.' 
      : 'No claims found.';

    // Calculate counts for filter pills
    const openCount = claimsList.filter(c => c.status !== ClaimStatus.COMPLETED).length;
    const closedCount = claimsList.filter(c => c.status === ClaimStatus.COMPLETED).length;
    const totalCount = claimsList.length;

    return (
      <>
      <div className="bg-surface dark:bg-gray-800 md:rounded-modal md:border border-surface-outline-variant dark:border-gray-700 flex flex-col md:flex-row overflow-hidden h-full min-h-0 md:max-h-[calc(100vh-8rem)]">
        {/* Left Column: Claims List - 30% width (350px) */}
        <div className={`w-full md:w-[350px] md:min-w-[350px] md:max-w-[350px] border-b md:border-b-0 md:border-r border-surface-outline-variant dark:border-gray-700 flex flex-col min-h-0 bg-surface dark:bg-gray-800 md:rounded-tl-modal md:rounded-tr-none md:rounded-bl-modal ${selectedClaimForModal ? 'hidden md:flex' : 'flex'}`}>
          <div className="sticky top-0 z-10 px-4 py-3 md:p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface md:bg-surface-container dark:bg-gray-700 flex flex-row justify-between items-center gap-2 md:gap-4 shrink-0 md:rounded-tl-modal md:rounded-tr-none">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile back: Claims list → Dashboard */}
              <button
                type="button"
                onClick={() => setCurrentTab(null)}
                className="md:hidden p-2 -ml-2 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full"
                aria-label="Back to dashboard"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-lg md:text-xl font-normal text-surface-on dark:text-gray-100 flex items-center gap-2 min-w-0">
                <span className="hidden sm:inline truncate">Warranty Claims</span>
                <span className="sm:hidden truncate">Claims</span>
              </h3>
            </div>
            {/* New Claim button */}
            {isHomeownerView ? (
              <Button
                variant="filled"
                onClick={() => onNewClaim()}
                className="!h-9 !px-3 md:!h-8 md:!px-4 !text-sm md:text-xs shrink-0"
              >
                <span className="hidden sm:inline">Add Claim</span>
                <span className="sm:hidden">Add</span>
              </Button>
            ) : isAdmin && (
              <Button
                variant="filled"
                onClick={() => {
                  setIsCreatingNewClaim(true);
                  setSelectedClaimForModal(null);
                }}
                className="!h-9 !px-3 md:!h-8 md:!px-4 !text-sm md:text-xs shrink-0"
              >
                <span className="hidden sm:inline">New Claim</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
          
          {/* Filter Pills */}
          <div className="px-4 py-2 border-b border-surface-outline-variant dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setClaimsFilter('Open')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  claimsFilter === 'Open'
                    ? 'border border-primary text-primary bg-primary/10'
                    : 'bg-white dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Open</span>
                  {claimsFilter === 'Open' && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {openCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setClaimsFilter('Closed')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  claimsFilter === 'Closed'
                    ? 'border border-primary text-primary bg-primary/10'
                    : 'bg-white dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Closed</span>
                  {claimsFilter === 'Closed' && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {closedCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setClaimsFilter('All')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  claimsFilter === 'All'
                    ? 'border border-primary text-primary bg-primary/10'
                    : 'bg-white dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>All</span>
                  {claimsFilter === 'All' && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {totalCount}
                    </span>
                  )}
                </div>
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleExportToExcel(claimsList)}
                  className="ml-auto p-2 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="relative flex-1 min-h-0 flex flex-col">
            <ClaimsListColumn
              claims={claimsList}
              filteredClaims={filteredClaims}
              isHomeownerView={isHomeownerView}
              emptyMsg={emptyMsg}
              isCreatingNewClaim={isCreatingNewClaim}
              claimMessages={claimMessages}
              selectedClaimId={selectedClaimForModal?.id || null}
              selectedClaimIds={selectedClaimIds}
              onClaimSelect={handleClaimSelection}
              onDeleteClaim={handleDeleteClaim}
              onToggleClaimSelection={handleToggleClaimSelection}
            />
            
            {/* Bulk Delete Button - Floating at bottom when claims are selected - Hidden in Homeowner View */}
            <AnimatePresence>
              {selectedClaimIds.length > 0 && !isHomeownerView && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
                >
                  <button
                    onClick={handleBulkDeleteClaims}
                    className="flex items-center gap-2 px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-full shadow-lg transition-colors font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete {selectedClaimIds.length} Claim{selectedClaimIds.length > 1 ? 's' : ''}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Claim Detail View - Desktop Only */}
        <div className={`flex-1 min-w-0 flex flex-col bg-surface dark:bg-gray-800 ${!selectedClaimForModal && !isCreatingNewClaim ? 'hidden md:flex' : 'hidden md:flex'} rounded-tr-modal rounded-br-modal md:rounded-r-modal md:rounded-l-none`}>
          {isCreatingNewClaim ? (
            <>
              {/* New Claim Header Toolbar */}
              <div className="h-16 shrink-0 px-6 border-b border-surface-outline-variant dark:border-gray-700 flex items-center justify-between bg-surface-container/30 dark:bg-gray-700/30 sticky top-0 z-10 rounded-tr-3xl">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsCreatingNewClaim(false)} 
                    className="md:hidden p-2 -ml-2 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>
                <button 
                  onClick={() => setIsCreatingNewClaim(false)}
                  className="hidden md:block p-2 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable New Claim Form Content */}
              <div 
                className="flex-1 overflow-y-auto p-6 overscroll-contain relative"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
              >
                {/* Backdrop overlay when warning is shown */}
                {showUnsavedWarning && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-6">
                    {/* Material 3 Confirmation Dialog */}
                    <div className="bg-surface-container-high dark:bg-gray-800 rounded-modal shadow-elevation-3 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                      {/* Dialog Title */}
                      <h3 className="text-xl font-semibold text-surface-on dark:text-gray-100 mb-3">
                        Unsaved Changes
                      </h3>
                      
                      {/* Dialog Content */}
                      <p className="text-surface-on-variant dark:text-gray-300 mb-6 leading-relaxed">
                        You have unsaved changes in your new claim. Are you sure you want to navigate away? All unsaved data will be lost.
                      </p>
                      
                      {/* Dialog Actions */}
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={handleCancelNavigation}
                          className="px-6 py-2.5 rounded-full text-primary dark:text-primary font-medium hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmNavigation}
                          className="px-6 py-2.5 rounded-full bg-primary text-primary-on font-medium hover:bg-primary/90 hover:shadow-elevation-1 transition-all"
                        >
                          Discard Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  <NewClaimForm
                    onSubmit={(data) => {
                      if (onCreateClaim) {
                        onCreateClaim(data);
                      }
                      setIsCreatingNewClaim(false);
                    }}
                    onCancel={() => setIsCreatingNewClaim(false)}
                    onSendMessage={() => {
                      setIsCreatingNewClaim(false);
                      setCurrentTab('MESSAGES');
                    }}
                    contractors={contractors}
                    activeHomeowner={targetHomeowner || activeHomeowner}
                    userRole={userRole}
                  />
                </Suspense>
              </div>
            </>
          ) : selectedClaimForModal ? (
            <>
              {/* Scrollable Claim Editor Content */}
              <div 
                className="flex-1 min-w-0 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
              >
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
                      if (selectedClaimForModal) {
                        setNewMessageSubject(selectedClaimForModal.title);
                      }
                      setShowNewMessageModal(true);
                    }}
                    onCancel={() => setSelectedClaimForModal(null)}
                    onNavigate={onNavigate}
                  />
                </Suspense>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-surface-on-variant dark:text-gray-400 gap-4 bg-surface-container/10 dark:bg-gray-700/10">
              <div className="w-20 h-20 bg-surface-container dark:bg-gray-700 rounded-full flex items-center justify-center">
                <ClipboardList className="h-9 w-10 text-surface-outline/50 dark:text-gray-500/50" />
              </div>
              <p className="text-sm font-medium">Select a claim to view details</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Full-Screen Overlay for Claim Modal */}
      {/* 
        NOTE: The modal state is STRICTLY controlled by URL search params.
        We do NOT force-clear the modal here, as that would interfere with browser history navigation.
        If a claim is in the URL (via deep link or back button), the modal should display it.
      */}
      {selectedClaimForModal && (
        <div className="md:hidden fixed inset-0 z-50 bg-surface dark:bg-gray-900 flex flex-col">
          {/* Claim detail: edge-to-edge sections on mobile */}
          <div className="flex-1 min-h-0">
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
                  if (selectedClaimForModal) {
                    setNewMessageSubject(selectedClaimForModal.title);
                  }
                  setShowNewMessageModal(true);
                }}
                onCancel={() => setSelectedClaimForModal(null)}
                onNavigate={onNavigate}
              />
            </Suspense>
          </div>
        </div>
      )}
      </>
    );
  };

  const renderDocumentsTab = () => (
    <div className="bg-surface dark:bg-gray-800 md:rounded-modal md:border border-surface-outline-variant dark:border-gray-700 flex flex-col">
      <div className="px-6 py-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex-shrink-0 md:rounded-t-modal">
        <h2 className="text-xl font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Account Documents
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
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
                    {isAdmin && (
                      <>
                        {/* Save to Google Drive */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (doc.url) {
                              const url = doc.url.startsWith('data:') 
                                ? doc.url 
                                : `https://drive.google.com/drive/folders/${doc.url}`;
                              window.open(`https://drive.google.com/drive/u/0/folders`, '_blank');
                            }
                          }}
                          className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                          title="Save to Google Drive"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                        
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
                        
                        {/* Delete */}
                        {onDeleteDocument && (
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
                    {isPDF ? (
                      <PDFThumbnailDisplay doc={doc} />
                    ) : (doc.type === 'IMAGE' || doc.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || doc.url?.startsWith('data:image/')) ? (
                      <img 
                        src={doc.thumbnailUrl || doc.url} 
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
                  <div className="p-2 bg-surface-container dark:bg-gray-700 rounded-b-xl">
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
        
        {/* Upload Action */}
        <div className="pt-4 flex justify-center">
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

  const renderTasksTab = (
    userTasks: Task[], 
    filteredTasks: Task[],
    onCreateScheduleTask?: (assigneeId: string) => Promise<void>,
    onCreateEvalTask?: (type: '60 Day' | '11 Month' | 'Other', assigneeId: string) => Promise<void>
  ) => {
    // Calculate counts for filter pills
    const openCount = userTasks.filter(task => !task.isCompleted).length;
    const closedCount = userTasks.filter(task => task.isCompleted).length;
    const totalCount = userTasks.length;

    return (
      <>
      <div className="bg-surface dark:bg-gray-800 md:rounded-modal md:border border-surface-outline-variant dark:border-gray-700 flex flex-col md:flex-row overflow-hidden h-full min-h-0 md:max-h-[calc(100vh-8rem)]">
        {/* Left Column: Tasks List */}
        <div className={`w-full md:w-[350px] md:min-w-[350px] md:max-w-[350px] border-b md:border-b-0 md:border-r border-surface-outline-variant dark:border-gray-700 flex flex-col min-h-0 bg-surface dark:bg-gray-800 md:rounded-tl-3xl md:rounded-tr-none md:rounded-bl-3xl ${selectedTaskForModal ? 'hidden md:flex' : 'flex'}`}>
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-surface dark:bg-gray-800 md:rounded-tl-3xl">
            {/* Title Bar */}
            <div className="px-4 py-3 md:p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface md:bg-surface-container dark:bg-gray-700 flex flex-row justify-between items-center gap-2 md:gap-4 shrink-0">
              <h3 className="text-lg md:text-xl font-normal text-surface-on dark:text-gray-100">
                <span className="hidden sm:inline">My Tasks</span>
                <span className="sm:hidden">Tasks</span>
              </h3>
            </div>
            
            {/* Filter Pills */}
            <div className="px-4 py-2 border-b border-surface-outline-variant/50 dark:border-gray-700/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTasksFilter('open')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all min-w-fit ${
                    tasksFilter === 'open'
                      ? 'border border-primary text-primary bg-primary/10'
                      : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>Open</span>
                    {tasksFilter === 'open' && (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {openCount}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setTasksFilter('closed')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all min-w-fit ${
                    tasksFilter === 'closed'
                      ? 'border border-primary text-primary bg-primary/10'
                      : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>Closed</span>
                    {tasksFilter === 'closed' && (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {closedCount}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setTasksFilter('all')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all min-w-fit ${
                    tasksFilter === 'all'
                      ? 'border border-primary text-primary bg-primary/10'
                      : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>All</span>
                    {tasksFilter === 'all' && (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {totalCount}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Task Creation Card */}
            {onCreateScheduleTask && onCreateEvalTask && (
              <TaskCreationCard
                employees={employees}
                onCreateScheduleTask={onCreateScheduleTask}
                onCreateEvalTask={onCreateEvalTask}
              />
            )}
          </div>

          <TasksListColumn
            tasks={filteredTasks}
            employees={employees}
            claims={claims}
            selectedTaskId={selectedTaskForModal?.id || null}
            onTaskSelect={(task) => {
              setSelectedTaskForModal(task);
              setTasksTabStartInEditMode(true);
            }}
          />
        </div>

        {/* Right Column: Task Detail View - Desktop Only */}
        <div className={`flex-1 flex flex-col bg-surface dark:bg-gray-800 ${!selectedTaskForModal ? 'hidden md:flex' : 'hidden md:flex'} rounded-tr-3xl rounded-br-3xl md:rounded-r-3xl md:rounded-l-none overflow-hidden`}>
          {selectedTaskForModal ? (
            <div className="flex flex-col h-full">
              {/* Scrollable Task Detail Content */}
              <div 
                className="flex-1 overflow-y-auto px-6 pt-4 pb-6 overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
              >
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                    <TaskDetail
                    task={selectedTaskForModal}
                    employees={employees}
                    currentUser={currentUser}
                    claims={claims}
                    homeowners={homeowners}
                    onToggleTask={onToggleTask}
                    onDeleteTask={onDeleteTask}
                    onUpdateTask={onUpdateTask}
                      startInEditMode={tasksTabStartInEditMode}
                    onSelectClaim={(claim) => {
                      setSelectedTaskForModal(null);
                        setTasksTabStartInEditMode(false);
                      handleClaimSelection(claim);
                      setCurrentTab('CLAIMS');
                    }}
                    taskMessages={taskMessages.filter(m => m.taskId === selectedTaskForModal.id)}
                      onBack={() => {
                        setSelectedTaskForModal(null);
                        setTasksTabStartInEditMode(false);
                      }}
                  />
                </Suspense>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-surface-on-variant dark:text-gray-400 gap-4 bg-surface-container/10 dark:bg-gray-700/10">
              <div className="w-20 h-20 bg-surface-container dark:bg-gray-700 rounded-full flex items-center justify-center">
                <CheckSquare className="h-9 w-10 text-surface-outline/50 dark:text-gray-500/50" />
              </div>
              <p className="text-sm font-medium">Select a task to view details</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Full-Screen Overlay for Task Detail */}
      {selectedTaskForModal && (
        <div className="md:hidden fixed inset-0 z-50 bg-surface dark:bg-gray-900 flex flex-col overflow-hidden">
          {/* Scrollable Task Detail Content */}
          <div 
            className="flex-1 overflow-y-auto px-6 pt-4 pb-6 overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
          >
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <TaskDetail
                task={selectedTaskForModal}
                employees={employees}
                currentUser={currentUser}
                claims={claims}
                homeowners={homeowners}
                onToggleTask={onToggleTask}
                onDeleteTask={onDeleteTask}
                startInEditMode={tasksTabStartInEditMode}
                onBack={() => {
                  setSelectedTaskForModal(null);
                  setTasksTabStartInEditMode(false);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}
      </>
    );
  };

  const renderMessagesTab = () => (
    <>
    <div className="bg-surface dark:bg-gray-800 md:rounded-3xl md:border border-surface-outline-variant dark:border-gray-700 flex flex-col md:flex-row overflow-hidden h-full min-h-0 md:max-h-[calc(100vh-8rem)]">
       {/* Left Column: Inbox List (Gmail Style) */}
       <div className={`w-full md:w-[350px] md:min-w-[350px] md:max-w-[350px] border-b md:border-b-0 md:border-r border-surface-outline-variant dark:border-gray-700 flex flex-col min-h-0 bg-surface dark:bg-gray-800 md:rounded-tl-3xl md:rounded-tr-none md:rounded-bl-3xl ${selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          <div className="sticky top-0 z-10 px-4 py-3 md:p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface md:bg-surface-container dark:bg-gray-700 flex flex-row justify-between items-center gap-2 md:gap-4 shrink-0 md:rounded-tl-3xl md:rounded-tr-none">
            <h3 className="text-lg md:text-xl font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              {displayThreads.filter(t => !t.isRead).length > 0 && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-on text-xs font-medium">
                  {displayThreads.filter(t => !t.isRead).length}
                </span>
              )}
              Inbox
            </h3>
            {/* Compose button */}
            <Button
              variant="filled"
              onClick={() => {
                setIsComposingMessage(true);
                setSelectedThreadId(null);
              }}
              className="!h-9 !px-3 md:!h-8 md:!px-4 !text-sm md:text-xs shrink-0"
            >
              <span className="hidden sm:inline">Compose</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
          
          {/* Search box on desktop only */}
          <div className="hidden md:block p-2 border-b border-surface-outline-variant/50 dark:border-gray-700/50">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-500" />
                <input 
                  type="text" 
                  placeholder="" 
                  className="w-full bg-white dark:bg-gray-700 rounded-full pl-9 pr-3 py-2 text-sm text-surface-on dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary placeholder-surface-outline-variant dark:placeholder-gray-500 border border-gray-200 dark:border-gray-600"
                />
             </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto p-6 min-h-0 rounded-bl-3xl md:rounded-bl-none"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              maskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)'
            }}
          >
             {displayThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant dark:text-gray-400 gap-2">
                  <Mail className="h-8 w-8 opacity-20 dark:opacity-40 text-surface-on dark:text-gray-400" />
                  <span className="text-sm">No messages found.</span>
                </div>
             ) : (
                <div className="grid grid-cols-1 gap-3">
                  {displayThreads.map((thread, index) => {
                    const lastMsg = thread.messages[thread.messages.length - 1];
                    const isUnread = !thread.isRead;
                    const participants = isAdmin 
                      ? thread.participants.filter(p => p !== currentUser.name).join(', ') || 'Me'
                      : thread.participants.filter(p => p !== activeHomeowner.name).join(', ') || 'Me';
                    
                    // Get message preview from the last message
                    const messagePreview = lastMsg?.content || '';
                    
                    // Format date with time
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
                          setSelectedThreadId(thread.id);
                          setIsComposingMessage(false);
                        }}
                      />
                    );
                  })}
                </div>
             )}
          </div>
       </div>

       {/* Right Column: Email Thread View - Desktop Only */}
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
                    setIsComposingMessage(false);
                    setNewMessageSubject('');
                    setNewMessageContent('');
                    setNewMessageRecipientId('');
                    setSelectedMessageTemplateId('');
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
                      onChange={(value) => setNewMessageRecipientId(value)}
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
                )}

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
                
                {/* Save as Template Button - Admin Only */}
                {isAdmin && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleOpenMessageTemplateCreator()}
                      className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 px-3 py-1.5 hover:bg-primary/5 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save as Template
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 flex justify-end gap-3 shrink-0 border-t border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30">
                <Button
                  variant="filled"
                  onClick={() => {
                    setIsComposingMessage(false);
                    setNewMessageSubject('');
                    setNewMessageContent('');
                    setNewMessageRecipientId('');
                    setSelectedMessageTemplateId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="filled"
                  onClick={() => {
                    handleCreateNewThread();
                    setIsComposingMessage(false);
                  }}
                  disabled={!newMessageSubject || !newMessageContent || isSendingMessage || (!isAdmin && !newMessageRecipientId)}
                  icon={isSendingMessage ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <Send className="h-4 w-4" />}
                >
                  Send Message
                </Button>
              </div>
            </div>
          ) : selectedThread ? (
            <div className="flex flex-col h-full">
               {/* Scrollable Thread Content */}
               <div 
                 className="flex-1 overflow-y-auto overscroll-contain px-6 pt-4"
                 style={{ 
                   WebkitOverflowScrolling: 'touch', 
                   touchAction: 'pan-y',
                   maskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)',
                   WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)'
                 } as React.CSSProperties}
               >
                 <div className="px-4 py-6 bg-white dark:bg-white rounded-2xl mx-4 my-4">
                    {/* Subject Line */}
                    <div className="flex items-start justify-between mb-8">
                       <h2 className="text-2xl font-normal text-surface-on dark:text-gray-100 leading-tight">{selectedThread.subject}</h2>
                       <button
                         onClick={() => {
                           const associatedClaim = claims.find(c => c.title === selectedThread.subject);
                           const project = associatedClaim ? (associatedClaim.jobName || associatedClaim.address) : 'Unknown Project';
                           const claimNum = associatedClaim?.claimNumber ? `Claim #${associatedClaim.claimNumber}` : '';
                           const contextLabel = [selectedThread.subject, claimNum, project].filter(Boolean).join(' • ');
                           
                           // Open the TasksSheet
                           useTaskStore.getState().openTasks(
                             associatedClaim?.id || null,
                             contextLabel,
                             'message'
                           );
                        }}
                        className="p-2 -mr-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                        title={`Add a note about: ${selectedThread.subject}`}
                      >
                         <StickyNote className="h-5 w-5" />
                       </button>
                    </div>

                    {/* Messages Loop */}
                    <div className="space-y-8">
                      {selectedThread.messages.map((msg, idx) => {
                        const isMe = isAdmin ? msg.senderRole === UserRole.ADMIN : msg.senderRole === UserRole.HOMEOWNER;
                        // Show read status only for outbound emails from internal users
                        const showReadStatus = isMe && msg.messageType === 'email';
                        
                        return (
                          <div key={msg.id} className="group">
                             <div className="flex items-start gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                   <div className="flex items-baseline justify-between">
                                      <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-surface-on dark:text-gray-100 text-sm">{msg.senderName}</span>
                                        <span className="text-xs text-surface-on-variant dark:text-gray-400">&lt;{isMe ? 'me' : msg.senderRole.toLowerCase()}&gt;</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-xs text-surface-on-variant dark:text-gray-400 transition-colors">
                                          {new Date(msg.timestamp).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </div>
                                        {/* Read Status Indicator */}
                                        {showReadStatus && (
                                          <div className="flex items-center gap-1" title={msg.isRead ? `Read ${msg.openedAt ? new Date(msg.openedAt).toLocaleString() : ''}` : 'Delivered'}>
                                            {msg.isRead ? (
                                              <CheckCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                                            ) : (
                                              <Check className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                   </div>
                                   <div className="text-xs text-surface-on-variant dark:text-gray-400">to {isMe ? (effectiveHomeowner?.name || 'Homeowner') : 'Me'}</div>
                                </div>
                             </div>
                             
                             {/* Message Body - Full Width Email Style */}
                             <div className="text-sm text-surface-on/90 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                                {msg.content}
                             </div>
                             
                             {/* Divider if not last */}
                             {idx < selectedThread.messages.length - 1 && (
                               <div className="mt-8 border-b border-surface-outline-variant/30 dark:border-gray-700/30"></div>
                             )}
                          </div>
                        );
                      })}
                   </div>
                   
                 </div>
               </div>

               {/* Reply Box (Sticky Bottom) */}
               <div className="border-t border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 p-6 shrink-0 rounded-br-3xl">
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
                            </div>
                            <div className="flex items-center gap-2">
                               <Button 
                                 onClick={() => setReplyExpanded(false)}
                                 variant="outlined"
                                 className="!h-9 !px-6"
                               >
                                 Discard
                               </Button>
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
    
    {/* Mobile Full-Screen Overlay for Message Thread */}
    {selectedThread && (
      <div className="md:hidden fixed inset-0 z-50 bg-surface dark:bg-gray-900 flex flex-col overflow-hidden">
        {/* Scrollable Thread Content */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain px-6 pt-4"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
        >
          <div className="px-8 py-6 bg-white dark:bg-white rounded-2xl mx-4 my-4">
            {/* Subject Line */}
            <div className="flex items-start justify-between mb-8">
              <h2 className="text-2xl font-normal text-surface-on dark:text-gray-100 leading-tight">{selectedThread.subject}</h2>
              <button
                onClick={() => {
                  const associatedClaim = claims.find(c => c.title === selectedThread.subject);
                  const project = associatedClaim ? (associatedClaim.jobName || associatedClaim.address) : 'Unknown Project';
                  const claimNum = associatedClaim?.claimNumber ? `Claim #${associatedClaim.claimNumber}` : '';
                  const contextLabel = [selectedThread.subject, claimNum, project].filter(Boolean).join(' • ');
                  
                  // Open the TasksSheet
                  useTaskStore.getState().openTasks(
                    associatedClaim?.id || null,
                    contextLabel,
                    'message'
                  );
                        }}
                        className="p-2 -mr-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                        title={`Add a note about: ${selectedThread.subject}`}
                      >
                <StickyNote className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Loop */}
            <div className="space-y-8">
              {selectedThread.messages.map((msg, idx) => {
                const isMe = isAdmin ? msg.senderRole === UserRole.ADMIN : msg.senderRole === UserRole.HOMEOWNER;
                return (
                  <div key={msg.id} className="group">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-surface-on dark:text-gray-100 text-sm">{msg.senderName}</span>
                            <span className="text-xs text-surface-on-variant dark:text-gray-400">&lt;{isMe ? 'me' : msg.senderRole.toLowerCase()}&gt;</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-surface-on-variant dark:text-gray-400 transition-colors">
                              {new Date(msg.timestamp).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400">to {isMe ? (effectiveHomeowner?.name || 'Homeowner') : 'Me'}</div>
                      </div>
                    </div>
                    
                    {/* Message Body */}
                    <div className="text-sm text-surface-on/90 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </div>
                    
                    {/* Divider if not last */}
                    {idx < selectedThread.messages.length - 1 && (
                      <div className="mt-8 border-b border-surface-outline-variant/30 dark:border-gray-700/30"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reply Box (Sticky Bottom) */}
        <div className="border-t border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 p-6 shrink-0">
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
                  className="w-full bg-transparent dark:bg-transparent outline-none text-sm p-4 resize-none leading-relaxed text-surface-on dark:text-gray-100 overflow-hidden"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
                <div className="flex justify-between items-center p-3 bg-surface-container/10 dark:bg-gray-700/10">
                  <div className="flex gap-2">
                    <button className="p-2 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full"><Paperclip className="h-4 w-4"/></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => setReplyExpanded(false)}
                      variant="outlined"
                      className="!h-9 !px-6"
                    >
                      Discard
                    </Button>
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
      </div>
    )}
    </>
  );

  // --- Main Render Logic ---

  // Helper function to render modals using Portal
  const renderModals = () => (
    <>
      {/* TASK DETAIL MODAL - Only show when not on TASKS tab (tasks tab has inline view) */}
      {selectedTaskForModal && currentTab !== 'TASKS' && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[fade-in_0.2s_ease-out] flex flex-col h-[90vh]">
            <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0">
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
                    handleClaimSelection(claim);
                    setCurrentTab('CLAIMS'); // Switch to CLAIMS tab when selecting a claim
                  }}
                  startInEditMode={true}
                  taskMessages={taskMessages.filter(m => m.taskId === selectedTaskForModal.id)}
                  onSendMessage={onSendTaskMessage}
                  onTrackTaskMessage={onTrackTaskMessage}
                  onNavigate={onNavigate}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CLAIM DETAIL MODAL - Only show when not on CLAIMS tab (claims tab has inline view) */}
      {selectedClaimForModal && currentTab !== 'CLAIMS' && onUpdateClaim && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[fade-in_0.2s_ease-out] flex flex-col h-[90vh] p-0">
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

      {/* NEW CLAIM MODAL - DEPRECATED: Now using inline view in claims tab
      Keeping this code commented for backward compatibility with mobile views if needed */}
      {/* {showNewClaimModal && createPortal(...)} */}

      {/* NEW TASK MODAL */}
      {showNewTaskModal && createPortal(
        <div 
          data-new-task-modal
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
          style={{ zIndex: 1000, overscrollBehavior: 'contain' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewTaskModal(false);
          }}
        >
          <div className="bg-surface dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] flex flex-col h-[85vh]">
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
            }} className="p-6 pb-24 space-y-4 bg-surface dark:bg-gray-800 flex-1 overflow-y-auto">
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
            className="w-full max-w-7xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {/* Close Button */}
              <button
                onClick={() => setShowManualModal(false)}
                className="absolute -top-12 right-0 p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors shadow-lg z-10"
              >
                <X className="h-5 w-5 text-gray-800 dark:text-gray-100" />
              </button>
              
              {/* Homeowner Manual Component */}
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <HomeownerManual homeownerId={activeHomeowner?.id} />
              </Suspense>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );

  // 1. HOMEOWNER CONTEXT VIEW (When Admin selects a homeowner OR when a homeowner logs in)
  // Render the dashboard if we have a valid context to show
  const shouldShowAdminStyleCard = 
    // 1. Admin/Builder viewing a specific homeowner
    ((isAdmin || isBuilder) && targetHomeowner) || 
    // 2. ANY user in Homeowner View (Real Homeowner OR Impersonating Admin) with a valid profile
    (userRole === UserRole.HOMEOWNER && activeHomeowner && activeHomeowner.id !== 'placeholder');
  
  if (shouldShowAdminStyleCard) {
    // Use targetHomeowner if available (preserved from admin view), otherwise use activeHomeowner for homeowner view
    const displayHomeowner = targetHomeowner || activeHomeowner;
    const isHomeownerView = userRole === UserRole.HOMEOWNER;
    const projectTag = displayHomeowner.jobName || 'N/A';
    const closingTag = displayHomeowner.closingDate ? new Date(displayHomeowner.closingDate).toLocaleDateString() : 'N/A';
    const tagsLine = `[${projectTag}] [${closingTag}]`;

    const openClaimsForHomeowner = claims.filter(c => {
      const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
      const homeownerEmail = displayHomeowner.email?.toLowerCase().trim() || '';
      return (
        claimEmail === homeownerEmail &&
        c.status !== ClaimStatus.COMPLETED &&
        c.status !== ClaimStatus.CLOSED &&
        c.reviewed === true
      );
    });

    const createHomeownerTask = async (taskData: Partial<Task>, options?: { openForEdit?: boolean }) => {
      const id = crypto.randomUUID();
      const now = new Date();
      const taskPreview: Task = {
        id,
        title: taskData.title ?? 'New Task',
        description: taskData.description ?? '',
        assignedToId: taskData.assignedToId || currentUser.id,
        assignedById: currentUser.id,
        isCompleted: false,
        dateAssigned: now,
        dueDate: taskData.dueDate || new Date(Date.now() + 86400000),
        relatedClaimIds: taskData.relatedClaimIds || [],
      };

      try {
        await onAddTask({ ...taskData, id });
      } catch (e) {
        console.error('Failed to create task from homeowner info card:', e);
      }

      if (options?.openForEdit) {
        setSelectedTaskForModal(taskPreview);
        if (currentTab === 'TASKS') {
          setTasksTabStartInEditMode(true);
        }
      }
    };

    const handleEvalCreate = async (value: '' | '60 Day' | '11 Month' | 'Other') => {
      if (!value) return;

      if (value === '60 Day') {
        await createHomeownerTask({
          title: 'Schedule 60 Day Evaluation',
          description: `Tags: ${tagsLine}`,
          relatedClaimIds: [],
          assignedToId: currentUser.id,
        });
      } else if (value === '11 Month') {
        await createHomeownerTask({
          title: 'Schedule 11 Month Evaluation',
          description: `Tags: ${tagsLine}`,
          relatedClaimIds: [],
          assignedToId: currentUser.id,
        });
      } else {
        // Other: create a blank-title task and open it immediately for editing
        await createHomeownerTask(
          {
            title: '',
            description: `Tags: ${tagsLine}`,
            relatedClaimIds: [],
            assignedToId: currentUser.id,
          },
          { openForEdit: true }
        );
      }
    };

    const handleScheduleCreate = async () => {
      const x = openClaimsForHomeowner.length;
      const claimLines = openClaimsForHomeowner
        .map((c) => {
          const claimRef = c.claimNumber ? `Claim #${c.claimNumber}` : `Claim ${c.id.substring(0, 8)}`;
          return `- ${claimRef}: ${c.title} (#claims?claimId=${c.id})`;
        })
        .join('\n');

      await createHomeownerTask({
        title: `Ready to schedule ${x} open claims`,
        description: `Tags: ${tagsLine}\n\nOpen claims:\n${claimLines || '- (none)'}`,
        relatedClaimIds: openClaimsForHomeowner.map((c) => c.id),
        assignedToId: currentUser.id,
      });
    };

    // Wrappers for TaskDetail Quick Actions (accept assigneeId parameter)
    const handleScheduleTaskWithAssignee = async (assigneeId: string) => {
      const x = openClaimsForHomeowner.length;

      await createHomeownerTask({
        title: `Ready to schedule ${x} open claims`,
        description: `Tags: ${tagsLine}`,
        relatedClaimIds: openClaimsForHomeowner.map((c) => c.id),
        assignedToId: assigneeId,
      });
    };

    const handleEvalTaskWithAssignee = async (type: '60 Day' | '11 Month' | 'Other', assigneeId: string) => {
      if (type === '60 Day') {
        await createHomeownerTask({
          title: 'Schedule 60 Day Evaluation',
          description: `Tags: ${tagsLine}`,
          relatedClaimIds: [],
          assignedToId: assigneeId,
        });
      } else if (type === '11 Month') {
        await createHomeownerTask({
          title: 'Schedule 11 Month Evaluation',
          description: `Tags: ${tagsLine}`,
          relatedClaimIds: [],
          assignedToId: assigneeId,
        });
      } else {
        // Other: create a blank-title task and open it immediately for editing
        await createHomeownerTask(
          {
            title: '',
            description: `Tags: ${tagsLine}`,
            relatedClaimIds: [],
            assignedToId: assigneeId,
          },
          { openForEdit: true }
        );
      }
    };

    // Get scheduled claims for this homeowner
    const scheduledClaims = claims
      .filter(c => {
        const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
        const homeownerEmail = displayHomeowner.email?.toLowerCase().trim() || '';
        return c.status === ClaimStatus.SCHEDULED && claimEmail === homeownerEmail;
      })
      .slice(0, 3);
    
    // Calculate upcoming appointment for mobile dashboard (Rule 6: Defensive rendering with null checks)
    const upcomingAppointment = (() => {
      if (!isHomeownerView || scheduledClaims.length === 0) return null;
      
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const upcomingClaims = scheduledClaims
        .map(c => {
          const acceptedDate = c.proposedDates?.find(d => d.status === 'ACCEPTED');
          if (!acceptedDate?.date) return null;
          
          const appointmentDate = new Date(acceptedDate.date);
          appointmentDate.setHours(0, 0, 0, 0);
          if (appointmentDate < now) return null;
          
          return { claim: c, date: appointmentDate, acceptedDate };
        })
        .filter(Boolean) as Array<{ claim: Claim; date: Date; acceptedDate: any }>;
      
      if (upcomingClaims.length === 0) return null;
      
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
      
      return {
        claimId: firstClaim.id,
        claimTitle: firstClaim.title,
        date: acceptedDate.date,
        timeSlot: acceptedDate.timeSlot ?? null,
        contractorName: firstClaim.contractorName ?? null,
        count: claimsOnNextDate.length,
      };
    })();
    
    // Render new mobile dashboard for both homeowner and admin view on mobile devices (when no tab is active)
    if (isMobileView && displayHomeowner && !currentTab) {
      return (
        <>
          {renderModals()}
          <HomeownerDashboardMobile
            homeowner={displayHomeowner}
            searchQuery={(isAdmin || isBuilder) ? searchQuery : undefined}
            onSearchChange={(isAdmin || isBuilder) ? onSearchChange : undefined}
            searchResults={(isAdmin || isBuilder) ? searchResults : undefined}
            onSelectHomeowner={(isAdmin || isBuilder) ? onSelectHomeowner : undefined}
            upcomingAppointment={upcomingAppointment}
            onAppointmentClick={(claimId) => {
              const claim = claims.find(c => c.id === claimId);
              if (claim) {
                handleClaimSelection(claim);
              }
            }}
            onNavigateToModule={(module) => {
              // Map module strings to existing tab state
              const moduleMap: { [key: string]: typeof currentTab } = {
                'TASKS': 'TASKS',
                'SCHEDULE': 'SCHEDULE',
                'BLUETAG': null, // Special handling
                'CLAIMS': 'CLAIMS',
                'MESSAGES': 'MESSAGES',
                'CALLS': 'CALLS',
                'INVOICES': 'INVOICES',
                'DOCUMENTS': 'DOCUMENTS',
                'MANUAL': 'MANUAL',
                'HELP': 'HELP',
              };

              if (module === 'BLUETAG') {
                setCurrentTab('PUNCHLIST');
              } else if (module === 'CHAT') {
                updateSearchParams({ view: 'chat' });
              } else {
                const tab = moduleMap[module];
                if (tab) {
                  setCurrentTab(tab);
                }
              }
            }}
          />
          {/* REMOVED: Floating Chat Widget - Now rendered at root level in App.tsx to escape stacking context */}
        </>
      );
    }
    
    return (
      <>
        {renderModals()}
        
        {/* ADMIN EXIT BUTTON - Only show when admin is viewing as homeowner */}
        {/* ✅ LOGIC: Show when isHomeownerView is true AND the Clerk user's role is admin */}
        {/* Real Homeowner: isHomeownerView=true but isAdminAccount=false -> HIDDEN */}
        {/* Admin Dashboard: isHomeownerView=false -> HIDDEN */}
        {/* Admin Impersonating: isHomeownerView=true AND isAdminAccount=true -> VISIBLE ✓ */}
        {isHomeownerView && isAdminAccount && (
          <div className="fixed top-20 right-4 z-[9999]">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log("🛑 NUCLEAR EXIT: Reloading Page...");
                console.log("Current state - userRole:", userRole, "isHomeownerView:", isHomeownerView);
                
                // Clear any persistence
                if (typeof window !== 'undefined') {
                  try {
                    localStorage.removeItem('selectedHomeownerId');
                    localStorage.removeItem('isHomeownerView');
                    sessionStorage.removeItem('homeownerView');
                  } catch (err) {
                    console.warn("Storage clear failed:", err);
                  }
                }
                
                // NUCLEAR OPTION: Hard reload to reset all state
                console.log("💥 Forcing page reload...");
                window.location.reload();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-on hover:bg-primary/90 font-medium rounded-full shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
              title="Return to Admin View (Force Reload)"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-semibold">Exit View</span>
            </button>
          </div>
        )}
        
        <div className={shouldHideDashboardUnderlay ? 'hidden' : 'block'}>
        {/* Main Layout Container - Sidebar + Content with Staggered Cascade Animation */}
        <StaggerContainer className={`flex flex-col lg:flex-row gap-6 w-full ${SIDEBAR_CONTENT_PADDING_LEFT} lg:pl-6 pr-4 lg:pr-6 bg-white dark:bg-gray-900`} staggerDelay={0.08}>
          {/* LEFT SIDEBAR - Homeowner Info Card with Search - HIDDEN ON MOBILE when tab is active */}
          <FadeIn direction="right" className={`transition-all duration-300 ease-in-out lg:flex-shrink-0 rounded-3xl ${currentTab ? 'hidden lg:block' : ''} ${isHomeownerCardCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-72'}`}>
            {/* Search Bar - Admin & Builder Only - Always visible on mobile, top of card on desktop */}
            {(isAdmin || isBuilder) && searchQuery !== undefined && onSearchChange && searchResults && onSelectHomeowner && (
              <div className={`lg:hidden mb-4 ${isHomeownerCardCollapsed ? 'block' : 'block'}`}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Homeowner Search"
                    className="w-full bg-white dark:bg-gray-700 rounded-full pl-9 pr-8 py-2 text-sm border border-surface-outline-variant dark:border-gray-600 focus:ring-2 focus:ring-primary focus:outline-none text-surface-on dark:text-gray-100 transition-all"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    title="Search homeowners"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => onSearchChange('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-outline-variant hover:text-surface-on"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  
                  {/* Dropdown Results */}
                  {searchQuery && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 max-h-96 overflow-y-auto">
                      {searchResults.map((homeowner) => (
                        <button
                          key={homeowner.id}
                          onClick={() => {
                            onSelectHomeowner(homeowner);
                            onSearchChange('');
                            setIsHomeownerCardCollapsed(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-surface-container dark:hover:bg-gray-700 border-b border-surface-outline-variant dark:border-gray-700 last:border-0 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-surface-on dark:text-gray-100 truncate">{homeowner.name}</p>
                              {homeowner.builder && (
                                <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">
                                  {homeowner.builder}
                                </p>
                              )}
                              {homeowner.jobName && (
                                <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">{homeowner.jobName}</p>
                              )}
                              {homeowner.closingDate && (
                                <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">
                                  Closing: {new Date(homeowner.closingDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Collapsed State - Show expand button */}
            {isHomeownerCardCollapsed && (
              <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 lg:sticky lg:top-4 p-2">
                <button
                  onClick={() => setIsHomeownerCardCollapsed(false)}
                  className="flex items-center justify-center w-full p-2 rounded transition-all"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-500 lg:block" />
                  <span className="lg:hidden text-sm text-surface-on dark:text-gray-100 ml-2">Tap to expand homeowner info</span>
                </button>
              </div>
            )}
            
            {/* Expanded State - Full Card */}
            {!isHomeownerCardCollapsed && (
              <div 
                ref={homeownerCardContainerRef}
                key={`homeowner-${homeownerCardKey}-${displayHomeowner?.id}`}
                className="bg-surface-container/30 dark:bg-gray-700/30 rounded-3xl border border-surface-outline-variant dark:border-gray-700 lg:sticky lg:top-4 overflow-hidden relative"
              >
                {/* Search Bar - Admin & Builder Only - Visible on all screen sizes */}
                {(isAdmin || isBuilder) && searchQuery !== undefined && onSearchChange && searchResults && onSelectHomeowner && (
                  <div className="block p-4 border-b border-surface-outline-variant/50 dark:border-gray-700/50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Homeowner Search"
                        className="w-full bg-white dark:bg-gray-700 rounded-full pl-9 pr-8 py-2 text-sm border border-surface-outline-variant dark:border-gray-600 focus:ring-2 focus:ring-primary focus:outline-none text-surface-on dark:text-gray-100 transition-all"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        title="Search homeowners"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => onSearchChange('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-outline-variant hover:text-surface-on"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      
                      {/* Dropdown Results */}
                      {searchQuery && searchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 max-h-96 overflow-y-auto">
                          {searchResults.map((homeowner) => (
                            <button
                              key={homeowner.id}
                              onClick={() => {
                                onSelectHomeowner(homeowner);
                                onSearchChange('');
                                setIsHomeownerCardCollapsed(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-surface-container dark:hover:bg-gray-700 border-b border-surface-outline-variant dark:border-gray-700 last:border-0 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-surface-on dark:text-gray-100 truncate">{homeowner.name}</p>
                                  {(() => {
                                    // Prefer linked builder user over legacy text field
                                    const builderName = homeowner.builderUserId && builderUsers
                                      ? builderUsers.find(bu => bu.id === homeowner.builderUserId)?.name
                                      : homeowner.builder;
                                    
                                    return builderName ? (
                                      <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">
                                        {builderName}
                                      </p>
                                    ) : null;
                                  })()}
                                  {homeowner.jobName && (
                                    <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">{homeowner.jobName}</p>
                                  )}
                                  {homeowner.closingDate && (
                                    <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">
                                      Closing: {new Date(homeowner.closingDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                  </div>
                )}
                
                {/* Next Appointment (sticky, above homeowner info) - Homeowner View Only */}
                {isHomeownerView && (
                  <div className="px-4 pt-4">
                    <div className="bg-primary/5 dark:bg-gray-700/50 rounded-2xl border border-surface-outline-variant/50 dark:border-gray-600 overflow-hidden">
                      <div className="p-3 bg-surface-container/30 dark:bg-gray-700/30 border-b border-surface-outline-variant/50 dark:border-gray-600 text-center">
                        <h3 className="font-medium text-sm flex items-center justify-center text-secondary-on-container dark:text-gray-100">
                          <Calendar className="h-4 w-4 mr-2" />
                          Next Appointment
                        </h3>
                      </div>
                      {(() => {
                        // Get the next upcoming appointment date
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);

                        const upcomingClaims = scheduledClaims
                          .map((c) => {
                            const acceptedDate = c.proposedDates.find((d) => d.status === 'ACCEPTED');
                            if (!acceptedDate) return null;
                            const appointmentDate = new Date(acceptedDate.date);
                            appointmentDate.setHours(0, 0, 0, 0);
                            if (appointmentDate < now) return null;
                            return { claim: c, date: appointmentDate, acceptedDate };
                          })
                          .filter(Boolean) as Array<{ claim: Claim; date: Date; acceptedDate: any }>;

                        if (upcomingClaims.length === 0) {
                          return (
                            <div className="p-3 text-center">
                              <p className="text-sm opacity-70 dark:opacity-60 text-secondary-on-container dark:text-gray-400">
                                No upcoming appointments.
                              </p>
                            </div>
                          );
                        }

                        // Sort by date
                        upcomingClaims.sort((a, b) => a.date.getTime() - b.date.getTime());

                        // Get the next date
                        const nextDate = upcomingClaims[0].date;
                        const nextDateStr = nextDate.toISOString().split('T')[0];

                        // Count how many claims have this same date
                        const claimsOnNextDate = upcomingClaims.filter((item) => {
                          const itemDateStr = item.date.toISOString().split('T')[0];
                          return itemDateStr === nextDateStr;
                        });

                        const firstClaim = claimsOnNextDate[0].claim;
                        const acceptedDate = claimsOnNextDate[0].acceptedDate;

                        return (
                          <div className="p-3 flex flex-col items-center">
                            <div
                              className="bg-surface/50 dark:bg-gray-700/50 p-4 rounded-lg text-sm backdrop-blur-sm border border-white/20 dark:border-gray-600/30 cursor-pointer hover:bg-surface/70 dark:hover:bg-gray-700/70 transition-colors w-full"
                              onClick={() => handleClaimSelection(firstClaim)}
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="font-medium text-secondary-on-container dark:text-gray-200 truncate text-center flex-1">
                                  {firstClaim.title}
                                </p>
                                {claimsOnNextDate.length > 1 && (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-on text-xs font-medium flex-shrink-0">
                                    {claimsOnNextDate.length}
                                  </span>
                                )}
                              </div>
                              <p className="opacity-80 dark:opacity-70 text-secondary-on-container dark:text-gray-300 text-center">
                                {new Date(acceptedDate.date).toLocaleDateString()} - {acceptedDate?.timeSlot}
                              </p>
                              {firstClaim.contractorName && (
                                <p className="opacity-70 dark:opacity-60 mt-1 text-secondary-on-container dark:text-gray-400 text-xs text-center">
                                  {firstClaim.contractorName}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

            {/* Card Content - Clickable to collapse */}
            <div 
              className="flex flex-col p-4 cursor-pointer relative"
              onClick={() => setIsHomeownerCardCollapsed(true)}
              title="Click to collapse"
            >
              {/* Homeowner Card Component */}
              <HomeownerCard
                name={displayHomeowner.name}
                address={displayHomeowner.address}
                builder={(() => {
                  // Prefer linked builder user over legacy text field
                  if (displayHomeowner.builderUserId && builderUsers) {
                    const linkedBuilder = builderUsers.find(bu => bu.id === displayHomeowner.builderUserId);
                    if (linkedBuilder) return linkedBuilder.name;
                  }
                  // Fallback to text field for unlinked homeowners
                  return displayHomeowner.builder || undefined;
                })()}
                project={displayHomeowner.jobName}
                closingDate={displayHomeowner.closingDate ? new Date(displayHomeowner.closingDate).toLocaleDateString() : undefined}
                phone={displayHomeowner.phone}
                email={displayHomeowner.email}
                clerkId={displayHomeowner.clerkId}
                inviteEmailRead={displayHomeowner.inviteEmailRead}
                isHomeownerView={isHomeownerView}
                onEdit={isAdmin ? () => {
                  handleOpenEditHomeowner();
                } : undefined}
                onViewAs={isAdmin && onViewAsHomeowner ? () => {
                  console.log("🚀 Dashboard received View As request");
                  onViewAsHomeowner(displayHomeowner);
                } : undefined}
              />
             </div>

             {/* Actions - Two columns on all viewports */}
             <div 
               className="mt-3 pt-3 px-3 pb-3 border-t border-surface-outline-variant/50 dark:border-gray-700/50 grid grid-cols-2 md:grid-cols-2 gap-2 items-center justify-center"
               onClick={(e) => e.stopPropagation()}
             >
                {/* Buttons removed from homeowner view - now in tabs */}
                {!isHomeownerView && (
                  <>
                    {/* Documents Button */}
                    <Button 
                      onClick={() => setShowDocsModal(true)} 
                      variant="outlined" 
                      icon={<FileText className="h-4 w-4" />}
                      className="!h-9 w-full md:w-auto"
                    >
                      Documents
                    </Button>
                    {/* Sub List Button - Show if subcontractor list exists */}
                    {displayHomeowner.subcontractorList && displayHomeowner.subcontractorList.length > 0 && (
                      <Button 
                        onClick={() => setShowSubListModal(true)} 
                        variant="outlined" 
                        icon={<HardHat className="h-4 w-4" />}
                        className="!h-9 w-full md:w-auto"
                      >
                        Sub List
                      </Button>
                    )}
                    {/* Punch List Button - Shows "BlueTag" on mobile and desktop */}
                    {(() => {
                      const reportKey = `bluetag_report_${displayHomeowner.id}`;
                      const hasReport = localStorage.getItem(reportKey) !== null;

                      return (
                        <Button
                          onClick={() => setCurrentTab('PUNCHLIST')}
                          variant="outlined"
                          icon={<ClipboardList className="h-4 w-4" />}
                          className="!h-9 w-full md:w-auto"
                        >
                          <span className="md:hidden">BlueTag</span>
                          <span className="hidden md:inline">BlueTag</span>
                        </Button>
                      );
                    })()}
                    {/* Calls Button - Show if homeowner has matched calls */}
                    {homeownerCalls.length > 0 && (
                      <Button 
                        onClick={() => {
                          // Navigate to Calls view with address filter
                          // Calls are matched by property address, not phone (callers use different numbers)
                          updateSearchParams({
                            view: 'calls',
                            search: displayHomeowner.address || ''
                          });
                        }}
                        variant="outlined"
                        icon={<Phone className="h-4 w-4" />}
                        className="!h-9 w-full md:w-auto"
                      >
                        Calls ({homeownerCalls.length})
                      </Button>
                    )}
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
                      className="!h-9 w-full md:w-auto"
                    >
                      Invite
                    </Button>
                  </>
                )}
              </div>

              {/* User Footer - Homeowner View Only */}
              {userRole === UserRole.HOMEOWNER && (
                <div className="mt-auto flex items-center gap-2 py-2 px-3 border-t border-gray-100 dark:border-gray-700 bg-surface-container/20 dark:bg-gray-700/20">
                  {/* Left: User Avatar */}
                  <div className="flex-shrink-0">
                    <UserButton
                      appearance={{
                        elements: {
                          userButtonTrigger: "!w-10 !h-10 !min-w-[40px] !min-h-[40px]",
                          userButtonAvatarBox: "!w-10 !h-10",
                          userButtonPopoverCard: "shadow-elevation-2 rounded-xl border border-gray-200",
                        }
                      }}
                    />
                  </div>
                  
                  {/* Middle: User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-surface-on dark:text-gray-100 truncate">
                        {(() => {
                          const { user } = useUser();
                          return user?.fullName || user?.firstName || displayHomeowner?.name || 'User';
                        })()}
                      </span>
                      <span className="text-xs text-surface-on-variant dark:text-gray-400">
                        Homeowner
                      </span>
                    </div>
                  </div>
                  
                  {/* Right: Sign Out Button */}
                  <SignOutButton>
                    <button className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 transition-colors" title="Sign Out">
                      <LogOut className="w-4 h-4 text-surface-on-variant dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                    </button>
                  </SignOutButton>
                </div>
              )}
            </div>
            )}
            {/* End Homeowner Card */}
            
          </FadeIn>
          {/* END LEFT SIDEBAR */}

          {/* RIGHT CONTENT AREA */}
          <FadeIn direction="up" delay={0.1} fullWidth className="flex-1 min-w-0 space-y-6">
            {/* Legacy tab-strip/back-button removed to prevent "ghost" UI flashing behind new views/modals. */}

            {/* Primary Tab Bar (Warranty/Tasks/Messages/etc.) */}
            <div className="sticky top-0 z-10">
              <div className="bg-background/95 dark:bg-gray-900/95 backdrop-blur border border-surface-outline-variant/40 dark:border-gray-700/50 rounded-2xl overflow-hidden">
                <div
                  ref={tabsContainerRef}
                  className="flex items-center gap-2 px-2 py-2 overflow-x-auto [-webkit-overflow-scrolling:touch]"
                  style={{ scrollbarWidth: 'none' } as React.CSSProperties}
                >
                  {availableTabs.map((tab) => {
                    const isActive = currentTab === tab;
                    const meta: Record<
                      Exclude<TabType, null>,
                      { label: string; icon: React.ReactNode }
                    > = {
                      CLAIMS: { label: 'Warranty', icon: <ClipboardList className="h-4 w-4" /> },
                      TASKS: { label: 'Tasks', icon: <CheckSquare className="h-4 w-4" /> },
                      MESSAGES: { label: 'Messages', icon: <Mail className="h-4 w-4" /> },
                      DOCUMENTS: { label: 'Docs', icon: <FileText className="h-4 w-4" /> },
                      MANUAL: { label: 'Manual', icon: <BookOpen className="h-4 w-4" /> },
                      HELP: { label: 'Help', icon: <HelpCircle className="h-4 w-4" /> },
                      CALLS: { label: 'Calls', icon: <Phone className="h-4 w-4" /> },
                      SCHEDULE: { label: 'Schedule', icon: <Calendar className="h-4 w-4" /> },
                      INVOICES: { label: 'Invoices', icon: <Receipt className="h-4 w-4" /> },
                      PUNCHLIST: { label: 'BlueTag', icon: <HardHat className="h-4 w-4" /> },
                      CHAT: { label: 'Chat', icon: <MessageCircle className="h-4 w-4" /> },
                    };

                    const { label, icon } = meta[tab] || { label: tab, icon: null };

                    return (
                      <button
                        key={tab}
                        type="button"
                        data-tab={tab}
                        onClick={() => setCurrentTab(tab)}
                        className={[
                          'flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-300',
                          // Base state with transparent border
                          'border border-transparent',
                          // Hover state: gray background, raised, shadow
                          'hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:-translate-y-0.5 hover:shadow-md',
                          // Active state: white background, blue text & border, RAISED with shadow (LOCKED)
                          isActive
                            ? '!bg-white dark:!bg-gray-800 !text-primary !border-primary -translate-y-0.5 shadow-md'
                            : 'bg-transparent text-surface-on dark:text-gray-100 hover:text-primary',
                        ].join(' ')}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {icon}
                        <span className="whitespace-nowrap">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

        {/* Content Area - Mobile Carousel (HIDDEN - now using desktop view for all) */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="hidden min-h-[calc(100vh-300px)] md:min-h-0 relative overflow-hidden"
        >
        <AnimatePresence mode={swipeProgress > 0 ? undefined : "wait"} initial={false}>
            {/* CLAIMS Tab */}
            <div 
              className="flex-shrink-0 snap-start min-h-[calc(100vh-300px)]" 
              style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', width: '100%' }}
            >
              <div className="w-full min-h-[calc(100vh-300px)]">
                <div className="max-w-7xl mx-auto">
                  {renderClaimsList(displayClaims, filteredClaimsForModal, isHomeownerView)}
                </div>
              </div>
            </div>

            {/* TASKS Tab - Admin Only */}
            {isAdmin && (
              <div 
                className="flex-shrink-0 snap-start min-h-[calc(100vh-300px)]" 
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', width: '100%' }}
              >
                <div className="w-full min-h-[calc(100vh-300px)]">
                  <div className="max-w-7xl mx-auto">
                    {renderTasksTab(userTasks, filteredTasksForModal, handleScheduleTaskWithAssignee, handleEvalTaskWithAssignee)}
                  </div>
                </div>
              </div>
            )}

            {/* MESSAGES Tab */}
            <div 
              className="flex-shrink-0 snap-start min-h-[calc(100vh-300px)]" 
              style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', width: '100%' }}
            >
              <div className="w-full min-h-[calc(100vh-300px)]">
                <div className="max-w-7xl mx-auto">
                  {renderMessagesTab()}
                </div>
              </div>
            </div>

            {/* DOCUMENTS Tab - Homeowner Only */}
            {userRole === UserRole.HOMEOWNER && (
              <div 
                className="flex-shrink-0 snap-start min-h-[calc(100vh-300px)]" 
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', width: '100%' }}
              >
                <div className="w-full min-h-[calc(100vh-300px)]">
                  <div className="w-full md:max-w-7xl md:mx-auto md:pb-4">
                    <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden">
                      <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
                        <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Account Documents
                        </h2>
                      </div>
                      
                      <div className="p-6 bg-surface dark:bg-gray-800">
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
                                  <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-2 flex items-center justify-end gap-1">
                                    {isPDF && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const link = document.createElement('a');
                                            link.href = `https://drive.google.com/drive/folders`;
                                            link.target = '_blank';
                                            link.click();
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
                                  </div>
                                  
                                  <div 
                                    className="w-full aspect-[3/4] bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden cursor-pointer relative group"
                                    onClick={() => {
                                      if (isPDF) {
                                        setSelectedDocument(doc);
                                        setIsPDFViewerOpen(true);
                                      } else if (doc.type === 'IMAGE' || doc.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || doc.url?.startsWith('data:image/')) {
                                        window.open(doc.url, '_blank');
                                      } else {
                                        window.open(doc.url, '_blank');
                                      }
                                    }}
                                  >
                                    {isPDF ? (
                                      <div className="relative w-full h-full">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                          <FileText className="h-16 w-16 text-primary mb-2" />
                                          <span className="text-xs text-surface-on-variant dark:text-gray-400 font-medium">PDF</span>
                                        </div>
                                      </div>
                                    ) : doc.type === 'IMAGE' || doc.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || doc.url?.startsWith('data:image/') ? (
                                      <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center">
                                        <FileText className="h-12 w-12 text-blue-600 mb-2" />
                                        <span className="text-xs text-surface-on-variant dark:text-gray-400">File</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="p-3 bg-surface-container dark:bg-gray-700">
                                    <p className="text-xs font-medium text-surface-on dark:text-gray-100 truncate" title={doc.name}>
                                      {doc.name}
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
              </div>
            )}

            {/* MANUAL Tab - Homeowner Only */}
            {userRole === UserRole.HOMEOWNER && (
              <div 
                className="flex-shrink-0 snap-start min-h-[calc(100vh-300px)]" 
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', width: '100%' }}
              >
                <div className="w-full min-h-[calc(100vh-300px)]">
                  <div className="max-w-7xl mx-auto">
                    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                      <HomeownerManual homeownerId={activeHomeowner?.id} />
                    </Suspense>
                  </div>
                </div>
              </div>
            )}

            {/* HELP Tab - Homeowner Only */}
            {userRole === UserRole.HOMEOWNER && (
              <div 
                className="flex-shrink-0 snap-start min-h-[calc(100vh-300px)]" 
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', width: '100%' }}
              >
                <div className="w-full min-h-[calc(100vh-300px)] bg-gray-50 dark:bg-gray-900">
                  <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <HomeownerWarrantyGuide />
                  </Suspense>
                </div>
              </div>
            )}

            {/* CALLS Tab - Admin Only */}
            {isAdmin && (
              <div 
                className="flex-shrink-0 snap-start min-h-[calc(100vh-300px)]" 
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', width: '100%' }}
              >
                <div className="w-full min-h-[calc(100vh-300px)]">
                  <div className="max-w-7xl mx-auto py-4">
                    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                      <AIIntakeDashboard 
                        onNavigate={onNavigate}
                        onSelectHomeowner={(homeownerId) => {
                          const homeowner = homeowners.find(h => h.id === homeownerId);
                          if (homeowner && onSelectHomeowner) {
                            onSelectHomeowner(homeowner);
                          }
                        }}
                        activeHomeownerId={safeActiveHomeownerId}
                        isAdmin={isAdmin}
                        userRole={userRole}
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            )}

            {/* INVOICES Tab - Administrator Only (hidden for employees) - NO GHOST HEADERS! */}
            {isAdmin && currentUser?.role !== 'Employee' && (
              <div 
                className="flex-shrink-0 snap-start min-h-[calc(100vh-300px)]" 
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', width: '100%' }}
              >
                <div className="w-full min-h-[calc(100vh-300px)]">
                  <div className="max-w-7xl mx-auto py-4">
                    {currentTab === 'INVOICES' ? (
                      <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>}>
                        <CBSBooksPageWrapper />
                      </Suspense>
                    ) : (
                      <div className="flex items-center justify-center h-full text-surface-on-variant dark:text-gray-400">
                        Switch to Invoices tab to view
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* INVOICES Tab - Administrator Only (hidden for employees) - Duplicate for carousel - NO GHOST HEADERS! */}
            {isAdmin && currentUser?.role !== 'Employee' && (
              <div
                className="flex-shrink-0 snap-start min-h-[calc(100vh-300px)]"
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', width: '100%' }}
              >
                <div className="w-full min-h-[calc(100vh-300px)]">
                  <div className="max-w-7xl mx-auto py-4">
                    {currentTab === 'INVOICES' ? (
                      <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>}>
                        <CBSBooksPageWrapper />
                      </Suspense>
                    ) : (
                      <div className="flex items-center justify-center h-full text-surface-on-variant dark:text-gray-400">
                        Switch to Invoices tab to view
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS Tab - Mobile Scroll Section - Removed (now only renders in main desktop area) */}
        </AnimatePresence>
        </div>

        {/* Content Area - Full-height layout with settings overlay */}
        {currentTab && (() => {
          const overlayInner = (
            <>
              {/* Main Content Area - Standard full-height flex layout */}
              <main className="flex-1 relative flex flex-col overflow-hidden bg-background">
                {(() => {
                  return (
                    <div className="w-full h-full overflow-y-auto">
                      <AnimatePresence mode="wait" initial={false}>
                      {/* Removed floating close FAB (use browser/back navigation instead). */}

          {currentTab === 'CLAIMS' && (
            <AnimatedTabContent tabKey="claims" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  {renderClaimsList(displayClaims, filteredClaimsForModal, isHomeownerView)}
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {currentTab === 'TASKS' && isAdmin && (
            <AnimatedTabContent tabKey="tasks" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <div className="flex flex-col h-full md:h-auto">
                    {renderTasksTab(userTasks, filteredTasksForModal, handleScheduleTaskWithAssignee, handleEvalTaskWithAssignee)}
                  </div>
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {currentTab === 'MESSAGES' && (
            <AnimatedTabContent tabKey="messages" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  {renderMessagesTab()}
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {/* CALLS Tab - Admin Only */}
          {currentTab === 'CALLS' && isAdmin && (
            <AnimatedTabContent tabKey="calls" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <div className="flex flex-col h-full md:h-auto">
                    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                      <AIIntakeDashboard 
                        onNavigate={onNavigate}
                        onSelectHomeowner={(homeownerId) => {
                          const homeowner = homeowners.find(h => h.id === homeownerId);
                          if (homeowner && onSelectHomeowner) {
                            onSelectHomeowner(homeowner);
                          }
                        }}
                        activeHomeownerId={safeActiveHomeownerId}
                        isAdmin={isAdmin}
                        userRole={userRole}
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {/* SCHEDULE Tab - Admin and Homeowners */}
          {currentTab === 'SCHEDULE' && (isAdmin || isHomeownerView) && (
            <AnimatedTabContent tabKey="schedule" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <div className="bg-surface dark:bg-gray-800 md:rounded-3xl md:border border-surface-outline-variant dark:border-gray-700 flex flex-col h-full">
                    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                      <ScheduleTab 
                        homeowners={homeowners}
                        currentUserId={currentUser?.id}
                        claims={claims}
                        userRole={userRole}
                        activeHomeownerId={safeActiveHomeownerId}
                        isAdmin={isAdmin}
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {/* CHAT Tab - Admin Only - Full-screen team chat interface */}
          {currentTab === 'CHAT' && isAdmin && (
            <AnimatedTabContent tabKey="chat" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col">
                <TeamChat
                  currentUserId={currentUser?.id || ''}
                  currentUserName={currentUser?.name || 'Unknown User'}
                  onOpenHomeownerModal={(homeownerId) => {
                    const homeowner = homeowners.find((h) => h.id === homeownerId);
                    if (homeowner && onSelectHomeowner) {
                      onSelectHomeowner(homeowner);
                    }
                  }}
                />
              </div>
            </AnimatedTabContent>
          )}

          {currentTab === 'INVOICES' && isAdmin && currentUser?.role !== 'Employee' && (
            <AnimatedTabContent tabKey="invoices">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>}>
                    <CBSBooksPageWrapper />
                  </Suspense>
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {currentTab === 'DOCUMENTS' && (
            <AnimatedTabContent tabKey="documents">
              <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                <div className="flex flex-col h-full md:h-auto">
                  <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
                      <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Account Documents
                      </h2>
                    </div>
                  
                  <div className="p-6 bg-surface dark:bg-gray-800">
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
                                  } else {
                                    // For other types, try to open in new tab
                                    window.open(doc.url, '_blank');
                                  }
                                }}
                              >
                                {isPDF ? (
                                  <div className="relative w-full h-full">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <FileText className="h-16 w-16 text-primary mb-2" />
                                      <span className="text-xs text-surface-on-variant dark:text-gray-400 font-medium">PDF</span>
                                    </div>
                                  </div>
                                ) : doc.type === 'IMAGE' || doc.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || doc.url?.startsWith('data:image/') ? (
                                  <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center justify-center">
                                    <FileText className="h-12 w-12 text-blue-600 mb-2" />
                                    <span className="text-xs text-surface-on-variant dark:text-gray-400">File</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Document Name */}
                              <div className="p-3 bg-surface-container dark:bg-gray-700">
                                <p className="text-xs font-medium text-surface-on dark:text-gray-100 truncate" title={doc.name}>
                                  {doc.name}
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
            </AnimatedTabContent>
          )}

          {currentTab === 'MANUAL' && (
            <AnimatedTabContent tabKey="manual">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <div className="flex flex-col h-full md:h-auto">
                    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                      <HomeownerManual homeownerId={activeHomeowner?.id} />
                    </Suspense>
                  </div>
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {/* HELP Tab - Homeowner Only */}
          {currentTab === 'HELP' && userRole === UserRole.HOMEOWNER && (
            <AnimatedTabContent tabKey="help">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <div className="flex flex-col h-full md:h-auto bg-gray-50 dark:bg-gray-900">
                    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                      <HomeownerWarrantyGuide />
                    </Suspense>
                  </div>
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {/* SETTINGS Tab is now rendered ABOVE (outside AnimatePresence) */}

                      </AnimatePresence>
                    </div>
                  );
                })()}
              </main>
            </>
          );

          return (
            <div className="relative bg-transparent flex flex-col pt-0">
              {overlayInner}
            </div>
          );
        })()}
        {/* END RIGHT CONTENT AREA */}
        </FadeIn>
        </StaggerContainer>
        {/* END MAIN LAYOUT CONTAINER */}
        </div>

        {/* REMOVED: Floating Team Chat (Admin) - redundant with Communication section button */}
        {/* {isAdmin && (
          <>
            {!isChatWidgetOpen && (
              <button
                type="button"
                onClick={() => setIsChatWidgetOpen(true)}
                className="fixed bottom-4 right-4 z-50 h-14 w-14 bg-white hover:bg-gray-50 text-primary border-2 border-primary rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                aria-label="Open Team Chat"
              >
                <MessageCircle className="h-6 w-6" />
              </button>
            )}

            {isChatWidgetOpen && (
              <Suspense fallback={null}>
                <FloatingChatWidget
                  currentUserId={currentUser?.id || ''}
                  currentUserName={currentUser?.name || 'Unknown User'}
                  isOpen={isChatWidgetOpen}
                  onOpenChange={setIsChatWidgetOpen}
                  onOpenHomeownerModal={(homeownerId) => {
                    const homeowner = homeowners.find((h) => h.id === homeownerId);
                    if (homeowner && onSelectHomeowner) {
                      onSelectHomeowner(homeowner);
                      setCurrentTab('CLAIMS');
                    }
                  }}
                />
              </Suspense>
            )}
          </>
        )} */}

        {/* DOCUMENTS MODAL - Now opened via button in homeowner card */}
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

        {/* HOMEOWNER CALLS MODAL - REMOVED
            This modal has been replaced by deep link navigation to /calls page with search filter.
            See CALLS-DEEP-LINK-FEATURE.md for details.
            The old modal code has been permanently removed to prevent JSX parsing issues. */}

        {/* PUNCH LIST APP MODAL */}
        {currentTab === 'PUNCHLIST' && effectiveHomeowner && createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setCurrentTab(null);
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
                  {/* ✅ FIX: Defensive check - ensure homeowner data exists before rendering */}
                  {effectiveHomeowner ? (
                    <PunchListApp
                      homeowner={effectiveHomeowner}
                      onClose={() => setCurrentTab(null)}
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
                ) : (
                  <div className="flex items-center justify-center h-full text-surface-on-variant dark:text-gray-400">
                    <p>Unable to load BlueTag. Homeowner data missing.</p>
                  </div>
                )}
                </Suspense>
              </div>
              
              {/* Close button at bottom right */}
              <button
                onClick={() => setCurrentTab(null)}
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
                            {builderUsers.map(bu => (
                              <option key={bu.id} value={bu.id}>{bu.name}</option>
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
        {showNewMessageModal && createPortal(
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
            style={{ overscrollBehavior: 'contain' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNewMessageModal(false);
            }}
          >
             <div className="bg-surface dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] flex flex-col h-[85vh]">
                <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700 shrink-0">
                  <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    New Message
                  </h2>
                  <button onClick={() => setShowNewMessageModal(false)} className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100">
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
                        onChange={(value) => setNewMessageRecipientId(value)}
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
                  )}

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
                  
                  {/* Save as Template Button - Admin Only */}
                  {isAdmin && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleOpenMessageTemplateCreator()}
                        className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 px-3 py-1.5 hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <Save className="h-4 w-4" />
                        Save as Template
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 flex justify-end gap-3 shrink-0 border-t border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30">
                  <Button
                    variant="filled"
                    onClick={() => setShowNewMessageModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="filled"
                    onClick={() => handleCreateNewThread()}
                    disabled={!newMessageSubject || !newMessageContent || isSendingMessage || (!isAdmin && !newMessageRecipientId)}
                    icon={isSendingMessage ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <Send className="h-4 w-4" />}
                  >
                    Send Message
                  </Button>
                </div>
             </div>
          </div>,
          document.body
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
        
        {/* Claim Suggestion Modal */}
        {showClaimSuggestionModal && createPortal(
          <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
            <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 w-full max-w-md mx-4 overflow-hidden flex flex-col animate-[scale-in_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
                <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">
                  Submit a Warranty Claim?
                </h2>
              </div>
              <div className="p-6 bg-surface dark:bg-gray-800">
                <p className="text-surface-on dark:text-gray-200">
                  It looks like you might be reporting a repair issue. For the best service and tracking, please submit this as a Warranty Claim.
                </p>
              </div>
              <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 flex flex-col gap-2 bg-surface-container dark:bg-gray-700">
                <Button 
                  variant="filled" 
                  onClick={handleRedirectToWarranty}
                  className="w-full"
                >
                  Go to Warranty Tab
                </Button>
                <Button 
                  variant="text" 
                  onClick={() => {
                    setShowClaimSuggestionModal(false);
                    handleCreateNewThread(true);
                  }}
                  className="w-full"
                >
                  No, send as a regular message
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // 2. ADMIN/BUILDER PLACEHOLDER VIEW (When no homeowner is selected)
  if ((isAdmin || isBuilder) && !targetHomeowner) {
    return (
      <>
        {renderModals()}
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 px-4">
          <div className="bg-surface-container-high dark:bg-gray-700 p-6 rounded-full">
            <Search className="h-12 w-12 text-surface-outline dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">Select a Homeowner</h2>
            <p className="text-surface-on-variant dark:text-gray-400 mt-2 max-w-sm mx-auto">
              Search for a homeowner to view their warranty claims, tasks, and account details.
            </p>
            {isBuilder && (
              <p className="text-surface-on-variant dark:text-gray-400 mt-1 text-xs">
                You are logged in as a Builder. Access is limited to your homeowners.
              </p>
            )}
          </div>
          
          {/* Homeowner Search Input */}
          {searchQuery !== undefined && onSearchChange && searchResults && onSelectHomeowner && (
            <div className="w-full max-w-md relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-outline-variant dark:text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search homeowners..."
                  className="w-full bg-white dark:bg-gray-700 rounded-2xl pl-12 pr-10 py-4 text-base border-2 border-surface-outline-variant dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none text-surface-on dark:text-gray-100 transition-all"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button 
                    onClick={() => onSearchChange('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-outline-variant hover:text-surface-on dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {searchQuery && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 max-h-96 overflow-y-auto">
                  {searchResults.map((homeowner) => (
                    <button
                      key={homeowner.id}
                      onClick={() => {
                        onSelectHomeowner(homeowner);
                        onSearchChange('');
                        setIsHomeownerCardCollapsed(false);
                      }}
                      className="w-full text-left px-6 py-4 hover:bg-surface-container dark:hover:bg-gray-700 border-b border-surface-outline-variant dark:border-gray-700 last:border-0 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-surface-on dark:text-gray-100 truncate">{homeowner.name}</p>
                          {homeowner.builder && (
                            <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-1">
                              {homeowner.builder}
                            </p>
                          )}
                          {homeowner.jobName && (
                            <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">{homeowner.jobName}</p>
                          )}
                          {homeowner.address && (
                            <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">{homeowner.address}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* No Results Message */}
              {searchQuery && searchResults.length === 0 && (
                <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 p-6 text-center">
                  <p className="text-surface-on-variant dark:text-gray-400">No homeowners found</p>
                </div>
              )}
            </div>
          )}
        </div>
        {/* REMOVED: Floating Chat Widget (redundant - use "Team Chat" button in Communication section instead) */}
        {/* {isAdmin && (
          <>
            {!isChatWidgetOpen && (
              <button
                type="button"
                onClick={() => setIsChatWidgetOpen(true)}
                className="fixed bottom-4 right-4 z-50 h-14 w-14 bg-white hover:bg-gray-50 text-primary border-2 border-primary rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                aria-label="Open Team Chat"
              >
                <MessageCircle className="h-6 w-6" />
              </button>
            )}

            {isChatWidgetOpen && (
              <Suspense fallback={null}>
                <FloatingChatWidget
                  currentUserId={currentUser?.id || ''}
                  currentUserName={currentUser?.name || 'Unknown User'}
                  isOpen={isChatWidgetOpen}
                  onOpenChange={setIsChatWidgetOpen}
                  onOpenHomeownerModal={(homeownerId) => {
                    const homeowner = homeowners.find((h) => h.id === homeownerId);
                    if (homeowner && onSelectHomeowner) {
                      onSelectHomeowner(homeowner);
                      setCurrentTab('CLAIMS');
                    }
                  }}
                />
              </Suspense>
            )}
          </>
        )} */}
      </>
    );
  }

  // 3. HOMEOWNER VIEW WITHOUT SELECTED HOMEOWNER (Admin/Builder switched to homeowner view without selection)
  // Show prompt to select a homeowner
  if (userRole === UserRole.HOMEOWNER && isAdminAccount && !targetHomeowner && (!activeHomeowner || activeHomeowner.id === 'placeholder')) {
    return (
      <>
        {renderModals()}
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 px-4">
          <div className="bg-surface-container-high dark:bg-gray-700 p-6 rounded-full">
            <Search className="h-12 w-12 text-surface-outline dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">Select a Homeowner</h2>
            <p className="text-surface-on-variant dark:text-gray-400 mt-2 max-w-sm mx-auto">
              You are in Homeowner View. Search for a homeowner to view their account.
            </p>
          </div>
          
          {/* Homeowner Search Input */}
          {searchQuery !== undefined && onSearchChange && searchResults && onSelectHomeowner && (
            <div className="w-full max-w-md relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-outline-variant dark:text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search homeowners..."
                  className="w-full bg-white dark:bg-gray-700 rounded-2xl pl-12 pr-10 py-4 text-base border-2 border-surface-outline-variant dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none text-surface-on dark:text-gray-100 transition-all"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button 
                    onClick={() => onSearchChange('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-outline-variant hover:text-surface-on dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {searchQuery && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 max-h-96 overflow-y-auto">
                  {searchResults.map((homeowner) => (
                    <button
                      key={homeowner.id}
                      onClick={() => {
                        onSelectHomeowner(homeowner);
                        onSearchChange('');
                        setIsHomeownerCardCollapsed(false);
                      }}
                      className="w-full text-left px-6 py-4 hover:bg-surface-container dark:hover:bg-gray-700 border-b border-surface-outline-variant dark:border-gray-700 last:border-0 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-surface-on dark:text-gray-100 truncate">{homeowner.name}</p>
                          {homeowner.builder && (
                            <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-1">
                              {homeowner.builder}
                            </p>
                          )}
                          {homeowner.jobName && (
                            <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">{homeowner.jobName}</p>
                          )}
                          {homeowner.address && (
                            <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">{homeowner.address}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* No Results Message */}
              {searchQuery && searchResults.length === 0 && (
                <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 p-6 text-center">
                  <p className="text-surface-on-variant dark:text-gray-400">No homeowners found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  // 4. FALLBACK - Should not reach here if logic is correct
  // This handles any edge cases where we don't have a homeowner selected
  return (
    <>
      {renderModals()}
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 px-4">
        <div className="bg-surface-container-high dark:bg-gray-700 p-6 rounded-full">
          <Search className="h-12 w-12 text-surface-outline dark:text-gray-400" />
        </div>
        <div>
          <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">Select a Homeowner</h2>
          <p className="text-surface-on-variant dark:text-gray-400 mt-2 max-w-sm mx-auto">
            Search for a homeowner to view their warranty claims, tasks, and account details.
          </p>
        </div>
        
        {/* Homeowner Search Input */}
        {searchQuery !== undefined && onSearchChange && searchResults && onSelectHomeowner && (
          <div className="w-full max-w-md relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-outline-variant dark:text-gray-400" />
              <input 
                type="text" 
                placeholder="Search homeowners..."
                className="w-full bg-white dark:bg-gray-700 rounded-2xl pl-12 pr-10 py-4 text-base border-2 border-surface-outline-variant dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none text-surface-on dark:text-gray-100 transition-all"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => onSearchChange('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-outline-variant hover:text-surface-on dark:hover:text-gray-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {searchQuery && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 max-h-96 overflow-y-auto">
                {searchResults.map((homeowner) => (
                  <button
                    key={homeowner.id}
                    onClick={() => {
                      onSelectHomeowner(homeowner);
                      onSearchChange('');
                    }}
                    className="w-full text-left px-6 py-4 hover:bg-surface-container dark:hover:bg-gray-700 border-b border-surface-outline-variant dark:border-gray-700 last:border-0 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-surface-on dark:text-gray-100 truncate">{homeowner.name}</p>
                        {homeowner.builder && (
                          <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-1">
                            {homeowner.builder}
                          </p>
                        )}
                        {homeowner.jobName && (
                          <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">{homeowner.jobName}</p>
                        )}
                        {homeowner.address && (
                          <p className="text-sm text-surface-on-variant dark:text-gray-300 truncate mt-0.5">{homeowner.address}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* No Results Message */}
            {searchQuery && searchResults.length === 0 && (
              <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 p-6 text-center">
                <p className="text-surface-on-variant dark:text-gray-400">No homeowners found</p>
              </div>
            )}
          </div>
        )}
      </div>


    </>
  );
};

export default Dashboard;

