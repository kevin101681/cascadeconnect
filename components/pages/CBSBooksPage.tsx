/**
 * CBS Books Page Component
 * 
 * A dedicated full-page component for CBS Books with split-view layout.
 * NO HEADERS, NO DUPLICATE TABS - Everything is managed by InvoicesListPanel.
 * 
 * This replaces the InvoicesModal pattern with a proper page layout.
 */

"use client";

import React, { useState, useMemo } from 'react';
import InvoicesListPanel, { TabType, Invoice, Client } from '../InvoicesListPanel';
import InvoiceFormPanel from '../InvoiceFormPanel';
import { Clients } from '../../lib/cbsbooks/components/Clients';
import { Reports } from '../../lib/cbsbooks/components/Reports';
import { Expenses } from '../../lib/cbsbooks/components/Expenses';
import type { Invoice as CBSInvoice, Client as CBSClient, Expense, ViewState } from '../../lib/cbsbooks/types';

interface CBSBooksPageProps {
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

const CBSBooksPage: React.FC<CBSBooksPageProps> = ({
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
  };
  
  const handleCreateNewBuilder = () => {
    setSelectedBuilder(null);
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
  
  // STRICT RULE: NO HEADERS OR TABS ALLOWED HERE.
  // ONLY THE GRID WRAPPER IS ALLOWED.
  // CLONE WARRANTY CLAIMS LAYOUT EXACTLY (flex-row, no gap, border-r on left)
  // NO OUTER PADDING - Dashboard already provides it!
  return (
    <div className="bg-surface dark:bg-gray-800 md:rounded-modal md:border border-surface-outline-variant dark:border-gray-700 flex flex-col md:flex-row overflow-hidden h-full min-h-0 md:max-h-[calc(100vh-8rem)]">
        
        {/* ==================== LEFT COLUMN (Master List) ==================== */}
        {/* Clone Warranty: w-full md:w-96, border-r on desktop, flex flex-col */}
        {(activeTab === 'invoices' || activeTab === 'builders') && (
          <div className="w-full md:w-96 border-b md:border-b-0 md:border-r border-surface-outline-variant dark:border-gray-700 flex flex-col min-h-0 bg-surface dark:bg-gray-800">
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
                console.log('Email invoice:', inv.id);
              }}
              onDownload={(inv) => {
                console.log('Download invoice:', inv.id);
              }}
              onDeleteInvoice={(id) => {
                if (confirm('Are you sure you want to delete this invoice?')) {
                  onDeleteInvoice(id);
                }
              }}
            />
          </div>
        )}

        {/* ==================== RIGHT COLUMN (Detail View) ==================== */}
        {/* Clone Warranty: flex-1, flex flex-col, bg-surface */}
        <div className="flex-1 flex flex-col bg-surface dark:bg-gray-800 min-h-0">
          
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
          
          {/* BUILDERS TAB - Placeholder or Builder Details */}
          {activeTab === 'builders' && (
            <>
              {!selectedBuilder ? (
                // Placeholder when no builder selected
                <div className="flex items-center justify-center h-full bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <p className="text-sm font-medium">Select a builder to view details</p>
                    <p className="text-xs mt-1">or click "New Builder" to create one</p>
                  </div>
                </div>
              ) : (
                // Show builder details/form when selected
                <div className="h-full overflow-auto bg-white dark:bg-gray-800">
                  <div className="p-6">
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
                </div>
              )}
            </>
          )}
          
          {/* P&L TAB - Legacy Reports Component */}
          {activeTab === 'p&l' && (
            <div className="h-full overflow-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <Reports
                  invoices={invoices}
                  expenses={expenses}
                  onNavigate={handleNavigate}
                  onBackup={onBackup || (() => {})}
                />
              </div>
            </div>
          )}
          
          {/* EXPENSES TAB - Legacy Expenses Component */}
          {activeTab === 'expenses' && (
            <div className="h-full overflow-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6">
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
            </div>
          )}
          
        </div>
      </div>
  );
};

export default CBSBooksPage;
