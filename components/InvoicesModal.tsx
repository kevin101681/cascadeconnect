/**
 * Invoices Modal Component
 * 
 * This component displays CBS Books in a full-screen modal
 */

import React, { useState, useEffect } from 'react';
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

// Cache the component outside the component to persist across renders
let cachedCBSBooksComponent: React.ComponentType<any> | null = null;
let loadPromise: Promise<React.ComponentType<any> | null> | null = null;

const InvoicesModal: React.FC<InvoicesModalProps> = ({ isOpen, onClose, prefillData }) => {
  const [CBSBooksComponent, setCBSBooksComponent] = useState<React.ComponentType<any> | null>(cachedCBSBooksComponent);
  const [isLoading, setIsLoading] = useState(!cachedCBSBooksComponent && isOpen);
  const [error, setError] = useState<string | null>(null);

  // Dynamically import CBS Books component (only once, then cache it)
  useEffect(() => {
    if (!isOpen) return;
    
    // If already cached, use it immediately - no loading needed
    if (cachedCBSBooksComponent) {
      setCBSBooksComponent(() => cachedCBSBooksComponent);
      setIsLoading(false);
      return;
    }

    // If already loading, wait for the existing promise
    if (loadPromise) {
      loadPromise.then((component) => {
        if (component) {
          setCBSBooksComponent(() => component);
          setIsLoading(false);
        }
      }).catch((err) => {
        console.error('Failed to load CBS Books:', err);
        setError(`Failed to load CBS Books: ${err.message || 'Please check the integration.'}`);
        setIsLoading(false);
      });
      return;
    }

    // Start loading if not cached and not already loading
    setIsLoading(true);
    setError(null);
    
    loadPromise = (async () => {
      try {
        console.log('Attempting to import CBS Books App...');
        // Direct dynamic import - same pattern as PunchListApp
        const module = await import('../lib/cbsbooks/App');
        console.log('CBS Books module loaded:', module);
        
        if (module && module.default) {
          console.log('CBS Books component found, caching it...');
          cachedCBSBooksComponent = module.default;
          setCBSBooksComponent(() => cachedCBSBooksComponent);
          setIsLoading(false);
          return cachedCBSBooksComponent;
        } else {
          console.error('CBS Books component not found in module:', module);
          const errorMsg = 'CBS Books component not found in module. Ensure it has a default export.';
          setError(errorMsg);
          setIsLoading(false);
          return null;
        }
      } catch (err: any) {
        console.error('Failed to load CBS Books:', err);
        const errorMsg = `Failed to load CBS Books: ${err.message || 'Please check the integration.'}`;
        setError(errorMsg);
        setIsLoading(false);
        return null;
      } finally {
        loadPromise = null;
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-surface dark:bg-gray-800 w-full h-full rounded-none shadow-elevation-3 overflow-hidden flex flex-col" style={{ transform: 'none' }}>
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
        <div className="flex-1 overflow-auto" style={{ transform: 'none', isolation: 'auto' }}>
          {isLoading && (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-surface-on dark:text-gray-100">Loading CBS Books...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <p className="text-error mb-4">{error}</p>
                <p className="text-sm text-surface-on-variant dark:text-gray-400">
                  Please ensure CBS Books is properly integrated into the workspace.
                </p>
              </div>
            </div>
          )}
          
          {!isLoading && !error && CBSBooksComponent && (
            <div className="h-full w-full" data-cbs-books style={{ pointerEvents: 'auto', transform: 'none', isolation: 'auto' }}>
              <CBSBooksComponent prefillInvoice={prefillData} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoicesModal;
