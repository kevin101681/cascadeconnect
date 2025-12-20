/**
 * Invoices Modal Component
 * 
 * This component displays CBS Books in a full-screen modal
 */

import React, { Suspense, lazy } from 'react';
import { X } from 'lucide-react';
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
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{ overscrollBehavior: 'contain', overflow: 'hidden' }}
    >
      <div 
        className="bg-surface dark:bg-gray-800 w-full h-full rounded-none shadow-elevation-3 overflow-hidden flex flex-col" 
        style={{ transform: 'none', overscrollBehavior: 'contain' }}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Close FAB */}
        <button
          onClick={onClose}
          className="fixed top-6 right-6 z-[101] bg-primary hover:bg-primary/90 text-primary-on rounded-full p-3 shadow-elevation-3 transition-all hover:scale-105 flex items-center justify-center"
          title="Close"
          aria-label="Close invoices modal"
        >
          <X className="h-6 w-6" />
        </button>
        
        {/* Content */}
        <div 
          className="flex-1 overflow-auto" 
          style={{ transform: 'none', isolation: 'auto', overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
        >
          <div 
            className="h-full w-full" 
            data-cbs-books 
            style={{ pointerEvents: 'auto', transform: 'none', isolation: 'auto' }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onScroll={(e) => e.stopPropagation()}
          >
            <Suspense fallback={
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-surface-on-variant dark:text-gray-400">Loading CBS Books...</p>
                </div>
              </div>
            }>
              <CBSBooksApp prefillInvoice={prefillData} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoicesModal;


