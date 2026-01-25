/**
 * Financials Dashboard Component
 * 
 * Main entry point for the Financials module with 4-tab navigation:
 * - Invoices: Full invoicing system (CBS Books integration)
 * - Builders: Builder/Client directory management
 * - Expenses: Expense tracking and management
 * - Profit & Loss: Financial reports and analytics
 * 
 * This component wraps the existing CBS Books functionality and adds
 * dedicated views for Builders, Expenses, and P&L reporting.
 */

import React, { useState, Suspense } from 'react';
import { FileText, Building2, Receipt, TrendingUp, Loader2 } from 'lucide-react';

// Lazy-load the CBS Books page wrapper
const CBSBooksPageWrapper = React.lazy(() => import('./CBSBooksPageWrapper'));

// Tab type definitions
type FinancialsTab = 'INVOICES' | 'BUILDERS' | 'EXPENSES' | 'PROFIT_LOSS';

interface FinancialsDashboardProps {
  // Optional prefill for invoices
  prefillInvoice?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
  
  // Optional initial tab
  initialTab?: FinancialsTab;
}

export const FinancialsDashboard: React.FC<FinancialsDashboardProps> = ({
  prefillInvoice,
  initialTab = 'INVOICES'
}) => {
  const [activeTab, setActiveTab] = useState<FinancialsTab>(initialTab);

  // Tab configuration
  const tabs: Array<{
    id: FinancialsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'INVOICES', label: 'Invoices', icon: FileText },
    { id: 'BUILDERS', label: 'Builders', icon: Building2 },
    { id: 'EXPENSES', label: 'Expenses', icon: Receipt },
    { id: 'PROFIT_LOSS', label: 'Profit & Loss', icon: TrendingUp },
  ];

  // Loading fallback component
  const LoadingFallback = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-surface-on-variant dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'INVOICES':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CBSBooksPageWrapper prefillInvoice={prefillInvoice} />
          </Suspense>
        );

      case 'BUILDERS':
        return (
          <div className="flex items-center justify-center h-[calc(100vh-16rem)] p-8">
            <div className="text-center max-w-md">
              <Building2 className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Builder Directory
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Manage your builder and client relationships. View contact information, 
                project history, and financial summaries.
              </p>
              <div className="mt-6 text-sm text-gray-400 dark:text-gray-500">
                Coming Soon
              </div>
            </div>
          </div>
        );

      case 'EXPENSES':
        return (
          <div className="flex items-center justify-center h-[calc(100vh-16rem)] p-8">
            <div className="text-center max-w-md">
              <Receipt className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Expense Tracking
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Track and categorize your business expenses. Upload receipts, 
                manage vendors, and generate expense reports.
              </p>
              <div className="mt-6 text-sm text-gray-400 dark:text-gray-500">
                Coming Soon
              </div>
            </div>
          </div>
        );

      case 'PROFIT_LOSS':
        return (
          <div className="flex items-center justify-center h-[calc(100vh-16rem)] p-8">
            <div className="text-center max-w-md">
              <TrendingUp className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Profit & Loss Reports
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                View comprehensive financial reports including income statements, 
                balance sheets, and cash flow analysis.
              </p>
              <div className="mt-6 text-sm text-gray-400 dark:text-gray-500">
                Coming Soon
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex space-x-1 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${isActive
                    ? 'border-primary text-primary dark:text-primary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default FinancialsDashboard;
