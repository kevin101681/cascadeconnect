/**
 * InvoicesListPanel Component
 * 
 * A split-view left panel for displaying invoice list (Master-Detail pattern).
 * Matches the visual structure of the Warranty Claims list.
 */

import React, { useState } from 'react';
import { Search, ChevronLeft, Plus } from 'lucide-react';
import Button from './Button';
import { InvoiceCard } from './ui/InvoiceCard';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  projectDetails?: string;
  paymentLink?: string;
  checkNumber?: string;
  date: string;
  dueDate: string;
  datePaid?: string;
  total: number;
  status: 'draft' | 'sent' | 'paid';
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

interface InvoicesListPanelProps {
  invoices: Invoice[];
  filteredInvoices: Invoice[];
  onInvoiceSelect: (invoice: Invoice) => void;
  onCreateNew: () => void;
  onBack?: () => void;
  selectedInvoiceId?: string | null;
  statusFilter?: 'all' | 'draft' | 'sent' | 'paid';
  onStatusFilterChange?: (filter: 'all' | 'draft' | 'sent' | 'paid') => void;
  // Actions passed through to InvoiceCard
  onMarkPaid?: (invoice: Invoice, checkNum: string) => void;
  onCheckNumberUpdate?: (invoice: Invoice, checkNum: string) => void;
  onEmail?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onDelete?: (invoiceId: string) => void;
}

// Helper to format date YYYY-MM-DD to MM/DD
const formatDateMobile = (dateString: string) => {
  if (!dateString) return '';
  try {
    const [y, m, d] = dateString.split('-');
    return `${m}/${d}`;
  } catch (e) {
    return dateString;
  }
};

// Helper to get today's date in local time YYYY-MM-DD
const getLocalTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const InvoicesListPanel: React.FC<InvoicesListPanelProps> = ({
  invoices,
  filteredInvoices,
  onInvoiceSelect,
  onCreateNew,
  onBack,
  selectedInvoiceId,
  statusFilter = 'sent',
  onStatusFilterChange,
  onMarkPaid,
  onCheckNumberUpdate,
  onEmail,
  onDownload,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter by search query
  const displayInvoices = searchQuery
    ? filteredInvoices.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.projectDetails?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredInvoices;

  return (
    <div className="w-full md:w-96 border-b md:border-b-0 md:border-r border-surface-outline-variant dark:border-gray-700 flex flex-col min-h-0 bg-surface dark:bg-gray-800">
      
      {/* ==================== HEADER ==================== */}
      <div className="sticky top-0 z-10 px-4 py-3 md:p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface dark:bg-gray-800 flex flex-row justify-between items-center gap-2 md:gap-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile back button (if provided) */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-2 -ml-2 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full"
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          
          {/* Title with count badge */}
          <h3 className="text-lg md:text-xl font-normal text-surface-on dark:text-gray-100 flex items-center gap-2 min-w-0">
            {filteredInvoices.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-primary text-primary bg-primary/10 text-xs font-medium flex-shrink-0">
                {filteredInvoices.length}
              </span>
            )}
            <span className="truncate">Invoices</span>
          </h3>
        </div>
        
        {/* New Invoice button */}
        <Button
          variant="filled"
          onClick={onCreateNew}
          className="!h-9 !px-3 md:!h-8 md:!px-4 !text-sm md:text-xs shrink-0"
        >
          <span className="hidden sm:inline">New Invoice</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* ==================== FILTER PILLS ==================== */}
      {onStatusFilterChange && (
        <div className="px-4 py-2 border-b border-surface-outline-variant/50 dark:border-gray-700/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStatusFilterChange('sent')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                statusFilter === 'sent'
                  ? 'border border-primary text-primary bg-primary/10'
                  : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => onStatusFilterChange('paid')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                statusFilter === 'paid'
                  ? 'border border-primary text-primary bg-primary/10'
                  : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => onStatusFilterChange('draft')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                statusFilter === 'draft'
                  ? 'border border-primary text-primary bg-primary/10'
                  : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => onStatusFilterChange('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                statusFilter === 'all'
                  ? 'border border-primary text-primary bg-primary/10'
                  : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
          </div>
        </div>
      )}

      {/* ==================== SEARCH BAR ==================== */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-on-variant dark:text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-full text-sm text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* ==================== INVOICE LIST ==================== */}
      <div 
        className="flex-1 overflow-y-auto px-2 py-4 md:p-4 min-h-0"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
      >
        {displayInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant dark:text-gray-400 gap-2">
            <span className="text-sm">
              {searchQuery ? 'No invoices match your search' : 'No invoices found'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {displayInvoices.map((inv) => {
              let cardStatus: 'Draft' | 'Sent' | 'Overdue' | 'Paid' = 'Draft';
              if (inv.status === 'paid') {
                cardStatus = 'Paid';
              } else if (inv.status === 'sent') {
                const today = new Date();
                const dueDate = new Date(inv.dueDate);
                cardStatus = dueDate < today ? 'Overdue' : 'Sent';
              }

              const isSelected = selectedInvoiceId === inv.id;

              return (
                <div key={inv.id} className="relative">
                  <InvoiceCard
                    invoiceNumber={inv.invoiceNumber}
                    status={cardStatus}
                    amount={`$${inv.total.toFixed(2)}`}
                    createdDate={formatDateMobile(inv.date)}
                    dueDate={formatDateMobile(inv.dueDate)}
                    builder={inv.clientName}
                    address={inv.projectDetails}
                    checkNumber={inv.checkNumber}
                    isSelected={isSelected}
                    onClick={() => onInvoiceSelect(inv)}
                    onMarkPaid={onMarkPaid ? (checkNum) => {
                      const today = getLocalTodayDate();
                      onMarkPaid({ ...inv, status: 'paid' as const, datePaid: today, checkNumber: checkNum }, checkNum);
                    } : undefined}
                    onCheckNumberUpdate={onCheckNumberUpdate ? (checkNum) => onCheckNumberUpdate(inv, checkNum) : undefined}
                    onEmail={onEmail ? () => onEmail(inv) : undefined}
                    onDownload={onDownload ? () => onDownload(inv) : undefined}
                    onDelete={onDelete ? () => onDelete(inv.id) : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicesListPanel;
