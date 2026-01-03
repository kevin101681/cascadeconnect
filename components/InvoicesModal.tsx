/**
 * Invoices Modal Component - Refactored
 * 
 * A properly isolated modal that wraps CBS Books with:
 * - Responsive viewport constraints (scrolls inside, not outside)
 * - Proper z-index hierarchy for nested pickers/dropdowns
 * - State cleanup on close to prevent stale data
 * - Mobile-first UX with full-screen takeover on small devices
 * - Keyboard accessibility (Esc to close, focus trap)
 */

import React, { Suspense, lazy, useEffect, useState, useCallback, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface InvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillData?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
}

// Lazy load CBS Books component for code splitting
const CBSBooksApp = lazy(() => import('../lib/cbsbooks/App'));

const InvoicesModal: React.FC<InvoicesModalProps> = ({ isOpen, onClose, prefillData }) => {
  console.log('🏗️ InvoicesModal component rendered, isOpen:', isOpen);
  
  // Key-based remounting for state cleanup
  const [mountKey, setMountKey] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset CBS Books state when modal opens by changing the key
  useEffect(() => {
    if (isOpen) {
      setMountKey(prev => prev + 1);
      // Focus close button for accessibility
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard event handler (Esc to close)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  // Focus trap (keep tab focus within modal)
  const handleFocusTrap = useCallback((e: KeyboardEvent) => {
    if (!isOpen || !modalRef.current || e.key !== 'Tab') return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  }, [isOpen]);

  // Setup keyboard listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleFocusTrap);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleFocusTrap);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown, handleFocusTrap]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) {
    console.log('❌ InvoicesModal returning null because isOpen is false');
    return null;
  }

  console.log('✅ InvoicesModal rendering portal');
  return createPortal(
    <div 
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoices-modal-title"
    >
      <div 
        ref={modalRef}
        className="
          bg-surface dark:bg-gray-800 shadow-elevation-3 overflow-hidden flex flex-col
          
          /* Mobile: Full screen takeover */
          fixed inset-0 w-screen h-screen rounded-none
          
          /* Desktop: Centered modal with breathing room */
          md:relative md:w-[95vw] md:h-[90vh] md:max-w-7xl md:rounded-3xl
          md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
        " 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-800/50">
          <h2 
            id="invoices-modal-title"
            className="text-xl md:text-2xl font-semibold text-surface-on dark:text-gray-100"
          >
            CBS Books - Invoices
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="
              p-2 md:p-3 rounded-full 
              bg-surface-container-high hover:bg-surface-container 
              dark:bg-gray-700 dark:hover:bg-gray-600
              text-surface-on-variant dark:text-gray-400 
              hover:text-surface-on dark:hover:text-gray-100
              transition-all hover:scale-105 active:scale-95
              flex items-center justify-center
            "
            title="Close (Esc)"
            aria-label="Close invoices modal"
          >
            <X className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>
        
        {/* Content Area - Scrollable with max height constraint */}
        <div 
          className="
            flex-1 overflow-y-auto overflow-x-hidden
            /* Ensure content scrolls inside modal, not the modal itself */
            max-h-[calc(100vh-80px)] md:max-h-[calc(90vh-80px)]
            
            /* Higher z-index context for nested modals/pickers */
            relative isolate
          "
          style={{ 
            // Elevate z-index context so child portals (date pickers, dropdowns) 
            // are above the modal backdrop (z-200)
            zIndex: 1 
          }}
        >
          {/* Wrapper with proper height constraints */}
          <div className="h-full w-full">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-100 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4 text-surface-on-variant dark:text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Loading CBS Books...</p>
                </div>
              </div>
            }>
              {/* Key prop forces remount on open to reset state */}
              <CBSBooksApp 
                key={mountKey} 
                prefillInvoice={prefillData} 
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoicesModal;
