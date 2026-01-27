/**
 * Full-Screen Invoices Manager - Master-Detail Overlay
 * 
 * A professional full-screen interface for managing invoices.
 * LEFT: Wide grid of invoice cards (2-3 columns)
 * RIGHT: Dedicated editor panel (always visible when creating/editing)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Loader2, AlertTriangle, Search, Building2, ArrowLeft } from 'lucide-react';
import { InvoiceCard } from '../ui/InvoiceCard';
import InvoiceFormPanel from '../InvoiceFormPanel';
import Button from '../Button';
import type { Invoice, Client, Expense, ViewState } from '../../lib/financial-tools/types';
import { api } from '../../lib/financial-tools/services/api';
import { useAuth } from '@clerk/clerk-react';
import jsPDF from 'jspdf';
import { BuilderForm } from '../../lib/financial-tools/components/BuilderForm';
import { Reports } from '../../lib/financial-tools/components/Reports';
import { Expenses } from '../../lib/financial-tools/components/Expenses';

interface InvoicesFullViewProps {
  isOpen: boolean;
  onClose: () => void;
  prefillData?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
}

export const InvoicesFullView: React.FC<InvoicesFullViewProps> = ({
  isOpen,
  onClose,
  prefillData,
}) => {
  const { getToken } = useAuth();
  
  // Debug logging
  useEffect(() => {
    console.log('💰 InvoicesFullView mounted, isOpen:', isOpen);
  }, []);
  
  useEffect(() => {
    console.log('💰 InvoicesFullView isOpen changed to:', isOpen);
  }, [isOpen]);
  
  // ==================== DATA STATE ====================
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // ==================== UI STATE ====================
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'BUILDERS' | 'EXPENSES' | 'REPORTS'>('INVOICES');
  
  // Invoice state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'draft' | 'sent'>('sent');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Builder state
  const [activeBuilderId, setActiveBuilderId] = useState<string | "new" | null>(null);
  
  // Track if initial load has completed
  const hasLoadedRef = React.useRef(false);

  // ==================== DATA LOADING ====================
  useEffect(() => {
    if (isOpen && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('InvoicesFullView: Loading data...');
      
      // Try cache first for instant display
      try {
        const [cachedInvoices, cachedClients, cachedExpenses] = await Promise.all([
          api.invoices.list(false), // Use cache
          api.clients.list(false), // Use cache
          api.expenses.list(false) // Use cache
        ]);
        
        // Show cached data immediately if available
        if (cachedInvoices.length > 0 || cachedClients.length > 0 || cachedExpenses.length > 0) {
          console.log(`✅ Loaded from cache`);
          setInvoices(cachedInvoices);
          setClients(cachedClients);
          setExpenses(cachedExpenses);
          setIsLoading(false);
          
          // Refresh from API in background
          refreshDataFromAPI().catch(err => {
            console.warn('Background refresh failed:', err);
          });
          return;
        }
      } catch (cacheError) {
        console.log('No cache available, fetching fresh data');
      }
      
      // No cache - load from API
      await refreshDataFromAPI();
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.message || "Failed to load data");
      setIsLoading(false);
    }
  };

  const refreshDataFromAPI = async () => {
    try {
      const [freshInvoices, freshClients, freshExpenses] = await Promise.all([
        api.invoices.list(true), // Force refresh
        api.clients.list(true), // Force refresh
        api.expenses.list(true) // Force refresh
      ]);
      
      setInvoices(freshInvoices);
      setClients(freshClients);
      setExpenses(freshExpenses);
      setIsLoading(false);
    } catch (err: any) {
      throw new Error(err.message || "Failed to refresh data");
    }
  };

  // ==================== FILTERED DATA ====================
  const filteredInvoices = useMemo(() => {
    // First filter by status
    let filtered = invoices.filter(inv => inv.status === statusFilter);
    
    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.clientName?.toLowerCase().includes(query) ||
        inv.projectDetails?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [invoices, statusFilter, searchQuery]);

  // ==================== COMPUTED TOTALS ====================
  const visibleTotal = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  }, [filteredInvoices]);

  // ==================== HANDLERS ====================
  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsCreatingNew(false);
  };

  const handleCreateNew = () => {
    if (activeTab === 'INVOICES') {
      setSelectedInvoice(null);
      setIsCreatingNew(true);
    } else if (activeTab === 'BUILDERS') {
      setActiveBuilderId("new");
    }
  };
  
  // Tab change handler
  const handleTabChange = (tab: 'INVOICES' | 'BUILDERS' | 'EXPENSES' | 'REPORTS') => {
    setActiveTab(tab);
    // Reset selections when switching tabs
    setSelectedInvoice(null);
    setIsCreatingNew(false);
    setActiveBuilderId(null);
  };
  
  // Builder handlers
  const handleBuilderSelect = (builder: Client) => {
    setActiveBuilderId(builder.id);
  };
  
  // Navigation handler (for legacy components)
  const handleNavigate = (view: ViewState) => {
    // Map ViewState to Tab
    const tabMap: Record<ViewState, 'INVOICES' | 'BUILDERS' | 'EXPENSES' | 'REPORTS'> = {
      'invoices': 'INVOICES',
      'clients': 'BUILDERS',
      'reports': 'REPORTS',
      'expenses': 'EXPENSES',
    };
    setActiveTab(tabMap[view]);
  };
  
  // Expense handlers
  const handleAddExpense = async (expense: Expense) => {
    try {
      const saved = await api.expenses.add(expense);
      setExpenses(prev => [saved, ...prev]);
    } catch (e: any) {
      console.error('Failed to save expense', e);
      alert(`Failed to save expense: ${e.message}`);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.expenses.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      console.error('Failed to delete expense', e);
      alert(`Failed to delete expense: ${e.message}`);
    }
  };

  const handleBulkAddExpenses = async (newExpenses: Expense[]) => {
    setExpenses(prev => [...newExpenses, ...prev]);
    for (const expense of newExpenses) {
      await api.expenses.add(expense).catch(console.error);
    }
  };

  const handleBulkDeleteExpenses = async (ids: string[]) => {
    setExpenses(prev => prev.filter(e => !ids.includes(e.id)));
    for (const id of ids) {
      await api.expenses.delete(id).catch(console.error);
    }
  };
  
  // Client/Builder handlers
  const handleAddClient = async (client: Client) => {
    try {
      const saved = await api.clients.add(client);
      setClients(prev => [saved, ...prev]);
      setActiveBuilderId(saved.id); // Switch to edit mode after creation
    } catch (e: any) {
      console.error('Failed to save builder', e);
      alert(`Failed to save builder: ${e.message}`);
    }
  };

  const handleUpdateClient = async (client: Client) => {
    try {
      const updated = await api.clients.update(client);
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (e: any) {
      console.error('Failed to update builder', e);
      alert(`Failed to update builder: ${e.message}`);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await api.clients.delete(id);
      setClients(prev => prev.filter(c => c.id !== id));
      setActiveBuilderId(null);
    } catch (e: any) {
      console.error('Failed to delete builder', e);
      alert(`Failed to delete builder: ${e.message}`);
    }
  };
  
  // Backup handler
  const handleFullBackup = () => {
    const data = {
      invoices,
      expenses,
      clients,
      timestamp: new Date().toISOString()
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cbsbooks-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveInvoice = async (invoiceData: Partial<Invoice>, action?: 'draft' | 'sent' | 'send') => {
    try {
      const itemsToSave = invoiceData.items || [];
      const total = itemsToSave.reduce((acc, item) => acc + item.amount, 0);
      
      // Map InvoiceFormPanel fields (builderId/builderName/builderEmail) to Invoice type (clientName/clientEmail)
      const builderName = (invoiceData as any).builderName || invoiceData.clientName || '';
      const builderEmail = (invoiceData as any).builderEmail || invoiceData.clientEmail || '';
      
      // If we have a builderId, look up the client to get email if not provided
      const builderId = (invoiceData as any).builderId;
      const client = builderId ? clients.find(c => c.id === builderId) : 
                      clients.find(c => c.companyName === builderName);
      const email = builderEmail || client?.email || '';

      const invoiceToSave: Invoice = {
        id: invoiceData.id || crypto.randomUUID(),
        invoiceNumber: invoiceData.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        clientName: builderName,
        clientEmail: email,
        projectDetails: invoiceData.projectDetails || '',
        paymentLink: invoiceData.paymentLink,
        checkNumber: invoiceData.checkNumber,
        date: invoiceData.date || new Date().toISOString().split('T')[0],
        dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
        datePaid: invoiceData.datePaid,
        items: itemsToSave,
        total: total,
        status: invoiceData.status || 'draft'
      };

      if (invoiceData.id) {
        // Update existing
        const updated = await api.invoices.update(invoiceToSave);
        setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
        setSelectedInvoice(updated); // Keep it selected
      } else {
        // Create new
        const saved = await api.invoices.add(invoiceToSave);
        setInvoices(prev => [saved, ...prev]);
        setSelectedInvoice(saved);
        setIsCreatingNew(false);
      }
      
      // If action is 'send', generate PDF and send email
      if (action === 'send') {
        console.log('📧 Generating PDF and sending email to:', email);
        
        if (!email) {
          alert('Cannot send email: Builder email is missing');
          return;
        }
        
        try {
          // Generate PDF
          const doc = createInvoicePDF(invoiceToSave);
          const pdfData = doc.output('datauristring'); // Returns base64 with data URI prefix
          
          // Send email with PDF attachment
          await api.invoices.sendEmail(
            email,
            `Invoice ${invoiceToSave.invoiceNumber} from Cascade Builder Services`,
            `Please find attached invoice ${invoiceToSave.invoiceNumber} for ${builderName}.\n\nTotal: $${invoiceToSave.total.toFixed(2)}\nDue Date: ${invoiceToSave.dueDate}`,
            `<p>Please find attached invoice ${invoiceToSave.invoiceNumber} for <strong>${builderName}</strong>.</p>
             <p><strong>Total:</strong> $${invoiceToSave.total.toFixed(2)}<br>
             <strong>Due Date:</strong> ${invoiceToSave.dueDate}</p>
             <p>Thank you for your business!</p>`,
            {
              filename: `${invoiceToSave.invoiceNumber}.pdf`,
              data: pdfData
            }
          );
          
          console.log('✅ Invoice email sent successfully to:', email);
          alert(`Invoice sent successfully to ${email}`);
        } catch (emailError: any) {
          console.error('❌ Failed to send invoice email:', emailError);
          alert(`Invoice saved but email failed: ${emailError.message || 'Unknown error'}. Please try sending it manually.`);
        }
      }
    } catch (e: any) {
      console.error('Failed to save invoice', e);
      alert(`Failed to save invoice: ${e.message || 'Unknown error'}`);
      throw e; // Re-throw so InvoiceFormPanel can handle the error
    }
  };

  const handleCancelEdit = () => {
    setSelectedInvoice(null);
    setIsCreatingNew(false);
  };

  const handleMarkPaid = async (invoice: Invoice, checkNum: string) => {
    try {
      const updated = await api.invoices.update({ 
        ...invoice, 
        status: 'paid' as const, 
        datePaid: invoice.datePaid || new Date().toISOString().split('T')[0], 
        checkNumber: checkNum 
      });
      setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
      if (selectedInvoice?.id === updated.id) {
        setSelectedInvoice(updated);
      }
    } catch (e: any) {
      console.error('Failed to mark as paid', e);
      alert(`Failed to mark as paid: ${e.message}`);
    }
  };

  const handleCheckNumberUpdate = async (invoice: Invoice, checkNum: string) => {
    try {
      const updated = await api.invoices.update({ ...invoice, checkNumber: checkNum });
      setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
      if (selectedInvoice?.id === updated.id) {
        setSelectedInvoice(updated);
      }
    } catch (e: any) {
      console.error('Failed to update check number', e);
    }
  };

  const handleEmail = async (invoice: Invoice) => {
    // TODO: Implement email functionality (can reuse from CBSBooksPage)
    alert('Email functionality - to be implemented');
  };

  const handleDownload = (invoice: Invoice) => {
    try {
      const doc = createInvoicePDF(invoice);
      doc.save(`${invoice.invoiceNumber}.pdf`);
    } catch (e) {
      console.error("PDF Download Error", e);
      alert("Failed to generate PDF. Check invoice data.");
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      await api.invoices.delete(invoiceId);
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(null);
        setIsCreatingNew(false);
      }
    } catch (e: any) {
      console.error('Failed to delete invoice', e);
      alert(`Failed to delete invoice: ${e.message}`);
    }
  };

  // ==================== PDF GENERATION ====================
  const createInvoicePDF = (invoice: Invoice) => {
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

  // ==================== RENDER ====================
  
  // Format date for display (MM/DD/YYYY)
  const formatDate = (dateString: string) => {
    if (!dateString) return '--';
    try {
      const [y, m, d] = dateString.split('-');
      return `${m}/${d}/${y}`;
    } catch (e) {
      return dateString;
    }
  };

  // Format amount for display
  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(0)}`;
  };

  // Don't render if not open
  if (!isOpen) return null;

  // Render via Portal to ensure it's at the top level of the DOM
  return (
    <>
      {/* ==================== CLOSE BUTTON (SEPARATE PORTAL) ==================== */}
      {createPortal(
        <button
          onClick={onClose}
          className="fixed rounded-full bg-white hover:bg-gray-100 shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900 w-10 h-10 flex items-center justify-center"
          style={{
            top: '24px',
            right: '24px',
            zIndex: 100000,
          }}
          title="Close"
          aria-label="Close invoices manager"
        >
          <X className="h-5 w-5" />
        </button>,
        document.body
      )}

      {/* ==================== MAIN OVERLAY PORTAL ==================== */}
      {createPortal(
        <div 
          className="fixed inset-0 z-overlay"
          style={{
            zIndex: 99999,
            backgroundColor: '#111827',
            margin: 0,
            padding: 0,
          }}
        >
          {/* ==================== SPLIT CONTAINER (Responsive) ==================== */}
          <div className="absolute inset-0 flex flex-col md:flex-row">
        
        {/* ==================== LEFT PANEL (THE LIST) ==================== */}
        {/* Mobile: Full width when no selection, hidden when editing */}
        {/* Desktop: Always visible at 50% width */}
        <div className={`absolute md:relative left-0 top-0 bottom-0 flex flex-col border-r border-gray-200 bg-white overflow-hidden w-full md:w-1/2 ${
          (selectedInvoice || isCreatingNew) ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* HEADER */}
          <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200">
            {/* TAB NAVIGATION */}
            <div className="flex items-center gap-2 mb-4">
              {(['INVOICES', 'BUILDERS', 'EXPENSES', 'REPORTS'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            
            {activeTab === 'INVOICES' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                  <Button
                    onClick={handleCreateNew}
                    variant="filled"
                    size="md"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Create New
                  </Button>
                </div>
                
                {/* SEARCH BAR */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by invoice #, client name, or project address..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                
                {/* STATUS FILTER TABS */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {(['draft', 'sent'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          statusFilter === status
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                        <span className="ml-1.5 text-xs opacity-70">
                          ({invoices.filter(i => i.status === status).length})
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {/* TOTAL BADGE */}
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-1.5">
                    <span className="text-xs text-green-600 font-medium">Total: </span>
                    <span className="text-sm font-bold text-green-800">
                      ${visibleTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'BUILDERS' && (
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Builders</h1>
                <Button
                  onClick={handleCreateNew}
                  variant="filled"
                  size="md"
                  icon={<Plus className="h-4 w-4" />}
                >
                  New Builder
                </Button>
              </div>
            )}
            
            {activeTab === 'EXPENSES' && (
              <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            )}
            
            {activeTab === 'REPORTS' && (
              <h1 className="text-2xl font-bold text-gray-900">Reports (P&L)</h1>
            )}
          </div>

          {/* BODY - SCROLLABLE GRID */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading data...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load</h3>
                      <p className="text-sm text-red-800">{error}</p>
                      <Button
                        onClick={loadData}
                        variant="danger"
                        size="sm"
                        className="mt-4"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* INVOICES TAB - Invoice Cards Grid */}
                {activeTab === 'INVOICES' && (
                  filteredInvoices.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400 text-sm">No invoices found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
                      {filteredInvoices.map(invoice => {
                        // Map status for display
                        const displayStatus: "Draft" | "Sent" | "Overdue" | "Paid" = 
                          invoice.status === 'draft' ? 'Draft' :
                          invoice.status === 'paid' ? 'Paid' : 'Sent';
                        
                        return (
                          <InvoiceCard
                            key={invoice.id}
                            invoiceNumber={invoice.invoiceNumber}
                            status={displayStatus}
                            amount={formatAmount(invoice.total)}
                            createdDate={formatDate(invoice.date)}
                            dueDate={formatDate(invoice.dueDate)}
                            builder={invoice.clientName}
                            address={invoice.projectDetails}
                            checkNumber={invoice.checkNumber}
                            isSelected={selectedInvoice?.id === invoice.id}
                            onClick={() => handleInvoiceClick(invoice)}
                            onMarkPaid={(checkNum) => handleMarkPaid(invoice, checkNum)}
                            onCheckNumberUpdate={(checkNum) => handleCheckNumberUpdate(invoice, checkNum)}
                            onEmail={() => handleEmail(invoice)}
                            onDownload={() => handleDownload(invoice)}
                            onDelete={() => handleDelete(invoice.id)}
                          />
                        );
                      })}
                    </div>
                  )
                )}
                
                {/* BUILDERS TAB - Builders List */}
                {activeTab === 'BUILDERS' && (
                  clients.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400 text-sm">No builders found</p>
                    </div>
                  ) : (
                    <div className="p-6 space-y-3">
                      {clients.map(builder => (
                        <button
                          key={builder.id}
                          onClick={() => handleBuilderSelect(builder)}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            activeBuilderId === builder.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Building2 className={`h-5 w-5 mt-0.5 ${
                              activeBuilderId === builder.id ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{builder.companyName}</h3>
                              {builder.email && (
                                <p className="text-sm text-gray-500 mt-0.5">{builder.email}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}
                
                {/* EXPENSES TAB - Full-width component */}
                {activeTab === 'EXPENSES' && (
                  <div className="h-full bg-white p-6">
                    <Expenses
                      expenses={expenses}
                      onAdd={handleAddExpense}
                      onDelete={handleDeleteExpense}
                      onBulkAdd={handleBulkAddExpenses}
                      onBulkDelete={handleBulkDeleteExpenses}
                      onNavigate={handleNavigate}
                      onBackup={handleFullBackup}
                    />
                  </div>
                )}
                
                {/* REPORTS TAB - Full-width component */}
                {activeTab === 'REPORTS' && (
                  <div className="h-full bg-white p-6">
                    <Reports
                      invoices={invoices}
                      expenses={expenses}
                      onNavigate={handleNavigate}
                      onBackup={handleFullBackup}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ==================== RIGHT PANEL (THE EDITOR) ==================== */}
        {/* Mobile: Full width when selected/creating, hidden otherwise */}
        {/* Desktop: Always visible at 50% width */}
        <div className={`absolute md:relative right-0 top-0 bottom-0 flex flex-col bg-white overflow-hidden w-full md:w-1/2 ${
          (selectedInvoice || isCreatingNew || activeBuilderId) ? 'flex' : 'hidden md:flex'
        }`}>
          {/* INVOICES TAB - Invoice Form */}
          {activeTab === 'INVOICES' && (
            (selectedInvoice || isCreatingNew) ? (
              <InvoiceFormPanel
                editInvoice={selectedInvoice}
                builders={clients.map(c => ({ id: c.id, name: c.companyName, email: c.email }))}
                onSave={async (invoice, action) => await handleSaveInvoice(invoice, action)}
                onCancel={handleCancelEdit}
                prefillData={isCreatingNew ? prefillData : undefined}
                isVisible={true}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-sm font-medium">Select an invoice to edit</p>
                  <p className="text-xs mt-1">or click "Create New" to start</p>
                </div>
              </div>
            )
          )}
          
          {/* BUILDERS TAB - Builder Form */}
          {activeTab === 'BUILDERS' && (
            <>
              {activeBuilderId === null ? (
                // STATE 1: Empty - Show placeholder
                <div className="flex-1 flex items-center justify-center bg-gray-50/50">
                  <div className="text-center text-gray-400">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">Select a builder to view details</p>
                    <p className="text-xs mt-1">or click "New Builder" to create one</p>
                  </div>
                </div>
              ) : activeBuilderId === "new" ? (
                // STATE 2: Create Mode - Show empty form
                <div className="h-full overflow-auto bg-white flex flex-col">
                  {/* Mobile Back Button Header */}
                  <div className="md:hidden flex items-center gap-3 px-6 py-4 border-b border-gray-200">
                    <button
                      onClick={() => setActiveBuilderId(null)}
                      className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Back to list"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900 flex-1">New Builder</h2>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-6">
                    <BuilderForm
                      mode="create"
                      initialData={null}
                      clients={clients}
                      onSave={handleAddClient}
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
                    <div className="h-full overflow-auto bg-white flex flex-col">
                      {/* Mobile Back Button Header */}
                      <div className="md:hidden flex items-center gap-3 px-6 py-4 border-b border-gray-200">
                        <button
                          onClick={() => setActiveBuilderId(null)}
                          className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                          aria-label="Back to list"
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900 flex-1">Edit Builder</h2>
                      </div>
                      
                      <div className="flex-1 overflow-auto p-6">
                        <BuilderForm
                          mode="edit"
                          initialData={selectedBuilder}
                          clients={clients}
                          onSave={handleUpdateClient}
                          onDelete={handleDeleteClient}
                          onCancel={() => setActiveBuilderId(null)}
                        />
                      </div>
                    </div>
                  );
                })()
              )}
            </>
          )}
          
          {/* EXPENSES & REPORTS TABS - No right panel needed (full width on left) */}
          {(activeTab === 'EXPENSES' || activeTab === 'REPORTS') && (
            <div className="flex-1 flex items-center justify-center bg-gray-50/50">
              <div className="text-center text-gray-400">
                <p className="text-sm">Content displayed on the left panel</p>
              </div>
            </div>
          )}
        </div>
        
      </div>
        </div>,
        document.body
      )}
    </>
  );
};
