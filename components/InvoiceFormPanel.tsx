/**
 * InvoiceFormPanel Component
 * 
 * A split-view panel for creating/editing invoices (Master-Detail pattern).
 * Designed to be embedded in a page layout, not a popup modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Calendar as CalendarIcon, DollarSign, X } from 'lucide-react';
import { z } from 'zod';
import Button from './Button';
import MaterialSelect from './MaterialSelect';
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
  const [status, setStatus] = useState<'draft' | 'sent' | 'paid'>('draft');
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
        setStatus(editInvoice.status);
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
        setStatus('draft');
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
        status,
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
      await onSave(invoice);
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
      // First save the invoice with 'sent' status
      await onSave({ ...invoice, status: 'sent' });
      
      // Then send the email
      const { api } = await import('../lib/cbsbooks/services/api');
      const subject = `Invoice ${invoiceNumber} from Cascade Connect`;
      const text = `Dear ${clientName},\n\nPlease find attached your invoice ${invoiceNumber}.\n\nTotal: $${calculateTotal().toFixed(2)}\nDue Date: ${new Date(dueDate).toLocaleDateString()}\n\nThank you for your business!\n\nCascade Connect`;
      const html = `
        <h2>Invoice ${invoiceNumber}</h2>
        <p>Dear ${clientName},</p>
        <p>Please find your invoice details below:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background-color: #f5f5f5;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Quantity</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Rate</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th>
          </tr>
          ${items.map(item => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.description}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${item.rate.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${item.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr style="background-color: #f5f5f5; font-weight: bold;">
            <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total:</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${calculateTotal().toFixed(2)}</td>
          </tr>
        </table>
        <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        ${paymentLink ? `<p><a href="${paymentLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Pay Now</a></p>` : ''}
        <p>Thank you for your business!</p>
        <p>Cascade Connect</p>
      `;
      
      // Generate PDF as base64 (stub for now - can be enhanced later)
      const pdfData = btoa(`Invoice ${invoiceNumber}\n${text}`);
      
      await api.invoices.sendEmail(
        clientEmail,
        subject,
        text,
        html,
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          data: pdfData
        }
      );
      
      setIsSaving(false);
      alert('Invoice saved and emailed successfully!');
    } catch (error) {
      setIsSaving(false);
      console.error('Failed to save and email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            <h3 className="text-sm font-semibold text-surface-on-variant dark:text-gray-700 uppercase tracking-wide">
              Invoice Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoice Number */}
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="INV-001"
                />
                {errors.invoiceNumber && (
                  <p className="text-xs text-error mt-1">{errors.invoiceNumber}</p>
                )}
              </div>
              
              {/* Status */}
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                  Status
                </label>
                <MaterialSelect
                  value={status}
                  onChange={(value) => setStatus(value as 'draft' | 'sent' | 'paid')}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'sent', label: 'Sent' },
                    { value: 'paid', label: 'Paid' },
                  ]}
                />
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
                  <CalendarIcon className="h-4 w-4 text-surface-on-variant dark:text-gray-600 mr-2" />
                  <span className="text-surface-on dark:text-gray-900">
                    {date ? new Date(date).toLocaleDateString('en-US', { 
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
                    setDate(d.toISOString().split('T')[0]);
                    setShowDatePicker(false);
                  }}
                  selectedDate={date ? new Date(date) : null}
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
                  <CalendarIcon className="h-4 w-4 text-surface-on-variant dark:text-gray-600 mr-2" />
                  <span className="text-surface-on dark:text-gray-900">
                    {dueDate ? new Date(dueDate).toLocaleDateString('en-US', { 
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
                    setDueDate(d.toISOString().split('T')[0]);
                    setShowDueDatePicker(false);
                  }}
                  selectedDate={dueDate ? new Date(dueDate) : null}
                />
              </div>
              
              {/* Date Paid (Optional) */}
              {status === 'paid' && (
                <div className="relative">
                  <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                    Date Paid
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDatePaidPicker(true)}
                    className="w-full h-9 flex items-center px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white hover:bg-surface-container-highest dark:hover:bg-gray-50 transition-colors text-left"
                  >
                    <CalendarIcon className="h-4 w-4 text-surface-on-variant dark:text-gray-600 mr-2" />
                    <span className="text-surface-on dark:text-gray-900">
                      {datePaid ? new Date(datePaid).toLocaleDateString('en-US', { 
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Select date'}
                    </span>
                  </button>
                  <CalendarPicker
                    isOpen={showDatePaidPicker}
                    onClose={() => setShowDatePaidPicker(false)}
                    onSelectDate={(d) => {
                      setDatePaid(d.toISOString().split('T')[0]);
                      setShowDatePaidPicker(false);
                    }}
                    selectedDate={datePaid ? new Date(datePaid) : null}
                  />
                </div>
              )}
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
                    setBuilderQuery(e.target.value);
                    setShowBuilderDropdown(true);
                  }}
                  onFocus={() => setShowBuilderDropdown(true)}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="Type to search builders..."
                />
                
                {/* Builder Dropdown */}
                {showBuilderDropdown && filteredBuilders.length > 0 && (
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
                          handleBuilderSelect(builder);
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
                placeholder="123 Main St, City, State"
              />
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
                        className="w-full h-10 px-3 rounded-md border border-surface-outline dark:border-gray-300 bg-white dark:bg-white text-sm text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-md border border-surface-outline dark:border-gray-300 bg-white dark:bg-white text-sm text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
          
          {/* Payment Info (Optional) */}
          {status === 'paid' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-surface-on-variant dark:text-gray-700 uppercase tracking-wide">
                Payment Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                    Check Number
                  </label>
                  <input
                    type="text"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Check #123456"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                    Payment Link
                  </label>
                  <input
                    type="url"
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-surface-outline dark:border-gray-300 bg-surface-container dark:bg-white text-surface-on dark:text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="https://payment.link"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== FOOTER (Sticky) - 3 Action Buttons ==================== */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-outline-variant dark:border-gray-700 bg-surface dark:bg-gray-800 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          
          <div className="flex items-center gap-3">
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
              {isSaving ? 'Sending...' : 'Save & Email'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InvoiceFormPanel;
