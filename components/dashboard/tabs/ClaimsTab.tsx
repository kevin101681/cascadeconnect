/**
 * Claims Tab - Warranty Claims Management
 * 
 * Two-column layout with:
 * - Left column: Claims list with filters (Open/Closed/All)
 * - Right column: Claim detail view with inline editor
 * - New claim creation form
 * - Mobile full-screen overlay
 * - Bulk delete functionality (admin only)
 * 
 * Extracted from Dashboard.tsx (Phase 3C)
 */

import React, { Suspense } from 'react';
import { ChevronLeft, X, ClipboardList, FileSpreadsheet, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Claim, ClaimMessage, Contractor, Homeowner, InternalEmployee } from '../../../types';
import { ClaimStatus, UserRole } from '../../../types';
import Button from '../../Button';
import { WarrantyCard } from '../../ui/WarrantyCard';

// Lazy load heavy components
const ClaimInlineEditor = React.lazy(() => import('../../ClaimInlineEditor').catch(err => {
  console.error('Failed to load ClaimInlineEditor:', err);
  return { default: () => <div className="p-4 text-red-500">Failed to load claim editor. Please refresh the page.</div> };
}));

const NewClaimForm = React.lazy(() => import('../../NewClaimForm').catch(err => {
  console.error('Failed to load NewClaimForm:', err);
  return { default: () => <div className="p-4 text-red-500">Failed to load claim form. Please refresh the page.</div> };
}));

// Memoized Claims List Component
const ClaimsListColumn = React.memo<{
  claims: Claim[];
  filteredClaims: Claim[];
  isHomeownerView: boolean;
  emptyMsg: string;
  isCreatingNewClaim: boolean;
  claimMessages: ClaimMessage[];
  selectedClaimId: string | null;
  selectedClaimIds: string[];
  onClaimSelect: (claim: Claim) => void;
  onDeleteClaim: (claimId: string) => void;
  onToggleClaimSelection: (claimId: string) => void;
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

interface ClaimsTabProps {
  // Data
  claims: Claim[];
  filteredClaims: Claim[];
  selectedClaim: Claim | null;
  selectedClaimIds: string[];
  isCreatingNewClaim: boolean;
  claimsFilter: 'Open' | 'Closed' | 'All';
  claimMessages: ClaimMessage[];
  
  // Warning state (for unsaved changes)
  showUnsavedWarning: boolean;
  
  // Related data
  contractors: Contractor[];
  activeHomeowner: Homeowner | null;
  targetHomeowner?: Homeowner | null;
  currentUser: InternalEmployee;
  userRole: UserRole;
  
  // Callbacks
  onSelectClaim: (claim: Claim | null) => void;
  onSetIsCreatingNewClaim: (isCreating: boolean) => void;
  onSetClaimsFilter: (filter: 'Open' | 'Closed' | 'All') => void;
  onToggleClaimSelection: (claimId: string) => void;
  onDeleteClaim: (claimId: string) => void;
  onBulkDeleteClaims: () => void;
  onExportToExcel: (claims: Claim[]) => void;
  onCreateClaim?: (data: any) => void;
  onUpdateClaim?: (claim: Claim) => void;
  onAddInternalNote?: (claimId: string, noteText: string, userName?: string) => Promise<void>;
  onTrackClaimMessage?: (claimId: string, message: any) => void;
  onNavigate?: (tab: string) => void;
  onNewClaim: () => void; // Homeowner-specific
  onCancelNavigation: () => void;
  onConfirmNavigation: () => void;
  onSetNewMessageSubject: (subject: string) => void;
  onSetShowNewMessageModal: (show: boolean) => void;
  onSetCurrentTab: (tab: string | null) => void;
  
  // Permissions
  isAdmin: boolean;
  isBuilder: boolean;
  isHomeownerView: boolean;
}

export const ClaimsTab: React.FC<ClaimsTabProps> = ({
  claims,
  filteredClaims,
  selectedClaim,
  selectedClaimIds,
  isCreatingNewClaim,
  claimsFilter,
  claimMessages,
  showUnsavedWarning,
  contractors,
  activeHomeowner,
  targetHomeowner,
  currentUser,
  userRole,
  onSelectClaim,
  onSetIsCreatingNewClaim,
  onSetClaimsFilter,
  onToggleClaimSelection,
  onDeleteClaim,
  onBulkDeleteClaims,
  onExportToExcel,
  onCreateClaim,
  onUpdateClaim,
  onAddInternalNote,
  onTrackClaimMessage,
  onNavigate,
  onNewClaim,
  onCancelNavigation,
  onConfirmNavigation,
  onSetNewMessageSubject,
  onSetShowNewMessageModal,
  onSetCurrentTab,
  isAdmin,
  isBuilder,
  isHomeownerView
}) => {
  // Calculate counts for filter pills
  const openCount = claims.filter(c => c.status !== ClaimStatus.COMPLETED).length;
  const closedCount = claims.filter(c => c.status === ClaimStatus.COMPLETED).length;
  const totalCount = claims.length;

  const emptyMsg = claimsFilter === 'Open' 
    ? 'No open claims.' 
    : claimsFilter === 'Closed' 
    ? 'No closed claims.'
    : 'No claims found.';

  return (
    <>
      <div className="bg-surface dark:bg-gray-800 md:rounded-modal md:border border-surface-outline-variant dark:border-gray-700 flex flex-col overflow-hidden h-full min-h-0 md:max-h-[calc(100vh-8rem)]">
        
        {/* Single Full-Width Header with Filters - Spans entire modal */}
        <div className="w-full px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between shrink-0 md:rounded-t-modal">
          {/* Left: Filter Tabs */}
          <div className="flex items-center gap-2">
            {/* Mobile back button */}
            <button
              type="button"
              onClick={() => onSetCurrentTab(null)}
              className="md:hidden p-2 -ml-2 mr-2 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full"
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            {/* Filter Pills */}
            <button
              onClick={() => onSetClaimsFilter('Open')}
              className={`transition-all duration-200 px-4 py-2 rounded-lg text-sm font-medium hover:-translate-y-0.5 hover:shadow-sm ${
                claimsFilter === 'Open'
                  ? 'text-primary bg-white dark:bg-gray-700 shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary bg-transparent'
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
              onClick={() => onSetClaimsFilter('Closed')}
              className={`transition-all duration-200 px-4 py-2 rounded-lg text-sm font-medium hover:-translate-y-0.5 hover:shadow-sm ${
                claimsFilter === 'Closed'
                  ? 'text-primary bg-white dark:bg-gray-700 shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary bg-transparent'
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
              onClick={() => onSetClaimsFilter('All')}
              className={`transition-all duration-200 px-4 py-2 rounded-lg text-sm font-medium hover:-translate-y-0.5 hover:shadow-sm ${
                claimsFilter === 'All'
                  ? 'text-primary bg-white dark:bg-gray-700 shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary bg-transparent'
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
                onClick={() => onExportToExcel(claims)}
                className="p-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary bg-transparent rounded-full transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
              >
                <FileSpreadsheet className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Right: Action buttons */}
          <div className="flex items-center gap-4">
            {/* New Claim button */}
            {isHomeownerView ? (
              <button
                onClick={() => onNewClaim()}
                className="h-9 px-4 text-sm font-medium shrink-0 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary border border-gray-200 dark:border-gray-600 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span className="hidden sm:inline">Add Claim</span>
                <span className="sm:hidden">Add</span>
              </button>
            ) : isAdmin && (
              <button
                onClick={() => {
                  onSetIsCreatingNewClaim(true);
                  onSelectClaim(null);
                }}
                className="h-9 px-4 text-sm font-medium shrink-0 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary border border-gray-200 dark:border-gray-600 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span className="hidden sm:inline">New Claim</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => onSetCurrentTab(null)}
              className="hidden md:block p-2 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area: Two-column layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Column: Claims List - 30% width (350px) */}
          <div className={`w-full md:w-[350px] md:min-w-[350px] md:max-w-[350px] border-b md:border-b-0 md:border-r border-surface-outline-variant dark:border-gray-700 flex flex-col min-h-0 bg-surface dark:bg-gray-800 ${selectedClaim ? 'hidden md:flex' : 'flex'}`}>

          <div className="relative flex-1 min-h-0 flex flex-col">
            <ClaimsListColumn
              claims={claims}
              filteredClaims={filteredClaims}
              isHomeownerView={isHomeownerView}
              emptyMsg={emptyMsg}
              isCreatingNewClaim={isCreatingNewClaim}
              claimMessages={claimMessages}
              selectedClaimId={selectedClaim?.id || null}
              selectedClaimIds={selectedClaimIds}
              onClaimSelect={onSelectClaim}
              onDeleteClaim={onDeleteClaim}
              onToggleClaimSelection={onToggleClaimSelection}
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
                    onClick={onBulkDeleteClaims}
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
        <div className={`flex-1 min-w-0 flex flex-col bg-surface dark:bg-gray-800 ${!selectedClaim && !isCreatingNewClaim ? 'hidden md:flex' : 'hidden md:flex'}`}>
          {isCreatingNewClaim ? (
            <>
              {/* New Claim Form Content */}
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
                          onClick={onCancelNavigation}
                          className="px-6 py-2.5 rounded-full text-primary dark:text-primary font-medium hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={onConfirmNavigation}
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
                      onSetIsCreatingNewClaim(false);
                    }}
                    onCancel={() => onSetIsCreatingNewClaim(false)}
                    onSendMessage={() => {
                      onSetIsCreatingNewClaim(false);
                      if (onNavigate) {
                        onNavigate('MESSAGES');
                      }
                    }}
                    contractors={contractors}
                    activeHomeowner={targetHomeowner || activeHomeowner}
                    userRole={userRole}
                  />
                </Suspense>
              </div>
            </>
          ) : selectedClaim ? (
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
                    claim={selectedClaim}
                    onUpdateClaim={(updatedClaim) => {
                      if (onUpdateClaim) {
                        onUpdateClaim(updatedClaim);
                      }
                      onSelectClaim(updatedClaim);
                    }}
                    contractors={contractors}
                    currentUser={currentUser}
                    userRole={userRole}
                    onAddInternalNote={onAddInternalNote}
                    claimMessages={claimMessages.filter(m => m.claimId === selectedClaim.id)}
                    onTrackClaimMessage={onTrackClaimMessage}
                    onSendMessage={() => {
                      if (selectedClaim) {
                        onSetNewMessageSubject(selectedClaim.title);
                      }
                      onSetShowNewMessageModal(true);
                    }}
                    onCancel={() => onSelectClaim(null)}
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
      </div>
      
      {/* Mobile Full-Screen Overlay for Claim Modal */}
      {selectedClaim && (
        <div className="md:hidden fixed inset-0 z-modal bg-surface dark:bg-gray-900 flex flex-col">
          {/* Claim detail: edge-to-edge sections on mobile */}
          <div className="flex-1 min-h-0">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <ClaimInlineEditor
                claim={selectedClaim}
                onUpdateClaim={(updatedClaim) => {
                  if (onUpdateClaim) {
                    onUpdateClaim(updatedClaim);
                  }
                  onSelectClaim(updatedClaim);
                }}
                contractors={contractors}
                currentUser={currentUser}
                userRole={userRole}
                onAddInternalNote={onAddInternalNote}
                claimMessages={claimMessages.filter(m => m.claimId === selectedClaim.id)}
                onTrackClaimMessage={onTrackClaimMessage}
                onSendMessage={() => {
                  if (selectedClaim) {
                    onSetNewMessageSubject(selectedClaim.title);
                  }
                  onSetShowNewMessageModal(true);
                }}
                onCancel={() => onSelectClaim(null)}
                onNavigate={onNavigate}
              />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
};
