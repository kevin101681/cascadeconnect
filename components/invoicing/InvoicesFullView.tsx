/**
 * Full-Screen Invoices Manager - Master-Detail Overlay
 * 
 * A professional full-screen interface for managing invoices.
 * LEFT: Wide grid of invoice cards (2-3 columns)
 * RIGHT: Dedicated editor panel (always visible when creating/editing)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { InvoiceCard } from '../ui/InvoiceCard';
import { NativeInvoiceForm } from './NativeInvoiceForm';
import type { Invoice, Client, Expense } from '../../lib/cbsbooks/types';
import { api } from '../../lib/cbsbooks/services/api';
import { useAuth } from '@clerk/clerk-react';
import jsPDF from 'jspdf';

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
  
  // ==================== DATA STATE ====================
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // ==================== UI STATE ====================
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('sent');
  
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
        const [cachedInvoices, cachedClients] = await Promise.all([
          api.invoices.list(false), // Use cache
          api.clients.list(false) // Use cache
        ]);
        
        // Show cached data immediately if available
        if (cachedInvoices.length > 0 || cachedClients.length > 0) {
          console.log(`✅ Loaded from cache`);
          setInvoices(cachedInvoices);
          setClients(cachedClients);
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
      const [freshInvoices, freshClients] = await Promise.all([
        api.invoices.list(true), // Force refresh
        api.clients.list(true) // Force refresh
      ]);
      
      setInvoices(freshInvoices);
      setClients(freshClients);
      setIsLoading(false);
    } catch (err: any) {
      throw new Error(err.message || "Failed to refresh data");
    }
  };

  // ==================== FILTERED DATA ====================
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices;
    return invoices.filter(inv => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  // ==================== HANDLERS ====================
  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsCreatingNew(false);
  };

  const handleCreateNew = () => {
    setSelectedInvoice(null);
    setIsCreatingNew(true);
  };

  const handleSaveInvoice = async (invoiceData: Partial<Invoice>) => {
    try {
      const itemsToSave = invoiceData.items || [];
      const total = itemsToSave.reduce((acc, item) => acc + item.amount, 0);
      
      const client = clients.find(c => c.companyName === invoiceData.clientName);
      const email = invoiceData.clientEmail || client?.email || '';

      const invoiceToSave: Invoice = {
        id: invoiceData.id || crypto.randomUUID(),
        invoiceNumber: invoiceData.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        clientName: invoiceData.clientName || '',
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
      
      return true; // Success
    } catch (e: any) {
      console.error('Failed to save invoice', e);
      alert(`Failed to save invoice: ${e.message || 'Unknown error'}`);
      return false; // Failure
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

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex">
      {/* ==================== CLOSE BUTTON ==================== */}
      <button
        onClick={onClose}
        className="absolute right-6 top-6 z-10 p-2 rounded-full bg-white hover:bg-gray-100 shadow-md border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Close"
        aria-label="Close invoices manager"
      >
        <X className="h-5 w-5" />
      </button>

      {/* ==================== SPLIT CONTAINER ==================== */}
      <div className="flex h-full w-full">
        
        {/* ==================== LEFT PANEL (THE LIST) ==================== */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white">
          
          {/* HEADER */}
          <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create New
              </button>
            </div>
            
            {/* STATUS FILTER TABS */}
            <div className="flex gap-2 mt-4">
              {(['all', 'draft', 'sent', 'paid'] as const).map(status => (
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
                    ({status === 'all' ? invoices.length : invoices.filter(i => i.status === status).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* BODY - SCROLLABLE GRID */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading invoices...</p>
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
                      <button
                        onClick={loadData}
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-sm">No invoices found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 p-6">
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
            )}
          </div>
        </div>

        {/* ==================== RIGHT PANEL (THE EDITOR) ==================== */}
        <div className="flex-1 flex flex-col bg-white">
          {(selectedInvoice || isCreatingNew) ? (
            <NativeInvoiceForm
              invoice={selectedInvoice}
              clients={clients}
              onSave={handleSaveInvoice}
              onCancel={handleCancelEdit}
              prefillData={isCreatingNew ? prefillData : undefined}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-sm font-medium">Select an invoice to edit</p>
                <p className="text-xs mt-1">or click "Create New" to start</p>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};
