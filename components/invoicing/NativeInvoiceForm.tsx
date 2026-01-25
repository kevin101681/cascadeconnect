/**
 * Native Invoice Form - The Editor Component
 * 
 * A clean, rebuilt form for creating/editing invoices.
 * Used inside the Right Panel of InvoicesFullView.
 * 
 * KEY IMPROVEMENTS:
 * - Date fields use Popover calendar (no timezone issues)
 * - Number inputs have spinners removed
 * - Rate defaults to empty string (not 0)
 * - Inline success/error feedback (no external toasts)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, Trash2, Check, X as XIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import AppButton from '../Button';
import type { Invoice, Client, InvoiceItem } from '../../lib/cbsbooks/types';

interface NativeInvoiceFormProps {
  invoice: Invoice | null; // null = creating new
  clients: Client[];
  onSave: (invoice: Partial<Invoice>) => Promise<boolean>; // Returns success status
  onCancel: () => void;
  prefillData?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
}

export const NativeInvoiceForm: React.FC<NativeInvoiceFormProps> = ({
  invoice,
  clients,
  onSave,
  onCancel,
  prefillData,
}) => {
  
  // ==================== FORM STATE ====================
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [status, setStatus] = useState<'draft' | 'sent' | 'paid'>('draft');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  // ==================== UI STATE ====================
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // ==================== INITIALIZE FORM ====================
  useEffect(() => {
    if (invoice) {
      // EDITING EXISTING
      setInvoiceNumber(invoice.invoiceNumber);
      setClientName(invoice.clientName);
      setClientEmail(invoice.clientEmail);
      setProjectDetails(invoice.projectDetails || '');
      setPaymentLink(invoice.paymentLink || '');
      
      // Parse dates from YYYY-MM-DD string
      try {
        setDate(invoice.date ? new Date(invoice.date + 'T00:00:00') : new Date());
        setDueDate(invoice.dueDate ? new Date(invoice.dueDate + 'T00:00:00') : new Date());
      } catch (e) {
        console.error('Date parsing error:', e);
        setDate(new Date());
        setDueDate(new Date());
      }
      
      setStatus(invoice.status);
      setItems(invoice.items || []);
    } else {
      // CREATING NEW
      setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
      setClientName(prefillData?.clientName || '');
      setClientEmail(prefillData?.clientEmail || '');
      setProjectDetails(prefillData?.projectDetails || '');
      setPaymentLink('');
      setDate(new Date());
      setDueDate(new Date());
      setStatus('draft');
      setItems([{
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }]);
    }
    
    setSaveStatus('idle');
    setErrorMessage('');
  }, [invoice, prefillData]);

  // ==================== COMPUTED VALUES ====================
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }, [items]);

  // ==================== ITEM HANDLERS ====================
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

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // Recalculate amount if quantity or rate changed
      if (field === 'quantity' || field === 'rate') {
        updated.amount = updated.quantity * updated.rate;
      }
      
      return updated;
    }));
  };

  // ==================== CLIENT AUTOCOMPLETE ====================
  const handleClientChange = (name: string) => {
    setClientName(name);
    
    // Auto-fill email if client exists
    const matchingClient = clients.find(c => 
      c.companyName.toLowerCase() === name.toLowerCase()
    );
    if (matchingClient) {
      setClientEmail(matchingClient.email);
    }
  };

  // ==================== SAVE HANDLER ====================
  const handleSave = async () => {
    // Validation
    if (!clientName.trim()) {
      setSaveStatus('error');
      setErrorMessage('Client name is required');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    if (items.length === 0 || items.every(i => !i.description.trim())) {
      setSaveStatus('error');
      setErrorMessage('At least one item is required');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setSaveStatus('saving');
    setErrorMessage('');

    // Format dates as YYYY-MM-DD to avoid timezone issues
    const formatDateForDB = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const invoiceData: Partial<Invoice> = {
      id: invoice?.id, // undefined for new invoices
      invoiceNumber,
      clientName,
      clientEmail,
      projectDetails,
      paymentLink,
      date: formatDateForDB(date),
      dueDate: formatDateForDB(dueDate),
      items: items.filter(i => i.description.trim()), // Remove empty items
      status,
    };

    const success = await onSave(invoiceData);
    
    if (success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      setErrorMessage('Failed to save');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // ==================== RENDER ====================
  return (
    <div className="flex-1 flex flex-col h-full">
      
      {/* HEADER */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {invoice ? 'Edit Invoice' : 'New Invoice'}
          </h2>
          <div className="flex items-center gap-3">
            {/* SAVE BUTTON WITH INLINE STATUS */}
            <AppButton
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              variant="filled"
              size="md"
              className={`transition-all ${
                saveStatus === 'success' 
                  ? '!bg-green-600 hover:!bg-green-600 !text-white'
                  : saveStatus === 'error'
                  ? '!bg-red-600 hover:!bg-red-600 !text-white'
                  : '!bg-blue-600 hover:!bg-blue-700 !text-white'
              }`}
              icon={
                saveStatus === 'saving' ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : saveStatus === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : saveStatus === 'error' ? (
                  <XIcon className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )
              }
            >
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'success' && 'Saved!'}
              {saveStatus === 'error' && 'Failed'}
              {saveStatus === 'idle' && 'Save'}
            </AppButton>
            
            <AppButton
              onClick={onCancel}
              variant="ghost"
              size="md"
            >
              Cancel
            </AppButton>
          </div>
        </div>
        
        {/* ERROR MESSAGE */}
        {saveStatus === 'error' && errorMessage && (
          <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {errorMessage}
          </div>
        )}
      </div>

      {/* BODY - SCROLLABLE FORM */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-3xl">
          
          {/* INVOICE NUMBER & STATUS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {/* CLIENT INFO */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => handleClientChange(e.target.value)}
                list="clients-list"
                className="mt-1"
                placeholder="Start typing to search..."
              />
              <datalist id="clients-list">
                {clients.map(client => (
                  <option key={client.id} value={client.companyName} />
                ))}
              </datalist>
            </div>
            
            <div>
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="mt-1"
                placeholder="client@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="projectDetails">Project Address</Label>
              <Input
                id="projectDetails"
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                className="mt-1"
                placeholder="Enter street address, city, state, zip"
              />
            </div>
          </div>

          {/* DATES - SINGLE LINE WITH POPOVERS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Invoice Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="mt-1 w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md hover:border-gray-400 transition-colors text-left">
                    <span className="text-sm">
                      {format(date, 'MM/dd/yyyy')}
                    </span>
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="mt-1 w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md hover:border-gray-400 transition-colors text-left">
                    <span className="text-sm">
                      {format(dueDate, 'MM/dd/yyyy')}
                    </span>
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate}
                    onSelect={(d) => d && setDueDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* PAYMENT LINK */}
          <div>
            <Label htmlFor="paymentLink">Payment Link (Optional)</Label>
            <Input
              id="paymentLink"
              type="url"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              className="mt-1"
              placeholder="https://..."
            />
          </div>

          {/* LINE ITEMS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Line Items *</Label>
              <AppButton
                onClick={handleAddItem}
                variant="ghost"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                Add Item
              </AppButton>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    {/* Description */}
                    <div className="col-span-6">
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="text-sm"
                      />
                    </div>
                    
                    {/* Quantity */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                        min="0"
                        step="1"
                        className="text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    
                    {/* Rate */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.rate === 0 ? '' : item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        placeholder="Rate"
                        min="0"
                        step="0.01"
                        className="text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    
                    {/* Amount (readonly) */}
                    <div className="col-span-2">
                      <Input
                        value={`$${item.amount.toFixed(2)}`}
                        readOnly
                        className="text-sm bg-white"
                      />
                    </div>
                  </div>
                  
                  {/* Delete Button */}
                  <AppButton
                    onClick={() => handleRemoveItem(item.id)}
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </AppButton>
                </div>
              ))}
            </div>
          </div>

          {/* TOTAL */}
          <div className="flex justify-end">
            <div className="bg-blue-50 px-6 py-3 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 font-medium mb-1">Total Amount</div>
              <div className="text-2xl font-bold text-blue-900">${total.toFixed(2)}</div>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
};
