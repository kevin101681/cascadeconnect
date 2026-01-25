
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
import { useUI } from '../contexts/UIContext';
import { calls, claims as claimsSchema, homeowners as homeownersTable } from '../db/schema';
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

// Phase 3: Extract Tab Components
// Import extracted tab wrappers (Priority 1: Simple tabs)
import { DocumentsTab } from './dashboard/tabs/DocumentsTab';
import { CallsTab } from './dashboard/tabs/CallsTab';
import { ScheduleTabWrapper } from './dashboard/tabs/ScheduleTabWrapper';
import { InvoicesTab } from './dashboard/tabs/InvoicesTab';
import { ChatTab } from './dashboard/tabs/ChatTab';
// Phase 3B: Complex tabs
import { MessagesTab } from './dashboard/tabs/MessagesTab';
import { TasksTab } from './dashboard/tabs/TasksTab';
import { ClaimsTab } from './dashboard/tabs/ClaimsTab';

// Phase 4: Import utility functions
import { formatDate, formatDateForExcel, formatTaskDateAssigned, getISODateString } from '../lib/utils/dateHelpers';
import { 
  formatClaimNumber, 
  isClaimCompleted, 
  isClaimOpen, 
  isClaimReviewed,
  findAcceptedScheduledDate,
  findServiceOrderDate,
  calculateClaimCounts,
  filterClaimsByStatus,
  generateClaimsExcelFileName,
  prepareClaimsForExport
} from '../lib/utils/claimHelpers';
import { isPDFDocument } from '../lib/utils/documentHelpers';

// Phase 4 Wave 2: Import dashboard hooks for state management
import { useClaimsData } from '../hooks/dashboard/useClaimsData';
import { useTasksData } from '../hooks/dashboard/useTasksData';
import { useMessagesData } from '../hooks/dashboard/useMessagesData';
// Phase 5 Wave 1: Import message workflow hook
import { useMessageWorkflow } from '../hooks/dashboard/useMessageWorkflow';
// Phase 5 Wave 2: Import initialization hook
// Import TabType from initialization hook to ensure type consistency
import { useDashboardInitialization, type TabType } from '../hooks/dashboard/useDashboardInitialization';
// Phase 5 Wave 3: Import modal management hook
import { useModalManagement } from '../hooks/dashboard/useModalManagement';

// Lazy-load heavy dashboard tabs / tools so they don't ship in the initial bundle.
const HomeownerManual = React.lazy(() => import('./HomeownerManual'));
const HomeownerWarrantyGuide = React.lazy(() =>
  import('./HomeownerWarrantyGuide').then((m) => ({ default: m.HomeownerWarrantyGuide }))
);

// InvoicesFullView now managed by AppShell - no longer imported here
// Lazy load heavy components to improve initial load time
// Add error handling for failed dynamic imports
const PdfFlipViewer3D = React.lazy(() => import('./PdfFlipViewer3D').catch(err => {
  console.error('Failed to load PdfFlipViewer3D:', err);
  return { default: () => <div className="p-4 text-red-500">Failed to load PDF viewer. Please refresh the page.</div> };
}));

// Lazy load CBSBooksPageWrapper for Invoices tab (admin only)
const CBSBooksPageWrapper = React.lazy(() => import('./pages/CBSBooksPageWrapper').catch(err => {
  console.error('Failed to load CBSBooksPageWrapper:', err);
  return { default: () => <div>Error loading Invoices</div> };
}));

// Lazy-load react-pageflip (heavy) so it doesn't ship on initial dashboard load.
const HTMLFlipBook = React.lazy(() => import('react-pageflip'));

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

// Tab types for dashboard navigation
// Now imported from useDashboardInitialization for consistency

export interface DashboardProps {
  // Tab types for dashboard navigation
  claims: Claim[];
  userRole: UserRole;
  onSelectClaim: (claim: Claim, startInEditMode?: boolean) => void;
  onNewClaim: (homeownerId?: string) => void;
  onCreateClaim?: (data: Partial<Claim>) => void;
  homeowners: Homeowner[];
  activeHomeowner: Homeowner | null;
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
  initialTab?: TabType; // Accept any tab type for flexibility
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
  onOpenTemplatesModal?: (tab?: 'warranty' | 'messages', prefill?: {subject?: string; body?: string}) => void;
}

export const AdminDashboard: React.FC<DashboardProps> = ({ 
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
  onDataReset,
  onOpenTemplatesModal
}) => {
  // Phase 6.3: AdminDashboard is ONLY for Admins/Employees/Builders
  // Hardcode role flags since homeowners use HomeownerDashboard
  const isAdmin = userRole === UserRole.ADMIN;
  const isBuilder = userRole === UserRole.BUILDER;
  const isHomeowner = false; // Homeowners use HomeownerDashboard now
  
  // Phase 5 Wave 2: Initialize dashboard (URL, responsive, deep-links)
  const initialization = useDashboardInitialization();
  const {
    searchParams,
    updateSearchParams,
    currentTab,
    setCurrentTab,
    isMobileView,
    userInteractionRef,
    initialLoadRef,
    mountTimeRef,
    previousTabRef,
    isReady
  } = initialization;
  
  // Phase 5 Wave 3: Initialize modal management
  const modals = useModalManagement();
  const {
    selectedDocument,
    isPDFViewerOpen,
    openPDFViewer,
    closePDFViewer,
    expandedDescription,
    showInviteModal,
    setShowInviteModal,
    inviteName,
    inviteEmail,
    invitePhone,
    inviteAddress,
    inviteBody,
    isDrafting,
    openInviteModal,
    closeInviteModal,
    setInviteName,
    setInviteEmail,
    setInvitePhone,
    setInviteAddress,
    setInviteBody,
    setIsDrafting,
    resetInviteForm,
    showDocsModal,
    setShowDocsModal,
    isDocUploading,
    openDocsModal,
    closeDocsModal,
    setIsDocUploading,
    showEditHomeownerModal,
    setShowEditHomeownerModal,
    editHomeownerName: editName,
    editHomeownerEmail: editEmail,
    editHomeownerPhone: editPhone,
    editHomeownerAddress: editStreet,
    editHomeownerStreet2: editStreet2,
    editHomeownerCity: editCity,
    editHomeownerState: editState,
    editHomeownerZip: editZip,
    editHomeownerBuilder: editBuilder,
    editHomeownerBuilderId: editBuilderId,
    editHomeownerJobName: editJobName,
    editHomeownerClosingDate: editClosingDate,
    editSubFile,
    editParsedSubs,
    isParsingSubs,
    openEditHomeownerModal,
    closeEditHomeownerModal,
    setEditHomeownerName: setEditName,
    setEditHomeownerEmail: setEditEmail,
    setEditHomeownerPhone: setEditPhone,
    setEditHomeownerAddress: setEditStreet,
    setEditHomeownerStreet2: setEditStreet2,
    setEditHomeownerCity: setEditCity,
    setEditHomeownerState: setEditState,
    setEditHomeownerZip: setEditZip,
    setEditHomeownerBuilder: setEditBuilder,
    setEditHomeownerBuilderId: setEditBuilderId,
    setEditHomeownerJobName: setEditJobName,
    setEditHomeownerClosingDate: setEditClosingDate,
    setEditSubFile,
    setEditParsedSubs,
    setIsParsingSubs,
    showSubListModal,
    setShowSubListModal,
    openSubListModal,
    closeSubListModal,
    isAnySecondaryModalOpen
  } = modals;
  
  // --- Effective Homeowner (used throughout component) ---
  // Define early to prevent "Cannot access before initialization" errors
  const effectiveHomeowner = (isAdmin || isBuilder) ? targetHomeowner : activeHomeowner;
  
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
  
  // ============================================================================
  // URL-DERIVED STATE (needed by hooks below)
  // ============================================================================
  
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
  
  // ============================================================================
  // Phase 4 Wave 2: Custom Hooks for State Management
  // ============================================================================
  
  // Claims data management hook
  const claimsData = useClaimsData({
    claims,
    initialFilter: 'Open',
    onClaimDeleted: (claimId) => {
      // Clear selection if deleted claim was selected
      if (selectedClaimForModal?.id === claimId) {
        setSelectedClaimForModal(null);
      }
      // Parent will re-render with updated claims from App.tsx
    },
    onClaimsDeleted: (claimIds) => {
      // Clear selection if any deleted claim was selected
      if (selectedClaimForModal && claimIds.includes(selectedClaimForModal.id)) {
        setSelectedClaimForModal(null);
      }
      // Parent will re-render with updated claims from App.txt
    }
  });
  
  // Tasks data management hook  
  const tasksData = useTasksData({
    tasks,
    currentUserId: currentUser.id,
    initialFilter: 'open'
  });
  
  // Messages data management hook
  const messagesData = useMessagesData({
    messages,
    initialThreadId
  });
  
  // Phase 5 Wave 1: Message workflow hook for complex operations
  const messageWorkflow = useMessageWorkflow({
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
    setIsSendingMessage: messagesData.setIsSendingMessage,
    setShowClaimSuggestionModal: messagesData.setShowClaimSuggestionModal,
    setShowNewMessageModal: messagesData.setShowNewMessageModal,
    setReplyContent: messagesData.setReplyContent,
    setReplyExpanded: (expanded: boolean) => setReplyExpanded(expanded),
    resetCompositionForm: messagesData.resetCompositionForm
  });
  
  // Extract values from hooks for use in component (MUST be done immediately after hook calls)
  const { filter: claimsFilter, setFilter: setClaimsFilter, filteredClaims: filteredClaimsForModal, selectedClaimIds, setSelectedClaimIds, toggleClaimSelection: handleToggleClaimSelection, isCreatingNewClaim, setIsCreatingNewClaim, exportToExcel: handleExportToExcel, deleteClaim: handleDeleteClaim, bulkDeleteClaims: handleBulkDeleteClaims } = claimsData;
  const { filter: tasksFilter, setFilter: setTasksFilter, userTasks, filteredTasks: filteredTasksForModal, showNewTaskModal, setShowNewTaskModal, newTaskTitle, setNewTaskTitle, newTaskAssignee, setNewTaskAssignee, newTaskNotes, setNewTaskNotes } = tasksData;
  const { 
    selectedThreadId, 
    selectThread: setSelectedThreadId, 
    selectedThread: selectedThreadFromHook,
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
    loadTemplates: loadMessageTemplates,
    saveTemplates: saveMessageTemplates,
    applyTemplate: handleMessageTemplateSelect,
    deleteTemplate: handleDeleteMessageTemplate,
    showClaimSuggestionModal,
    setShowClaimSuggestionModal,
    isSendingMessage,
    setIsSendingMessage
  } = messagesData;
  
  // ============================================================================
  // Initialization complete - all URL/responsive logic now in useDashboardInitialization hook
  // Modal management now in useModalManagement hook (Phase 5 Wave 3)
  // ============================================================================
  
  // REMOVED: PDF Viewer state - NOW PROVIDED BY useModalManagement HOOK
  // const [selectedDocument, setSelectedDocument] = useState<HomeownerDocument | null>(null);
  // const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);

  // Modal store for notes
  const { onOpen: openModal } = useModalStore();

  // REMOVED: Team Chat widget state - Now managed in App.tsx
  // const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false);
  
  // Manual page viewer state
  const [manualPageDimensions, setManualPageDimensions] = useState({ width: 800, height: 1200 });
  const manualFlipBookRef = useRef<any>(null);
  
  // REMOVED: Description expand popup state - NOW PROVIDED BY useModalManagement HOOK
  // const [expandedDescription, setExpandedDescription] = useState<Claim | null>(null);
  
  // REMOVED: User interaction tracking - NOW PROVIDED BY useDashboardInitialization HOOK
  // const initialLoadRef = useRef(true);
  // const mountTimeRef = useRef(Date.now());
  // const userInteractionRef = useRef(false);
  // const previousTabRef = useRef<TabType>(null);
  
  // REMOVED: URL State Management - NOW PROVIDED BY useDashboardInitialization HOOK
  // const [searchParams, setSearchParams] = useState(...);
  // const updateSearchParams = useCallback(...);
  // useEffect(() => { /* popstate listener */ }, []);
  // useEffect(() => { /* deep-link bootstrap */ }, []);
  
  // REMOVED: Mobile detection - NOW PROVIDED BY useDashboardInitialization HOOK
  // const [isMobileView, setIsMobileView] = useState(...);
  // useEffect(() => { /* resize listener */ }, []);
  
  // REMOVED: Responsive initialization - NOW PROVIDED BY useDashboardInitialization HOOK
  // useEffect(() => { /* auto-open claims on desktop */ }, []);
  
  // REMOVED: Current tab derivation - NOW PROVIDED BY useDashboardInitialization HOOK
  // const currentTab = useMemo<TabType>(...);
  // const setCurrentTab = useCallback(...);
  
  // Auto-open "New Claim" modal when URL contains ?new=true
  useEffect(() => {
    const newParam = searchParams.get('new');
    const view = searchParams.get('view');
    
    // If navigating to claims tab with new=true, open the new claim form
    if (view === 'claims' && newParam === 'true') {
      console.log('🔗 Auto-opening new claim form from URL parameter');
      setIsCreatingNewClaim(true);
      
      // Clean up URL to prevent re-opening on refresh
      setTimeout(() => {
        updateSearchParams({ new: null });
      }, 100);
    }
  }, [searchParams, updateSearchParams]);
  
  // Message composition state - NOW MANAGED BY useMessagesData HOOK
  // Message composition state - NOW MANAGED BY useMessagesData HOOK
  // Auto-open right pane compose view when URL contains ?new=true with smart pre-fill
  useEffect(() => {
    const newParam = searchParams.get('new');
    const view = searchParams.get('view');
    const subject = searchParams.get('subject');
    const body = searchParams.get('body');
    
    // If navigating to messages tab with new=true, open the compose view in right pane
    if (view === 'messages' && newParam === 'true') {
      console.log('🔗 Auto-opening compose view from URL parameter');
      
      // Smart Pre-fill: Only pre-fill if fields are empty
      if (subject && !newMessageSubject.trim()) {
        console.log('✨ [Dashboard] Pre-filling message subject:', subject);
        setNewMessageSubject(subject);
      }
      
      if (body && !newMessageContent.trim()) {
        console.log('✨ [Dashboard] Pre-filling message body:', body);
        setNewMessageContent(body);
      }
      
      // Open compose view in right pane instead of modal
      setIsComposingMessage(true);
      setSelectedThreadId(null); // Clear any selected thread
      
      // Clean up URL to prevent re-opening on refresh
      setTimeout(() => {
        updateSearchParams({ new: null, subject: null, body: null });
      }, 100);
    }
  }, [searchParams, updateSearchParams, newMessageSubject, newMessageContent]);
  
  // REMOVED: Debug tab logging - NOW IN useDashboardInitialization HOOK
  // useEffect(() => { console.log('📍 Current tab state changed to:', currentTab); }, [currentTab]);
  
  // REMOVED: setCurrentTab - NOW PROVIDED BY useDashboardInitialization HOOK
  
  // REMOVED: Get selected task/claim IDs from URL - MOVED BEFORE HOOKS
  // REMOVED: selectedTaskForModal, selectedClaimForModal - MOVED BEFORE HOOKS
  // REMOVED: setSelectedTaskForModal, setSelectedClaimForModal - MOVED BEFORE HOOKS
  
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

  const availableTabs = useMemo(() => {
    const tabs = getAvailableTabs();
    console.log('📊 Available tabs:', tabs);
    console.log('📊 User role:', userRole, 'isAdmin:', isAdmin, 'currentUser?.role:', currentUser?.role);
    return tabs;
  }, [userRole, isAdmin, currentUser?.role]);
  
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
  
  // Claims filter state - NOW MANAGED BY useClaimsData HOOK
  // const [claimsFilter, setClaimsFilter] = useState<'All' | 'Open' | 'Closed'>('Open');
  
  // Multi-select claims state - NOW MANAGED BY useClaimsData HOOK (destructured above)
  // const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  
  // Tasks filter state - NOW MANAGED BY useTasksData HOOK
  // const [tasksFilter, setTasksFilter] = useState<'all' | 'open' | 'closed'>('open');
  
  // CRITICAL: All useMemo hooks MUST be at top level, not inside render functions
  // Memoize filtered claims to prevent recalculation - NOW MANAGED BY useClaimsData HOOK
  // const filteredClaimsForModal = useMemo(() => {
  //   if (claimsFilter === 'Open') {
  //     return claims.filter(c => c.status !== ClaimStatus.COMPLETED);
  //   } else if (claimsFilter === 'Closed') {
  //     return claims.filter(c => c.status === ClaimStatus.COMPLETED);
  //   }
  //   return claims;
  // }, [claims, claimsFilter]);
  
  // Memoize user tasks to prevent recalculation - NOW MANAGED BY useTasksData HOOK
  // const userTasks = useMemo(() => 
  //   tasks.filter(t => t.assignedToId === currentUser.id),
  //   [tasks, currentUser.id]
  // );
  
  // Memoize filtered tasks to prevent recalculation - NOW MANAGED BY useTasksData HOOK
  // const filteredTasksForModal = useMemo(() => {
  //   if (tasksFilter === 'open') {
  //     return userTasks.filter(t => !t.isCompleted);
  //   } else if (tasksFilter === 'closed') {
  //     return userTasks.filter(t => t.isCompleted);
  //   }
  //   return userTasks;
  // }, [userTasks, tasksFilter]);
  
  // Hook values extracted earlier (lines 587-640) - DO NOT DUPLICATE HERE
  
  // REMOVED: Invite Modal State - NOW PROVIDED BY useModalManagement HOOK
  // const [showInviteModal, setShowInviteModal] = useState(false);
  // const [inviteName, setInviteName] = useState('');
  // const [inviteEmail, setInviteEmail] = useState('');
  // const [inviteBody, setInviteBody] = useState('');
  // const [isDrafting, setIsDrafting] = useState(false);

  // REMOVED: Documents Modal State - NOW PROVIDED BY useModalManagement HOOK
  // const [showDocsModal, setShowDocsModal] = useState(false);
  // const [isDocUploading, setIsDocUploading] = useState(false);

  // REMOVED: Edit Homeowner Modal State - NOW PROVIDED BY useModalManagement HOOK
  // const [showEditHomeownerModal, setShowEditHomeownerModal] = useState(false);
  // const [editName, setEditName] = useState('');
  // const [editEmail, setEditEmail] = useState('');
  // const [editPhone, setEditPhone] = useState('');
  // const [editStreet, setEditStreet] = useState('');
  // const [editCity, setEditCity] = useState('');
  // const [editState, setEditState] = useState('');
  // const [editZip, setEditZip] = useState('');
  // const [editBuilderId, setEditBuilderId] = useState('');
  // const [editJobName, setEditJobName] = useState('');
  // const [editClosingDate, setEditClosingDate] = useState('');
  // const [editSubFile, setEditSubFile] = useState<File | null>(null);
  // const [editParsedSubs, setEditParsedSubs] = useState<any[]>([]);
  // const [isParsingSubs, setIsParsingSubs] = useState(false);

  // REMOVED: Messaging State - NOW MANAGED BY useMessagesData HOOK
  // const [showSubListModal, setShowSubListModal] = useState(false);

  // UI Context for global modals (replaces local state)
  const { showInvoicesFullView, setShowInvoicesFullView, setInvoicesPrefillData, setActiveHomeowner } = useUI();
  
  // Sync active homeowner to UI context for chat
  useEffect(() => {
    setActiveHomeowner(effectiveHomeowner);
  }, [effectiveHomeowner, setActiveHomeowner]);

  // 🔧 DEV ONLY: Quick seed test homeowner
  const handleSeedTestHomeowner = async () => {
    if (!isDbConfigured) {
      alert('Database not configured. Cannot seed test homeowner.');
      return;
    }

    try {
      const testEmail = 'test.dev@example.com';
      
      // Check if test homeowner already exists in database
      const existing = await db
        .select()
        .from(homeownersTable)
        .where(eq(homeownersTable.email, testEmail))
        .limit(1);

      let testHomeowner: Homeowner;

      if (existing.length > 0) {
        console.log('✅ Test homeowner already exists in database');
        testHomeowner = {
          id: existing[0].id,
          name: existing[0].name,
          email: existing[0].email,
          phone: existing[0].phone || '',
          street: existing[0].street || '',
          city: existing[0].city || '',
          state: existing[0].state || '',
          zip: existing[0].zip || '',
          address: existing[0].address,
          builder: existing[0].builder || '',
          builderId: existing[0].builderGroupId || undefined,
          jobName: existing[0].jobName || '',
          closingDate: existing[0].closingDate || new Date(),
          firstName: existing[0].firstName || undefined,
          lastName: existing[0].lastName || undefined,
        } as Homeowner;
      } else {
        // Create new test homeowner
        const newId = crypto.randomUUID();
        const homeownerData = {
          id: newId,
          name: 'Test Homeowner',
          firstName: 'Test',
          lastName: 'Homeowner',
          email: testEmail,
          phone: '(555) 123-4567',
          street: '123 Dev Street',
          city: 'Code City',
          state: 'WA',
          zip: '98000',
          address: '123 Dev Street, Code City, WA 98000',
          builder: 'Test Builder Co.',
          builderGroupId: null,
          jobName: 'LOT-TEST-001',
          closingDate: new Date(),
          agentName: 'Test Agent',
          agentEmail: 'agent@example.com',
          agentPhone: '(555) 987-6543',
          enrollmentComments: 'Test homeowner created for development',
          password: null,
          clerkId: null,
        };

        await db.insert(homeownersTable).values(homeownerData);
        console.log('✅ Test homeowner created in database:', newId);

        testHomeowner = {
          id: newId,
          name: homeownerData.name,
          email: homeownerData.email,
          phone: homeownerData.phone,
          street: homeownerData.street,
          city: homeownerData.city,
          state: homeownerData.state,
          zip: homeownerData.zip,
          address: homeownerData.address,
          builder: homeownerData.builder || '',
          builderId: homeownerData.builderGroupId || undefined,
          jobName: homeownerData.jobName,
          closingDate: homeownerData.closingDate,
          firstName: homeownerData.firstName || undefined,
          lastName: homeownerData.lastName || undefined,
        } as Homeowner;
      }

      // Check if homeowner exists in the homeowners array (App.tsx state)
      const existsInState = homeowners.find(h => h.id === testHomeowner.id);
      
      if (!existsInState && onUpdateHomeowner) {
        // Add to App.tsx state by calling onUpdateHomeowner (which handles both add and update)
        console.log('📝 Adding test homeowner to App state');
        onUpdateHomeowner(testHomeowner);
        
        // Give React a moment to update state
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Now select this homeowner (stay as admin, don't impersonate)
      if (onSelectHomeowner) {
        onSelectHomeowner(testHomeowner);
        console.log('✅ Selected test homeowner for admin view');
      }

      alert(`✅ Test Homeowner Ready!\n\nName: ${testHomeowner.name}\nEmail: ${testHomeowner.email}\n\nYou are viewing as ADMIN with this homeowner's data loaded.`);
    } catch (error) {
      console.error('❌ Failed to seed test homeowner:', error);
      alert(`Failed to create test homeowner: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
  // Message composition state and template management - NOW MANAGED BY useMessagesData HOOK
  // const [newMessageRecipientId, setNewMessageRecipientId] = useState<string>('');
  // const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [replyExpanded, setReplyExpanded] = useState(false);
  
  // Message Email Templates state - NOW MANAGED BY useMessagesData HOOK
  // interface MessageEmailTemplate { ... }
  // const [messageEmailTemplates, setMessageEmailTemplates] = useState<MessageEmailTemplate[]>(() => { ... });
  // const [showClaimSuggestionModal, setShowClaimSuggestionModal] = useState(false);
  // const [selectedMessageTemplateId, setSelectedMessageTemplateId] = useState<string>('');
  
  // Template management functions - NOW PROVIDED BY useMessagesData HOOK
  // const loadMessageTemplates = () => { ... };
  // const saveMessageTemplates = (templates: MessageEmailTemplate[]) => { ... };
  // const handleMessageTemplateSelect = (templateId: string) => { ... };
  
  // Open message template creator - now uses centralized modal
  const handleOpenMessageTemplateCreator = (template?: {id: string; name: string; subject: string; body: string}) => {
    if (onOpenTemplatesModal) {
      if (template) {
        // Editing existing template - open modal with Messages tab
        onOpenTemplatesModal('messages');
      } else {
        // Creating new template - open with prefill from current message
        onOpenTemplatesModal('messages', {
          subject: newMessageSubject,
          body: newMessageContent
        });
      }
    }
  };
  
  // Delete message template - NOW PROVIDED BY useMessagesData HOOK (wrapping for confirmation)
  const handleDeleteMessageTemplateWithConfirm = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      handleDeleteMessageTemplate(templateId);
    }
  };

  // Delete claim - NOW PROVIDED BY useClaimsData HOOK (extracted at line 608)
  // const handleDeleteClaim = async (claimId: string) => { ... };
  
  // Toggle claim selection for multi-select - NOW PROVIDED BY useClaimsData HOOK
  // const handleToggleClaimSelection = (claimId: string) => { ... };
  
  // Bulk delete selected claims - NOW PROVIDED BY useClaimsData HOOK (extracted at line 608)
  // const handleBulkDeleteClaims = async () => { ... };

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

  // New Claim Modal State (restored for legacy compatibility)
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  
  // New Claim Inline Creation State - NOW MANAGED BY useClaimsData HOOK
  // const [isCreatingNewClaim, setIsCreatingNewClaim] = useState(false);
  
  // Unsaved changes confirmation dialog state
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingClaimSelection, setPendingClaimSelection] = useState<Claim | null>(null);
  
  // Documents modal state (legacy compatibility)
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);

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

  // New Task Modal State - NOW MANAGED BY useTasksData HOOK
  // const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  // const [newTaskTitle, setNewTaskTitle] = useState('');
  // const [newTaskAssignee, setNewTaskAssignee] = useState(currentUser.id);
  // const [newTaskNotes, setNewTaskNotes] = useState('');

  // Modal states
  const [showManualModal, setShowManualModal] = useState(false);

  // Debug: Log modal state changes - showNewClaimModal removed (managed by hook now)
  // useEffect(() => {
  //   console.log('showNewClaimModal changed to:', showNewClaimModal);
  // }, [showNewClaimModal]);

  useEffect(() => {
    console.log('showNewTaskModal changed to:', showNewTaskModal);
  }, [showNewTaskModal]);

  // Lock body scroll when any modal is open (without layout shifts)
  useEffect(() => {
    const isAnyModalOpen = showNewTaskModal || showNewMessageModal || isCreatingNewClaim ||
                          isAnySecondaryModalOpen || (currentTab === 'PUNCHLIST') || (currentTab === 'CHAT');

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
  }, [showNewTaskModal, showNewMessageModal, isCreatingNewClaim, isAnySecondaryModalOpen, currentTab]);

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

  // Send reply handler - NOW PROVIDED BY useMessageWorkflow HOOK
  // const handleSendReply = async () => { ... }; (93 lines removed)
  const handleSendReply = async () => {
    if (selectedThreadId && replyContent.trim()) {
      await messageWorkflow.sendReply(selectedThreadId, replyContent);
    }
  };
  
  // Handler for sending new messages (creates new thread) - NOW PROVIDED BY useMessageWorkflow HOOK
  const handleSendMessage = async () => {
    await messageWorkflow.createNewThread(
      newMessageSubject,
      newMessageContent,
      newMessageRecipientId,
      false
    );
  };

  // Create new thread handler - NOW PROVIDED BY useMessageWorkflow HOOK
  // const handleCreateNewThread = async (forceSend: boolean = false) => { ... }; (82 lines removed)

  // Handler to redirect homeowner to Warranty tab and open claim form
  const handleRedirectToWarranty = () => {
    messageWorkflow.redirectToWarranty();
    setCurrentTab('CLAIMS');
    setIsCreatingNewClaim(true);
  };

  // --- Render Helpers ---

  const renderClaimGroup = (title: string, groupClaims: Claim[], emptyMsg: string, isClosed: boolean = false, showNewClaimButton: boolean = false, filter?: 'All' | 'Open' | 'Closed', setFilter?: (filter: 'All' | 'Open' | 'Closed') => void, onExportExcel?: () => void, allClaims?: Claim[], isAdminView: boolean = false) => {
    // Calculate counts for filter pills using utility
    const { openCount, closedCount, totalCount } = allClaims ? calculateClaimCounts(allClaims) : { openCount: 0, closedCount: 0, totalCount: 0 };

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
                const scheduledDate = findAcceptedScheduledDate(claim);
                const isCompleted = isClaimCompleted(claim);
                
                // Find the most recent service order message using utility
                const serviceOrderDate = findServiceOrderDate(claim.id, claimMessages);
                
                const isReviewed = isClaimReviewed(claim);
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
                            #{formatClaimNumber(claim)}
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
                            Created: {formatDate(claim.dateSubmitted)}
                          </span>
                          {/* Scheduled Date */}
                          {scheduledDate && (
                            <span className="inline-flex items-center h-6 text-xs font-medium gap-1 bg-primary/20 dark:bg-primary/20 text-primary dark:text-primary px-3 rounded-full whitespace-nowrap w-fit">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span>Scheduled: {formatDate(scheduledDate.date)}</span>
                            </span>
                          )}
                          {/* Service Order Date */}
                          {serviceOrderDate ? (
                            <span className="inline-flex items-center h-6 text-xs font-medium text-surface-on-variant dark:text-gray-300 gap-1 bg-surface-container dark:bg-gray-700 px-3 rounded-full border border-surface-outline-variant dark:border-gray-600 whitespace-nowrap w-fit">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span>S.O. Sent: {formatDate(serviceOrderDate)}</span>
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
                              Eval: {formatDate(claim.dateEvaluated)}
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

  // handleExportToExcel - NOW PROVIDED BY useClaimsData HOOK (extracted at line 588)
  // const handleExportToExcel = async (claimsList: Claim[]) => { ... };

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
              const isPDF = isPDFDocument(doc);
              
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
                        openPDFViewer(doc);
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

  // --- Main Render Logic ---

  // DEBUG: Log on every render
  console.log('🏠 Dashboard RENDERING - showInvoicesFullView:', showInvoicesFullView);
  console.log('🏠 activeHomeowner:', activeHomeowner ? activeHomeowner.name : 'none');
  console.log('🏠 currentTab:', currentTab);

  // Helper function to render modals using Portal
  const renderModals = () => (
    <>
      {/* TASK DETAIL MODAL - Only show when not on TASKS tab (tasks tab has inline view) */}
      {selectedTaskForModal && currentTab !== 'TASKS' && createPortal(
        <div 
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
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
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
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
          <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/80 backdrop-blur-sm">
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
              closePDFViewer();
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
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
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
          className="fixed inset-0 z-backdrop bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
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
                className="absolute -top-12 right-0 p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors shadow-lg z-base"
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
  console.log('💰 [RENDER ROUTING] isAdmin:', isAdmin, 'isBuilder:', isBuilder);
  console.log('💰 [RENDER ROUTING] targetHomeowner:', targetHomeowner);
  console.log('💰 [RENDER ROUTING] activeHomeowner:', activeHomeowner);
  console.log('💰 [RENDER ROUTING] userRole:', userRole);
  
  const shouldShowAdminStyleCard = 
    // 1. Admin/Builder viewing a specific homeowner
    ((isAdmin || isBuilder) && targetHomeowner) || 
    // 2. ANY user in Homeowner View (Real Homeowner OR Impersonating Admin) with a valid profile
    (userRole === UserRole.HOMEOWNER && activeHomeowner !== null);
  
  console.log('💰 [RENDER ROUTING] shouldShowAdminStyleCard:', shouldShowAdminStyleCard);
  
  // ============================================================================
  // UNIFIED RENDER LOGIC - Calculate what content to show
  // ============================================================================
  let mainContent: JSX.Element | null = null;
  
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
      mainContent = (
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
    } else {
      mainContent = (
        <>
          {renderModals()}
        
        {/* ADMIN EXIT BUTTON - Only show when admin is viewing as homeowner */}
        {/* ✅ LOGIC: Show when isHomeownerView is true AND the Clerk user's role is admin */}
        {/* Real Homeowner: isHomeownerView=true but isAdminAccount=false -> HIDDEN */}
        {/* Admin Dashboard: isHomeownerView=false -> HIDDEN */}
        {/* Admin Impersonating: isHomeownerView=true AND isAdminAccount=true -> VISIBLE ✓ */}
        {isHomeownerView && isAdminAccount && (
          <div className="fixed top-20 right-4 z-toast">
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
                    <div className="absolute z-dropdown w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 max-h-96 overflow-y-auto">
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
                        <div className="absolute z-dropdown w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 max-h-96 overflow-y-auto">
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
            <div className="sticky top-0 z-sticky">
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
                        onClick={() => {
                          console.log('🖱️ Tab clicked:', tab);
                          // Special handling for INVOICES - open full-screen overlay
                          if (tab === 'INVOICES') {
                            console.log('💰 Opening Invoices Full View');
                            
                            // Set prefill data for invoices modal
                            setInvoicesPrefillData(
                              effectiveHomeowner
                                ? {
                                    clientName: effectiveHomeowner.name || '',
                                    clientEmail: effectiveHomeowner.email || '',
                                    projectDetails: effectiveHomeowner.address || effectiveHomeowner.jobName || '',
                                    homeownerId: effectiveHomeowner.id,
                                  }
                                : undefined
                            );
                            
                            // Open invoices modal via UIContext
                            setShowInvoicesFullView(true);
                          } else {
                            console.log('📑 Setting current tab to:', tab);
                            setCurrentTab(tab);
                          }
                        }}
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
                  <ClaimsTab
                    claims={displayClaims}
                    filteredClaims={filteredClaimsForModal}
                    selectedClaim={selectedClaimForModal}
                    selectedClaimIds={selectedClaimIds}
                    isCreatingNewClaim={isCreatingNewClaim}
                    claimsFilter={claimsFilter}
                    claimMessages={claimMessages}
                    showUnsavedWarning={showUnsavedWarning}
                    contractors={contractors}
                    activeHomeowner={activeHomeowner}
                    targetHomeowner={targetHomeowner}
                    currentUser={currentUser}
                    userRole={userRole}
                    onSelectClaim={setSelectedClaimForModal}
                    onSetIsCreatingNewClaim={setIsCreatingNewClaim}
                    onSetClaimsFilter={setClaimsFilter}
                    onToggleClaimSelection={handleToggleClaimSelection}
                    onDeleteClaim={handleDeleteClaim}
                    onBulkDeleteClaims={handleBulkDeleteClaims}
                    onExportToExcel={handleExportToExcel}
                    onCreateClaim={onCreateClaim}
                    onUpdateClaim={onUpdateClaim}
                    onAddInternalNote={onAddInternalNote}
                    onTrackClaimMessage={onTrackClaimMessage}
                    onNavigate={onNavigate}
                    onNewClaim={onNewClaim}
                    onCancelNavigation={handleCancelNavigation}
                    onConfirmNavigation={handleConfirmNavigation}
                    onSetNewMessageSubject={setNewMessageSubject}
                    onSetShowNewMessageModal={setShowNewMessageModal}
                    onSetCurrentTab={setCurrentTab}
                    isAdmin={isAdmin}
                    isBuilder={isBuilder}
                    isHomeownerView={isHomeownerView}
                  />
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
                    <TasksTab
                      tasks={userTasks}
                      filteredTasks={filteredTasksForModal}
                      selectedTask={selectedTaskForModal}
                      employees={employees}
                      claims={claims}
                      homeowners={homeowners}
                      currentUser={currentUser}
                      taskMessages={taskMessages}
                      tasksFilter={tasksFilter}
                      onTaskSelect={setSelectedTaskForModal}
                      onToggleTask={onToggleTask}
                      onDeleteTask={onDeleteTask}
                      onUpdateTask={onUpdateTask}
                      onFilterChange={setTasksFilter}
                      onCreateScheduleTask={handleScheduleTaskWithAssignee}
                      onCreateEvalTask={handleEvalTaskWithAssignee}
                      startInEditMode={tasksTabStartInEditMode}
                      onEditModeChange={setTasksTabStartInEditMode}
                      onSelectClaim={(claim) => {
                        setSelectedTaskForModal(null);
                        setTasksTabStartInEditMode(false);
                        handleClaimSelection(claim);
                        setCurrentTab('CLAIMS');
                      }}
                      isAdmin={isAdmin}
                    />
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
                  <MessagesTab
                    threads={displayThreads}
                    selectedThreadId={selectedThreadId}
                    isComposingMessage={isComposingMessage}
                    currentUser={currentUser}
                    effectiveHomeowner={effectiveHomeowner}
                    employees={employees}
                    messageEmailTemplates={messageEmailTemplates}
                    newMessageSubject={newMessageSubject}
                    newMessageContent={newMessageContent}
                    newMessageRecipientId={newMessageRecipientId}
                    selectedMessageTemplateId={selectedMessageTemplateId}
                    replyContent={replyContent}
                    replyExpanded={replyExpanded}
                    onSelectThread={setSelectedThreadId}
                    onSetIsComposingMessage={setIsComposingMessage}
                    onSetNewMessageSubject={setNewMessageSubject}
                    onSetNewMessageContent={setNewMessageContent}
                    onSetNewMessageRecipientId={setNewMessageRecipientId}
                    onSetSelectedMessageTemplateId={setSelectedMessageTemplateId}
                    onSetReplyContent={setReplyContent}
                    onSetReplyExpanded={setReplyExpanded}
                    onSendNewMessage={handleSendMessage}
                    onSendReply={handleSendReply}
                    onMessageTemplateSelect={handleMessageTemplateSelect}
                    onOpenMessageTemplateCreator={handleOpenMessageTemplateCreator}
                    onDeleteMessageTemplate={handleDeleteMessageTemplate}
                    isAdmin={isAdmin}
                  />
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
                                        openPDFViewer(doc);
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
                    <CallsTab
                      homeowners={homeowners}
                      onNavigate={onNavigate}
                      onSelectHomeowner={onSelectHomeowner}
                      activeHomeownerId={safeActiveHomeownerId}
                      isAdmin={isAdmin}
                      userRole={userRole}
                    />
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
                  <ClaimsTab
                    claims={displayClaims}
                    filteredClaims={filteredClaimsForModal}
                    selectedClaim={selectedClaimForModal}
                    selectedClaimIds={selectedClaimIds}
                    isCreatingNewClaim={isCreatingNewClaim}
                    claimsFilter={claimsFilter}
                    claimMessages={claimMessages}
                    showUnsavedWarning={showUnsavedWarning}
                    contractors={contractors}
                    activeHomeowner={activeHomeowner}
                    targetHomeowner={targetHomeowner}
                    currentUser={currentUser}
                    userRole={userRole}
                    onSelectClaim={setSelectedClaimForModal}
                    onSetIsCreatingNewClaim={setIsCreatingNewClaim}
                    onSetClaimsFilter={setClaimsFilter}
                    onToggleClaimSelection={handleToggleClaimSelection}
                    onDeleteClaim={handleDeleteClaim}
                    onBulkDeleteClaims={handleBulkDeleteClaims}
                    onExportToExcel={handleExportToExcel}
                    onCreateClaim={onCreateClaim}
                    onUpdateClaim={onUpdateClaim}
                    onAddInternalNote={onAddInternalNote}
                    onTrackClaimMessage={onTrackClaimMessage}
                    onNavigate={onNavigate}
                    onNewClaim={onNewClaim}
                    onCancelNavigation={handleCancelNavigation}
                    onConfirmNavigation={handleConfirmNavigation}
                    onSetNewMessageSubject={setNewMessageSubject}
                    onSetShowNewMessageModal={setShowNewMessageModal}
                    onSetCurrentTab={setCurrentTab}
                    isAdmin={isAdmin}
                    isBuilder={isBuilder}
                    isHomeownerView={isHomeownerView}
                  />
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {currentTab === 'TASKS' && isAdmin && (
            <AnimatedTabContent tabKey="tasks" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <TasksTab
                    tasks={userTasks}
                    filteredTasks={filteredTasksForModal}
                    selectedTask={selectedTaskForModal}
                    employees={employees}
                    claims={claims}
                    homeowners={homeowners}
                    currentUser={currentUser}
                    taskMessages={taskMessages}
                    tasksFilter={tasksFilter}
                    tasksTabStartInEditMode={tasksTabStartInEditMode}
                    onTaskSelect={setSelectedTaskForModal}
                    onSetTasksFilter={setTasksFilter}
                    onSetTasksTabStartInEditMode={setTasksTabStartInEditMode}
                    onToggleTask={onToggleTask}
                    onDeleteTask={onDeleteTask}
                    onUpdateTask={onUpdateTask}
                    onSelectClaim={(claim) => {
                      handleClaimSelection(claim);
                      setCurrentTab('CLAIMS');
                    }}
                    onSetCurrentTab={setCurrentTab}
                    onCreateScheduleTask={handleScheduleTaskWithAssignee}
                    onCreateEvalTask={handleEvalTaskWithAssignee}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {currentTab === 'MESSAGES' && (
            <AnimatedTabContent tabKey="messages" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <MessagesTab
                    threads={displayThreads}
                    selectedThreadId={selectedThreadId}
                    isComposingMessage={isComposingMessage}
                    currentUser={currentUser}
                    effectiveHomeowner={effectiveHomeowner}
                    employees={employees}
                    messageEmailTemplates={messageEmailTemplates}
                    newMessageSubject={newMessageSubject}
                    newMessageContent={newMessageContent}
                    newMessageRecipientId={newMessageRecipientId}
                    selectedMessageTemplateId={selectedMessageTemplateId}
                    replyContent={replyContent}
                    replyExpanded={replyExpanded}
                    onSelectThread={setSelectedThreadId}
                    onSetIsComposingMessage={setIsComposingMessage}
                    onSetNewMessageSubject={setNewMessageSubject}
                    onSetNewMessageContent={setNewMessageContent}
                    onSetNewMessageRecipientId={setNewMessageRecipientId}
                    onSetSelectedMessageTemplateId={setSelectedMessageTemplateId}
                    onSetReplyContent={setReplyContent}
                    onSetReplyExpanded={setReplyExpanded}
                    onSendNewMessage={handleSendMessage}
                    onSendReply={handleSendReply}
                    onMessageTemplateSelect={handleMessageTemplateSelect}
                    onOpenMessageTemplateCreator={handleOpenMessageTemplateCreator}
                    onDeleteMessageTemplate={handleDeleteMessageTemplate}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {/* CALLS Tab - Admin Only */}
          {currentTab === 'CALLS' && isAdmin && (
            <AnimatedTabContent tabKey="calls" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <CallsTab
                    homeowners={homeowners}
                    activeHomeownerId={safeActiveHomeownerId}
                    isAdmin={isAdmin}
                    userRole={userRole}
                    onNavigate={onNavigate}
                    onSelectHomeowner={onSelectHomeowner}
                  />
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {/* SCHEDULE Tab - Admin and Homeowners */}
          {currentTab === 'SCHEDULE' && (isAdmin || isHomeownerView) && (
            <AnimatedTabContent tabKey="schedule" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <ScheduleTabWrapper
                    homeowners={homeowners}
                    currentUserId={currentUser?.id}
                    claims={claims}
                    userRole={userRole}
                    activeHomeownerId={safeActiveHomeownerId}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {/* CHAT Tab - Admin Only - Full-screen team chat interface */}
          {currentTab === 'CHAT' && isAdmin && (
            <AnimatedTabContent tabKey="chat" className="flex-1 min-h-0 flex flex-col">
              <div className="w-full h-full flex flex-col">
                <ChatTab
                  currentUserId={currentUser?.id || ''}
                  currentUserName={currentUser?.name || 'Unknown User'}
                  homeowners={homeowners}
                  onSelectHomeowner={onSelectHomeowner}
                />
              </div>
            </AnimatedTabContent>
          )}

          {/* INVOICES Tab - Admin Only (not Employees) */}
          {currentTab === 'INVOICES' && isAdmin && currentUser?.role !== 'Employee' && (
            <AnimatedTabContent tabKey="invoices">
              <div className="w-full h-full flex flex-col md:h-auto md:block md:max-w-7xl md:mx-auto">
                <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                  <InvoicesTab />
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {/* DOCUMENTS Tab */}
          {currentTab === 'DOCUMENTS' && (
            <AnimatedTabContent tabKey="documents">
              <div className="flex-1 overflow-y-auto md:overflow-visible w-full md:max-w-7xl md:mx-auto md:pb-4">
                <DocumentsTab
                  documents={displayDocuments}
                  isAdmin={isAdmin}
                  onUploadDocument={() => setShowDocumentsModal(true)}
                  onDeleteDocument={onDeleteDocument}
                />
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
                className="fixed bottom-4 right-4 z-dropdown h-14 w-14 bg-white hover:bg-gray-50 text-primary border-2 border-primary rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
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
            className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
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
                                 openPDFViewer(doc);
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
              <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center sticky top-0 z-sticky flex-shrink-0">
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
                className="absolute bottom-4 right-4 z-backdrop bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
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
            className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
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
            className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
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
                    onClick={() => messageWorkflow.createNewThread(
                      newMessageSubject,
                      newMessageContent,
                      newMessageRecipientId,
                      false  // Don't force send - allow AI detection
                    )}
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
        
        {/* Claim Suggestion Modal */}
        {showClaimSuggestionModal && createPortal(
          <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
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
                    messageWorkflow.createNewThread(
                      newMessageSubject,
                      newMessageContent,
                      newMessageRecipientId,
                      true  // forceSend = true to bypass AI detection
                    );
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
  } else if ((isAdmin || isBuilder) && !targetHomeowner) {
    mainContent = (
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
                className="fixed bottom-4 right-4 z-dropdown h-14 w-14 bg-white hover:bg-gray-50 text-primary border-2 border-primary rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
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
  } else if (userRole === UserRole.HOMEOWNER && isAdminAccount && !targetHomeowner && !activeHomeowner) {
    mainContent = (
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
  } else {
    // 4. FALLBACK - Should not reach here if logic is correct
    // This handles any edge cases where we don't have a homeowner selected
    console.log('💰 [FALLBACK PATH] About to return fallback, showInvoicesFullView:', showInvoicesFullView);
    
    mainContent = (
    <>
      {renderModals()}
      
      {console.log('💰 [FALLBACK JSX] Rendering fallback return')}
      
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
  }

  // ============================================================================
  // UNIFIED RETURN - Single return statement for all paths
  // ============================================================================
  console.log('💰 [UNIFIED RETURN] Dashboard render complete');
  
  // InvoicesFullView now managed by AppShell - no longer rendered here
  // This eliminates the "multiple return paths" bug where modals disappear
  
  return (
    <>
      {/* 🔧 DEV ONLY: Seed Test Homeowner Button */}
      {isAdmin && (
        <button
          onClick={handleSeedTestHomeowner}
          className="fixed bottom-24 right-6 z-[150] group bg-purple-500 hover:bg-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 animate-pulse hover:animate-none"
          title="🔧 DEV: Create/Load Test Homeowner"
        >
          <User className="h-6 w-6" />
          <span className="text-sm font-medium whitespace-nowrap">
            Seed Test User
          </span>
        </button>
      )}

      {/* Global Modals - Always accessible */}
      {renderModals()}
      
      {/* Main Content - Dynamic based on user state */}
      {mainContent}
    </>
  );
};

export default AdminDashboard;

