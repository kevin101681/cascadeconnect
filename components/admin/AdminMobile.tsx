import React, { useState, Suspense } from 'react';
import type { DashboardProps } from '../AdminDashboard';
import type { Homeowner, Claim, Contractor, ClaimClassification } from '../../types';
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
  CheckSquare
} from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { formatDate } from '../../lib/utils/dateHelpers';
import { useClerk } from '@clerk/clerk-react';
import { useUI } from '../../contexts/UIContext';
import { useTaskStore } from '../../stores/useTaskStore';
import { WarrantyCard } from '../ui/WarrantyCard';
import { AdminMobileHeader } from './AdminMobileHeader';

// Lazy load heavy modal components
const TasksSheet = React.lazy(() => import('../TasksSheet'));
const PunchListApp = React.lazy(() => import('../PunchListApp'));
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
const ChatSidebar = React.lazy(() =>
  import('../chat/ChatSidebar').then(m => ({ default: m.ChatSidebar }))
);
const ChatWindow = React.lazy(() =>
  import('../chat/ChatWindow').then(m => ({ default: m.ChatWindow }))
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
                              🏗️ {homeowner.builder}
                            </p>
                          )}
                          {homeowner.jobName && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              📋 {homeowner.jobName}
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
  
  // Global search state for dashboard
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  
  // Edit homeowner modal state
  const [isEditingHomeowner, setIsEditingHomeowner] = useState(false);
  
  // Stack navigation state for Claims (List -> Detail)
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [claimsFilter, setClaimsFilter] = useState<'Open' | 'Closed' | 'All'>('Open');
  
  // Stack navigation state for Tasks (List -> Detail)
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [tasksFilter, setTasksFilter] = useState<'open' | 'closed' | 'all'>('open');
  
  // Stack navigation state for Messages (Thread List -> Chat Window)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
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
  } = props;

  // Determine which homeowner to display
  const selectedHomeowner = targetHomeowner || activeHomeowner;

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

  // ========== ACTION BUTTON COMPONENT ==========
  const ActionButton: React.FC<{
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }> = ({ icon: Icon, label, onClick, variant = 'secondary' }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl p-6 transition-all active:scale-95 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-primary/30 hover:bg-gray-50 dark:hover:bg-gray-700"
      style={{ minHeight: '110px' }}
    >
      <Icon className="h-8 w-8 text-primary" />
      <span className="text-sm font-medium text-center text-primary">
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

      {/* Collapsible Homeowner Info Card */}
      <div className={`px-4 pt-4 pb-6 ${globalQuery.trim().length > 0 ? 'opacity-30 pointer-events-none' : ''}`}>
        <button
          type="button"
          onClick={() => setIsHomeownerExpanded(!isHomeownerExpanded)}
          className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {selectedHomeowner.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedHomeowner.jobName || 'No project'} • {formatDate(selectedHomeowner.closingDate)}
              </p>
            </div>
            {isHomeownerExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
            )}
          </div>

          {/* Expanded Details */}
          {isHomeownerExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 mb-1">Email</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium truncate">{selectedHomeowner.email}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedHomeowner.phone || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400 mb-1">Address</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedHomeowner.address || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400 mb-1">Builder</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedHomeowner.builder || 'N/A'}</p>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Quick Actions
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedHomeowner.phone) {
                        window.open(`sms:${selectedHomeowner.phone}`, '_blank');
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedHomeowner.address) {
                        const encoded = encodeURIComponent(selectedHomeowner.address);
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <MapPin className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Maps</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedHomeowner.phone) {
                        window.open(`tel:${selectedHomeowner.phone}`, '_blank');
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Phone className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Call</span>
                  </button>
                </div>
              </div>

              {/* Footer: Status & Edit Button - Desktop Parity */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                {/* Status Badge - Real Logic */}
                <div className="flex items-center gap-2">
                  {(() => {
                    // Determine status based on claims or default to "Active"
                    if (homeownerClaims.length > 0) {
                      // Use the most recent claim's status
                      const status = homeownerClaims[0].status;
                      return <StatusBadge status={status} />;
                    } else {
                      // Default: Active homeowner with no claims
                      return (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                          Active
                        </span>
                      );
                    }
                  })()}
                </div>

                {/* Edit Homeowner Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('✏️ Edit homeowner:', selectedHomeowner.id);
                    setIsEditingHomeowner(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-white dark:bg-gray-800 border border-primary/30 rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                >
                  <FileEdit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          )}
        </button>
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
              setShowClaims(true);
            }}
          />
          
          {/* 2. Messages (Homeowner context) */}
          <ActionButton
            icon={Mail}
            label="Messages"
            onClick={() => {
              console.log('💬 Opening Homeowner Messages');
              setShowMessages(true);
            }}
          />
          
          {/* 3. Tasks - Updated Icon */}
          <ActionButton
            icon={CheckSquare}
            label="Tasks"
            onClick={() => {
              console.log('✅ Opening Tasks');
              setShowTasks(true);
            }}
          />
          
          {/* 4. Documents */}
          <ActionButton
            icon={FileText}
            label="Documents"
            onClick={() => {
              console.log('📄 Opening Documents tab');
              setShowDocuments(true);
            }}
          />
          
          {/* 5. Schedule */}
          <ActionButton
            icon={Calendar}
            label="Schedule"
            onClick={() => {
              console.log('📅 Opening Schedule');
              setShowSchedule(true);
            }}
          />
          
          {/* 6. Notes (Internal) */}
          <ActionButton
            icon={StickyNote}
            label="Notes"
            onClick={() => {
              console.log('📝 Opening Notes');
              openTasks();
            }}
          />
          
          {/* 7. BlueTag - Updated Icon */}
          <ActionButton
            icon={Clipboard}
            label="Blue Tag"
            onClick={() => {
              console.log('📋 Opening PunchList');
              setShowPunchList(true);
            }}
          />
          
          {/* 8. Team Chat (Global) */}
          <ActionButton
            icon={MessageCircle}
            label="Team Chat"
            onClick={() => {
              console.log('💭 Opening Team Chat');
              setShowTeamChat(true);
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
            onClick={() => onNavigate?.('HOMEOWNERS')}
          />
          <ActionButton
            icon={DollarSign}
            label="Invoices"
            onClick={() => setShowInvoicesFullView?.(true)}
          />
          <ActionButton
            icon={BarChart}
            label="Analytics"
            onClick={() => {
              console.log('📊 Opening Analytics');
              onNavigate?.('ANALYTICS' as any);
            }}
          />
          <ActionButton
            icon={UserCog}
            label="Internal Users"
            onClick={() => onNavigate?.('TEAM')}
          />
          <ActionButton
            icon={Building2}
            label="Builders"
            onClick={() => {
              console.log('🏗️ Opening Builders');
              onNavigate?.('BUILDERS' as any);
            }}
          />
          <ActionButton
            icon={Database}
            label="Backend"
            onClick={() => onNavigate?.('DATA')}
          />
          <ActionButton
            icon={FileEdit}
            label="Templates"
            onClick={() => {
              console.log('📝 Opening Templates');
              onOpenTemplatesModal?.();
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
      
      {/* Tasks Modal */}
      {showTasks && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-0 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Tasks
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
      
      {/* Tasks Sheet (Global via useTaskStore) */}
      <Suspense fallback={null}>
        <TasksSheet
          onNavigateToClaim={(claimId) => console.log('Navigate to claim:', claimId)}
          claims={claims}
        />
      </Suspense>

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

      {/* Claims/Warranty Modal - STACK NAVIGATION */}
      {showClaims && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-0 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {selectedClaimId && (
                  <button
                    type="button"
                    onClick={() => setSelectedClaimId(null)}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">
                  {selectedClaimId ? 'Claim Detail' : 'Warranty Claims'}
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
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setClaimsFilter('Open')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              claimsFilter === 'Open'
                                ? 'border border-primary text-primary bg-primary/10'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
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
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              claimsFilter === 'Closed'
                                ? 'border border-primary text-primary bg-primary/10'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
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
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              claimsFilter === 'All'
                                ? 'border border-primary text-primary bg-primary/10'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
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
                                      className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
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
                                  className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
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
                          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
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
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                                >
                                  <StickyNote className="h-4 w-4" />
                                  <span>Note</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    console.log('Process claim workflow');
                                  }}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
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
                                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
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
                                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors shadow-sm whitespace-nowrap"
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

      {/* Messages Modal - STACK NAVIGATION */}
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
                  {activeThreadId ? 'Chat' : `Messages - ${selectedHomeowner.name}`}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowMessages(false);
                    setActiveThreadId(null);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content - Stack Navigation */}
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                }>
                  {!activeThreadId ? (
                    /* LIST VIEW: Show thread list */
                    <ChatSidebar
                      effectiveUserId={selectedHomeowner.id}
                      selectedChannelId={null}
                      onSelectChannel={(channel: Channel) => setActiveThreadId(channel.id)}
                      isCompact={false}
                    />
                  ) : (
                    /* DETAIL VIEW: Show chat window */
                    <ChatWindow
                      channelId={activeThreadId}
                      channelName="Chat"
                      channelType="dm"
                      effectiveUserId={selectedHomeowner.id}
                      effectiveUserName={selectedHomeowner.name}
                      onMarkAsRead={() => console.log('Mark as read')}
                      isCompact={false}
                    />
                  )}
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Chat Modal - Global Internal Chat with Stack Navigation */}
      {showTeamChat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-0 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {activeTeamChannelId && (
                  <button
                    type="button"
                    onClick={() => setActiveTeamChannelId(null)}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">
                  {activeTeamChannelId ? 'Chat' : 'Team Chat'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowTeamChat(false);
                    setActiveTeamChannelId(null);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content - Stack Navigation */}
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                }>
                  {!activeTeamChannelId ? (
                    /* LIST VIEW: Channel List */
                    <ChatSidebar
                      effectiveUserId={currentUser?.id || 'admin'}
                      selectedChannelId={null}
                      onSelectChannel={(channel: Channel) => {
                        // Set state to show chat window - prevents URL navigation
                        console.log('Team channel selected:', channel.id);
                        setActiveTeamChannelId(channel.id);
                      }}
                      isCompact={false}
                    />
                  ) : (
                    /* DETAIL VIEW: Chat Window */
                    <ChatWindow
                      channelId={activeTeamChannelId}
                      channelName="Team Chat"
                      channelType="public"
                      effectiveUserId={currentUser?.id || 'admin'}
                      effectiveUserName={currentUser?.name || 'Admin'}
                      onMarkAsRead={() => console.log('Mark as read')}
                      isCompact={false}
                    />
                  )}
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Homeowner Modal */}
      {isEditingHomeowner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Edit Homeowner
              </h2>
              <button
                onClick={() => setIsEditingHomeowner(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedHomeowner.name}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={selectedHomeowner.email}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    defaultValue={selectedHomeowner.phone}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedHomeowner.address}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Builder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Builder
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedHomeowner.builder}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Job Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedHomeowner.jobName}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsEditingHomeowner(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('💾 Saving homeowner changes');
                  // TODO: Implement actual save logic with onUpdateHomeowner
                  setIsEditingHomeowner(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Save Changes
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
