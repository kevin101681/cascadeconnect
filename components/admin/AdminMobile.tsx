import React, { useState } from 'react';
import type { DashboardProps } from '../AdminDashboard';
import type { Homeowner } from '../../types';
import { 
  X, Search, Loader2, Home, MessageSquare, FileText, 
  Plus, ChevronRight 
} from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { formatDate } from '../../lib/utils/dateHelpers';

/**
 * Admin Mobile View - Full Admin Dashboard (Mobile-Optimized)
 * 
 * This provides the ADMIN view of a selected homeowner's account on mobile.
 * Unlike HomeownerMobile (which shows the homeowner's perspective),
 * this shows the full admin dashboard with all admin features and tools.
 * 
 * Architecture:
 * 1. Search State: Show homeowner search (no selection)
 * 2. Dashboard State: Show admin dashboard for selected homeowner
 * 
 * Features:
 * - Full admin permissions and actions
 * - Claim management (view, create, edit)
 * - Message center with internal notes
 * - Document uploads and management
 * - Back button to return to search
 */
export const AdminMobile: React.FC<DashboardProps> = (props) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentTab, setCurrentTab] = useState<'CLAIMS' | 'MESSAGES' | 'DOCUMENTS'>('CLAIMS');
  
  const {
    claims,
    userRole,
    homeowners,
    activeHomeowner,
    targetHomeowner,
    onClearHomeownerSelection,
    searchQuery,
    onSearchChange,
    searchResults,
    onSelectHomeowner,
    documents,
    onUploadDocument,
    messages,
    onSelectClaim,
    onNewClaim,
  } = props;

  // Determine which homeowner to display
  const displayHomeowner = targetHomeowner || activeHomeowner;

  // Debug logging
  console.log('📱 AdminMobile render:', {
    targetHomeowner: targetHomeowner?.name || 'null',
    activeHomeowner: activeHomeowner?.name || 'null',
    displayHomeowner: displayHomeowner?.name || 'null',
    isSelecting,
    currentTab
  });

  // Handler for homeowner selection
  const handleHomeownerSelect = (homeowner: Homeowner) => {
    console.log('📱 AdminMobile: Homeowner selected:', homeowner.name, homeowner.id);
    setIsSelecting(true);
    
    if (onSelectHomeowner) {
      onSelectHomeowner(homeowner);
    }
    
    if (onSearchChange) {
      onSearchChange('');
    }
    
    setTimeout(() => {
      console.log('📱 AdminMobile: Loading complete, showing admin dashboard');
      setIsSelecting(false);
      setCurrentTab('CLAIMS');
    }, 1000);
  };

  // Handler to clear selection and return to search
  const handleClearSelection = () => {
    console.log('📱 AdminMobile: Clearing homeowner selection, returning to search');
    setCurrentTab('CLAIMS');
    if (onClearHomeownerSelection) {
      onClearHomeownerSelection();
    }
  };

  // ========== DASHBOARD STATE (Homeowner Selected) ==========
  if (displayHomeowner) {
    console.log('✅ AdminMobile: Rendering ADMIN dashboard for', displayHomeowner.name);
    
    // Filter data for this homeowner
    const homeownerClaims = claims.filter(c => 
      c.homeownerEmail?.toLowerCase() === displayHomeowner.email?.toLowerCase()
    );
    const homeownerDocuments = documents.filter(d => d.homeownerId === displayHomeowner.id);
    const homeownerMessages = messages.filter(m => m.homeownerId === displayHomeowner.id);

    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Bar */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleClearSelection}
              className="flex-shrink-0 p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors active:scale-95"
              title="Back to search"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex-1 min-w-0 text-center">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {displayHomeowner.name}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Admin View • {displayHomeowner.builder || 'No builder'}
              </p>
            </div>
            
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* CLAIMS TAB */}
          {currentTab === 'CLAIMS' && (
            <div className="p-4 space-y-3">
              {/* New Claim Button */}
              <button
                onClick={() => onNewClaim(displayHomeowner.id)}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-4 font-medium shadow-md active:scale-[0.98] transition-transform"
                style={{ minHeight: '56px' }}
              >
                <Plus className="h-5 w-5" />
                <span className="text-lg">New Claim</span>
              </button>

              {/* Claims Count Badge */}
              <div className="flex items-center justify-between py-2">
                <h2 className="text-base font-medium text-gray-700 dark:text-gray-300">
                  All Claims
                </h2>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                  {homeownerClaims.length}
                </span>
              </div>

              {/* Claims List */}
              {homeownerClaims.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Home className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No claims yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Tap "New Claim" to create one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {homeownerClaims.map((claim) => (
                    <button
                      key={claim.id}
                      onClick={() => onSelectClaim(claim)}
                      className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-left active:scale-[0.99] transition-transform"
                      style={{ minHeight: '88px' }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                            {claim.title || 'No title'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {claim.category || 'Uncategorized'}
                          </p>
                        </div>
                        <StatusBadge status={claim.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>📅 {formatDate(claim.dateSubmitted)}</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MESSAGES TAB */}
          {currentTab === 'MESSAGES' && (
            <div className="p-4 space-y-3">
              {/* New Message Button */}
              <button
                onClick={() => {
                  console.log('📧 New message - opening composer');
                  // Future: Open message composition modal
                }}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-4 font-medium shadow-md active:scale-[0.98] transition-transform"
                style={{ minHeight: '56px' }}
              >
                <Plus className="h-5 w-5" />
                <span className="text-lg">New Message</span>
              </button>

              {/* Messages Count */}
              <div className="flex items-center justify-between py-2">
                <h2 className="text-base font-medium text-gray-700 dark:text-gray-300">
                  Message Threads
                </h2>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                  {homeownerMessages.length}
                </span>
              </div>

              {/* Messages List */}
              {homeownerMessages.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <MessageSquare className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No messages yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start a conversation</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {homeownerMessages.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => {
                        console.log('💬 Message thread clicked:', thread.id);
                        // Future: Open message thread view
                      }}
                      className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-left active:scale-[0.99] transition-transform"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 truncate">
                        {thread.subject}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                        {thread.messages?.[thread.messages.length - 1]?.content || 'No messages'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>💬 {thread.messages?.length || 0} messages</span>
                        <span>📅 {formatDate(thread.lastMessageAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {currentTab === 'DOCUMENTS' && (
            <div className="p-4 space-y-3">
              {/* Upload Document Button */}
              <button
                onClick={() => {
                  console.log('📄 Upload document clicked');
                  // Future: Open document upload modal
                }}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-4 font-medium shadow-md active:scale-[0.98] transition-transform"
                style={{ minHeight: '56px' }}
              >
                <Plus className="h-5 w-5" />
                <span className="text-lg">Upload Document</span>
              </button>

              {/* Documents Count */}
              <div className="flex items-center justify-between py-2">
                <h2 className="text-base font-medium text-gray-700 dark:text-gray-300">
                  All Documents
                </h2>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                  {homeownerDocuments.length}
                </span>
              </div>

              {/* Documents List */}
              {homeownerDocuments.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <FileText className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No documents yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Upload your first document</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {homeownerDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        console.log('📄 Document clicked:', doc.id);
                        // Future: Open document viewer
                      }}
                      className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-left active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">
                            {doc.name || 'Untitled'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {doc.type} • {formatDate(doc.uploadDate)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-2" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
            {/* Claims Tab */}
            <button
              onClick={() => setCurrentTab('CLAIMS')}
              className={`
                flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all min-w-[90px]
                ${currentTab === 'CLAIMS'
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-700'
                }
              `}
            >
              <Home className={`h-6 w-6 mb-1 ${currentTab === 'CLAIMS' ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-xs font-medium ${currentTab === 'CLAIMS' ? 'font-semibold' : ''}`}>
                Claims
              </span>
              {homeownerClaims.length > 0 && (
                <span className={`text-[10px] mt-0.5 ${currentTab === 'CLAIMS' ? 'text-primary' : 'text-gray-500'}`}>
                  {homeownerClaims.length}
                </span>
              )}
            </button>

            {/* Messages Tab */}
            <button
              onClick={() => setCurrentTab('MESSAGES')}
              className={`
                flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all min-w-[90px]
                ${currentTab === 'MESSAGES'
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-700'
                }
              `}
            >
              <MessageSquare className={`h-6 w-6 mb-1 ${currentTab === 'MESSAGES' ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-xs font-medium ${currentTab === 'MESSAGES' ? 'font-semibold' : ''}`}>
                Messages
              </span>
              {homeownerMessages.length > 0 && (
                <span className={`text-[10px] mt-0.5 ${currentTab === 'MESSAGES' ? 'text-primary' : 'text-gray-500'}`}>
                  {homeownerMessages.length}
                </span>
              )}
            </button>

            {/* Documents Tab */}
            <button
              onClick={() => setCurrentTab('DOCUMENTS')}
              className={`
                flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all min-w-[90px]
                ${currentTab === 'DOCUMENTS'
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-700'
                }
              `}
            >
              <FileText className={`h-6 w-6 mb-1 ${currentTab === 'DOCUMENTS' ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-xs font-medium ${currentTab === 'DOCUMENTS' ? 'font-semibold' : ''}`}>
                Documents
              </span>
              {homeownerDocuments.length > 0 && (
                <span className={`text-[10px] mt-0.5 ${currentTab === 'DOCUMENTS' ? 'text-primary' : 'text-gray-500'}`}>
                  {homeownerDocuments.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== SEARCH STATE (No Homeowner Selected) ==========
  console.log('📱 AdminMobile: Rendering search screen');
  
  return (
    <div className="flex flex-col min-h-screen bg-surface dark:bg-gray-900">
      {/* Loading Overlay */}
      {isSelecting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 mx-4 shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
            <p className="text-surface-on dark:text-gray-100 font-medium text-lg">Loading admin dashboard...</p>
          </div>
        </div>
      )}
      
      {/* Mobile-First Search Content */}
      <div className="flex-1 flex flex-col p-4 pt-6 space-y-6">
        {/* Icon and Header */}
        <div className="flex flex-col items-center text-center space-y-4 pt-8">
          <div className="bg-primary/10 dark:bg-primary/20 p-8 rounded-full">
            <Search className="h-16 w-16 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-surface-on dark:text-gray-100">
              Admin Dashboard
            </h1>
            <p className="text-base text-surface-on-variant dark:text-gray-400 px-4">
              Search for a homeowner to manage their account
            </p>
          </div>
        </div>

        {/* Search Input */}
        {searchQuery !== undefined && onSearchChange && searchResults && onSelectHomeowner && (
          <div className="w-full relative">
            <div className="relative">
              <Search 
                className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-surface-outline-variant dark:text-gray-400 pointer-events-none" 
              />
              <input
                type="text"
                placeholder="Search by name, email, or job..."
                className="w-full bg-white dark:bg-gray-800 rounded-2xl pl-14 pr-12 py-5 text-lg border-2 border-surface-outline-variant dark:border-gray-600 focus:ring-4 focus:ring-primary/20 focus:border-primary focus:outline-none text-surface-on dark:text-gray-100 transition-all shadow-sm"
                style={{ minHeight: '56px' }}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                disabled={isSelecting}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-surface-outline-variant hover:text-surface-on dark:hover:text-gray-300 transition-colors active:scale-95"
                  disabled={isSelecting}
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <div className="mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden max-h-[60vh] overflow-y-auto">
                {searchResults.map((homeowner, index) => (
                  <button
                    key={homeowner.id}
                    onClick={() => handleHomeownerSelect(homeowner)}
                    disabled={isSelecting}
                    className={`
                      w-full text-left px-6 py-5 
                      active:bg-primary/10 
                      hover:bg-surface-container dark:hover:bg-gray-700 
                      border-b border-surface-outline-variant dark:border-gray-700 
                      last:border-0 
                      transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${index === 0 ? 'rounded-t-2xl' : ''}
                      ${index === searchResults.length - 1 ? 'rounded-b-2xl' : ''}
                    `}
                    style={{ minHeight: '72px' }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-semibold text-lg">
                          {homeowner.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      
                      {/* Homeowner Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-medium text-surface-on dark:text-gray-100 truncate">
                          {homeowner.name}
                        </p>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {homeowner.builder && (
                            <p className="text-sm text-surface-on-variant dark:text-gray-400 truncate">
                              🏗️ {homeowner.builder}
                            </p>
                          )}
                          {homeowner.jobName && (
                            <p className="text-sm text-surface-on-variant dark:text-gray-400 truncate">
                              📋 {homeowner.jobName}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Chevron */}
                      <ChevronRight className="flex-shrink-0 h-6 w-6 text-surface-outline-variant dark:text-gray-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {searchQuery && searchResults.length === 0 && (
              <div className="mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-surface-outline-variant dark:border-gray-700 p-8 text-center">
                <Search className="h-12 w-12 mx-auto text-surface-outline-variant dark:text-gray-500 mb-3" />
                <p className="text-surface-on-variant dark:text-gray-400 text-lg">No homeowners found</p>
                <p className="text-sm text-surface-on-variant dark:text-gray-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMobile;
