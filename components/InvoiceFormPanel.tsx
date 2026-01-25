/**
 * InvoiceFormPanel Component
 * 
 * A split-view panel for creating/editing invoices (Master-Detail pattern).
 * Designed to be embedded in a page layout, not a popup modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Calendar as CalendarIcon, DollarSign, X } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@clerk/clerk-react';
import Button from './Button';
import CalendarPicker from './CalendarPicker';

// ==================== TYPES & SCHEMA ====================

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  projectDetails?: string;
  paymentLink?: string;
  checkNumber?: string;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  datePaid?: string; // YYYY-MM-DD
  total: number;
  status: 'draft' | 'sent' | 'paid';
  items: InvoiceItem[];
}

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  clientName: z.string().min(1, 'Builder name is required'),
  clientEmail: z.string().email('Valid email is required').or(z.literal('')),
  projectDetails: z.string().optional(),
  date: z.string(),
  dueDate: z.string(),
  items: z.array(z.object({
    id: z.string(),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    rate: z.number().min(0, 'Rate must be non-negative'),
    amount: z.number(),
  })).min(1, 'At least one line item is required'),
});

// ==================== COMPONENT ====================

interface InvoiceFormPanelProps {
  onSave: (invoice: Partial<Invoice>) => void;
  onCancel: () => void;
  builders?: Array<{ id: string; name: string; email?: string }>;
  prefillData?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
  editInvoice?: Invoice | null;
  isVisible: boolean; // Whether the panel should be shown
}

const InvoiceFormPanel: React.FC<InvoiceFormPanelProps> = ({
  onSave,
  onCancel,
  builders = [],
  prefillData,
  editInvoice,
  isVisible,
}) => {
  // ==================== AUTH ====================
  const { getToken } = useAuth();
  
  // ==================== STATE ====================
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [datePaid, setDatePaid] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  // Status removed - now managed automatically by backend
  // draft: when created, sent: when sent/emailed, paid: when payment received or manually marked
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  // Builder search/autocomplete
  const [builderQuery, setBuilderQuery] = useState('');
  const [showBuilderDropdown, setShowBuilderDropdown] = useState(false);
  
  // Date pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showDatePaidPicker, setShowDatePaidPicker] = useState(false);
  
  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPaymentLink, setIsGeneratingPaymentLink] = useState(false);

  // ==================== HELPERS ====================
  
  const getLocalTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const calculateTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }, [items]);
  
  // ==================== EFFECTS ====================
  
  // Initialize form when panel becomes visible or editInvoice changes
  useEffect(() => {
    if (isVisible) {
      if (editInvoice) {
        // Edit mode
        setInvoiceNumber(editInvoice.invoiceNumber);
        setClientName(editInvoice.clientName);
        setClientEmail(editInvoice.clientEmail || '');
        setProjectDetails(editInvoice.projectDetails || '');
        setDate(editInvoice.date);
        setDueDate(editInvoice.dueDate);
        setDatePaid(editInvoice.datePaid || '');
        setCheckNumber(editInvoice.checkNumber || '');
        setPaymentLink(editInvoice.paymentLink || '');
        // Status removed - managed by backend
        setItems(editInvoice.items || []);
        setBuilderQuery(editInvoice.clientName);
      } else {
        // Create mode
        const today = getLocalTodayDate();
        const dueInThirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
        setClientName(prefillData?.clientName || '');
        setClientEmail(prefillData?.clientEmail || '');
        setProjectDetails(prefillData?.projectDetails || '');
        setDate(today);
        setDueDate(dueInThirtyDays);
        setDatePaid('');
        setCheckNumber('');
        setPaymentLink('');
        // Status removed - will be 'draft' by default in backend
        setItems([
          {
            id: crypto.randomUUID(),
            description: 'Walk through and warranty management services',
            quantity: 1,
            rate: 0,
            amount: 0,
          },
        ]);
        setBuilderQuery(prefillData?.clientName || '');
      }
      setErrors({});
    }
  }, [isVisible, editInvoice, prefillData]);
  
  // Update clientName when builder query changes (for autocomplete)
  useEffect(() => {
    if (!showBuilderDropdown) {
      setClientName(builderQuery);
    }
  }, [builderQuery, showBuilderDropdown]);
  
  // Close builder dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the dropdown
      if (target.closest('[data-builder-dropdown]')) {
        return;
      }
      setShowBuilderDropdown(false);
    };
    
    if (showBuilderDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBuilderDropdown]);
  
  // ==================== HANDLERS ====================
  
  const handleBuilderSelect = (builder: { name: string; email?: string }) => {
    setBuilderQuery(builder.name);
    setClientName(builder.name);
    if (builder.email) setClientEmail(builder.email);
    setShowBuilderDropdown(false);
  };
  
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };
  
  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };
  
  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-calculate amount when quantity or rate changes
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate;
        }
        
        return updated;
      }
      return item;
    }));
  };
  
  const validateAndGetInvoice = (): Partial<Invoice> | null => {
    setErrors({});
    
    try {
      // Validate
      invoiceSchema.parse({
        invoiceNumber,
        clientName,
        clientEmail,
        projectDetails,
        date,
        dueDate,
        items,
      });
      
      const invoice: Partial<Invoice> = {
        ...(editInvoice?.id ? { id: editInvoice.id } : {}),
        invoiceNumber,
        clientName,
        clientEmail,
        projectDetails,
        paymentLink,
        checkNumber,
        date,
        dueDate,
        datePaid: datePaid || undefined,
        total: calculateTotal(),
        // Status removed - backend will set to 'draft' by default
        items,
      };
      
      return invoice;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
      }
      return null;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invoice = validateAndGetInvoice();
    if (!invoice) return;
    
    setIsSaving(true);
    try {
      // Save as Draft (status will be 'draft')
      await onSave({ ...invoice, status: 'draft' });
      setIsSaving(false);
    } catch (error) {
      setIsSaving(false);
      console.error('Failed to save invoice:', error);
    }
  };
  
  const handleSaveAndMarkSent = async () => {
    const invoice = validateAndGetInvoice();
    if (!invoice) return;
    
    setIsSaving(true);
    try {
      await onSave({ ...invoice, status: 'sent' });
      setIsSaving(false);
    } catch (error) {
      setIsSaving(false);
      console.error('Failed to save and mark sent:', error);
    }
  };
  
  const handleSaveAndEmail = async () => {
    const invoice = validateAndGetInvoice();
    if (!invoice) return;
    
    if (!clientEmail) {
      setErrors({ clientEmail: 'Email is required to send invoice' });
      return;
    }
    
    setIsSaving(true);
    try {
      // Get Clerk authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }
      
      // Save the invoice first (this will trigger onSave which should return the saved invoice)
      await onSave({ ...invoice, status: 'sent' });
      
      // Construct the full invoice object for PDF generation
      const fullInvoice = {
        id: invoice.id || crypto.randomUUID(),
        invoiceNumber,
        clientName,
        clientEmail,
        projectDetails,
        paymentLink,
        checkNumber,
        date,
        dueDate,
        datePaid: datePaid || undefined,
        total: calculateTotal(),
        status: 'sent' as const,
        items
      };
      
      // Dynamically import jsPDF
      const jsPDF = (await import('jspdf')).default;
      
      // Generate PDF using the same logic as Invoices.tsx
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
      doc.text(`#${invoiceNumber}`, 14, 26);
      
      // Dates
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.text(`Date: ${formatDate(date)}`, 140, 20, { align: 'right' } as any);
      doc.text(`Due Date: ${formatDate(dueDate)}`, 140, 26, { align: 'right' } as any);
      
      // Bill To section
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("Bill To:", 14, 40);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(clientName || '', 14, 46);
      if (clientEmail) doc.text(clientEmail, 14, 51);
      
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
      if (projectDetails) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0);
        doc.text("Project Address: ", 18, y);
        doc.setFont(undefined, 'normal');
        const labelW = 28;
        doc.text(projectDetails, 18 + labelW, y);
        y += 8;
      }
      
      // Items
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
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
      doc.text(`TOTAL  $${calculateTotal().toFixed(0)}`, 165, y + 6, { align: 'center', baseline: 'middle' } as any);
      
      // Payment Button (if link exists)
      if (paymentLink) {
        y += 22;
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.roundedRect(155, y, 40, 10, 5, 5, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.text("PAY ONLINE", 175, y + 6, { align: 'center', baseline: 'middle' } as any);
        
        doc.link(155, y, 40, 10, { url: paymentLink });
      }
      
      // Get PDF as base64 string
      const pdfDataUri = doc.output('datauristring');
      
      // Strip the data URI prefix to get pure base64
      // datauristring format: "data:application/pdf;base64,<base64content>"
      const pureBase64 = pdfDataUri.split(',')[1] || pdfDataUri;
      
      // Prepare email content
      const subject = `Invoice #${invoiceNumber} from Cascade Builder Services`;
      const text = `Dear ${clientName},\n\nPlease find attached invoice #${invoiceNumber}.\n\nTotal: $${calculateTotal().toFixed(2)}\nDue Date: ${new Date(dueDate).toLocaleDateString()}\n\nThank you for your business!\n\nCascade Builder Services`;
      
      // HTML email with payment button
      const paymentButtonHtml = paymentLink 
        ? `
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
          <tr>
            <td>
              <table cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 50px; background-color: #4f7882;">
                    <a href="${paymentLink}" target="_blank" style="padding: 12px 24px; border: 1px solid #4f7882; border-radius: 50px; font-family: sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block;">
                      Pay Invoice Online
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>` 
        : '';
      
      const html = `
        <div style="font-family: sans-serif; color: #191c1d; line-height: 1.5;">
          <p style="white-space: pre-wrap;">${text}</p>
          ${paymentButtonHtml}
        </div>
      `;
      
      // Send email via API with authentication (via cookies)
      const response = await fetch('/api/cbsbooks/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies for Clerk authentication
        body: JSON.stringify({
          to: clientEmail,
          subject,
          text,
          html,
          attachment: {
            filename: `Invoice_${invoiceNumber}.pdf`,
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
      
      setIsSaving(false);
      alert('Invoice saved and emailed successfully!');
    } catch (error) {
      setIsSaving(false);
      console.error('Failed to save and email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleGeneratePaymentLink = async () => {
    setIsGeneratingPaymentLink(true);
    try {
      const response = await fetch('/.netlify/functions/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: invoiceNumber,
          amount: calculateTotal(),
          name: `Invoice #${invoiceNumber}`,
          description: `Payment for ${clientName} - ${projectDetails || 'Services'}`
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create payment link: ${response.status}`);
      }
      
      const { url } = await response.json();
      setPaymentLink(url);
      alert('Square payment link generated successfully!');
    } catch (e: any) {
      console.error("Failed to generate payment link", e);
      alert("Failed to generate payment link: " + e.message);
    } finally {
      setIsGeneratingPaymentLink(false);
    }
  };
  
  // ==================== FILTERED BUILDERS ====================
  
  const filteredBuilders = builders.filter(b =>
    b.name.toLowerCase().includes(builderQuery.toLowerCase())
  );
  
  // ==================== RENDER ====================
  
  if (!isVisible) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50/50 dark:bg-gray-900/50">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm font-medium">Select an invoice to view details</p>
          <p className="text-xs mt-1">or click "New Invoice" to create one</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full bg-surface dark:bg-gray-800">
      {/* ==================== BODY (Scrollable) - No Header ==================== */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div 
          className="flex-1 overflow-y-auto px-6 pt-4 pb-6 space-y-6"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
        >
          
          {/* Invoice Details Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-on-variant dark:text-gray-700 uppercase tracking-wide">
                Invoice Details
              </h3>
              {/* Invoice Number Badge (Read-Only Display) */}
              <div className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                <span className="text-xs font-semibold text-primary">{invoiceNumber}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Invoice Date */}
              <div className="relative">
                <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                  Invoice Date *
                </label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full h-9 flex items-center px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white hover:bg-surface-container-highest dark:hover:bg-gray-50 transition-colors text-left"
                >
                  <CalendarIcon className="h-4 w-4 text-surface-on-variant dark:text-gray-600 mr-2 shrink-0" />
                  <span className="text-surface-on dark:text-gray-900 whitespace-nowrap">
                    {date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { 
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Select date'}
                  </span>
                </button>
                <CalendarPicker
                  isOpen={showDatePicker}
                  onClose={() => setShowDatePicker(false)}
                  onSelectDate={(d) => {
                    // Force time to noon to avoid timezone issues
                    d.setHours(12, 0, 0, 0);
                    setDate(d.toISOString().split('T')[0]);
                    setShowDatePicker(false);
                  }}
                  selectedDate={date ? new Date(date + 'T12:00:00') : null}
                />
              </div>
              
              {/* Due Date */}
              <div className="relative">
                <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                  Due Date *
                </label>
                <button
                  type="button"
                  onClick={() => setShowDueDatePicker(true)}
                  className="w-full h-9 flex items-center px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white hover:bg-surface-container-highest dark:hover:bg-gray-50 transition-colors text-left"
                >
                  <CalendarIcon className="h-4 w-4 text-surface-on-variant dark:text-gray-600 mr-2 shrink-0" />
                  <span className="text-surface-on dark:text-gray-900 whitespace-nowrap">
                    {dueDate ? new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', { 
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Select date'}
                  </span>
                </button>
                <CalendarPicker
                  isOpen={showDueDatePicker}
                  onClose={() => setShowDueDatePicker(false)}
                  onSelectDate={(d) => {
                    // Force time to noon to avoid timezone issues
                    d.setHours(12, 0, 0, 0);
                    setDueDate(d.toISOString().split('T')[0]);
                    setShowDueDatePicker(false);
                  }}
                  selectedDate={dueDate ? new Date(dueDate + 'T12:00:00') : null}
                />
              </div>
            </div>
          </div>
          
          {/* Builder/Client Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-surface-on-variant dark:text-gray-700 uppercase tracking-wide">
              Builder/Client Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Builder Name (with autocomplete) */}
              <div className="relative">
                <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                  Builder Name *
                </label>
                <input
                  type="text"
                  value={builderQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    setBuilderQuery(query);
                    // Only show dropdown when user is typing (not on focus, only when input has content)
                    setShowBuilderDropdown(query.length > 0);
                  }}
                  onFocus={() => {
                    // Only open if there's already text in the input
                    if (builderQuery.length > 0) {
                      setShowBuilderDropdown(true);
                    }
                  }}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="Type to search builders..."
                />
                
                {/* Builder Dropdown */}
                {showBuilderDropdown && builderQuery.length > 0 && filteredBuilders.length > 0 && (
                  <div 
                    data-builder-dropdown
                    className="absolute z-50 w-full mt-2 bg-white dark:bg-white rounded-lg shadow-elevation-3 border border-surface-outline-variant dark:border-gray-300 max-h-40 overflow-y-auto"
                  >
                    {filteredBuilders.map(builder => (
                      <button
                        key={builder.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input blur
                          console.log('🔹 Selected Builder:', builder.name, builder.email);
                          // Set both the query (display) and the actual client name
                          setBuilderQuery(builder.name);
                          setClientName(builder.name);
                          if (builder.email) {
                            setClientEmail(builder.email);
                          }
                          // Close dropdown immediately after selection
                          setShowBuilderDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-surface-container dark:hover:bg-gray-50 transition-colors border-b border-surface-outline-variant dark:border-gray-200 last:border-0"
                      >
                        <div className="font-medium text-sm text-surface-on dark:text-gray-900">
                          {builder.name}
                        </div>
                        {builder.email && (
                          <div className="text-xs text-surface-on-variant dark:text-gray-600 mt-0.5">
                            {builder.email}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {errors.clientName && (
                  <p className="text-xs text-error mt-1">{errors.clientName}</p>
                )}
              </div>
              
              {/* Client Email */}
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="builder@example.com"
                />
                {errors.clientEmail && (
                  <p className="text-xs text-error mt-1">{errors.clientEmail}</p>
                )}
              </div>
            </div>
            
            {/* Project Details */}
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                Project Details / Address
              </label>
              <input
                type="text"
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="Enter street address, city, state"
              />
            </div>
            
            {/* Payment Link Section */}
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                Square Payment Link (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  className="flex-1 h-9 px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="https://square.link/..."
                  readOnly={isGeneratingPaymentLink}
                />
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleGeneratePaymentLink}
                  disabled={isGeneratingPaymentLink || !clientName || calculateTotal() === 0}
                  className="text-xs whitespace-nowrap"
                >
                  {isGeneratingPaymentLink ? 'Generating...' : 'Generate Link'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Generate a Square payment link to accept online payments
              </p>
            </div>
          </div>
          
          {/* Line Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-on-variant dark:text-gray-700 uppercase tracking-wide">
                Line Items
              </h3>
              <Button
                type="button"
                variant="ghost"
                onClick={handleAddItem}
                icon={<Plus className="h-4 w-4" />}
                className="text-xs"
              >
                Add Item
              </Button>
            </div>
            
            {/* Line Items List */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="bg-surface-container/30 dark:bg-gray-100/50 p-4 rounded-lg border border-surface-outline-variant dark:border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Description */}
                    <div className="md:col-span-6">
                      <label className="text-xs text-surface-on-variant dark:text-gray-600 mb-1 block">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-surface-outline dark:border-gray-300 bg-white dark:bg-white text-sm text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Service description"
                      />
                    </div>
                    
                    {/* Quantity */}
                    <div className="md:col-span-2">
                      <label className="text-xs text-surface-on-variant dark:text-gray-600 mb-1 block">
                        Qty *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-md border border-surface-outline dark:border-gray-300 bg-white dark:bg-white text-sm text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    
                    {/* Rate */}
                    <div className="md:col-span-2">
                      <label className="text-xs text-surface-on-variant dark:text-gray-600 mb-1 block">
                        Rate ($) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate === 0 ? '' : item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full h-10 px-3 rounded-md border border-surface-outline dark:border-gray-300 bg-white dark:bg-white text-sm text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    
                    {/* Amount (Read-only) */}
                    <div className="md:col-span-2 flex items-end gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="text-xs text-surface-on-variant dark:text-gray-600 mb-1 block">
                          Amount
                        </label>
                        <div className="w-full h-10 px-2 rounded-md border border-surface-outline-variant dark:border-gray-200 bg-surface-container/50 dark:bg-gray-50 text-sm text-surface-on dark:text-gray-900 flex items-center font-medium overflow-hidden">
                          <span className="truncate">${item.amount.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-10 w-10 flex items-center justify-center rounded-md text-error hover:bg-error/10 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {errors.items && (
              <p className="text-xs text-error">{errors.items}</p>
            )}
          </div>
          
          {/* Total (IN BODY, NOT FOOTER) */}
          <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <DollarSign className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-surface-on dark:text-gray-900 whitespace-nowrap">
                  Total Amount
                </span>
              </div>
              <span className="text-xl md:text-2xl font-bold text-primary shrink-0">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ==================== FOOTER (Sticky) - 4 Action Buttons ==================== */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-outline-variant dark:border-gray-700 bg-surface dark:bg-gray-800 flex-shrink-0">
          <Button
            type="button"
            variant="text"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="outlined"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={handleSaveAndMarkSent}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save & Mark Sent'}
            </Button>
            <Button
              type="button"
              variant="filled"
              onClick={handleSaveAndEmail}
              disabled={isSaving}
            >
              {isSaving ? 'Sending...' : 'Save & Send'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InvoiceFormPanel;
