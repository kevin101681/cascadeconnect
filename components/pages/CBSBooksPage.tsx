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
import { useAuth } from '@clerk/clerk-react';
import InvoicesListPanel, { TabType, Invoice, Client } from '../InvoicesListPanel';
import InvoiceFormPanel from '../InvoiceFormPanelRefactored';
import { BuilderForm } from '../../lib/financial-tools/components/BuilderForm';
import { Reports } from '../../lib/financial-tools/components/Reports';
import { Expenses } from '../../lib/financial-tools/components/Expenses';
import { Building2, Mail, X, Download as DownloadIcon, Loader2, Send } from 'lucide-react';
import Button from '../Button';
import jsPDF from 'jspdf';
import type { Invoice as CBSInvoice, Client as CBSClient, Expense, ViewState } from '../../lib/financial-tools/types';

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
  // ==================== AUTH ====================
  const { getToken } = useAuth();
  
  // ==================== STATE ====================
  
  // Tab state (which module is active)
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  
  // Invoice state
  const [selectedInvoice, setSelectedInvoice] = useState<CBSInvoice | null>(null);
  const [showInvoicePanel, setShowInvoicePanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('sent');
  
  // Builder state - tracks which builder to show in right pane
  // Can be: null (empty), "new" (create form), or builder.id (edit form)
  const [activeBuilderId, setActiveBuilderId] = useState<string | "new" | null>(null);
  
  // Email modal state
  const [emailingInvoice, setEmailingInvoice] = useState<CBSInvoice | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
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
    setActiveBuilderId(null);
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
    setActiveBuilderId(builder.id);
  };
  
  const handleCreateNewBuilder = () => {
    setActiveBuilderId("new");
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
  
  // ==================== PDF GENERATION ====================
  
  const createInvoicePDF = (invoice: CBSInvoice) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    
    // Colors
    const primaryColor = [79, 120, 130];
    const surfaceContainerColor = [238, 239, 241];
    
    // Helper function to format date
    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      try {
        const [y, m, d] = dateString.split('-');
        return `${m}/${d}/${y}`;
      } catch (e) {
        return dateString;
      }
    };
    
    // Add CBS Logo (if available)
    try {
      const logoPath = '/images/manual/cbslogo.png';
      doc.addImage(logoPath, 'PNG', 162, 10, 25, 0);
    } catch (e) {
      console.warn('Could not load CBS logo:', e);
    }
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`INVOICE`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`#${invoice.invoiceNumber}`, 14, 26);
    
    // Dates
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Date: ${formatDate(invoice.date)}`, 140, 20, { align: 'right' } as any);
    doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 140, 26, { align: 'right' } as any);
    if (invoice.status === 'paid' && invoice.datePaid) {
      doc.text(`Date Paid: ${formatDate(invoice.datePaid)}`, 140, 32, { align: 'right' } as any);
    }
    
    // Bill To section
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Bill To:", 14, 40);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(invoice.clientName || '', 14, 46);
    if (invoice.clientEmail) doc.text(invoice.clientEmail, 14, 51);
    
    // Sent From section
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Sent From:", 14, 58);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text("Cascade Builder Services", 14, 64);
    doc.text("3519 Fox Ct.", 14, 69);
    doc.text("Gig Harbor, WA 98335", 14, 74);
    
    // Items Table
    let y = 88;
    
    // Table header
    doc.setFillColor(surfaceContainerColor[0], surfaceContainerColor[1], surfaceContainerColor[2]);
    doc.roundedRect(14, y, 182, 8, 5, 5, 'F');
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Description", 18, y + 5);
    doc.text("Qty", 120, y + 5, { align: 'center' } as any);
    doc.text("Rate", 150, y + 5, { align: 'center' } as any);
    doc.text("Amount", 180, y + 5, { align: 'center' } as any);
    
    y += 14;
    
    // Project Details row (if exists)
    if (invoice.projectDetails) {
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0);
      doc.text("Project Address: ", 18, y);
      doc.setFont(undefined, 'normal');
      const labelW = 28;
      doc.text(invoice.projectDetails, 18 + labelW, y);
      y += 8;
    }
    
    // Items
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    items.forEach(item => {
      doc.text(item.description || '', 18, y);
      doc.text((item.quantity || 0).toString(), 120, y, { align: 'center' } as any);
      doc.text(`$${(item.rate || 0).toFixed(0)}`, 150, y, { align: 'center' } as any);
      doc.text(`$${(item.amount || 0).toFixed(0)}`, 180, y, { align: 'center' } as any);
      y += 8;
    });
    
    y += 5;
    
    // Total
    doc.setDrawColor(surfaceContainerColor[0], surfaceContainerColor[1], surfaceContainerColor[2]);
    doc.line(14, y, 196, y);
    y += 10;
    
    doc.setFillColor(surfaceContainerColor[0], surfaceContainerColor[1], surfaceContainerColor[2]);
    doc.roundedRect(135, y, 60, 10, 5, 5, 'F');
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const safeTotal = typeof invoice.total === 'number' ? invoice.total : 0;
    doc.text(`TOTAL  $${safeTotal.toFixed(0)}`, 165, y + 6, { align: 'center', baseline: 'middle' } as any);
    
    // Payment Button (if link exists)
    if (invoice.paymentLink) {
      y += 22;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.roundedRect(155, y, 40, 10, 5, 5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.text("PAY ONLINE", 175, y + 6, { align: 'center', baseline: 'middle' } as any);
      
      doc.link(155, y, 40, 10, { url: invoice.paymentLink });
    }
    
    return doc;
  };
  
  // ==================== EMAIL & DOWNLOAD HANDLERS ====================
  
  const handleGeneratePaymentLink = async (invoice: CBSInvoice) => {
    try {
      // Check if payment link already exists
      if (invoice.paymentLink) {
        // Open existing payment link
        window.open(invoice.paymentLink, '_blank');
        return;
      }
      
      // Generate new payment link via Square
      const response = await fetch('/.netlify/functions/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: invoice.invoiceNumber,
          amount: invoice.total,
          name: `Invoice #${invoice.invoiceNumber}`,
          description: `Payment for ${invoice.clientName} - ${invoice.projectDetails || 'Services'}`
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create payment link: ${response.status}`);
      }
      
      const { url } = await response.json();
      
      // Save the payment link to the invoice
      onUpdateInvoice({ ...invoice, paymentLink: url });
      
      // Open the payment link
      window.open(url, '_blank');
      
      alert('Payment link generated! Opening in new tab...');
    } catch (e: any) {
      console.error("Failed to generate payment link", e);
      alert("Failed to generate payment link: " + e.message);
    }
  };
  
  const handlePrepareEmail = (invoice: CBSInvoice) => {
    setEmailingInvoice(invoice);
    setEmailTo(invoice.clientEmail || '');
    setEmailSubject(`Invoice #${invoice.invoiceNumber} from Cascade Builder Services`);
    setEmailBody(`Hello,\n\nPlease find attached invoice #${invoice.invoiceNumber}.\n\nThank you,\nCascade Builder Services`);
  };
  
  const handleSendEmail = async () => {
    if (!emailingInvoice || !emailTo) {
      alert("Recipient email is required.");
      return;
    }
    
    setIsSendingEmail(true);
    try {
      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }
      
      // Generate PDF
      const doc = createInvoicePDF(emailingInvoice);
      const pdfDataUri = doc.output('datauristring');
      
      // Strip the data URI prefix to get pure base64
      // datauristring format: "data:application/pdf;base64,<base64content>"
      const pureBase64 = pdfDataUri.split(',')[1] || pdfDataUri;
      
      // Construct HTML with Payment Button
      const paymentButtonHtml = emailingInvoice.paymentLink 
        ? `
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
          <tr>
            <td>
              <table cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 50px; background-color: #4f7882;">
                    <a href="${emailingInvoice.paymentLink}" target="_blank" style="padding: 12px 24px; border: 1px solid #4f7882; border-radius: 50px; font-family: sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block;">
                      Pay Invoice Online
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>` 
        : '';
      
      const htmlBody = `
        <div style="font-family: sans-serif; color: #191c1d; line-height: 1.5;">
          <p style="white-space: pre-wrap;">${emailBody}</p>
          ${paymentButtonHtml}
        </div>
      `;
      
      // Send email via API with authentication
      const response = await fetch('/api/cbsbooks/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies for Clerk authentication
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          text: emailBody,
          html: htmlBody,
          attachment: {
            filename: `Invoice_${emailingInvoice.invoiceNumber}.pdf`,
            data: pureBase64 // Pure base64 without data URI prefix
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to send email: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Email sent successfully:', result);
      
      // Update status to sent if draft
      if (emailingInvoice.status === 'draft') {
        onUpdateInvoice({ ...emailingInvoice, status: 'sent' });
      }
      
      // Close modal
      setEmailingInvoice(null);
      alert('Email sent successfully!');
    } catch (e: any) {
      console.error("Failed to send email", e);
      alert("Failed to send email: " + e.message);
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  const handleDownloadPDF = (invoice: CBSInvoice) => {
    try {
      const doc = createInvoicePDF(invoice);
      doc.save(`${invoice.invoiceNumber}.pdf`);
    } catch (e) {
      console.error("PDF Download Error", e);
      alert("Failed to generate PDF. Check invoice data.");
    }
  };
  
  // ==================== RENDER ====================
  
  // STRICT RULE: NO HEADERS OR TABS ALLOWED HERE.
  // ONLY THE GRID WRAPPER IS ALLOWED.
  // CLONE WARRANTY CLAIMS LAYOUT EXACTLY (flex-row, no gap, border-r on left)
  // NO OUTER PADDING - Dashboard already provides it!
  return (
    <>
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
              selectedBuilderId={activeBuilderId === "new" ? undefined : activeBuilderId || undefined}
              
              // Actions
              onCreateNew={() => {
                if (activeTab === 'invoices') handleCreateNewInvoice();
                if (activeTab === 'builders') handleCreateNewBuilder();
              }}
              
              // Invoice card actions
              onMarkPaid={(inv, checkNum) => {
                // Mark as paid with check number
                onUpdateInvoice({ 
                  ...inv, 
                  status: 'paid' as const, 
                  datePaid: inv.datePaid || new Date().toISOString().split('T')[0], 
                  checkNumber: checkNum 
                });
              }}
              onCheckNumberUpdate={(inv, checkNum) => onUpdateInvoice({ ...inv, checkNumber: checkNum })}
              onEmail={(inv) => handlePrepareEmail(inv)}
              onDownload={(inv) => handleDownloadPDF(inv)}
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
          
          {/* BUILDERS TAB - Three states: Empty, Create, Edit */}
          {activeTab === 'builders' && (
            <>
              {activeBuilderId === null ? (
                // STATE 1: Empty - Show placeholder
                <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">Select a builder to view details</p>
                    <p className="text-xs mt-1">or click "New Builder" to create one</p>
                  </div>
                </div>
              ) : activeBuilderId === "new" ? (
                // STATE 2: Create Mode - Show empty form
                <div className="h-full overflow-auto bg-white dark:bg-gray-800">
                  <div className="p-6">
                    <BuilderForm
                      mode="create"
                      initialData={null}
                      clients={clients}
                      onSave={(client) => {
                        onAddClient(client);
                        setActiveBuilderId(client.id); // Switch to edit mode after creation
                      }}
                      onCancel={() => setActiveBuilderId(null)}
                    />
                  </div>
                </div>
              ) : (
                // STATE 3: Edit Mode - Show form with selected builder data
                (() => {
                  const selectedBuilder = clients.find(c => c.id === activeBuilderId);
                  if (!selectedBuilder) {
                    // Builder not found - reset to empty
                    setActiveBuilderId(null);
                    return null;
                  }
                  return (
                    <div className="h-full overflow-auto bg-white dark:bg-gray-800">
                      <div className="p-6">
                        <BuilderForm
                          mode="edit"
                          initialData={selectedBuilder}
                          clients={clients}
                          onSave={(client) => {
                            onUpdateClient(client);
                            // Stay in edit mode
                          }}
                          onDelete={(id) => {
                            if (confirm('Are you sure you want to delete this builder?')) {
                              onDeleteClient(id);
                              setActiveBuilderId(null);
                            }
                          }}
                          onCancel={() => setActiveBuilderId(null)}
                        />
                      </div>
                    </div>
                  );
                })()
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
      
      {/* ==================== EMAIL MODAL ==================== */}
      {emailingInvoice && (
        <div className="fixed inset-0 z-[70] bg-black/50 dark:bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface dark:bg-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-surface-outline-variant dark:border-gray-700 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-surface-on dark:text-gray-100">
                <Mail className="text-primary" />
                Email Invoice
              </h3>
              <button
                onClick={() => setEmailingInvoice(null)}
                className="p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full transition-colors text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-surface-outline dark:text-gray-400 uppercase tracking-wider ml-1 mb-1 block">
                  To
                </label>
                <input
                  type="email"
                  className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400"
                  placeholder="client@example.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-surface-outline dark:text-gray-400 uppercase tracking-wider ml-1 mb-1 block">
                  Subject
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-surface-outline dark:text-gray-400 uppercase tracking-wider ml-1 mb-1 block">
                  Message
                </label>
                <textarea
                  className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary h-32 resize-none text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-surface-on-variant dark:text-gray-400 bg-surface-container dark:bg-gray-700/50 p-3 rounded-xl">
                <DownloadIcon size={16} />
                <span>Invoice #{emailingInvoice.invoiceNumber}.pdf will be attached.</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="text"
                onClick={() => setEmailingInvoice(null)}
                disabled={isSendingEmail}
                className="text-surface-on dark:text-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                icon={isSendingEmail ? <Loader2 className="animate-spin" /> : <Send size={16} />}
              >
                {isSendingEmail ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CBSBooksPage;
