/**
 * App Shell - Global Application Layout
 * 
 * This component wraps the entire application and provides:
 * - Consistent z-index layering
 * - Global modals (InvoicesFullView, ChatWidget)
 * - Layout structure that persists across routes
 * 
 * **Purpose:** Extracted from Dashboard.tsx to eliminate the "multiple return paths"
 * bug where modals would disappear when switching views. By moving these to the
 * shell layer, they persist regardless of the active route/view.
 * 
 * **Z-Index Hierarchy (using semantic layers):**
 * - z-base (10): Chat FAB button
 * - z-dropdown (50): Dropdowns within modals
 * - z-overlay (500): InvoicesFullView, ChatWidget
 */

import React, { ReactNode, Suspense } from 'react';
import { useUI } from '../../contexts/UIContext';
import { Loader2 } from 'lucide-react';

// Lazy-load heavy modal components
const InvoicesFullView = React.lazy(() => 
  import('../invoicing/InvoicesFullView').then(m => ({ default: m.InvoicesFullView }))
);

const FloatingChatWidget = React.lazy(() => 
  import('../chat/ChatWidget').then(m => ({ default: m.ChatWidget }))
);

interface AppShellProps {
  children: ReactNode;
  /**
   * Whether to show the Chat Widget FAB button.
   * Set to false for routes where chat isn't needed (e.g., public enrollment).
   */
  showChatWidget?: boolean;
}

/**
 * Loading fallback for lazy-loaded modals
 */
const ModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 z-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center">
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-elevation-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
      <p className="text-sm text-gray-600 dark:text-gray-300">Loading...</p>
    </div>
  </div>
);

export const AppShell: React.FC<AppShellProps> = ({ 
  children, 
  showChatWidget = true 
}) => {
  const {
    showInvoicesFullView,
    setShowInvoicesFullView,
    invoicesPrefillData,
    setInvoicesPrefillData,
    isChatWidgetOpen,
    setIsChatWidgetOpen,
    activeHomeowner,
  } = useUI();
  
  // Handle closing invoices modal (clear prefill data)
  const handleCloseInvoices = () => {
    console.log('💰 AppShell: Closing InvoicesFullView');
    setShowInvoicesFullView(false);
    setInvoicesPrefillData(undefined);
  };
  
  return (
    <>
      {/* Main Content Area */}
      {children}
      
      {/* ==================== GLOBAL MODALS ==================== */}
      
      {/* Invoices Full View Overlay (z-overlay = 500) */}
      {showInvoicesFullView && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <InvoicesFullView
            isOpen={showInvoicesFullView}
            onClose={handleCloseInvoices}
            prefillData={invoicesPrefillData}
          />
        </Suspense>
      )}
      
      {/* Chat Widget (z-overlay = 500) */}
      {showChatWidget && (
        <Suspense fallback={null}>
          <FloatingChatWidget
            homeownerId={activeHomeowner?.id}
            homeownerName={activeHomeowner?.name}
            isOpen={isChatWidgetOpen}
            onOpenChange={setIsChatWidgetOpen}
          />
        </Suspense>
      )}
    </>
  );
};

export default AppShell;
