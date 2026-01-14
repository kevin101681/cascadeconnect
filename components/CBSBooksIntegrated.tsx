/**
 * CBS Books Integrated Component
 * 
 * A comprehensive financial management interface with split-view layout.
 * Combines Invoices, Builders, P&L Reports, and Expenses into a single tabbed interface.
 * 
 * Uses Master-Detail pattern matching Warranty Claims design.
 */

import React, { useState, useMemo } from 'react';
import InvoicesListPanel, { TabType, Invoice, Client } from './InvoicesListPanel';
import InvoiceFormPanel from './InvoiceFormPanel';
import { Clients } from '../lib/cbsbooks/components/Clients';
import { Reports } from '../lib/cbsbooks/components/Reports';
import { Expenses } from '../lib/cbsbooks/components/Expenses';
import type { Invoice as CBSInvoice, Client as CBSClient, Expense, ViewState } from '../lib/cbsbooks/types';

interface CBSBooksIntegratedProps {
  // Invoices Data
  invoices: CBSInvoice[];
  onAddInvoice: (invoice: CBSInvoice) => void;
  onUpdateInvoice: (invoice: CBSInvoice) => void;
  onDeleteInvoice: (id: string) => void;
  onBulkAddInvoices?: (invoices: CBSInvoice[]) => void;
  onBulkDeleteInvoices?: (ids: string[]) => void;
  
  // Builders/Clients Data
  clients: CBSClient[];
  onAddClient: (client: CBSClient) => void;
  onUpdateClient: (client: CBSClient) => void;
  onDeleteClient: (id: string) => void;
  onBulkAddClients?: (clients: CBSClient[]) => void;
  
  // Expenses Data
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onBulkAddExpenses?: (expenses: Expense[]) => void;
  onBulkDeleteExpenses?: (ids: string[]) => void;
  
  // Backup
  onBackup?: () => void;
  
  // Prefill (for invoices)
  prefillInvoice?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
}

const CBSBooksIntegrated: React.FC<CBSBooksIntegratedProps> = ({
  invoices,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onBulkAddInvoices,
  onBulkDeleteInvoices,
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onBulkAddClients,
  expenses,
  onAddExpense,
  onDeleteExpense,
  onBulkAddExpenses,
  onBulkDeleteExpenses,
  onBackup,
  prefillInvoice,
}) => {
  // ==================== STATE ====================
  
  // Tab state (which module is active)
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  
  // Invoice state
  const [selectedInvoice, setSelectedInvoice] = useState<CBSInvoice | null>(null);
  const [showInvoicePanel, setShowInvoicePanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('sent');
  
  // Builder state
  const [selectedBuilder, setSelectedBuilder] = useState<CBSClient | null>(null);
  const [showBuilderPanel, setShowBuilderPanel] = useState(false);
  
  // ==================== FILTERED DATA ====================
  
  // Filter invoices by status
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices;
    return invoices.filter(inv => inv.status === statusFilter);
  }, [invoices, statusFilter]);
  
  // ==================== HANDLERS ====================
  
  // Tab change handler
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Reset selections when switching tabs
    setShowInvoicePanel(false);
    setShowBuilderPanel(false);
    setSelectedInvoice(null);
    setSelectedBuilder(null);
  };
  
  // Invoice handlers
  const handleInvoiceSelect = (invoice: CBSInvoice) => {
    setSelectedInvoice(invoice);
    setShowInvoicePanel(true);
  };
  
  const handleCreateNewInvoice = () => {
    setSelectedInvoice(null);
    setShowInvoicePanel(true);
  };
  
  const handleInvoiceSave = async (invoice: Partial<CBSInvoice>) => {
    // This logic is similar to what was in Invoices.tsx
    const itemsToSave = invoice.items || [];
    const total = itemsToSave.reduce((acc, item) => acc + item.amount, 0);
    
    const client = clients.find(c => c.companyName === invoice.clientName);
    const email = invoice.clientEmail || client?.email || '';

    const invoiceToSave: CBSInvoice = {
      id: invoice.id || crypto.randomUUID(),
      invoiceNumber: invoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      clientName: invoice.clientName || '',
      clientEmail: email,
      projectDetails: invoice.projectDetails || '',
      paymentLink: invoice.paymentLink,
      checkNumber: invoice.checkNumber,
      date: invoice.date || new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate || new Date().toISOString().split('T')[0],
      datePaid: invoice.datePaid,
      items: itemsToSave,
      total: total,
      status: invoice.status || 'draft'
    };

    if (invoice.id) {
      onUpdateInvoice(invoiceToSave);
    } else {
      onAddInvoice(invoiceToSave);
    }
    
    setShowInvoicePanel(false);
    setSelectedInvoice(null);
  };
  
  const handleInvoiceCancel = () => {
    setShowInvoicePanel(false);
    setSelectedInvoice(null);
  };
  
  // Builder handlers
  const handleBuilderSelect = (builder: CBSClient) => {
    setSelectedBuilder(builder);
    setShowBuilderPanel(true);
  };
  
  const handleCreateNewBuilder = () => {
    setSelectedBuilder(null);
    setShowBuilderPanel(true);
  };
  
  // Navigation handler (for legacy components)
  const handleNavigate = (view: ViewState) => {
    // Map ViewState to TabType
    const tabMap: Record<ViewState, TabType> = {
      'invoices': 'invoices',
      'clients': 'builders',
      'reports': 'p&l',
      'expenses': 'expenses',
    };
    setActiveTab(tabMap[view]);
  };
  
  // ==================== RENDER ====================
  
  return (
    <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Main Split-View Container */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[400px_1fr] overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
        
        {/* ==================== LEFT COLUMN (Master List) ==================== */}
        <InvoicesListPanel
          activeTab={activeTab}
          onTabChange={handleTabChange}
          
          // Invoices
          invoices={invoices}
          filteredInvoices={filteredInvoices}
          onInvoiceSelect={handleInvoiceSelect}
          selectedInvoiceId={selectedInvoice?.id}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          
          // Builders
          builders={clients}
          onBuilderSelect={handleBuilderSelect}
          selectedBuilderId={selectedBuilder?.id}
          
          // Actions
          onCreateNew={() => {
            if (activeTab === 'invoices') handleCreateNewInvoice();
            if (activeTab === 'builders') handleCreateNewBuilder();
            if (activeTab === 'expenses') {
              // Expenses creation is handled within the Expenses component
            }
          }}
          
          // Invoice card actions
          onMarkPaid={(inv, checkNum) => {
            onUpdateInvoice({ 
              ...inv, 
              status: 'paid' as const, 
              datePaid: inv.datePaid || new Date().toISOString().split('T')[0], 
              checkNumber: checkNum 
            });
          }}
          onCheckNumberUpdate={(inv, checkNum) => onUpdateInvoice({ ...inv, checkNumber: checkNum })}
          onEmail={(inv) => {
            // Email handler (could open modal)
            console.log('Email invoice:', inv.id);
          }}
          onDownload={(inv) => {
            // Download handler (could generate PDF)
            console.log('Download invoice:', inv.id);
          }}
          onDeleteInvoice={(id) => {
            if (confirm('Are you sure you want to delete this invoice?')) {
              onDeleteInvoice(id);
            }
          }}
        />

        {/* ==================== RIGHT COLUMN (Detail View) ==================== */}
        <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-800 relative overflow-hidden">
          
          {/* INVOICES TAB - Invoice Form Panel */}
          {activeTab === 'invoices' && (
            <InvoiceFormPanel
              isVisible={showInvoicePanel}
              onSave={handleInvoiceSave}
              onCancel={handleInvoiceCancel}
              builders={clients.map(c => ({ 
                id: c.id, 
                name: c.companyName, 
                email: c.email 
              }))}
              prefillData={prefillInvoice}
              editInvoice={selectedInvoice}
            />
          )}
          
          {/* BUILDERS TAB - Legacy Clients Component */}
          {activeTab === 'builders' && (
            <div className="h-full overflow-auto p-6">
              <Clients
                clients={clients}
                invoices={invoices}
                onAdd={onAddClient}
                onUpdate={onUpdateClient}
                onDelete={onDeleteClient}
                onBulkAdd={onBulkAddClients || (() => {})}
                onNavigate={handleNavigate}
                onBackup={onBackup || (() => {})}
              />
            </div>
          )}
          
          {/* P&L TAB - Legacy Reports Component */}
          {activeTab === 'p&l' && (
            <div className="h-full overflow-auto p-6">
              <Reports
                invoices={invoices}
                expenses={expenses}
                onNavigate={handleNavigate}
                onBackup={onBackup || (() => {})}
              />
            </div>
          )}
          
          {/* EXPENSES TAB - Legacy Expenses Component */}
          {activeTab === 'expenses' && (
            <div className="h-full overflow-auto p-6">
              <Expenses
                expenses={expenses}
                onAdd={onAddExpense}
                onDelete={onDeleteExpense}
                onBulkAdd={onBulkAddExpenses || (() => {})}
                onBulkDelete={onBulkDeleteExpenses || (() => {})}
                onNavigate={handleNavigate}
                onBackup={onBackup || (() => {})}
              />
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default CBSBooksIntegrated;
