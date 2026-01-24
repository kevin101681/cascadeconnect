/**
 * InvoiceModalNew Component
 * 
 * A clean, modern invoice creation/editing modal that follows our design system.
 * Structured to match WarrantyClaimsModal with proper header/body/footer separation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
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

interface InvoiceModalNewProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Partial<Invoice>) => void;
  builders?: Array<{ id: string; name: string; email?: string }>;
  prefillData?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
  editInvoice?: Invoice | null;
}

const InvoiceModalNew: React.FC<InvoiceModalNewProps> = ({
  isOpen,
  onClose,
  onSave,
  builders = [],
  prefillData,
  editInvoice,
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
  
  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, editInvoice, prefillData]);
  
  // Update clientName when builder query changes (for autocomplete)
  useEffect(() => {
    if (!showBuilderDropdown) {
      setClientName(builderQuery);
    }
  }, [builderQuery, showBuilderDropdown]);
  
  // Close builder dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      
      setIsSaving(true);
      
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
      
      await onSave(invoice);
      setIsSaving(false);
      onClose();
    } catch (error) {
      setIsSaving(false);
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
      }
    }
  };
  
  // ==================== FILTERED BUILDERS ====================
  
  const filteredBuilders = builders.filter(b =>
    b.name.toLowerCase().includes(builderQuery.toLowerCase())
  );
  
  // ==================== RENDER ====================
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none z-[101]"
      >
        <div 
          className="bg-white dark:bg-white rounded-3xl shadow-elevation-5 w-full max-w-4xl max-h-[90vh] pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ==================== HEADER ==================== */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 rounded-t-3xl flex-shrink-0">
            <div>
              <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">
                {editInvoice ? 'Edit Invoice' : 'New Invoice'}
              </h2>
              <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
                {editInvoice ? `Editing ${editInvoice.invoiceNumber}` : 'Create a new invoice for billing'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ==================== BODY (Scrollable) ==================== */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              
              {/* Invoice Details Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-surface-on-variant dark:text-gray-300 uppercase tracking-wide">
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
                      className="w-full h-[56px] px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
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
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                      Invoice Date *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(true)}
                      className="w-full h-[56px] flex items-center px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 hover:bg-surface-container-highest dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <CalendarIcon className="h-5 w-5 text-surface-on-variant dark:text-gray-400 mr-3" />
                      <span className="text-surface-on dark:text-gray-100">
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
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                      Due Date *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDueDatePicker(true)}
                      className="w-full h-[56px] flex items-center px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 hover:bg-surface-container-highest dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <CalendarIcon className="h-5 w-5 text-surface-on-variant dark:text-gray-400 mr-3" />
                      <span className="text-surface-on dark:text-gray-100">
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
                    <div>
                      <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                        Date Paid
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowDatePaidPicker(true)}
                        className="w-full h-[56px] flex items-center px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 hover:bg-surface-container-highest dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <CalendarIcon className="h-5 w-5 text-surface-on-variant dark:text-gray-400 mr-3" />
                        <span className="text-surface-on dark:text-gray-100">
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
                <h3 className="text-sm font-semibold text-surface-on-variant dark:text-gray-300 uppercase tracking-wide">
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
                      className="w-full h-[56px] px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      placeholder="Type to search builders..."
                    />
                    
                    {/* Builder Dropdown */}
                    {showBuilderDropdown && filteredBuilders.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 max-h-40 overflow-y-auto">
                        {filteredBuilders.map(builder => (
                          <button
                            key={builder.id}
                            type="button"
                            onClick={() => handleBuilderSelect(builder)}
                            className="w-full text-left px-4 py-3 hover:bg-surface-container dark:hover:bg-gray-700 transition-colors border-b border-surface-outline-variant dark:border-gray-700 last:border-0"
                          >
                            <div className="font-medium text-sm text-surface-on dark:text-gray-100">
                              {builder.name}
                            </div>
                            {builder.email && (
                              <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-0.5">
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
                      className="w-full h-[56px] px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
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
                    className="w-full h-[56px] px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Enter street address, city, state"
                  />
                </div>
              </div>
              
              {/* Line Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-surface-on-variant dark:text-gray-300 uppercase tracking-wide">
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
                    <div key={item.id} className="bg-surface-container/30 dark:bg-gray-700/30 p-4 rounded-lg border border-surface-outline-variant dark:border-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        {/* Description */}
                        <div className="md:col-span-6">
                          <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">
                            Description *
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            className="w-full h-10 px-3 rounded-md border border-surface-outline dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Service description"
                          />
                        </div>
                        
                        {/* Quantity */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">
                            Qty *
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full h-10 px-3 rounded-md border border-surface-outline dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          />
                        </div>
                        
                        {/* Rate */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">
                            Rate ($) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full h-10 px-3 rounded-md border border-surface-outline dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          />
                        </div>
                        
                        {/* Amount (Read-only) */}
                        <div className="md:col-span-2 flex items-end gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">
                              Amount
                            </label>
                            <div className="w-full h-10 px-3 rounded-md border border-surface-outline-variant dark:border-gray-600 bg-surface-container/50 dark:bg-gray-900/50 text-sm text-surface-on dark:text-gray-100 flex items-center font-medium">
                              ${item.amount.toFixed(2)}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-surface-on dark:text-gray-100">
                      Total Amount
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* Payment Info (Optional) */}
              {status === 'paid' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-surface-on-variant dark:text-gray-300 uppercase tracking-wide">
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
                        className="w-full h-[56px] px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
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
                        className="w-full h-[56px] px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        placeholder="https://payment.link"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ==================== FOOTER ==================== */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-outline-variant dark:border-gray-700 bg-white dark:bg-gray-50 rounded-b-3xl flex-shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="filled"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : editInvoice ? 'Update Invoice' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default InvoiceModalNew;
