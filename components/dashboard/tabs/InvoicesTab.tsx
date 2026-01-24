/**
 * Invoices Tab - CBS Books Integration
 * 
 * Displays the CBS (Cascade Builder Software) Books page for
 * managing invoices, payments, and financial records.
 * 
 * Extracted from Dashboard.tsx (Phase 3)
 */

import React, { Suspense } from 'react';

// Lazy-load the CBS Books page wrapper
const CBSBooksPageWrapper = React.lazy(() => import('../../pages/CBSBooksPageWrapper'));

interface InvoicesTabProps {
  // Currently no props needed - CBS Books manages its own state
  // Can add homeownerId or other filters in future
}

export const InvoicesTab: React.FC<InvoicesTabProps> = () => {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <CBSBooksPageWrapper />
    </Suspense>
  );
};

export default InvoicesTab;
