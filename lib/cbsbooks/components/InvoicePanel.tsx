import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface InvoicePanelProps {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Panel shell for the Invoices master-detail layout.
 * - NOT a modal/dialog (no overlay, no close "X" on desktop)
 * - Mobile gets a back chevron to return to the list
 */
export const InvoicePanel: React.FC<InvoicePanelProps> = ({ title, onBack, children, footer }) => {
  return (
    <div className="flex min-w-0 flex-col h-full bg-white dark:bg-gray-900">
      <div className="h-16 shrink-0 px-6 border-b border-surface-outline-variant dark:border-gray-700 flex items-center gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-2 -ml-2 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-lg md:text-xl font-normal text-surface-on dark:text-gray-100 truncate">
          {title}
        </h2>
      </div>

      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <div
          className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
        >
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 sm:px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

