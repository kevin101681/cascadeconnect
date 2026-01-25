import React, { useState } from 'react';
import { useDashboardInitialization } from '../../hooks/dashboard/useDashboardInitialization';
import type { DashboardProps } from '../AdminDashboard';
import { HomeownerMobile } from '../homeowner/HomeownerMobile';
import type { Homeowner } from '../../types';

/**
 * Admin Mobile View (Phase 8)
 * 
 * When admins view homeowners on mobile, they see the HomeownerMobile interface.
 * This component serves as the entry point for admin mobile experience.
 * 
 * Features:
 * - Homeowner search and selection
 * - Loading state during selection
 * - Seamless handoff to HomeownerMobile
 */
export const AdminMobile: React.FC<DashboardProps> = (props) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const {
    claims,
    userRole,
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
    contractors,
    claimMessages,
    taskMessages,
    onTrackTaskMessage,
    onSendTaskMessage,
    builderGroups,
    builderUsers,
    currentBuilderId,
    currentUserEmail,
    tasks,
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
    onOpenTemplatesModal,
    onSelectClaim,
    onNewClaim,
    onCreateClaim,
  } = props;

  // Determine which homeowner to display
  const displayHomeowner = targetHomeowner || activeHomeowner;

  // Debug logging
  console.log('📱 AdminMobile render:', {
    targetHomeowner: targetHomeowner?.name || 'null',
    activeHomeowner: activeHomeowner?.name || 'null',
    displayHomeowner: displayHomeowner?.name || 'null',
    isSelecting
  });

  // Handler for homeowner selection with loading state
  const handleHomeownerSelect = (homeowner: Homeowner) => {
    console.log('📱 AdminMobile: Homeowner selected:', homeowner.name, homeowner.id);
    setIsSelecting(true);
    
    // Call parent's onSelectHomeowner
    if (onSelectHomeowner) {
      onSelectHomeowner(homeowner);
    }
    
    // Clear search query
    if (onSearchChange) {
      onSearchChange('');
    }
    
    // Reset loading state after a longer delay to allow state propagation
    setTimeout(() => {
      console.log('📱 AdminMobile: Loading complete, checking displayHomeowner...');
      setIsSelecting(false);
    }, 1000);
  };

  // If there's a homeowner context, show the homeowner mobile interface
  if (displayHomeowner) {
    console.log('✅ AdminMobile: Rendering HomeownerMobile for', displayHomeowner.name);
    return (
      <HomeownerMobile
        claims={claims}
        userRole={userRole}
        homeowners={homeowners}
        activeHomeowner={displayHomeowner}
        employees={employees}
        currentUser={currentUser}
        targetHomeowner={targetHomeowner}
        onClearHomeownerSelection={onClearHomeownerSelection}
        onUpdateHomeowner={onUpdateHomeowner}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchResults={searchResults}
        onSelectHomeowner={onSelectHomeowner}
        documents={documents}
        onUploadDocument={onUploadDocument}
        onDeleteDocument={onDeleteDocument}
        messages={messages}
        onSendMessage={onSendMessage}
        onCreateThread={onCreateThread}
        onUpdateThread={onUpdateThread}
        onAddInternalNote={onAddInternalNote}
        onTrackClaimMessage={onTrackClaimMessage}
        onUpdateClaim={onUpdateClaim}
        contractors={contractors}
        claimMessages={claimMessages}
        taskMessages={taskMessages}
        onTrackTaskMessage={onTrackTaskMessage}
        onSendTaskMessage={onSendTaskMessage}
        builderGroups={builderGroups}
        builderUsers={builderUsers}
        currentBuilderId={currentBuilderId}
        currentUserEmail={currentUserEmail}
        tasks={tasks}
        onAddTask={onAddTask}
        onToggleTask={onToggleTask}
        onDeleteTask={onDeleteTask}
        onUpdateTask={onUpdateTask}
        onNavigate={onNavigate}
        onAddEmployee={onAddEmployee}
        onUpdateEmployee={onUpdateEmployee}
        onDeleteEmployee={onDeleteEmployee}
        onAddContractor={onAddContractor}
        onUpdateContractor={onUpdateContractor}
        onDeleteContractor={onDeleteContractor}
        onAddBuilderUser={onAddBuilderUser}
        onUpdateBuilderUser={onUpdateBuilderUser}
        onDeleteBuilderUser={onDeleteBuilderUser}
        onDeleteHomeowner={onDeleteHomeowner}
        onDataReset={onDataReset}
        onOpenTemplatesModal={onOpenTemplatesModal}
        onSelectClaim={onSelectClaim}
        onNewClaim={onNewClaim}
        onCreateClaim={onCreateClaim}
      />
    );
  }

  // If no homeowner selected, show search/selection screen with mobile-optimized layout
  console.log('📱 AdminMobile: Rendering search screen');
  
  return (
    <div className="flex flex-col min-h-screen bg-surface dark:bg-gray-900">
      {/* Loading Overlay */}
      {isSelecting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 mx-4 shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
            <p className="text-surface-on dark:text-gray-100 font-medium text-lg">Loading homeowner...</p>
          </div>
        </div>
      )}
      
      {/* Mobile-First Content */}
      <div className="flex-1 flex flex-col p-4 pt-6 space-y-6">
        {/* Icon and Header */}
        <div className="flex flex-col items-center text-center space-y-4 pt-8">
          <div className="bg-primary/10 dark:bg-primary/20 p-8 rounded-full">
            <svg className="h-16 w-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-surface-on dark:text-gray-100">
              Select a Homeowner
            </h1>
            <p className="text-base text-surface-on-variant dark:text-gray-400 px-4">
              Search to view warranty claims, tasks, and account details.
            </p>
          </div>
        </div>

        {/* Search Input - Full Width, Mobile Optimized */}
        {searchQuery !== undefined && onSearchChange && searchResults && onSelectHomeowner && (
          <div className="w-full relative">
            {/* Search Box */}
            <div className="relative">
              <svg 
                className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-surface-outline-variant dark:text-gray-400 pointer-events-none" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
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
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search Results - Mobile Optimized */}
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
                      {/* Avatar Circle */}
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
                              {homeowner.builder}
                            </p>
                          )}
                          {homeowner.jobName && (
                            <p className="text-sm text-surface-on-variant dark:text-gray-400 truncate">
                              {homeowner.jobName}
                            </p>
                          )}
                          {homeowner.address && (
                            <p className="text-xs text-surface-on-variant dark:text-gray-500 truncate">
                              {homeowner.address}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Chevron */}
                      <svg 
                        className="flex-shrink-0 h-6 w-6 text-surface-outline-variant dark:text-gray-500" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {searchQuery && searchResults.length === 0 && (
              <div className="mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-surface-outline-variant dark:border-gray-700 p-8 text-center">
                <svg className="h-12 w-12 mx-auto text-surface-outline-variant dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
