/**
 * InvoiceFormPanel Component - REFACTORED
 * 
 * Modern invoice form with Builder-centric workflow and 4-button architecture.
 * 
 * KEY FEATURES:
 * - Builder Combobox (not Homeowner)
 * - Read-only Invoice Number badge
 * - 4-Button Footer: Cancel, Save Draft, Mark Sent, Save & Send
 * - Status derived from button action (not manual dropdown)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Calendar as CalendarIcon, DollarSign, X, Search, Check, ChevronsUpDown, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@clerk/clerk-react';
import Button from './Button';
import CalendarPickerSimple from './CalendarPickerSimple';

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
  builderId?: string; // NEW: Builder-centric
  builderName?: string; // For display
  builderEmail?: string;
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

export interface Builder {
  id: string;
  name: string;
  email?: string;
}

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  builderId: z.string().min(1, 'Builder is required'),
  builderEmail: z.string().email('Valid email is required').or(z.literal('')),
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
  onSave: (invoice: Partial<Invoice>, action?: 'draft' | 'sent' | 'send') => void;
  onCancel: () => void;
  builders?: Builder[];
  prefillData?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
  editInvoice?: Invoice | null;
  isVisible: boolean;
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
  const [builderId, setBuilderId] = useState('');
  const [builderEmail, setBuilderEmail] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  // Builder combobox state
  const [builderQuery, setBuilderQuery] = useState('');
  const [showBuilderDropdown, setShowBuilderDropdown] = useState(false);
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ==================== AUTO-GENERATE INVOICE NUMBER ====================
  
  useEffect(() => {
    if (!editInvoice && !invoiceNumber) {
      // Generate invoice number: INV-YYYYMMDD-XXXX
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      setInvoiceNumber(`INV-${dateStr}-${randomStr}`);
    }
  }, [editInvoice, invoiceNumber]);

  // ==================== INITIALIZE FROM EDIT MODE ====================
  
  useEffect(() => {
    if (editInvoice && isVisible) {
      setInvoiceNumber(editInvoice.invoiceNumber || '');
      setBuilderId(editInvoice.builderId || '');
      setBuilderQuery(editInvoice.builderName || '');
      setBuilderEmail(editInvoice.builderEmail || '');
      setProjectDetails(editInvoice.projectDetails || '');
      setDate(editInvoice.date || '');
      setDueDate(editInvoice.dueDate || '');
      setItems(editInvoice.items || []);
    } else if (!editInvoice && isVisible) {
      // Reset for new invoice
      const today = new Date().toISOString().split('T')[0];
      const dueIn30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      setBuilderId('');
      setBuilderQuery(prefillData?.clientName || '');
      setBuilderEmail(prefillData?.clientEmail || '');
      setProjectDetails(prefillData?.projectDetails || '');
      setDate(today);
      setDueDate(dueIn30);
      setItems([
        { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }
      ]);
    }
  }, [editInvoice, isVisible, prefillData]);

  // ==================== BUILDER SEARCH/FILTER ====================
  
  const filteredBuilders = useMemo(() => {
    if (!builderQuery) return builders;
    const query = builderQuery.toLowerCase();
    return builders.filter(b => 
      b.name.toLowerCase().includes(query) || 
      b.email?.toLowerCase().includes(query)
    );
  }, [builders, builderQuery]);

  const handleSelectBuilder = (builder: Builder) => {
    setBuilderId(builder.id);
    setBuilderQuery(builder.name);
    setBuilderEmail(builder.email || '');
    setShowBuilderDropdown(false);
    setErrors(prev => ({ ...prev, builderId: '' }));
  };

  // ==================== ITEM MANAGEMENT ====================
  
  const handleAddItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // Auto-calculate amount
      if (field === 'quantity' || field === 'rate') {
        updated.amount = updated.quantity * updated.rate;
      }
      
      return updated;
    }));
  };

  // ==================== TOTALS ====================
  
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const total = subtotal;

  // ==================== VALIDATION ====================
  
  const validate = (): boolean => {
    console.log('🔍 Starting validation...');
    const newErrors: Record<string, string> = {};
    
    if (!invoiceNumber) newErrors.invoiceNumber = 'Invoice number is required';
    if (!builderId) newErrors.builderId = 'Builder is required';
    if (!builderEmail) newErrors.builderEmail = 'Builder email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(builderEmail)) {
      newErrors.builderEmail = 'Valid email is required';
    }
    if (!date) newErrors.date = 'Invoice date is required';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    if (items.length === 0) newErrors.items = 'At least one line item is required';
    
    items.forEach((item, idx) => {
      if (!item.description) newErrors[`item_${idx}_description`] = 'Description required';
      if (item.quantity <= 0) newErrors[`item_${idx}_quantity`] = 'Quantity must be > 0';
      if (item.rate < 0) newErrors[`item_${idx}_rate`] = 'Rate cannot be negative';
    });
    
    console.log('🔍 Validation errors:', newErrors);
    console.log('🔍 Error count:', Object.keys(newErrors).length);
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== SAVE HANDLERS (4 BUTTONS) ====================
  
  const handleSave = async (action: 'draft' | 'sent' | 'send') => {
    console.log('💾 handleSave called with action:', action);
    console.log('💾 Current state:', { 
      invoiceNumber, 
      builderId, 
      builderQuery,
      builderEmail, 
      date, 
      dueDate, 
      itemCount: items.length 
    });
    
    if (!validate()) {
      console.log('❌ Validation failed, errors:', errors);
      return;
    }
    
    console.log('✅ Validation passed, proceeding to save...');
    setIsLoadingSave(true);
    
    try {
      const invoice: Partial<Invoice> = {
        id: editInvoice?.id,
        invoiceNumber,
        builderId,
        builderName: builderQuery,
        builderEmail,
        projectDetails,
        date,
        dueDate,
        total,
        items,
        status: action === 'draft' ? 'draft' : 'sent', // sent or send both mark as sent
      };
      
      console.log('💾 Calling onSave with invoice:', invoice);
      await onSave(invoice, action);
      console.log('✅ onSave completed successfully');
      
      // Reset form on success (only for new invoices)
      if (!editInvoice) {
        const today = new Date().toISOString().split('T')[0];
        const dueIn30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        setInvoiceNumber('');
        setBuilderId('');
        setBuilderQuery('');
        setBuilderEmail('');
        setProjectDetails('');
        setDate(today);
        setDueDate(dueIn30);
        setItems([{ id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }]);
      }
    } catch (error) {
      console.error('❌ Save error:', error);
    } finally {
      setIsLoadingSave(false);
    }
  };

  const handleCancel = () => {
    setErrors({});
    onCancel();
  };

  // ==================== RENDER ====================
  
  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        {/* Mobile Back Button */}
        <button
          onClick={handleCancel}
          className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Back to list"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex-1">
          {editInvoice ? 'Edit Invoice' : 'New Invoice'}
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Invoice Number - Simple Text Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Invoice Number
          </label>
          <span className="text-sm text-gray-500 font-mono">
            #{invoiceNumber ? (invoiceNumber.length > 8 ? invoiceNumber.slice(0, 8) : invoiceNumber) : 'Generating...'}
          </span>
          {errors.invoiceNumber && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.invoiceNumber}</p>
          )}
        </div>

        {/* Builder Combobox */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Builder *
          </label>
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                value={builderQuery}
                onChange={(e) => {
                  setBuilderQuery(e.target.value);
                  setShowBuilderDropdown(true);
                }}
                onFocus={() => setShowBuilderDropdown(true)}
                placeholder="Search for builder..."
                className={`w-full px-4 py-3 pr-10 border ${
                  errors.builderId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            
            {/* Dropdown */}
            {showBuilderDropdown && filteredBuilders.length > 0 && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowBuilderDropdown(false)}
                />
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredBuilders.map((builder) => (
                    <button
                      key={builder.id}
                      type="button"
                      onClick={() => handleSelectBuilder(builder)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {builder.name}
                        </div>
                        {builder.email && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {builder.email}
                          </div>
                        )}
                      </div>
                      {builderId === builder.id && (
                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {errors.builderId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.builderId}</p>
          )}
        </div>

        {/* Builder Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Builder Email *
          </label>
          <input
            type="email"
            value={builderEmail}
            onChange={(e) => {
              setBuilderEmail(e.target.value);
              setErrors(prev => ({ ...prev, builderEmail: '' }));
            }}
            placeholder="builder@example.com"
            className={`w-full px-4 py-3 border ${
              errors.builderEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          {errors.builderEmail && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.builderEmail}</p>
          )}
        </div>

        {/* Project Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Details
          </label>
          <textarea
            value={projectDetails}
            onChange={(e) => setProjectDetails(e.target.value)}
            rows={3}
            placeholder="Project name, address, or notes..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invoice Date *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className={`w-full px-4 py-3 pr-10 border ${
                  errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left`}
              >
                {date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                }) : 'Select date'}
              </button>
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              
              {showDatePicker && (
                <CalendarPickerSimple
                  selectedDate={date}
                  onDateSelect={(newDate) => {
                    setDate(newDate);
                    setShowDatePicker(false);
                    setErrors(prev => ({ ...prev, date: '' }));
                  }}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>
            {errors.date && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDueDatePicker(true)}
                className={`w-full px-4 py-3 pr-10 border ${
                  errors.dueDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left`}
              >
                {dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                }) : 'Select date'}
              </button>
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              
              {showDueDatePicker && (
                <CalendarPickerSimple
                  selectedDate={dueDate}
                  onDateSelect={(newDate) => {
                    setDueDate(newDate);
                    setShowDueDatePicker(false);
                    setErrors(prev => ({ ...prev, dueDate: '' }));
                  }}
                  onClose={() => setShowDueDatePicker(false)}
                />
              )}
            </div>
            {errors.dueDate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dueDate}</p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Line Items *
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="flex gap-2 items-start bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex-1 grid grid-cols-12 gap-2">
                  {/* Description */}
                  <div className="col-span-12 sm:col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      placeholder="Description"
                      className={`w-full px-3 py-2 text-sm border ${
                        errors[`item_${idx}_description`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Qty"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 text-sm border ${
                        errors[`item_${idx}_quantity`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    />
                  </div>

                  {/* Rate */}
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      placeholder="Rate"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 text-sm border ${
                        errors[`item_${idx}_rate`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    />
                  </div>

                  {/* Amount (read-only) */}
                  <div className="col-span-4 sm:col-span-2">
                    <div className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-medium">
                      ${item.amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={items.length === 1}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          
          {errors.items && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.items}</p>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-300 dark:border-gray-600">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-BUTTON FOOTER - FIXED TO BOTTOM */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Cancel */}
          <button
            onClick={handleCancel}
            disabled={isLoadingSave}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            Cancel
          </button>

          {/* Save as Draft */}
          <button
            onClick={() => handleSave('draft')}
            disabled={isLoadingSave}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {isLoadingSave ? 'Saving...' : 'Save Draft'}
          </button>

          {/* Save & Mark Sent */}
          <button
            onClick={() => handleSave('sent')}
            disabled={isLoadingSave}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {isLoadingSave ? 'Saving...' : 'Mark Sent'}
          </button>

          {/* Save & Send Email */}
          <button
            onClick={() => handleSave('send')}
            disabled={isLoadingSave}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {isLoadingSave ? 'Sending...' : 'Save & Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceFormPanel;
