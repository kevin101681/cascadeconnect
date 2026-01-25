import React from 'react';
import { useDashboardInitialization } from '../../hooks/dashboard/useDashboardInitialization';
import type { DashboardProps } from '../AdminDashboard';
import { HomeownerMobile } from '../homeowner/HomeownerMobile';

/**
 * Admin Mobile View (Phase 8)
 * 
 * Currently, when admins view homeowners on mobile, they see the HomeownerMobile interface.
 * This component serves as the entry point for admin mobile experience.
 * 
 * Future: Could add admin-specific mobile controls/views here.
 */
export const AdminMobile: React.FC<DashboardProps> = (props) => {
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

  // If there's a homeowner context, show the homeowner mobile interface
  if (displayHomeowner) {
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

  // If no homeowner selected, show search/selection screen
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4 py-8">
      <div className="bg-surface-container-high dark:bg-gray-700 p-6 rounded-full">
        <svg className="h-12 w-12 text-surface-outline dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
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
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-outline-variant dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
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
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
  );
};

export default AdminMobile;
