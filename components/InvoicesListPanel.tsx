/**
 * InvoicesListPanel Component (Comprehensive Tab-Aware Version)
 * 
 * A split-view left panel for displaying lists across multiple tabs (Master-Detail pattern).
 * Matches the visual structure of the Warranty Claims list.
 * 
 * Supports: Invoices, Builders, P&L Reports, Expenses
 */

import React, { useState } from 'react';
import { Search, ChevronLeft, Plus, Building2, PieChart, Receipt } from 'lucide-react';
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

export interface Client {
  id: string;
  companyName: string;
  email: string;
  checkPayorName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  address?: string;
}

export type TabType = 'invoices' | 'builders' | 'p&l' | 'expenses';

interface InvoicesListPanelProps {
  // Tab Control
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  
  // Invoices Tab
  invoices?: Invoice[];
  filteredInvoices?: Invoice[];
  onInvoiceSelect?: (invoice: Invoice) => void;
  selectedInvoiceId?: string | null;
  statusFilter?: 'all' | 'draft' | 'sent' | 'paid';
  onStatusFilterChange?: (filter: 'all' | 'draft' | 'sent' | 'paid') => void;
  
  // Builders Tab
  builders?: Client[];
  onBuilderSelect?: (builder: Client) => void;
  selectedBuilderId?: string | null;
  
  // Actions
  onCreateNew?: () => void;
  onBack?: () => void;
  
  // Invoice Card Actions (pass-through)
  onMarkPaid?: (invoice: Invoice, checkNum: string) => void;
  onCheckNumberUpdate?: (invoice: Invoice, checkNum: string) => void;
  onEmail?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
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
  activeTab,
  onTabChange,
  invoices = [],
  filteredInvoices = [],
  onInvoiceSelect,
  selectedInvoiceId,
  statusFilter = 'sent',
  onStatusFilterChange,
  builders = [],
  onBuilderSelect,
  selectedBuilderId,
  onCreateNew,
  onBack,
  onMarkPaid,
  onCheckNumberUpdate,
  onEmail,
  onDownload,
  onDeleteInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter invoices by search query (with null safety)
  const displayInvoices = searchQuery
    ? filteredInvoices.filter(inv => 
        (inv.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.projectDetails || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredInvoices;

  // Filter builders by search query (with null safety)
  const displayBuilders = searchQuery
    ? builders.filter(b => 
        (b.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.email || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : builders;

  // Dynamic title and button label based on tab
  const getTitle = () => {
    switch (activeTab) {
      case 'invoices': return 'Invoices';
      case 'builders': return 'Builders';
      case 'p&l': return 'P&L Reports';
      case 'expenses': return 'Expenses';
      default: return 'Invoices';
    }
  };

  const getButtonLabel = () => {
    switch (activeTab) {
      case 'invoices': return { full: 'New Invoice', short: 'New' };
      case 'builders': return { full: 'New Builder', short: 'New' };
      case 'p&l': return null; // No "New" button for reports
      case 'expenses': return { full: 'New Expense', short: 'New' };
      default: return { full: 'New', short: 'New' };
    }
  };

  const getCount = () => {
    switch (activeTab) {
      case 'invoices': return filteredInvoices.length;
      case 'builders': return builders.length;
      case 'p&l': return 0; // No count for reports
      case 'expenses': return 0; // Could add expense count
      default: return 0;
    }
  };

  const showFilters = activeTab === 'invoices';
  const showSearch = activeTab === 'invoices' || activeTab === 'builders';
  const showList = activeTab === 'invoices' || activeTab === 'builders';

  const buttonLabel = getButtonLabel();
  const count = getCount();

  return (
    <>
      {/* NOTE: No outer wrapper - parent (CBSBooksPage) provides the wrapper with borders */}
      
      {/* ==================== HEADER ==================== */}
      <div className="sticky top-0 z-10 px-4 py-3 md:p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface md:bg-surface-container dark:bg-gray-700 flex flex-row justify-between items-center gap-2 md:gap-4 shrink-0">
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
            {count > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-primary text-primary bg-primary/10 text-xs font-medium flex-shrink-0">
                {count}
              </span>
            )}
            <span className="truncate">{getTitle()}</span>
          </h3>
        </div>
        
        {/* New Button (if applicable) */}
        {buttonLabel && onCreateNew && (
          <Button
            variant="filled"
            onClick={onCreateNew}
            className="!h-9 !px-3 md:!h-8 md:!px-4 !text-sm md:text-xs shrink-0"
          >
            <span className="hidden sm:inline">{buttonLabel.full}</span>
            <span className="sm:hidden">{buttonLabel.short}</span>
          </Button>
        )}
      </div>

      {/* ==================== TABS ROW ==================== */}
      <div className="px-4 py-2 border-b border-surface-outline-variant dark:border-gray-700 bg-surface md:bg-surface-container dark:bg-gray-700">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => onTabChange('invoices')}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'invoices'
                ? 'bg-white dark:bg-gray-600 border border-primary text-primary shadow-sm'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-transparent'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => onTabChange('builders')}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'builders'
                ? 'bg-white dark:bg-gray-600 border border-primary text-primary shadow-sm'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-transparent'
            }`}
          >
            Builders
          </button>
          <button
            onClick={() => onTabChange('p&l')}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'p&l'
                ? 'bg-white dark:bg-gray-600 border border-primary text-primary shadow-sm'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-transparent'
            }`}
          >
            P&L
          </button>
          <button
            onClick={() => onTabChange('expenses')}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'bg-white dark:bg-gray-600 border border-primary text-primary shadow-sm'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-transparent'
            }`}
          >
            Expenses
          </button>
        </div>
      </div>

      {/* ==================== FILTER PILLS (Invoices Only) ==================== */}
      {showFilters && onStatusFilterChange && (
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
      {showSearch && (
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-on-variant dark:text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'invoices' ? 'Search invoices...' : 'Search builders...'}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-full text-sm text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* ==================== LIST CONTENT ==================== */}
      <div 
        className="flex-1 overflow-y-auto px-2 py-4 md:p-4 min-h-0"
        style={{ 
          WebkitOverflowScrolling: 'touch', 
          touchAction: 'pan-y',
          maskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)'
        } as React.CSSProperties}
      >
        {/* INVOICES LIST */}
        {activeTab === 'invoices' && showList && (
          <>
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
                        onClick={() => onInvoiceSelect?.(inv)}
                        onMarkPaid={onMarkPaid ? (checkNum) => {
                          const today = getLocalTodayDate();
                          onMarkPaid({ ...inv, status: 'paid' as const, datePaid: today, checkNumber: checkNum }, checkNum);
                        } : undefined}
                        onCheckNumberUpdate={onCheckNumberUpdate ? (checkNum) => onCheckNumberUpdate(inv, checkNum) : undefined}
                        onEmail={onEmail ? () => onEmail(inv) : undefined}
                        onDownload={onDownload ? () => onDownload(inv) : undefined}
                        onDelete={onDeleteInvoice ? () => onDeleteInvoice(inv.id) : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* BUILDERS LIST */}
        {activeTab === 'builders' && showList && (
          <>
            {displayBuilders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant dark:text-gray-400 gap-2">
                <span className="text-sm">
                  {searchQuery ? 'No builders match your search' : 'No builders found'}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {displayBuilders.map((builder) => {
                  const isSelected = selectedBuilderId === builder.id;
                  
                  // Format address from components
                  const fullAddress = [
                    builder.addressLine1,
                    builder.addressLine2,
                    builder.city,
                    builder.state,
                    builder.zip
                  ].filter(Boolean).join(', ') || builder.address;
                  
                  return (
                    <button
                      key={builder.id}
                      type="button"
                      onClick={() => onBuilderSelect?.(builder)}
                      className={`w-full text-left rounded-card p-4 transition-all touch-manipulation ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-500 shadow-md border-2' 
                          : 'bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300'
                      }`}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900 truncate">{builder.companyName}</h4>
                          {builder.checkPayorName && builder.checkPayorName !== builder.companyName && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">Check: {builder.checkPayorName}</p>
                          )}
                          <p className="text-xs text-gray-600 truncate mt-0.5">{builder.email}</p>
                          {fullAddress && (
                            <p className="text-xs text-gray-500 truncate mt-1 flex items-start gap-1">
                              <span className="text-gray-400 shrink-0">📍</span>
                              <span className="truncate">{fullAddress}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* P&L PLACEHOLDER (List view not applicable - full report in right column) */}
        {activeTab === 'p&l' && (
          <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant dark:text-gray-400 gap-2 text-center px-4">
            <PieChart className="h-12 w-12 opacity-20" />
            <span className="text-sm">
              Select filters and view detailed reports in the right panel
            </span>
          </div>
        )}

        {/* EXPENSES PLACEHOLDER (List view not applicable - full list in right column) */}
        {activeTab === 'expenses' && (
          <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant dark:text-gray-400 gap-2 text-center px-4">
            <Receipt className="h-12 w-12 opacity-20" />
            <span className="text-sm">
              View and manage expenses in the right panel
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default InvoicesListPanel;
