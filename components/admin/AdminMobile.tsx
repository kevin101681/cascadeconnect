import React, { useState, Suspense } from 'react';
import type { DashboardProps } from '../AdminDashboard';
import type { Homeowner, Claim, Contractor, ClaimClassification, Call } from '../../types';
import type { Channel } from '../../services/internalChatService';
import { ClaimStatus } from '../../types';
import { 
  X, 
  Search, 
  Loader2, 
  ChevronRight, 
  ChevronDown, 
  Command,
  ClipboardList, 
  Calendar, 
  HardHat, 
  Shield, 
  FileText, 
  Mail,
  Phone, 
  MessageCircle, 
  MapPin,
  Users, 
  DollarSign, 
  BarChart, 
  UserCog, 
  Building2, 
  Database, 
  FileEdit, 
  LogOut,
  ArrowLeft,
  StickyNote,
  Paperclip,
  Plus,
  Info,
  Lock,
  CheckCircle,
  ChevronUp,
  Clipboard,
  CheckSquare,
  Send,
  Link as LinkIcon,
  Copy,
  Clock,
  AlertCircle,
  User
} from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { formatDate } from '../../lib/utils/dateHelpers';
import { useClerk } from '@clerk/clerk-react';
import { useUI } from '../../contexts/UIContext';
import { useTaskStore } from '../../stores/useTaskStore';
import { WarrantyCard } from '../ui/WarrantyCard';
import { AdminMobileHeader } from './AdminMobileHeader';
import { Input } from '../ui/input';

// Lazy load heavy modal components
const TasksSheet = React.lazy(() => import('../TasksSheet'));
const PunchListApp = React.lazy(() => import('../PunchListApp'));
const BackendDashboard = React.lazy(() => import('../BackendDashboard'));
const HomeownersList = React.lazy(() => import('../HomeownersList'));
const InternalUserManagement = React.lazy(() => import('../InternalUserManagement'));
const WarrantyAnalytics = React.lazy(() => import('../WarrantyAnalytics'));
const ScheduleTabWrapper = React.lazy(() => 
  import('../dashboard/tabs/ScheduleTabWrapper').then(m => ({ default: m.ScheduleTabWrapper }))
);

// Lazy load real tab components for stack navigation
const ClaimDetail = React.lazy(() => import('../ClaimDetail'));
const TasksTab = React.lazy(() =>
  import('../dashboard/tabs/TasksTab').then(m => ({ default: m.TasksTab }))
);
const DocumentsTab = React.lazy(() =>
  import('../dashboard/tabs/DocumentsTab').then(m => ({ default: m.DocumentsTab }))
);
const MessagesTab = React.lazy(() =>
  import('../dashboard/tabs/MessagesTab').then(m => ({ default: m.MessagesTab }))
);
const ChatSidebar = React.lazy(() =>
  import('../chat/ChatSidebar').then(m => ({ default: m.ChatSidebar }))
);
const ChatWindow = React.lazy(() =>
  import('../chat/ChatWindow').then(m => ({ default: m.ChatWindow }))
);
const MobileChatView = React.lazy(() =>
  import('../mobile/MobileChatView').then(m => ({ default: m.MobileChatView }))
);

// ============================================================================
// COMPONENT 1: ADMIN MOBILE SEARCH (No Homeowner Selected)
// ============================================================================

const AdminMobileSearch: React.FC<DashboardProps> = ({
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectHomeowner,
}) => {
  // Local state for loading animation
  const [isSelecting, setIsSelecting] = useState(false);
  
  // Global search state
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);

  const handleSelectHomeowner = (homeowner: Homeowner) => {
    console.log('🔍 AdminMobileSearch: Homeowner selected:', homeowner.name);
    setIsSelecting(true);
    
    if (onSelectHomeowner) {
      onSelectHomeowner(homeowner);
    }
    
    if (onSearchChange) {
      onSearchChange('');
    }
    
    // Reset loading state after animation
    setTimeout(() => setIsSelecting(false), 800);
  };

  // Handle global search with debouncing
  React.useEffect(() => {
    const query = globalQuery.trim();
    if (!query || query.length < 2) {
      setGlobalResults([]);
      setIsGlobalSearching(false);
      return;
    }

    console.log('🔍 Mobile Global Search:', query);
    setIsGlobalSearching(true);
    
    const timeoutId = setTimeout(async () => {
      try {
        // Import the search function dynamically
        const { performGlobalSearch } = await import('../../services/globalSearch');
        const response = await performGlobalSearch(query);
        console.log('🔍 Mobile Global Search Results:', response.results.length);
        setGlobalResults(response.results);
      } catch (error) {
        console.error('🔍 Mobile Global Search Error:', error);
        setGlobalResults([]);
      } finally {
        setIsGlobalSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [globalQuery]);

  // Determine which search is active
  const isShowingGlobalResults = globalQuery.trim().length > 0;

  return (
    <div className="w-full overflow-x-hidden bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
      {/* Loading Overlay */}
      {isSelecting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 mx-4 shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-900 dark:text-gray-100 font-medium text-lg">Loading dashboard...</p>
          </div>
        </div>
      )}
      
      {/* Unified Header Component */}
      <AdminMobileHeader
        homeownerQuery={searchQuery || ''}
        onHomeownerSearch={onSearchChange}
        globalQuery={globalQuery}
        onGlobalSearch={setGlobalQuery}
        autoFocusHomeowner
        disabledHomeowner={isSelecting}
      />

      {/* Search Content */}
      <div className="flex-1 flex flex-col p-4 space-y-4">
        {/* GLOBAL SEARCH RESULTS - Priority when global query exists */}
        {isShowingGlobalResults && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Loading State */}
            {isGlobalSearching && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Searching...</span>
              </div>
            )}

            {/* Results */}
            {!isGlobalSearching && globalResults.length > 0 && (
              <div className="max-h-[70vh] overflow-y-auto">
                {globalResults.map((result: any, index: number) => (
                  <a
                    key={result.id}
                    href={result.url}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = result.url;
                    }}
                    className={`
                      block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 
                      border-b border-gray-200 dark:border-gray-700 last:border-0
                      transition-all
                    `}
                  >
                    <div className="flex items-center gap-4">
                      {/* Type Badge */}
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {result.type}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.title}
                        </p>
                        {result.subtitle && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                            {result.subtitle}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* No Results */}
            {!isGlobalSearching && globalResults.length === 0 && globalQuery.trim().length >= 2 && (
              <div className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No results found for "{globalQuery}"</p>
              </div>
            )}

            {/* Minimum chars hint */}
            {!isGlobalSearching && globalQuery.trim().length < 2 && (
              <div className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        )}

        {/* HOMEOWNER SEARCH RESULTS - Show when NOT doing global search */}
        {!isShowingGlobalResults && searchQuery && searchResults && searchResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[70vh] overflow-y-auto">
            {searchResults.map((homeowner, index) => (
                  <button
                    key={homeowner.id}
                    type="button"
                    onClick={() => handleSelectHomeowner(homeowner)}
                    disabled={isSelecting}
                    className={`
                      w-full text-left px-6 py-5 
                      active:bg-primary/10 
                      hover:bg-gray-50 dark:hover:bg-gray-700 
                      border-b border-gray-200 dark:border-gray-700 
                      last:border-0 
                      transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${index === 0 ? 'rounded-t-2xl' : ''}
                      ${index === searchResults.length - 1 ? 'rounded-b-2xl' : ''}
                    `}
                    style={{ minHeight: '72px' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-semibold text-lg">
                          {homeowner.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                          {homeowner.name}
                        </p>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {homeowner.builder && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {homeowner.builder}
                            </p>
                          )}
                          {homeowner.jobName && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {homeowner.jobName}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRight className="flex-shrink-0 h-6 w-6 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}

        {/* No Homeowner Results */}
        {!isShowingGlobalResults && searchQuery && searchResults.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Search className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No homeowners found</p>
            <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT 2: ADMIN MOBILE DASHBOARD (Homeowner Selected)
// ============================================================================

const AdminMobileDashboard: React.FC<DashboardProps> = (props) => {
  // ========== ALL HOOKS AT THE TOP (NO CONDITIONAL HOOKS) ==========
  const [isHomeownerExpanded, setIsHomeownerExpanded] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPunchList, setShowPunchList] = useState(false);
  const [showClaims, setShowClaims] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showTeamChat, setShowTeamChat] = useState(false);
  const [showBackend, setShowBackend] = useState(false);
  const [showHomeowners, setShowHomeowners] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showBuilderGroups, setShowBuilderGroups] = useState(false);
  const [selectedBuilderGroupId, setSelectedBuilderGroupId] = useState<string | null>(null);
  const [showCalls, setShowCalls] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  
  // Scroll position preservation
  const dashboardScrollRef = React.useRef(0);
  
  // Global search state for dashboard
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  
  // Edit homeowner modal state & inline form data
  const [isEditingHomeowner, setIsEditingHomeowner] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    builder: '',
    jobName: '',
    closingDate: '',
  });
  
  // Invite homeowner modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBody, setInviteBody] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  
  // Stack navigation state for Claims (List -> Detail)
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [claimsFilter, setClaimsFilter] = useState<'Open' | 'Closed' | 'All'>('Open');
  
  // Stack navigation state for Tasks (List -> Detail)
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [tasksFilter, setTasksFilter] = useState<'open' | 'closed' | 'all'>('open');
  
  // Stack navigation state for Messages (Thread List -> Chat Window)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  // Messages Tab state (for homeowner-specific messaging)
  const [isComposingMessage, setIsComposingMessage] = useState(false);
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [newMessageRecipientId, setNewMessageRecipientId] = useState('');
  const [selectedMessageTemplateId, setSelectedMessageTemplateId] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyExpanded, setReplyExpanded] = useState(false);
  
  // Stack navigation state for Team Chat (Channel List -> Chat Window)
  const [activeTeamChannelId, setActiveTeamChannelId] = useState<string | null>(null);
  
  // Ref to trigger save from ClaimDetail (for mobile footer)
  const claimDetailSaveRef = React.useRef<(() => void) | null>(null);
  
  // Context/Store hooks
  const { setShowInvoicesFullView } = useUI();
  const { signOut } = useClerk();
  const { openTasks } = useTaskStore();

  // ========== EXTRACT PROPS ==========
  const {
    claims = [],
    userRole,
    activeHomeowner,
    targetHomeowner,
    onUpdateHomeowner,
    searchQuery,
    onSearchChange,
    searchResults,
    onSelectHomeowner,
    onNavigate,
    onOpenTemplatesModal,
    contractors = [],
    onUpdateClaim,
    currentUser,
    claimMessages = [],
    tasks = [],
    employees = [],
    homeowners = [],
    taskMessages = [],
    onToggleTask,
    onDeleteTask,
    onUpdateTask,
    onSelectClaim,
    documents = [],
    messages = [],
    onUploadDocument,
    onDeleteDocument,
    onSendMessage,
    onCreateThread,
    onUpdateThread,
    builderUsers = [],
    builderGroups = [],
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
  } = props;

  // Message email templates (localStorage-based)
  const [messageEmailTemplates, setMessageEmailTemplates] = React.useState<Array<{
    id: string;
    name: string;
    subject: string;
    body: string;
  }>>([]);
  
  // Load templates from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('cascade_message_templates');
      if (stored) {
        setMessageEmailTemplates(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load message templates:', error);
    }
  }, []);

  // ========== MOCK CALL DATA ==========
  const MOCK_CALL: Call = {
    id: 'mock-call-1',
    vapiCallId: 'vapi-123-mock',
    homeownerId: targetHomeowner?.id || null,
    homeownerName: 'John Smith',
    phoneNumber: '+15551234567',
    propertyAddress: '123 Oak Street, Springfield, IL 62701',
    issueDescription: 'Calling about roof warranty - shingles appear to be lifting after recent storm. Noticed some water damage in the attic.',
    isUrgent: true,
    transcript: `Assistant: Thank you for calling Cascade Warranty Services. How can I help you today?

Caller: Hi, this is John Smith. I'm calling about some issues with my roof. I think it might be covered under warranty.`,
    recordingUrl: 'https://example.com/recordings/mock-call-1.mp3',
    isVerified: false,
    addressMatchSimilarity: 0.85,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    verifiedBuilderName: null,
    verifiedClosingDate: null,
  };

  // Determine which homeowner to display
  const selectedHomeowner = targetHomeowner || activeHomeowner;

  // Synchronize edit form data when homeowner changes
  React.useEffect(() => {
    if (selectedHomeowner) {
      setEditFormData({
        name: selectedHomeowner.name || '',
        email: selectedHomeowner.email || '',
        phone: selectedHomeowner.phone || '',
        address: selectedHomeowner.address || '',
        builder: selectedHomeowner.builder || '',
        jobName: selectedHomeowner.jobName || '',
        closingDate: selectedHomeowner.closingDate instanceof Date 
          ? selectedHomeowner.closingDate.toISOString().split('T')[0] 
          : selectedHomeowner.closingDate || '',
      });
      setIsEditingHomeowner(false); // Reset edit mode when switching homeowners
    }
  }, [selectedHomeowner?.id]);

  // Default invite message
  const DEFAULT_INVITE_MESSAGE = "Welcome to Cascade Connect! You have been invited to join your new Homeowner Portal. Please click the link below to activate your account and view your warranty details.";

  // Filter claims for this homeowner
  const homeownerClaims = claims.filter(
    c => c.homeownerEmail?.toLowerCase() === selectedHomeowner?.email?.toLowerCase()
  );

  // Filter documents for this homeowner  
  const homeownerDocuments = documents.filter(
    d => d.homeownerId === selectedHomeowner?.id
  );

  // Filter messages for this homeowner
  const homeownerMessages = messages.filter(
    m => m.homeownerId === selectedHomeowner?.id
  );

  // Debug logging for active homeowner
  React.useEffect(() => {
    if (selectedHomeowner) {
      console.log('📱 MobileDashboard Active for:', selectedHomeowner.id, selectedHomeowner.name);
      console.log('   • Email:', selectedHomeowner.email);
      console.log('   • Claims count:', homeownerClaims.length);
      console.log('   • Tasks count:', tasks.length);
      console.log('   • Documents count:', homeownerDocuments.length);
      console.log('   • Messages count:', homeownerMessages.length);
    }
  }, [selectedHomeowner, homeownerClaims.length, tasks.length, homeownerDocuments.length, homeownerMessages.length]);

  // Global search with debouncing
  React.useEffect(() => {
    const query = globalQuery.trim();
    if (!query || query.length < 2) {
      setGlobalResults([]);
      setIsGlobalSearching(false);
      return;
    }

    console.log('🔍 Dashboard Global Search:', query);
    setIsGlobalSearching(true);
    
    const timeoutId = setTimeout(async () => {
      try {
        const { performGlobalSearch } = await import('../../services/globalSearch');
        const response = await performGlobalSearch(query);
        console.log('🔍 Dashboard Global Search Results:', response.results.length);
        setGlobalResults(response.results);
      } catch (error) {
        console.error('🔍 Dashboard Global Search Error:', error);
        setGlobalResults([]);
      } finally {
        setIsGlobalSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [globalQuery]);

  // ========== ROBUST BROWSER HISTORY API FOR BACK BUTTON NAVIGATION ==========
  // Manage browser history for modal navigation (Back button support)
  
  // Handle browser back button with proper state-based navigation
  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      console.log('🔙 Browser back button pressed', state);
      
      // If state has a detail ID, we're going from Detail -> List
      if (state?.id) {
        console.log('🔙 Returning from Detail to List');
        setSelectedClaimId(null);
        setSelectedTask(null);
        setActiveThreadId(null);
        setActiveTeamChannelId(null);
        setSelectedBuilderGroupId(null);
        setSelectedCallId(null);
        return;
      }
      
      // If state has a view but no ID, we're going from List -> Dashboard
      if (state?.view) {
        console.log('🔙 Returning from List to Dashboard');
        setShowClaims(false);
        setShowTasks(false);
        setShowMessages(false);
        setShowDocuments(false);
        setShowSchedule(false);
        setShowPunchList(false);
        setShowTeamChat(false);
        setShowBackend(false);
        setShowHomeowners(false);
        setShowAnalytics(false);
        setShowTeam(false);
        setShowNotes(false);
        setShowBuilderGroups(false);
        setShowCalls(false);
        setIsEditingHomeowner(false);
        return;
      }
      
      // If state is null, ensure we're on Dashboard (close everything)
      if (!state) {
        console.log('🔙 Returning to Dashboard (state is null)');
        setShowClaims(false);
        setShowTasks(false);
        setShowMessages(false);
        setShowDocuments(false);
        setShowSchedule(false);
        setShowPunchList(false);
        setShowTeamChat(false);
        setShowBackend(false);
        setShowHomeowners(false);
        setShowAnalytics(false);
        setShowTeam(false);
        setShowNotes(false);
        setShowBuilderGroups(false);
        setShowCalls(false);
        setIsEditingHomeowner(false);
        setSelectedClaimId(null);
        setSelectedTask(null);
        setActiveThreadId(null);
        setActiveTeamChannelId(null);
        setSelectedBuilderGroupId(null);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Empty deps - event handler uses state from event.state

  // Push history when opening a modal (Dashboard -> List)
  React.useEffect(() => {
    const activeModal = showClaims ? 'CLAIMS'
      : showTasks ? 'TASKS'
      : showMessages ? 'MESSAGES'
      : showDocuments ? 'DOCUMENTS'
      : showSchedule ? 'SCHEDULE'
      : showPunchList ? 'PUNCHLIST'
      : showTeamChat ? 'TEAMCHAT'
      : showBackend ? 'BACKEND'
      : showHomeowners ? 'HOMEOWNERS'
      : showAnalytics ? 'ANALYTICS'
      : showTeam ? 'TEAM'
      : showNotes ? 'NOTES'
      : showBuilderGroups ? 'BUILDER_GROUPS'
      : showCalls ? 'CALLS'
      : isEditingHomeowner ? 'EDIT_HOMEOWNER'
      : null;
    
    if (activeModal) {
      window.history.pushState({ view: activeModal }, '');
      console.log('📍 Pushed List View:', activeModal);
    }
  }, [showClaims, showTasks, showMessages, showDocuments, showSchedule, showPunchList, showTeamChat, showBackend, showHomeowners, showAnalytics, showTeam, showNotes, showBuilderGroups, showCalls, isEditingHomeowner]);

  // Push history when opening a detail view (List -> Detail)
  React.useEffect(() => {
    const activeDetail = selectedClaimId ? { view: 'CLAIMS', id: selectedClaimId }
      : selectedTask ? { view: 'TASKS', id: selectedTask.id }
      : activeThreadId ? { view: 'MESSAGES', id: activeThreadId }
      : activeTeamChannelId ? { view: 'TEAMCHAT', id: activeTeamChannelId }
      : selectedBuilderGroupId ? { view: 'BUILDER_GROUPS', id: selectedBuilderGroupId }
      : selectedCallId ? { view: 'CALLS', id: selectedCallId }
      : null;
    
    if (activeDetail) {
      window.history.pushState(activeDetail, '');
      console.log('📍 Pushed Detail View:', activeDetail);
    }
  }, [selectedClaimId, selectedTask, activeThreadId, activeTeamChannelId, selectedBuilderGroupId, selectedCallId]);

  console.log('📱 AdminMobileDashboard render:', {
    homeowner: selectedHomeowner?.name || 'NONE',
    hasHomeowner: !!selectedHomeowner,
    homeownerId: selectedHomeowner?.id,
  });

  // Safety check - should never happen due to controller routing
  if (!selectedHomeowner) {
    console.error('❌ AdminMobileDashboard: No homeowner! This should not happen.');
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-xl text-red-600">Error: No homeowner selected</p>
          <p className="text-sm text-gray-600 mt-2">Please go back and select a homeowner</p>
        </div>
      </div>
    );
  }

  // Handler for switching homeowners via inline search
  const handleHomeownerSwitch = (homeowner: Homeowner) => {
    console.log('📱 Switching to homeowner:', homeowner.name);
    if (onSelectHomeowner) {
      onSelectHomeowner(homeowner);
    }
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  // Handler for saving homeowner edits
  const handleSaveHomeownerEdit = async () => {
    if (!selectedHomeowner) return;
    
    console.log('💾 Saving homeowner edits:', editFormData);
    
    try {
      // Call the update handler from parent
      if (onUpdateHomeowner) {
        // Convert closingDate string back to Date before updating
        const updatedData = {
          ...selectedHomeowner,
          ...editFormData,
          closingDate: editFormData.closingDate ? new Date(editFormData.closingDate) : selectedHomeowner.closingDate,
        };
        
        await onUpdateHomeowner(updatedData);
      }
      
      // Exit edit mode
      setIsEditingHomeowner(false);
      console.log('✅ Homeowner updated successfully');
    } catch (error) {
      console.error('❌ Failed to save homeowner:', error);
      // TODO: Show error toast/notification
    }
  };

  // Handler for inviting homeowner
  const handleInviteHomeowner = () => {
    if (!selectedHomeowner) return;
    
    console.log('📧 Opening invite modal for:', selectedHomeowner.email);
    
    // Pre-fill the invite form with homeowner data and default message
    setInviteName(selectedHomeowner.name || '');
    setInviteEmail(selectedHomeowner.email || '');
    setInviteBody(DEFAULT_INVITE_MESSAGE); // Pre-fill with standard message
    setIsDrafting(false);
    setInviteStatus('idle'); // Reset status
    
    // Open the modal
    setShowInviteModal(true);
  };

  // Handler for sending the invitation (with button feedback)
  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteBody) return;
    
    console.log('📧 Sending invitation to:', inviteEmail);
    
    try {
      // Set sending state
      setInviteStatus('sending');
      
      // TODO: Replace with actual API call
      // Example: await sendInvitationAPI({ name: inviteName, email: inviteEmail, body: inviteBody });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API delay
      
      // Set success state
      setInviteStatus('success');
      console.log('✅ Invitation sent successfully to:', inviteEmail);
      
      // Wait for user to see success state
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Close modal and reset
      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      setInviteBody('');
      setInviteStatus('idle');
      
    } catch (error) {
      console.error('❌ Failed to send invitation:', error);
      setInviteStatus('error');
      
      // Reset to idle after showing error
      setTimeout(() => setInviteStatus('idle'), 3000);
    }
  };

  // ========== SCROLL POSITION PRESERVATION ==========
  // Helper to save scroll position before opening a modal
  const handleOpenModal = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    dashboardScrollRef.current = window.scrollY;
    console.log('💾 Saved scroll position:', dashboardScrollRef.current);
    setter(true);
  };

  // Restore scroll position when all modals are closed
  React.useLayoutEffect(() => {
    const allModalsClosed = !showClaims && !showTasks && !showMessages && 
      !showDocuments && !showSchedule && !showPunchList && !showTeamChat &&
      !showBackend && !showHomeowners && !showAnalytics && !showTeam && 
      !showNotes && !showBuilderGroups && !showCalls && !isEditingHomeowner;
    
    if (allModalsClosed) {
      console.log('📜 Restoring scroll position:', dashboardScrollRef.current);
      window.scrollTo(0, dashboardScrollRef.current);
    }
  }, [showClaims, showTasks, showMessages, showDocuments, showSchedule, 
      showPunchList, showTeamChat, showBackend, showHomeowners, showAnalytics, 
      showTeam, showNotes, showBuilderGroups, showCalls, isEditingHomeowner]);

  // ========== ACTION BUTTON COMPONENT ==========
  const ActionButton: React.FC<{
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    fullWidth?: boolean;
  }> = ({ icon: Icon, label, onClick, variant = 'secondary', fullWidth = false }) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center justify-center gap-3 rounded-2xl transition-all active:scale-95 
        bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 
        hover:border-primary/30 hover:bg-gray-50 dark:hover:bg-gray-700
        ${fullWidth 
          ? 'col-span-2 h-14 flex-row' 
          : 'flex-col p-6'
        }
      `}
      style={fullWidth ? undefined : { minHeight: '110px' }}
    >
      <Icon className={`text-primary ${fullWidth ? 'h-5 w-5' : 'h-8 w-8'}`} />
      <span className={`font-medium text-center text-primary ${fullWidth ? 'text-base' : 'text-sm'}`}>
        {label}
      </span>
    </button>
  );

  // ========== RENDER ==========
  return (
    <div className="w-full overflow-x-hidden bg-gray-50 dark:bg-gray-900 min-h-screen pb-8">
      {/* Unified Mobile Header with Search */}
      <div className="sticky top-0 z-20">
        <AdminMobileHeader
          homeownerQuery={searchQuery || ''}
          onHomeownerSearch={onSearchChange}
          globalQuery={globalQuery}
          onGlobalSearch={setGlobalQuery}
          homeownerPlaceholder="Switch homeowner..."
        />
        
        {/* Homeowner Search Results Dropdown - Only when searching homeowners */}
        {searchQuery && !globalQuery && searchResults && searchResults.length > 0 && (
          <div className="absolute left-4 right-4 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[40vh] overflow-y-auto z-30">
            {searchResults.map((homeowner) => (
              <button
                key={homeowner.id}
                type="button"
                onClick={() => handleHomeownerSwitch(homeowner)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-0 transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold">
                    {homeowner.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {homeowner.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {homeowner.builder} • {homeowner.jobName}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GLOBAL SEARCH RESULTS OVERLAY - Shows when global query active */}
      {globalQuery.trim().length > 0 && (
        <div className="px-4 pt-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Close Button (Top Right) */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setGlobalQuery('')}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Loading State */}
            {isGlobalSearching && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Searching...</span>
              </div>
            )}

            {/* Results */}
            {!isGlobalSearching && globalResults.length > 0 && (
              <div className="max-h-[60vh] overflow-y-auto">
                {globalResults.map((result: any) => (
                  <a
                    key={result.id}
                    href={result.url}
                    onClick={(e) => {
                      e.preventDefault();
                      setGlobalQuery('');
                      window.location.href = result.url;
                    }}
                    className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-0 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                          {result.type}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.title}
                        </p>
                        {result.subtitle && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* No Results */}
            {!isGlobalSearching && globalResults.length === 0 && globalQuery.trim().length >= 2 && (
              <div className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No results found for "{globalQuery}"</p>
              </div>
            )}

            {/* Minimum chars hint */}
            {!isGlobalSearching && globalQuery.trim().length < 2 && (
              <div className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Homeowner Info Card - Inline Editing */}
      <div className={`px-4 pt-4 pb-6 ${globalQuery.trim().length > 0 ? 'opacity-30 pointer-events-none' : ''}`}>
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          
          {/* Header Row (Always Visible) */}
          <button
            type="button"
            onClick={() => setIsHomeownerExpanded(!isHomeownerExpanded)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Row 1: Name + Status Badge (inline) */}
                <div className="flex items-center gap-3 mb-1">
                  {isEditingHomeowner ? (
                    <Input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="text-lg font-semibold h-8 -ml-2 flex-1"
                      placeholder="Homeowner Name"
                    />
                  ) : (
                    <h2 className="text-lg font-semibold text-primary dark:text-primary">
                      {selectedHomeowner.name}
                    </h2>
                  )}
                  
                  {/* Status Badge - Sits immediately next to name */}
                  {!isEditingHomeowner && (() => {
                    // Determine status based on claims or default to "Active"
                    if (homeownerClaims.length > 0) {
                      const status = homeownerClaims[0].status;
                      return <StatusBadge status={status} />;
                    } else {
                      return (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          Active
                        </span>
                      );
                    }
                  })()}
                </div>
                
                {/* Row 2: Project - Builder - Closing Date */}
                {isEditingHomeowner ? (
                  <div className="space-y-1 mt-2">
                    <Input
                      type="text"
                      value={editFormData.jobName}
                      onChange={(e) => setEditFormData({ ...editFormData, jobName: e.target.value })}
                      className="h-8 text-xs w-full"
                      placeholder="Project Name"
                    />
                    <Input
                      type="text"
                      value={editFormData.builder}
                      onChange={(e) => setEditFormData({ ...editFormData, builder: e.target.value })}
                      className="h-8 text-xs w-full"
                      placeholder="Builder Name"
                    />
                    <Input
                      type="date"
                      value={editFormData.closingDate}
                      onChange={(e) => setEditFormData({ ...editFormData, closingDate: e.target.value })}
                      className="h-8 text-xs w-full"
                      placeholder="Closing Date"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedHomeowner.jobName || 'No project'} • {selectedHomeowner.builder || 'No builder'} • {formatDate(selectedHomeowner.closingDate)}
                  </p>
                )}
              </div>
              
              {/* Expand/Collapse Icon */}
              {isHomeownerExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
              )}
            </div>
          </button>

          {/* Expanded Body - Contact Info & Inline Editing */}
          {isHomeownerExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              
              {/* Email Row */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Email</p>
                {isEditingHomeowner ? (
                  <Input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full h-10 bg-white dark:bg-gray-800"
                    placeholder="email@example.com"
                  />
                ) : (
                  <div className="flex items-center gap-0">
                    {/* Action Button: Internal Message */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('✉️ Opening internal message modal');
                        handleOpenModal(setShowMessages);
                      }}
                      className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex-shrink-0"
                      title="Send Internal Message"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                    
                    {/* Email Value */}
                    <p className="text-sm text-primary dark:text-primary font-medium truncate flex-1">
                      {selectedHomeowner.email}
                    </p>
                  </div>
                )}
              </div>

              {/* Phone Row */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Phone</p>
                {isEditingHomeowner ? (
                  <Input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full h-10 bg-white dark:bg-gray-800"
                    placeholder="(555) 555-5555"
                  />
                ) : (
                  <div className="flex items-center gap-0">
                    {/* Action Button: Text */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedHomeowner.phone) {
                          window.open(`sms:${selectedHomeowner.phone}`, '_blank');
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex-shrink-0"
                      title="Send Text Message"
                      disabled={!selectedHomeowner.phone}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    
                    {/* Action Button: Call */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedHomeowner.phone) {
                          window.open(`tel:${selectedHomeowner.phone}`, '_blank');
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex-shrink-0"
                      title="Call"
                      disabled={!selectedHomeowner.phone}
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    
                    {/* Phone Value */}
                    <p className="text-sm text-primary dark:text-primary font-medium flex-1">
                      {selectedHomeowner.phone || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              {/* Address Row */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Address</p>
                {isEditingHomeowner ? (
                  <Input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full h-10 bg-white dark:bg-gray-800"
                    placeholder="123 Main St, City, ST 12345"
                  />
                ) : (
                  <div className="flex items-center gap-0">
                    {/* Action Button: Maps */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedHomeowner.address) {
                          const encoded = encodeURIComponent(selectedHomeowner.address);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex-shrink-0"
                      title="Open in Maps"
                      disabled={!selectedHomeowner.address}
                    >
                      <MapPin className="h-4 w-4" />
                    </button>
                    
                    {/* Address Value */}
                    <p className="text-sm text-primary dark:text-primary font-medium flex-1">
                      {selectedHomeowner.address || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer: Edit & Invite Buttons */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {isEditingHomeowner ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveHomeownerEdit();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Save Changes</span>
                  </button>
                ) : (
                  <div className="flex gap-3">
                    {/* Edit Information Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('✏️ Edit homeowner:', selectedHomeowner.id);
                        setIsEditingHomeowner(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary bg-white dark:bg-gray-800 border border-primary/30 rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <FileEdit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    
                    {/* Invite Homeowner Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInviteHomeowner();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary bg-white dark:bg-gray-800 border border-primary/30 rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      <span>Invite</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PROJECT Section (No Title) */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {/* 1. Warranty */}
          <ActionButton
            icon={Shield}
            label="Warranty"
            onClick={() => {
              console.log('🛡️ Opening Warranty (Claims tab)');
              handleOpenModal(setShowClaims);
            }}
          />
          
          {/* 2. Messages (Homeowner context) */}
          <ActionButton
            icon={Mail}
            label="Messages"
            onClick={() => {
              console.log('💬 Opening Homeowner Messages');
              handleOpenModal(setShowMessages);
            }}
          />
          
          {/* 3. Tasks - Updated Icon */}
          <ActionButton
            icon={CheckSquare}
            label="Tasks"
            onClick={() => {
              console.log('✅ Opening Tasks');
              handleOpenModal(setShowTasks);
            }}
          />
          
          {/* 4. Documents */}
          <ActionButton
            icon={FileText}
            label="Documents"
            onClick={() => {
              console.log('📄 Opening Documents tab');
              handleOpenModal(setShowDocuments);
            }}
          />
          
          {/* 5. Schedule */}
          <ActionButton
            icon={Calendar}
            label="Schedule"
            onClick={() => {
              console.log('📅 Opening Schedule');
              handleOpenModal(setShowSchedule);
            }}
          />
          
          {/* 6. Notes (Internal) */}
          <ActionButton
            icon={StickyNote}
            label="Notes"
            onClick={() => {
              console.log('📝 Opening Notes');
              handleOpenModal(setShowNotes);
            }}
          />
          
          {/* 7. BlueTag - Updated Icon */}
          <ActionButton
            icon={Clipboard}
            label="Blue Tag"
            onClick={() => {
              console.log('📋 Opening PunchList');
              handleOpenModal(setShowPunchList);
            }}
          />
          
          {/* 8. Calls */}
          <ActionButton
            icon={Phone}
            label="Calls"
            onClick={() => {
              console.log('📞 Opening Calls');
              handleOpenModal(setShowCalls);
            }}
          />
        </div>
      </div>

      {/* ADMIN Section - Styled Divider */}
      <div className="px-4 mb-6">
        {/* Centered divider with lines */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            ADMIN
          </h3>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ActionButton
            icon={Users}
            label="Homeowners"
            onClick={() => {
              console.log('👥 Opening Homeowners');
              handleOpenModal(setShowHomeowners);
            }}
          />
          <ActionButton
            icon={DollarSign}
            label="Invoices"
            onClick={() => {
              dashboardScrollRef.current = window.scrollY;
              setShowInvoicesFullView?.(true);
            }}
          />
          <ActionButton
            icon={BarChart}
            label="Analytics"
            onClick={() => {
              console.log('📊 Opening Analytics');
              handleOpenModal(setShowAnalytics);
            }}
          />
          <ActionButton
            icon={MessageCircle}
            label="Team Chat"
            onClick={() => {
              console.log('💭 Opening Team Chat');
              handleOpenModal(setShowTeamChat);
            }}
          />
          <ActionButton
            icon={UserCog}
            label="Internal Users"
            onClick={() => {
              console.log('👥 Opening Internal Users');
              handleOpenModal(setShowTeam);
            }}
          />
          <ActionButton
            icon={Building2}
            label="Builders"
            onClick={() => {
              console.log('🏗️ Opening Builder Groups');
              handleOpenModal(setShowBuilderGroups);
            }}
          />
          <ActionButton
            icon={Database}
            label="Backend"
            onClick={() => {
              console.log('🔧 Opening Backend Tools');
              handleOpenModal(setShowBackend);
            }}
          />
          <ActionButton
            icon={LogOut}
            label="Sign Out"
            onClick={async () => {
              console.log('👋 Signing out');
              await signOut();
            }}
            variant="danger"
          />
        </div>
      </div>

      {/* ========== MODALS ========== */}
      
      {/* Tasks Modal - Full Desktop Parity with Stack Navigation */}
      {showTasks && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-0 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                {selectedTask && (
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">
                  {selectedTask ? 'Task Detail' : 'Tasks'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowTasks(false);
                    setSelectedTask(null);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                }>
                  {(() => {
                    // Filter tasks based on selected filter
                    const filteredTasks = tasks.filter(t => {
                      if (tasksFilter === 'open') return !t.isCompleted;
                      if (tasksFilter === 'closed') return t.isCompleted;
                      return true; // 'all'
                    });

                    return (
                      <TasksTab
                        tasks={tasks}
                        filteredTasks={filteredTasks}
                        selectedTask={selectedTask}
                        employees={employees}
                        claims={claims}
                        homeowners={homeowners}
                        currentUser={currentUser}
                        taskMessages={taskMessages || []}
                        tasksFilter={tasksFilter}
                        tasksTabStartInEditMode={!!selectedTask} // Start in edit mode when task selected
                        onTaskSelect={setSelectedTask}
                        onSetTasksFilter={setTasksFilter}
                        onToggleTask={(taskId) => {
                          if (onToggleTask) onToggleTask(taskId);
                        }}
                        onDeleteTask={(taskId) => {
                          if (onDeleteTask) {
                            onDeleteTask(taskId);
                            setSelectedTask(null);
                          }
                        }}
                        onUpdateTask={onUpdateTask}
                        onSelectClaim={(claim) => {
                          if (onSelectClaim) {
                            setShowTasks(false);
                            onSelectClaim(claim, false);
                          }
                        }}
                        onSetCurrentTab={() => {}}
                        isAdmin={true}
                      />
                    );
                  })()}
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Notes Modal - Full Screen */}
      {showNotes && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col h-full animate-in slide-in-from-bottom-4 duration-200">
          {/* Sticky Header */}
          <div className="flex-none px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Internal Notes
            </h2>
            <button
              onClick={() => setShowNotes(false)}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900/50">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            }>
              {/* Wrapper to hide TasksSheet's internal header since we have our own */}
              <div className="notes-mobile-wrapper">
                <style>{`
                  /* Hide TasksSheet's internal header (we have our own above) */
                  .notes-mobile-wrapper > div > div:first-child {
                    display: none !important;
                  }
                  /* Remove top padding/margin from the content area */
                  .notes-mobile-wrapper > div {
                    padding-top: 0 !important;
                  }
                  /* Ensure input form is at the top */
                  .notes-mobile-wrapper > div > div:nth-child(2) {
                    border-top: none !important;
                  }
                `}</style>
                <TasksSheet
                  isInline={true}
                  onNavigateToClaim={(claimId) => console.log('Navigate to claim:', claimId)}
                  claims={claims}
                />
              </div>
            </Suspense>
          </div>
        </div>
      )}

      {/* Builder Groups Modal - Full Screen with List -> Detail Flow */}
      {showBuilderGroups && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col h-full animate-in slide-in-from-bottom-4 duration-200">
          {/* Sticky Header */}
          <div className="flex-none px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
            {selectedBuilderGroupId && (
              <button
                onClick={() => setSelectedBuilderGroupId(null)}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
              {selectedBuilderGroupId ? 'Edit Group' : 'Builder Groups'}
            </h2>
            {!selectedBuilderGroupId && (
              <button
                onClick={() => {
                  console.log('TODO: Create new builder group');
                  // TODO: Implement create new group flow
                }}
                className="p-2 -mr-2 text-primary hover:text-primary/80 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => {
                setShowBuilderGroups(false);
                setSelectedBuilderGroupId(null);
              }}
              className="p-2 -mr-2 ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900/50">
            {!selectedBuilderGroupId ? (
              /* LIST VIEW */
              <div className="p-4 space-y-3">
                {builderGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Building2 className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No builder groups yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Tap the + button above to create one
                    </p>
                  </div>
                ) : (
                  builderGroups.map((group) => {
                    const memberCount = (builderUsers || []).filter(u => u.builderGroupId === group.id).length;
                    return (
                      <button
                        key={group.id}
                        onClick={() => setSelectedBuilderGroupId(group.id)}
                        className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-primary dark:hover:border-primary transition-colors text-left"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {group.name}
                          </h3>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                        {group.email && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {group.email}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {memberCount} {memberCount === 1 ? 'member' : 'members'}
                          </div>
                          {group.enrollmentSlug && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-3 w-3" />
                              Link active
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              /* DETAIL VIEW */
              (() => {
                const selectedGroup = builderGroups.find(g => g.id === selectedBuilderGroupId);
                if (!selectedGroup) {
                  return (
                    <div className="p-4 text-center text-gray-500">
                      Group not found
                    </div>
                  );
                }
                
                const members = (builderUsers || []).filter(u => u.builderGroupId === selectedGroup.id);
                const enrollmentUrl = selectedGroup.enrollmentSlug 
                  ? `${window.location.origin}/enroll/${selectedGroup.enrollmentSlug}`
                  : '';

                return (
                  <div className="p-4 space-y-6">
                    {/* Group Information */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        Group Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Group Name
                          </label>
                          <input
                            type="text"
                            value={selectedGroup.name}
                            readOnly
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        {selectedGroup.email && (
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={selectedGroup.email}
                              readOnly
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enrollment Link */}
                    {enrollmentUrl && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                          <LinkIcon className="h-5 w-5 text-primary" />
                          Enrollment Link
                        </h3>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={enrollmentUrl}
                            readOnly
                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(enrollmentUrl);
                              // TODO: Show toast notification
                              console.log('Link copied!');
                            }}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Members */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Members ({members.length})
                        </h3>
                        <button
                          onClick={() => {
                            console.log('TODO: Add member');
                            // TODO: Implement add member flow
                          }}
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </button>
                      </div>
                      {members.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          No members yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {member.name}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {member.email}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  console.log('TODO: Remove member', member.id);
                                  // TODO: Implement remove member
                                }}
                                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors ml-2"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Calls Modal - Full Screen with List -> Detail Flow */}
      {showCalls && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col h-full animate-in slide-in-from-bottom-4 duration-200">
          {/* Sticky Header */}
          <div className="flex-none px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
            {selectedCallId && (
              <button
                onClick={() => setSelectedCallId(null)}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedCallId ? 'Call Details' : 'Phone Calls'}
            </h2>
            <button
              onClick={() => {
                setShowCalls(false);
                setSelectedCallId(null);
              }}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900/50 p-4">
            {/* View A: Call List */}
            {!selectedCallId && (
              <div className="space-y-3">
                {/* Mock Call Card */}
                <button
                  onClick={() => setSelectedCallId(MOCK_CALL.id)}
                  className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {MOCK_CALL.homeownerName || 'Unknown Caller'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {MOCK_CALL.phoneNumber}
                      </p>
                    </div>
                    {MOCK_CALL.isUrgent && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                    {MOCK_CALL.issueDescription}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(MOCK_CALL.createdAt)}</span>
                  </div>
                </button>

                {/* Empty State (when no real calls) */}
                <div className="text-center py-12">
                  <Phone className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No other calls at this time</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Showing 1 mock call for testing
                  </p>
                </div>
              </div>
            )}

            {/* View B: Call Detail */}
            {selectedCallId && selectedCallId === MOCK_CALL.id && (
              <div className="space-y-4">
                {/* Caller Info Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {MOCK_CALL.homeownerName || 'Unknown Caller'}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{MOCK_CALL.phoneNumber}</span>
                        </div>
                        {MOCK_CALL.propertyAddress && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{MOCK_CALL.propertyAddress}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(MOCK_CALL.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    {MOCK_CALL.isUrgent && (
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium rounded-full">
                        Urgent
                      </span>
                    )}
                  </div>

                  {/* Issue Summary */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Issue Summary
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {MOCK_CALL.issueDescription}
                    </p>
                  </div>
                </div>

                {/* Transcript Card */}
                {MOCK_CALL.transcript && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Call Transcript
                    </h4>
                    <div className="space-y-3">
                      {MOCK_CALL.transcript.split('\n\n').map((block, idx) => {
                        const isAssistant = block.startsWith('Assistant:');
                        const text = block.replace(/^(Assistant|Caller):\s*/,'');
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg ${
                              isAssistant
                                ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                                : 'bg-gray-50 dark:bg-gray-900/50 mr-8'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {isAssistant ? (
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-xs font-semibold">AI</span>
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                </div>
                              )}
                              <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                {text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recording (if available) */}
                {MOCK_CALL.recordingUrl && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Call Recording
                    </h4>
                    <audio controls className="w-full">
                      <source src={MOCK_CALL.recordingUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}

                {/* Verification Status */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Verification Status
                  </h4>
                  <div className="flex items-center gap-2">
                    {MOCK_CALL.isVerified ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-600 dark:text-green-400">Verified</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">Pending Verification</span>
                      </>
                    )}
                  </div>
                  {MOCK_CALL.addressMatchSimilarity !== null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Address match: {Math.round((MOCK_CALL.addressMatchSimilarity || 0) * 100)}%
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        }>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowSchedule(false)}>
            <div className="fixed inset-0 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="min-h-full p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl mx-auto">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Schedule - {selectedHomeowner.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowSchedule(false)}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-4">
                    <ScheduleTabWrapper
                      homeowners={[selectedHomeowner]}
                      claims={homeownerClaims}
                      userRole={userRole}
                      activeHomeownerId={selectedHomeowner.id}
                      isAdmin={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Suspense>
      )}

      {/* PunchList Modal */}
      {showPunchList && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        }>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="fixed inset-0 overflow-y-auto">
              <PunchListApp
                homeowner={selectedHomeowner}
                onClose={() => setShowPunchList(false)}
                onSavePDF={(blob, filename) => console.log('Save PDF:', filename)}
                onCreateMessage={async (homeownerId, subject, content, attachments) => {
                  console.log('Create message:', subject);
                }}
                onUpdateHomeowner={onUpdateHomeowner}
              />
            </div>
          </div>
        </Suspense>
      )}

      {/* Backend Tools Modal - Full Screen */}
      {showBackend && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col h-full animate-in slide-in-from-bottom-4 duration-200">
          {/* Sticky Header */}
          <div className="flex-none border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
            {/* Title Row */}
            <div className="px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Backend Systems
              </h2>
              <button
                onClick={() => setShowBackend(false)}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Tab Selector Dropdown - Mobile Only */}
            <div className="px-4 pb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Select System:</p>
              <select
                id="backend-tab-selector"
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base shadow-sm appearance-none focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                onChange={(e) => {
                  // Simulate clicking the corresponding tab button
                  const tabValue = e.target.value;
                  const tabButtons = document.querySelectorAll('.backend-dashboard-mobile-wrapper button');
                  const tabLabels = ['NETLIFY', 'OPENAI', 'SENTRY', 'POSTHOG', 'EMAILS', 'OVERVIEW', 'NEON'];
                  const index = tabLabels.indexOf(tabValue);
                  if (index >= 0 && tabButtons[index]) {
                    (tabButtons[index] as HTMLButtonElement).click();
                  }
                }}
              >
                <option value="NETLIFY">Netlify (Deployments)</option>
                <option value="OPENAI">OpenAI (AI Model)</option>
                <option value="SENTRY">Sentry (Error Tracking)</option>
                <option value="POSTHOG">PostHog (Analytics)</option>
                <option value="EMAILS">Emails (SendGrid)</option>
                <option value="OVERVIEW">Overview (Database Stats)</option>
                <option value="NEON">Neon (Database Config)</option>
              </select>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900/50">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            }>
              {/* Wrapper to override BackendDashboard's modal styling */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                // Override BackendDashboard's fixed positioning and backdrop
              }}>
                <style>{`
                  .backend-dashboard-mobile-wrapper > div:first-child {
                    position: static !important;
                    z-index: auto !important;
                    background: transparent !important;
                    backdrop-filter: none !important;
                    padding: 0 !important;
                    display: block !important;
                    overflow: visible !important;
                    animation: none !important;
                  }
                  .backend-dashboard-mobile-wrapper > div:first-child > div:first-child {
                    position: static !important;
                    max-width: 100% !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: 100% !important;
                    margin: 0 !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                    animation: none !important;
                    background: white !important;
                  }
                  .dark .backend-dashboard-mobile-wrapper > div:first-child > div:first-child {
                    background: rgb(17, 24, 39) !important;
                  }
                  /* Hide the BackendDashboard's own header since we have our own */
                  .backend-dashboard-mobile-wrapper > div:first-child > div:first-child > div:first-child {
                    display: none !important;
                  }
                  /* Hide the horizontal tab bar on mobile */
                  .backend-dashboard-mobile-wrapper .overflow-x-auto {
                    display: none !important;
                  }
                `}</style>
                <div className="backend-dashboard-mobile-wrapper">
                  <BackendDashboard
                    onClose={() => setShowBackend(false)}
                  />
                </div>
              </div>
            </Suspense>
          </div>
        </div>
      )}

      {/* Homeowners Modal - Full Screen */}
      {showHomeowners && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col h-full animate-in slide-in-from-bottom-4 duration-200">
          {/* Sticky Header */}
          <div className="flex-none px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Homeowners
            </h2>
            <button
              onClick={() => setShowHomeowners(false)}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900/50">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            }>
              <HomeownersList
                homeowners={homeowners}
                builderGroups={builderGroups}
                builderUsers={builderUsers}
                onUpdateHomeowner={onUpdateHomeowner}
                onDeleteHomeowner={onDeleteHomeowner}
                onClose={() => setShowHomeowners(false)}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Analytics Modal - Full Screen */}
      {showAnalytics && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col h-full animate-in slide-in-from-bottom-4 duration-200">
          {/* Sticky Header */}
          <div className="flex-none px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Analytics
            </h2>
            <button
              onClick={() => setShowAnalytics(false)}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900/50">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            }>
              <WarrantyAnalytics
                claims={claims}
                homeowners={homeowners}
                builderGroups={builderGroups}
                builderUsers={builderUsers}
                claimMessages={claimMessages as any}
                onSelectClaim={(claim) => {
                  setShowAnalytics(false);
                  if (onSelectClaim) {
                    onSelectClaim(claim, false);
                  }
                }}
                onClose={() => setShowAnalytics(false)}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Internal Users / Team Modal - Full Screen */}
      {showTeam && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col h-full animate-in slide-in-from-bottom-4 duration-200">
          {/* Sticky Header */}
          <div className="flex-none px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Internal Users
            </h2>
            <button
              onClick={() => setShowTeam(false)}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900/50">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            }>
              <InternalUserManagement
                employees={employees}
                onAddEmployee={onAddEmployee}
                onUpdateEmployee={onUpdateEmployee}
                onDeleteEmployee={onDeleteEmployee}
                contractors={contractors}
                onAddContractor={onAddContractor}
                onUpdateContractor={onUpdateContractor}
                onDeleteContractor={onDeleteContractor}
                builderUsers={builderUsers}
                builderGroups={builderGroups}
                homeowners={homeowners}
                onAddBuilderUser={onAddBuilderUser}
                onUpdateBuilderUser={onUpdateBuilderUser}
                onDeleteBuilderUser={onDeleteBuilderUser}
                onClose={() => setShowTeam(false)}
                initialTab="EMPLOYEES"
                currentUser={currentUser}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Claims/Warranty Modal - STACK NAVIGATION */}
      {showClaims && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-0 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">
                  {selectedClaimId ? 'Edit Claim' : 'Warranty Claims'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowClaims(false);
                    setSelectedClaimId(null);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content - Stack Navigation */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                }>
                  {!selectedClaimId ? (
                    /* LIST VIEW: Desktop-Style Claims List with Tabs */
                    <>
                      {/* Filter Tabs */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setClaimsFilter('Open')}
                            className={`transition-all duration-200 px-4 py-2 rounded-lg text-sm font-medium hover:-translate-y-0.5 hover:shadow-sm ${
                              claimsFilter === 'Open'
                                ? 'text-primary bg-white dark:bg-gray-700 shadow-md'
                                : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary bg-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>Open</span>
                              {claimsFilter === 'Open' && (
                                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {homeownerClaims.filter(c => c.status !== ClaimStatus.COMPLETED).length}
                                </span>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => setClaimsFilter('Closed')}
                            className={`transition-all duration-200 px-4 py-2 rounded-lg text-sm font-medium hover:-translate-y-0.5 hover:shadow-sm ${
                              claimsFilter === 'Closed'
                                ? 'text-primary bg-white dark:bg-gray-700 shadow-md'
                                : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary bg-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>Closed</span>
                              {claimsFilter === 'Closed' && (
                                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {homeownerClaims.filter(c => c.status === ClaimStatus.COMPLETED).length}
                                </span>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => setClaimsFilter('All')}
                            className={`transition-all duration-200 px-4 py-2 rounded-lg text-sm font-medium hover:-translate-y-0.5 hover:shadow-sm ${
                              claimsFilter === 'All'
                                ? 'text-primary bg-white dark:bg-gray-700 shadow-md'
                                : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary bg-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>All</span>
                              {claimsFilter === 'All' && (
                                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {homeownerClaims.length}
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Claims List - Desktop-Style Cards */}
                      <div className="flex-1 overflow-y-auto p-4" style={{ height: '85vh' }}>
                        {(() => {
                          // Filter claims based on selected tab
                          const filteredClaims = homeownerClaims.filter(c => {
                            if (claimsFilter === 'Open') return c.status !== ClaimStatus.COMPLETED;
                            if (claimsFilter === 'Closed') return c.status === ClaimStatus.COMPLETED;
                            return true; // 'All'
                          });

                          if (filteredClaims.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Shield className="h-16 w-16 mb-4 opacity-20" />
                                <p>
                                  {claimsFilter === 'Open' 
                                    ? 'No open claims' 
                                    : claimsFilter === 'Closed' 
                                    ? 'No closed claims'
                                    : 'No warranty claims yet'}
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {filteredClaims.map((claim) => {
                                const scheduledDate = claim.proposedDates?.find(d => d.status === 'ACCEPTED');
                                const serviceOrderMessages = (claimMessages || [])
                                  .filter(m => m.claimId === claim.id && 
                                               m.type === 'SUBCONTRACTOR' && 
                                               m.subject?.toLowerCase().includes('service order'))
                                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                                const serviceOrderDate = serviceOrderMessages.length > 0 ? serviceOrderMessages[0]?.timestamp : null;
                                const isReviewed = claim.reviewed || false;

                                return (
                                  <WarrantyCard
                                    key={claim.id}
                                    title={claim.title}
                                    classification={claim.classification}
                                    createdDate={claim.dateSubmitted ? new Date(claim.dateSubmitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
                                    scheduledDate={scheduledDate?.date ? new Date(scheduledDate.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
                                    soSentDate={serviceOrderDate ? new Date(serviceOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
                                    subName={claim.contractorName}
                                    attachmentCount={claim.attachments?.length || 0}
                                    isReviewed={isReviewed}
                                    isClosed={claim.status === ClaimStatus.COMPLETED}
                                    isSelected={false}
                                    onClick={() => setSelectedClaimId(claim.id)}
                                    isHomeownerView={false}
                                  />
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    /* DETAIL VIEW: Full Desktop-Parity Claim Detail with ALL Sections */
                    <div className="relative flex-1 overflow-hidden" style={{ height: '85vh' }}>
                      {/* Scrollable Content Area with Bottom Padding for Footer */}
                      <div className="absolute inset-0 overflow-y-auto pb-20 px-4">
                        {(() => {
                          const claim = homeownerClaims.find(c => c.id === selectedClaimId);
                          if (!claim) {
                            return <div className="p-4 text-red-500">Claim not found</div>;
                          }
                          
                          return (
                            <div className="space-y-4 py-4">
                              {/* SECTION 1: CLAIM TITLE (Editable Input with Label) */}
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Claim Title
                                </label>
                                <input
                                  type="text"
                                  value={claim.title}
                                  onChange={(e) => {
                                    onUpdateClaim?.({
                                      ...claim,
                                      title: e.target.value
                                    });
                                  }}
                                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Enter claim title..."
                                />
                              </div>

                              {/* SECTION 2: DESCRIPTION (Editable Textarea with Label) */}
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Description
                                </label>
                                <textarea
                                  value={claim.description}
                                  onChange={(e) => {
                                    onUpdateClaim?.({
                                      ...claim,
                                      description: e.target.value
                                    });
                                  }}
                                  rows={6}
                                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  placeholder="Enter description..."
                                />

                                {/* ATTACHMENTS: Show existing + Upload capability */}
                                {claim.attachments && claim.attachments.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                      <Paperclip className="h-4 w-4" />
                                      Attachments ({claim.attachments.length})
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                      {claim.attachments.map((att, i) => {
                                        const attachmentType = att.type || 'DOCUMENT';
                                        const attachmentUrl = att.url || '';
                                        const attachmentName = att.name || 'Attachment';
                                        
                                        return (
                                          <div
                                            key={att.id || `att-${i}`}
                                            className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
                                          >
                                            {attachmentType === 'IMAGE' && attachmentUrl ? (
                                              <img
                                                src={attachmentUrl}
                                                alt={attachmentName}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                              />
                                            ) : (
                                              <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                                <FileText className="h-6 w-6 text-blue-600 mb-1" />
                                                <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-full text-center">{attachmentName}</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* UPLOAD BUTTON/ZONE */}
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Trigger file upload
                                      console.log('Open file upload for claim attachments');
                                      // TODO: Implement actual upload handler
                                    }}
                                    className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Upload Images or Documents
                                  </button>
                                </div>
                              </div>

                              {/* SECTION 3: WARRANTY ASSESSMENT (Fully Editable) */}
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                  <Info className="h-4 w-4 text-blue-600" />
                                  Warranty Assessment
                                </h3>
                                <div className="space-y-4">
                                  {/* Classification Dropdown */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                      Classification
                                    </label>
                                    <select
                                      value={claim.classification || '60 Day'}
                                      onChange={(e) => {
                                        onUpdateClaim?.({
                                          ...claim,
                                          classification: e.target.value as ClaimClassification
                                        });
                                      }}
                                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                                    >
                                      <option value="60 Day">60 Day</option>
                                      <option value="11-Month">11-Month</option>
                                      <option value="1-Year">1-Year</option>
                                      <option value="2-Year">2-Year</option>
                                      <option value="10-Year Structural">10-Year Structural</option>
                                      <option value="Non-Warranty">Non-Warranty</option>
                                    </select>
                                  </div>

                                  {/* Date Evaluated Input */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                      Date Evaluated
                                    </label>
                                    <input
                                      type="date"
                                      value={claim.dateEvaluated ? new Date(claim.dateEvaluated).toISOString().split('T')[0] : ''}
                                      onChange={(e) => {
                                        onUpdateClaim?.({
                                          ...claim,
                                          dateEvaluated: e.target.value ? new Date(e.target.value) : undefined
                                        });
                                      }}
                                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>

                                  {/* Non-Warranty Explanation (if applicable) */}
                                  {claim.classification === 'Non-Warranty' && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                                      <label className="block text-xs font-semibold text-red-900 dark:text-red-300 mb-1.5">
                                        Non-Warranty Explanation
                                      </label>
                                      <textarea
                                        value={claim.nonWarrantyExplanation || ''}
                                        onChange={(e) => {
                                          onUpdateClaim?.({
                                            ...claim,
                                            nonWarrantyExplanation: e.target.value
                                          });
                                        }}
                                        rows={3}
                                        className="w-full bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                        placeholder="Explain why this is not covered..."
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* SECTION 4: SUB ASSIGNMENT */}
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                  <HardHat className="h-4 w-4 text-blue-600" />
                                  Sub Assignment
                                </h3>
                                <div className="space-y-3">
                                  <select
                                    value={claim.contractorId || ''}
                                    onChange={(e) => {
                                      const contractor = contractors.find(c => c.id === e.target.value);
                                      if (contractor) {
                                        onUpdateClaim?.({
                                          ...claim,
                                          contractorId: contractor.id,
                                          contractorName: contractor.companyName,
                                          contractorEmail: contractor.email
                                        });
                                      }
                                    }}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                                  >
                                    <option value="">Select a sub...</option>
                                    {contractors.map(c => (
                                      <option key={c.id} value={c.id}>
                                        {c.companyName} ({c.specialty})
                                      </option>
                                    ))}
                                  </select>

                                  {/* Service Order Button (if contractor assigned) */}
                                  {claim.contractorId && (
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-blue-900 dark:text-blue-300">{claim.contractorName}</p>
                                        <p className="text-xs text-blue-700 dark:text-blue-400">{claim.contractorEmail}</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          console.log('Generate and send service order');
                                          // TODO: Implement service order generation
                                        }}
                                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                      >
                                        Service Order
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* SECTION 5: SCHEDULING */}
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-blue-600" />
                                  Scheduling
                                </h3>
                                
                                {claim.status === 'SCHEDULED' && claim.proposedDates && claim.proposedDates.length > 0 ? (
                                  /* Show Confirmed Appointment */
                                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                                    <div className="flex items-start gap-3 mb-3">
                                      <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                        <CheckCircle className="h-6 w-6 text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wide">Appointment Confirmed</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                          {new Date(claim.proposedDates[0].date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                                          Time Slot: {claim.proposedDates[0].timeSlot}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateClaim?.({
                                          ...claim,
                                          status: ClaimStatus.SCHEDULING,
                                          proposedDates: []
                                        });
                                      }}
                                      className="w-full py-2 px-4 text-sm font-medium text-green-800 dark:text-green-300 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                    >
                                      Reschedule / Edit
                                    </button>
                                  </div>
                                ) : (
                                  /* Scheduling Input */
                                  <div className="space-y-3">
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      Enter the final date and time agreed upon with the homeowner.
                                    </p>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Scheduled Date
                                      </label>
                                      <input
                                        type="date"
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Time Slot
                                      </label>
                                      <select className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer">
                                        <option value="AM">AM (8am - 12pm)</option>
                                        <option value="PM">PM (12pm - 4pm)</option>
                                        <option value="All Day">All Day</option>
                                      </select>
                                    </div>
                                    <button
                                      type="button"
                                      className="w-full py-2.5 px-4 text-sm font-medium text-white bg-gray-900 dark:bg-primary hover:bg-primary dark:hover:bg-primary/90 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Confirm Appointment
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* SECTION 6: INTERNAL NOTES (Collapsible) */}
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    Internal Notes
                                    <span className="text-[10px] font-normal opacity-70">(Not visible to Homeowner)</span>
                                  </h3>
                                  <ChevronDown className="h-4 w-4 text-blue-900 dark:text-blue-300" />
                                </div>
                                <textarea
                                  value={claim.internalNotes || ''}
                                  onChange={(e) => {
                                    onUpdateClaim?.({
                                      ...claim,
                                      internalNotes: e.target.value
                                    });
                                  }}
                                  rows={4}
                                  className="w-full bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  placeholder="Add internal notes..."
                                />
                              </div>

                              {/* SECTION 7: MESSAGE SUMMARY (Collapsible) */}
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4" />
                                    Message Summary
                                    <span className="text-[10px] font-normal opacity-70">(Not visible to Homeowner)</span>
                                  </h3>
                                  <ChevronDown className="h-4 w-4 text-blue-900 dark:text-blue-300" />
                                </div>
                                <p className="text-xs text-blue-800 dark:text-blue-300 mb-3">
                                  No messages sent for this claim yet. Messages sent via the "Send Message" button will appear here.
                                </p>
                                {/* Send Message Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    console.log('Send message to homeowner');
                                    // TODO: Open message composer modal
                                  }}
                                  className="w-full py-2.5 px-4 text-sm font-medium bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl flex items-center justify-center gap-2"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  Send Message
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* STICKY BOTTOM ACTION BAR - Desktop Parity with Horizontal Scroll */}
                      {(() => {
                        const claim = homeownerClaims.find(c => c.id === selectedClaimId);
                        if (!claim) return null;
                        
                        return (
                          <div className="absolute bottom-0 left-0 right-0 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 shadow-lg z-50">
                            {/* Scrollable Button Container */}
                            <div className="overflow-x-auto">
                              <div className="flex items-center gap-2 px-3 py-3 min-w-max">
                                {/* Left Group: Secondary Actions */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const claimNumber = claim.claimNumber || claim.id.substring(0, 8);
                                    const project = claim.jobName || claim.address;
                                    const contextLabel = `${claim.title || 'Untitled'} • Claim #${claimNumber} • ${project}`;
                                    
                                    useTaskStore.getState().openTasks(
                                      claim.id,
                                      contextLabel,
                                      'claim'
                                    );
                                  }}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl whitespace-nowrap"
                                >
                                  <StickyNote className="h-4 w-4" />
                                  <span>Note</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    console.log('Process claim workflow');
                                  }}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl whitespace-nowrap"
                                >
                                  <HardHat className="h-4 w-4" />
                                  <span>Process</span>
                                </button>

                                {/* Spacer to push right group to the end */}
                                <div className="flex-1 min-w-[20px]"></div>

                                {/* Right Group: Primary Actions */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedClaimId(null)}
                                  className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl whitespace-nowrap"
                                >
                                  Cancel
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (claimDetailSaveRef.current) {
                                      claimDetailSaveRef.current();
                                    }
                                    setTimeout(() => setSelectedClaimId(null), 100);
                                  }}
                                  className="px-6 py-2 text-sm font-medium bg-gray-900 text-white shadow-md hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-xl whitespace-nowrap"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal - FULL BROWSER */}
      {showDocuments && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-0 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Documents - {selectedHomeowner.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowDocuments(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                }>
                  <DocumentsTab
                    documents={homeownerDocuments}
                    isAdmin={true}
                    onUploadDocument={() => {
                      console.log('Upload document clicked');
                      // TODO: Implement upload flow
                    }}
                    onDeleteDocument={(docId: string) => {
                      if (onDeleteDocument) {
                        onDeleteDocument(docId);
                      }
                    }}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Modal - Homeowner-Specific Messages with Stack Navigation */}
      {showMessages && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-0 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {activeThreadId && (
                  <button
                    type="button"
                    onClick={() => setActiveThreadId(null)}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">
                  {activeThreadId ? 'Thread' : 'Messages'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowMessages(false);
                    setActiveThreadId(null);
                    setIsComposingMessage(false);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content - MessagesTab with Full Desktop Parity */}
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                }>
                  <MessagesTab
                    threads={homeownerMessages}
                    selectedThreadId={activeThreadId}
                    isComposingMessage={isComposingMessage}
                    currentUser={{
                      id: currentUser?.id || 'admin',
                      name: currentUser?.name || 'Admin',
                      role: currentUser?.role || 'admin'
                    }}
                    effectiveHomeowner={selectedHomeowner}
                    employees={employees}
                    messageEmailTemplates={messageEmailTemplates || []}
                    newMessageSubject={newMessageSubject}
                    newMessageContent={newMessageContent}
                    newMessageRecipientId={newMessageRecipientId}
                    selectedMessageTemplateId={selectedMessageTemplateId}
                    replyContent={replyContent}
                    replyExpanded={replyExpanded}
                    onSelectThread={setActiveThreadId}
                    onSetIsComposingMessage={setIsComposingMessage}
                    onSetNewMessageSubject={setNewMessageSubject}
                    onSetNewMessageContent={setNewMessageContent}
                    onSetNewMessageRecipientId={setNewMessageRecipientId}
                    onSetSelectedMessageTemplateId={setSelectedMessageTemplateId}
                    onSetReplyContent={setReplyContent}
                    onSetReplyExpanded={setReplyExpanded}
                    onSendNewMessage={() => {
                      if (onCreateThread && selectedHomeowner) {
                        onCreateThread(selectedHomeowner.id, newMessageSubject, newMessageContent);
                        setNewMessageSubject('');
                        setNewMessageContent('');
                        setIsComposingMessage(false);
                      }
                    }}
                    onSendReply={() => {
                      if (onSendMessage && activeThreadId) {
                        onSendMessage(activeThreadId, replyContent);
                        setReplyContent('');
                        setReplyExpanded(false);
                      }
                    }}
                    onMessageTemplateSelect={(templateId) => {
                      const template = messageEmailTemplates?.find(t => t.id === templateId);
                      if (template) {
                        setNewMessageSubject(template.subject);
                        setNewMessageContent(template.body);
                      }
                    }}
                    onOpenMessageTemplateCreator={() => {
                      console.log('Open message template creator');
                      // TODO: Implement template creator modal
                    }}
                    onDeleteMessageTemplate={(templateId) => {
                      console.log('Delete template:', templateId);
                      // Remove template from state
                      const updated = messageEmailTemplates.filter(t => t.id !== templateId);
                      setMessageEmailTemplates(updated);
                      localStorage.setItem('cascade_message_templates', JSON.stringify(updated));
                    }}
                    isAdmin={true}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Chat Modal - Global Internal Chat with Stack Navigation */}
      {showTeamChat && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        }>
          <MobileChatView
            onBack={() => {
              setShowTeamChat(false);
              setActiveTeamChannelId(null);
            }}
            currentUserId={currentUser?.id || 'admin'}
            currentUserName={currentUser?.name || 'Admin'}
          />
        </Suspense>
      )}

      {/* INVITE HOMEOWNER MODAL */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInviteModal(false);
          }}
        >
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Invite Homeowner
              </h2>
              <button 
                onClick={() => setShowInviteModal(false)} 
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Full Name
                </label>
                <Input
                  type="text" 
                  className="w-full"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <Input
                  type="email" 
                  className="w-full"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Invitation Message
                </label>
                {isDrafting ? (
                  <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 flex items-center justify-center min-h-[200px]">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Drafting email...</span>
                    </div>
                  </div>
                ) : (
                  <textarea
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm leading-relaxed"
                    value={inviteBody}
                    onChange={(e) => setInviteBody(e.target.value)}
                    placeholder="Welcome to Cascade Connect..."
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteStatus('idle');
                }}
                disabled={inviteStatus === 'sending'}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                disabled={!inviteEmail || !inviteBody || isDrafting || inviteStatus === 'sending' || inviteStatus === 'success'}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:cursor-not-allowed ${
                  inviteStatus === 'success'
                    ? 'bg-green-600 hover:bg-green-700'
                    : inviteStatus === 'error'
                    ? 'bg-red-600 hover:bg-red-700'
                    : inviteStatus === 'sending'
                    ? 'bg-primary/70'
                    : 'bg-primary hover:bg-primary/90'
                } ${inviteStatus === 'sending' ? 'opacity-70' : ''}`}
              >
                {inviteStatus === 'sending' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : inviteStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Sent!
                  </>
                ) : inviteStatus === 'error' ? (
                  <>
                    <X className="h-4 w-4" />
                    Failed
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENT 3: ADMIN MOBILE (Controller - NO HOOKS!)
// ============================================================================

/**
 * AdminMobile - Pure Controller Component
 * 
 * CRITICAL RULES:
 * - NO HOOKS in this component
 * - ONLY routing logic
 * - ALL hooks live in child components
 * 
 * This ensures React hook count remains consistent across renders.
 */
export function AdminMobile(props: DashboardProps) {
  // Extract routing decision variables (NOT A HOOK)
  const { activeHomeowner, targetHomeowner } = props;
  const selectedHomeowner = targetHomeowner || activeHomeowner;
  
  console.log('📱 AdminMobile (Controller):', {
    hasHomeowner: !!selectedHomeowner,
    homeowner: selectedHomeowner?.name || 'none',
  });

  // ========== PURE ROUTING LOGIC (NO HOOKS ALLOWED) ==========
  
  if (selectedHomeowner) {
    // User has selected a homeowner - show dashboard
    return <AdminMobileDashboard {...props} />;
  }
  
  // No homeowner selected - show search
  return <AdminMobileSearch {...props} />;
}

export default AdminMobile;
