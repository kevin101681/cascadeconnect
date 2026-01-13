
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Invoice, Client, InvoiceItem, ViewState } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { TabBar } from './ui/TabBar';
import { Plus, Trash2, Download, Search, X, Upload, Database, SlidersHorizontal, Camera, ArrowUpDown, Share2, Check, Sparkles, Loader2, ScanText, Link as LinkIcon, Mail, Send, CreditCard, Pencil, Calendar as CalendarIcon, ChevronLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import { FloatingMenu, ActionItem } from './ui/FloatingMenu';
import { api } from '../services/api';
import { CheckScanner } from './CheckScanner';
import { InvoiceScanner } from './InvoiceScanner';
import { Dropdown } from './ui/Dropdown';
import { parseInvoiceFromText } from '../services/geminiService';
import CalendarPicker from './CalendarPicker';
import { InvoiceCard } from '../../../components/ui/InvoiceCard';

interface InvoicesProps {
  invoices: Invoice[];
  clients: Client[];
  onAdd: (invoice: Invoice) => void;
  onUpdate: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
  onBulkAdd: (invoices: Invoice[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onNavigate: (view: ViewState) => void;
  onBackup: () => void;
  prefillInvoice?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
}

// Helper to format date YYYY-MM-DD to MM/DD/YYYY
const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
        const [y, m, d] = dateString.split('-');
        return `${m}/${d}/${y}`;
    } catch (e) {
        return dateString;
    }
};

// Helper to format date MM/DD for mobile
const formatDateMobile = (dateString: string) => {
    if (!dateString) return '';
    try {
        const [y, m, d] = dateString.split('-');
        return `${m}/${d}`;
    } catch (e) {
        return dateString;
    }
};

// Helper to get today's date in local time YYYY-MM-DD
const getLocalTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseCSVDate = (dateStr: string): string => {
    // Try to parse MM/DD/YYYY to YYYY-MM-DD
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Check if already YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

    // Check for MM/DD/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [m, d, y] = parts;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Fallback to Date parse
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
};

type ActiveFab = 'none' | 'menu' | 'filter' | 'search';

export const Invoices: React.FC<InvoicesProps> = ({ 
  invoices, clients, onAdd, onUpdate, onDelete, onBulkAdd, onBulkDelete, onNavigate, onBackup, prefillInvoice 
}) => {
  const [isCreating, setIsCreating] = useState(false); // Only for "New Invoice" mode
  const [expandedId, setExpandedId] = useState<string | null>(null); // For Inline Edit
  const [currentInvoice, setCurrentInvoice] = useState<Partial<Invoice>>({});
  
  // URL-based modal state management (single source of truth)
  const [searchParams, setSearchParams] = useState(() => new URLSearchParams(window.location.search));
  
  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setSearchParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Helper to update URL search params
  const updateSearchParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    
    const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState({}, '', newUrl);
      setSearchParams(newParams);
    }
  };
  
  // Get selected invoice from URL
  const selectedInvoiceId = searchParams.get('invoiceId');
  const selectedInvoice = useMemo(() => {
    if (!selectedInvoiceId) return null;
    return invoices.find(inv => inv.id === selectedInvoiceId) || null;
  }, [selectedInvoiceId, invoices]);
  
  const [searchQuery, setSearchQuery] = useState('');
  // Use a single state to track which FAB modal is active
  const [activeFab, setActiveFab] = useState<ActiveFab>('none');
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('sent');
  const [sortValue, setSortValue] = useState('date-desc'); // date-desc, date-asc, client-asc, total-desc
  const [showCheckScanner, setShowCheckScanner] = useState(false);
  const [showInvoiceScanner, setShowInvoiceScanner] = useState(false);
  
  const [filterSelectionCount, setFilterSelectionCount] = useState(0);
  
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCheckNumber, setBulkCheckNumber] = useState('');
  
  // Pagination State
  const [displayLimit, setDisplayLimit] = useState(20);

  // AI Import State
  const [showAIImport, setShowAIImport] = useState(false);
  const [aiImportText, setAiImportText] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Email State
  const [emailingInvoice, setEmailingInvoice] = useState<Invoice | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Payment Link State
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [showManualLinkInput, setShowManualLinkInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showDatePaidPicker, setShowDatePaidPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const rateOptions = [25, 35, 50, 75, 100, 150];

  // Listen for external create invoice event from Dashboard header
  useEffect(() => {
    const handleCreateInvoice = () => {
      handleCreate();
    };
    window.addEventListener('cbsbooks-create-invoice', handleCreateInvoice);
    return () => {
      window.removeEventListener('cbsbooks-create-invoice', handleCreateInvoice);
    };
  }, []);

  // Sorting Options
  const sortOptions = [
    { value: 'date-desc', label: 'Date: Newest' },
    { value: 'date-asc', label: 'Date: Oldest' },
    { value: 'client-asc', label: 'Builder: A-Z' },
    { value: 'client-desc', label: 'Builder: Z-A' },
    { value: 'total-desc', label: 'Amount: High to Low' },
    { value: 'total-asc', label: 'Amount: Low to High' },
  ];

  // Auto-create invoice with pre-filled data if provided
  // Use a ref to track if we've already processed prefill data
  const prefillProcessedRef = useRef(false);

  useEffect(() => {
    // Skip if we've already processed prefill or if we're already creating/editing
    if (isCreating || expandedId !== null || prefillProcessedRef.current) {
      return;
    }

    // Check both prop and sessionStorage (for URL-based prefill)
    const prefillData = prefillInvoice || (() => {
      try {
        const stored = sessionStorage.getItem('invoicePrefill');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Clear it after reading
          sessionStorage.removeItem('invoicePrefill');
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing invoice prefill data:', e);
      }
      return null;
    })();

    if (prefillData && prefillData.clientName) {
      // Check if we already created an invoice for this homeowner (avoid duplicates)
      const existingPrefillKey = `invoiceCreated_${prefillData.homeownerId}`;
      if (prefillData.homeownerId && sessionStorage.getItem(existingPrefillKey)) {
        prefillProcessedRef.current = true;
        return; // Already created
      }

      // Mark as processed before setting state to prevent re-runs
      prefillProcessedRef.current = true;

      // Create invoice with pre-filled data
      setCurrentInvoice({
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        date: getLocalTodayDate(),
        dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        clientName: prefillData.clientName,
        clientEmail: prefillData.clientEmail || '',
        projectDetails: prefillData.projectDetails || '',
        items: [{ id: crypto.randomUUID(), description: 'Walk through and warranty management services', quantity: 1, rate: 0, amount: 0 }],
        status: 'draft',
        total: 0
      });
      setIsCreating(true);
      setActiveFab('none');
      
      // Mark as created to avoid duplicates
      if (prefillData.homeownerId) {
        sessionStorage.setItem(existingPrefillKey, 'true');
      }
    } else if (!prefillInvoice) {
      // No prefill data, mark as processed
      prefillProcessedRef.current = true;
    }
  }, [prefillInvoice, isCreating, expandedId]);

  // Reset prefill processed flag when prefillInvoice prop changes
  useEffect(() => {
    prefillProcessedRef.current = false;
  }, [prefillInvoice]);

  // Auto-focus search input when search FAB is activated
  useEffect(() => {
    if (activeFab === 'search') {
      // Small timeout to allow render/animation to start
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeFab]);

  const toggleFab = (fab: ActiveFab) => {
    // If opening a new fab, close menu first
    if (fab !== 'none' && activeFab !== fab) {
      setActiveFab(fab);
    } else {
      setActiveFab(prev => prev === fab ? 'none' : fab);
    }
    if (fab === 'filter') setFilterSelectionCount(0);
  };

  const handleFilterSelection = (type: 'status' | 'sort', value: any) => {
      if (type === 'status') setStatusFilter(value);
      if (type === 'sort') setSortValue(value);

      const newCount = filterSelectionCount + 1;
      setFilterSelectionCount(newCount);

      if (newCount >= 2) {
          setActiveFab('none');
      }
  };

  // 1. First, filter by Search Query (Client Name, Invoice #, Address, Items)
  const invoicesMatchingSearch = useMemo(() => {
    if (!searchQuery) return invoices;
    const lowerQuery = searchQuery.toLowerCase();
    return invoices.filter(inv => 
      inv.clientName.toLowerCase().includes(lowerQuery) || 
      inv.invoiceNumber.toLowerCase().includes(lowerQuery) ||
      (inv.projectDetails && inv.projectDetails.toLowerCase().includes(lowerQuery)) ||
      (inv.items || []).some(item => item.description.toLowerCase().includes(lowerQuery)) ||
      (inv.checkNumber && inv.checkNumber.toLowerCase().includes(lowerQuery))
    );
  }, [invoices, searchQuery]);

  // 2. Then, filter by Status and Sort (for the list view)
  const filteredInvoices = useMemo(() => {
    let result = invoicesMatchingSearch;

    if (statusFilter !== 'all') {
        result = result.filter(inv => inv.status === statusFilter);
    }

    // Apply Sorting
    const sorted = [...result];
    sorted.sort((a, b) => {
        const [key, direction] = sortValue.split('-');
        let comparison = 0;
        
        if (key === 'date') {
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (key === 'client') {
            comparison = a.clientName.localeCompare(b.clientName);
        } else if (key === 'total') {
            comparison = a.total - b.total;
        }

        return direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [invoicesMatchingSearch, statusFilter, sortValue]);

  const visibleInvoices = useMemo(() => {
      return filteredInvoices.slice(0, displayLimit);
  }, [filteredInvoices, displayLimit]);

  // 3. Stats Calculation (Based on search results, but with specific status logic)
  const stats = useMemo(() => {
      const currentYear = new Date().getFullYear();
      
      // YTD: Always calculated from PAID invoices in the current year, matching the search.
      const ytd = invoicesMatchingSearch
        .filter(inv => inv.status === 'paid' && new Date(inv.date).getFullYear() === currentYear)
        .reduce((acc, inv) => acc + inv.total, 0);

      let outstanding = 0;

      // Outstanding logic changes based on the selected tab
      switch (statusFilter) {
          case 'all':
              outstanding = invoicesMatchingSearch
                .filter(inv => inv.status === 'sent')
                .reduce((acc, inv) => acc + inv.total, 0);
              break;
          case 'draft':
              outstanding = invoicesMatchingSearch
                .filter(inv => inv.status === 'draft')
                .reduce((acc, inv) => acc + inv.total, 0);
              break;
          case 'sent':
              outstanding = invoicesMatchingSearch
                .filter(inv => inv.status === 'sent')
                .reduce((acc, inv) => acc + inv.total, 0);
              break;
          case 'paid':
              outstanding = 0;
              break;
      }

      return { outstanding, ytd };
  }, [invoicesMatchingSearch, statusFilter]);

  const handleShowMore = () => {
      setDisplayLimit(prev => prev + 20);
  };

  const toggleExpand = (inv: Invoice) => {
    if (expandedId === inv.id) {
        setExpandedId(null);
        setCurrentInvoice({});
    } else {
        if (isCreating) setIsCreating(false);
        setExpandedId(inv.id);
        setCurrentInvoice(JSON.parse(JSON.stringify(inv)));
    }
  };

  const handleCreate = () => {
    setExpandedId(null);
    setCurrentInvoice({
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      date: getLocalTodayDate(),
      dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      items: [{ id: crypto.randomUUID(), description: 'Walk through and warranty management services', quantity: 1, rate: 0, amount: 0 }],
      status: 'draft',
      total: 0,
      clientName: ''
    });
    setIsCreating(true);
    setActiveFab('none');
  };

  const handleSave = async () => {
    if (!currentInvoice.clientName) {
      alert("Client is required");
      return;
    }

    setIsSaving(true);
    
    try {
        const itemsToSave = currentInvoice.items || [];
        const total = itemsToSave.reduce((acc, item) => acc + item.amount, 0);
        
        let finalPaymentLink = currentInvoice.paymentLink;

        // Auto-generate link if missing and total > 0 (and we have a client name)
        if (!finalPaymentLink && total > 0 && currentInvoice.clientName) {
             try {
                // Determine invoice number
                const invNum = currentInvoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
                // Call API to generate link
                finalPaymentLink = await api.invoices.createPaymentLink(invNum, total, currentInvoice.clientName);
             } catch (e: any) {
                 console.error("Auto-generation of payment link failed", e);
                 const proceed = confirm(`Failed to auto-generate Square payment link: ${e.message || 'Unknown error'}. \n\nSave invoice anyway without the link?`);
                 if (!proceed) {
                     setIsSaving(false);
                     return;
                 }
             }
        }

        const client = clients.find(c => c.companyName === currentInvoice.clientName);
        const email = currentInvoice.clientEmail || client?.email || '';

        const invoiceToSave: Invoice = {
          id: currentInvoice.id || crypto.randomUUID(),
          invoiceNumber: currentInvoice.invoiceNumber || 'DRAFT',
          clientName: currentInvoice.clientName,
          clientEmail: email,
          projectDetails: currentInvoice.projectDetails,
          paymentLink: finalPaymentLink, // Use generated or existing link
          checkNumber: currentInvoice.checkNumber,
          date: currentInvoice.date || getLocalTodayDate(),
          dueDate: currentInvoice.dueDate || getLocalTodayDate(),
          datePaid: currentInvoice.datePaid,
          items: itemsToSave,
          total: total,
          status: currentInvoice.status || 'draft'
        };

        if (currentInvoice.id) {
          onUpdate(invoiceToSave);
        } else {
          onAdd(invoiceToSave);
        }
        
        setIsCreating(false);
        setExpandedId(null);
        updateSearchParams({ invoiceId: null }); // Close modal via URL
        setCurrentInvoice({});
    } catch (e) {
        console.error("Error saving invoice", e);
        alert("An error occurred while saving.");
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDeleteInvoice = (id: string) => {
      if(confirm('Delete invoice?')) {
          onDelete(id);
          if (expandedId === id) setExpandedId(null);
      }
  };

  const handleMarkAsPaid = (inv: Invoice) => {
      const today = getLocalTodayDate();
      const updatedInv = { 
          ...inv, 
          status: 'paid' as const,
          datePaid: today
      };
      
      onUpdate(updatedInv);

      // If this invoice is currently being edited/expanded, update the form state too
      // to prevent "Saving" overwriting the paid status with old draft status.
      if (expandedId === inv.id) {
          setCurrentInvoice(prev => ({
              ...prev,
              status: 'paid',
              datePaid: today
          }));
      }
  };

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setCurrentInvoice(prev => {
        const updatedItems = (prev.items || []).map(item => {
            if (item.id === itemId) {
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'rate') {
                    updated.amount = updated.quantity * updated.rate;
                }
                return updated;
            }
            return item;
        });
        return { ...prev, items: updatedItems };
    });
  };

  const deleteItem = (itemId: string) => {
    setCurrentInvoice(prev => ({
        ...prev,
        items: (prev.items || []).filter(i => i.id !== itemId)
    }));
  };

  const handleAddItem = () => {
    setCurrentInvoice(prev => ({
        ...prev,
        items: [...(prev.items || []), { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  // --- PDF GENERATION LOGIC ---
  const createInvoicePDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Explicitly set standard font to avoid issues
    doc.setFont("helvetica", "normal");

    // Colors
    const primaryColor = [79, 120, 130]; // #4f7882
    const surfaceContainerColor = [238, 239, 241]; // #eeeff1
    
    // Helper to add new page if needed
    const checkPageBreak = (currentY: number) => {
        if (currentY > 260) {
            doc.addPage();
            return 20; // Reset Y to top margin
        }
        return currentY;
    };

    // Add CBS Logo in top right corner (natural aspect ratio)
    try {
        const logoPath = '/images/manual/cbslogo.png';
        // Only specify width, let height scale naturally to maintain aspect ratio
        doc.addImage(logoPath, 'PNG', 162, 10, 25, 0); // x, y, width, height=0 means auto-scale
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
    doc.text(`Date: ${formatDate(invoice.date)}`, 140, 20, { align: 'right' });
    doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 140, 26, { align: 'right' });
    if (invoice.status === 'paid' && invoice.datePaid) {
        doc.text(`Date Paid: ${formatDate(invoice.datePaid)}`, 140, 32, { align: 'right' });
    }

    // Bill To section
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Bill To:", 14, 40);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(invoice.clientName || '', 14, 46);
    if(invoice.clientEmail) doc.text(invoice.clientEmail, 14, 51);
    
    // Sent From section (right side, aligned with Bill To)
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Sent From:", 120, 40);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text("Cascade Builder Services", 120, 46);
    doc.text("3519 Fox Ct.", 120, 51);
    doc.text("Gig Harbor, WA 98335", 120, 56);
    
    // Items Table Header Y Position
    let y = 75;

    // Project Details (Moved above Items Table)
    if (invoice.projectDetails) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text("Address:", 14, 62);
        doc.setFont(undefined, 'normal');
        doc.text(invoice.projectDetails, 32, 62); // Reduced from 40 to 32 to bring closer
    }

    // Table Header with Rounded Corners (Pill style)
    doc.setFillColor(surfaceContainerColor[0], surfaceContainerColor[1], surfaceContainerColor[2]);
    doc.roundedRect(14, y-5, 182, 8, 5, 5, 'F');

    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    // Vertically center text in pill: pill top is y-5, height is 8, so center is y-1
    doc.text("Description", 16, y-1);
    doc.text("Qty", 110, y-1, { align: 'center' });
    doc.text("Rate", 135, y-1, { align: 'right' });
    doc.text("Amount", 185, y-1, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    
    y += 10;
    
    // Defensive check: Ensure items exist and is array
    const items = Array.isArray(invoice.items) ? invoice.items : [];

    items.forEach(item => {
        y = checkPageBreak(y);
        doc.text(item.description || '', 16, y);
        doc.text((item.quantity || 0).toString(), 110, y, { align: 'center' });
        doc.text(`$${(item.rate || 0).toFixed(0)}`, 135, y, { align: 'right' });
        doc.text(`$${(item.amount || 0).toFixed(0)}`, 185, y, { align: 'right' });
        y += 8;
    });
    
    // Total & Buttons Section
    // Force a page break if we are near bottom to ensure button and total stay together
    if (y > 230) {
        doc.addPage();
        y = 30; // More space at top
    } else {
        y += 5;
    }

    // Line separator
    doc.setDrawColor(surfaceContainerColor[0], surfaceContainerColor[1], surfaceContainerColor[2]);
    doc.line(14, y, 196, y);
    y += 10;
    
    // Total Background with Rounded Corners (Pill style) - Reduced width and padding
    doc.setFillColor(surfaceContainerColor[0], surfaceContainerColor[1], surfaceContainerColor[2]);
    doc.roundedRect(135, y-6, 60, 10, 5, 5, 'F'); // Reduced from 70 to 60, moved from x=125 to x=135

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    
    // Align Total label and Amount - vertically centered in pill (height 10, center is y-1)
    doc.text("Total", 142, y-1);
    // Ensure total is a number safe for toFixed
    const safeTotal = typeof invoice.total === 'number' ? invoice.total : 0;
    doc.text(`$${safeTotal.toFixed(0)}`, 188, y-1, { align: 'right' });

    // Payment Button
    // Only render if paymentLink exists
    if (invoice.paymentLink) {
        y += 20;
        
        // Ensure we didn't run off page
        if (y > 280) {
            doc.addPage();
            y = 30;
        }

        // Button Background (Pill) - High Contrast (Teal)
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]); 
        // x=155, width=40 (approx center under total)
        doc.roundedRect(155, y-7, 40, 10, 5, 5, 'F');
        
        // Button Text - White, centered horizontally and vertically
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');

        // Pill center: x=175 (155 + 40/2), y center: y-2 (pill top is y-7, height 10, so center is y-2)
        doc.text("PAY ONLINE", 175, y-2, { align: 'center' });
        
        // Clickable Link
        doc.link(155, y-7, 40, 10, { url: invoice.paymentLink });
    }
    
    return doc;
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    try {
        const doc = createInvoicePDF(invoice);
        doc.save(`${invoice.invoiceNumber}.pdf`);
    } catch (e) {
        console.error("PDF Download Error", e);
        alert("Failed to generate PDF. Check invoice data.");
    }
  };

  const handleShare = async (invoice: Invoice) => {
      // Mobile Share Sheet
      if (navigator.share) {
          try {
             const doc = createInvoicePDF(invoice);
             const blob = doc.output('blob');
             
             // Sanitize filename for mobile compatibility (remove slashes/special chars)
             const safeFilename = `${(invoice.invoiceNumber || 'invoice').replace(/[^a-z0-9-_]/gi, '_')}.pdf`;

             const file = new File([blob], safeFilename, { type: 'application/pdf' });
             
             await navigator.share({
                 title: `Invoice ${invoice.invoiceNumber}`,
                 text: `Here is invoice #${invoice.invoiceNumber} from Cascade Builder Services.`,
                 files: [file]
             });
          } catch (e) {
              console.error('Share failed', e);
          }
      } else {
          // Fallback to download if share not supported
          handleDownloadPDF(invoice);
      }
  };

  const handlePrepareEmail = (invoice: Invoice) => {
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
        const doc = createInvoicePDF(emailingInvoice);
        // Get Base64 without data URI prefix (jspdf's datauristring includes it)
        const pdfDataUri = doc.output('datauristring');
        
        // Construct HTML with Payment Button (Table based for compatibility)
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
        
        // Send to backend
        const result = await api.invoices.sendEmail(
            emailTo,
            emailSubject,
            emailBody, // Plain text fallback
            htmlBody,  // HTML version
            { 
                filename: `Invoice_${emailingInvoice.invoiceNumber}.pdf`,
                data: pdfDataUri // Backend will strip prefix
            }
        );

        // Update status to sent if draft
        if (emailingInvoice.status === 'draft') {
            onUpdate({ ...emailingInvoice, status: 'sent' });
        }

        alert("Email sent successfully!");
        setEmailingInvoice(null);
    } catch (e: any) {
        console.error("Failed to send email", e);
        alert("Failed to send email: " + e.message);
    } finally {
        setIsSendingEmail(false);
    }
  };

  const parseCSVLine = (text: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          if (inQuotes && text[i + 1] === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; }
        } else if (char === ',' && !inQuotes) { result.push(current); current = ''; } else { current += char; }
      }
      result.push(current);
      return result;
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          const newInvoices: Invoice[] = [];
          
          const existingNumbers = new Set(invoices.map(i => i.invoiceNumber.toLowerCase().trim()));

          for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              const parts = parseCSVLine(line);
              
              if (parts.length >= 5) {
                  const invNum = parts[0]?.trim() || `INV-${Date.now()}-${i}`;
                  
                  if (existingNumbers.has(invNum.toLowerCase())) {
                      console.log(`Skipping duplicate invoice: ${invNum}`);
                      continue; 
                  }

                  newInvoices.push({
                      id: crypto.randomUUID(),
                      invoiceNumber: invNum,
                      clientName: parts[1]?.trim() || 'Unknown',
                      clientEmail: '',
                      date: parseCSVDate(parts[2]?.trim()),
                      dueDate: parseCSVDate(parts[3]?.trim()),
                      total: parseFloat(parts[4]?.replace(/[$,]/g, '')) || 0,
                      status: (parts[5]?.trim().toLowerCase() as any) || 'draft',
                      items: [], 
                  });
              }
          }

          if (newInvoices.length > 0) {
              onBulkAdd(newInvoices);
              alert(`Successfully imported ${newInvoices.length} invoices. Skipped ${lines.length - 1 - newInvoices.length} duplicates.`);
          } else {
              alert("No new invoices found to import.");
          }
          
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };
  
  // Bulk Selection Logic
  const toggleSelect = (id: string) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleSelectAll = () => {
      if (selectedIds.size === filteredInvoices.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredInvoices.map(i => i.id)));
      }
  };
  
  const handleBulkPay = () => {
      if (!bulkCheckNumber) {
          alert("Please enter a check number");
          return;
      }
      handleCheckScanPayments(Array.from(selectedIds), bulkCheckNumber);
      setSelectedIds(new Set());
      setBulkCheckNumber('');
  };

  const handleAIParse = async () => {
    if(!aiImportText.trim()) return;
    setIsProcessingAI(true);
    try {
        const result = await parseInvoiceFromText(aiImportText, aiInstructions);
        if(result) {
            handleParsedInvoice(result);
            setShowAIImport(false);
            setAiImportText('');
            setAiInstructions('');
        } else {
            alert("Could not extract data. Please try again.");
        }
    } catch(e) {
        alert("AI Processing Failed");
    } finally {
        setIsProcessingAI(false);
    }
  };

  const handleParsedInvoice = (result: Partial<Invoice>) => {
      setCurrentInvoice({
          ...result,
          // Ensure defaults
          id: crypto.randomUUID(),
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          date: result.date || getLocalTodayDate(),
          dueDate: result.dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          status: 'draft',
          total: (result.items || []).reduce((acc: number, i: any) => acc + (i.amount || 0), 0)
      });
      setIsCreating(true);
      setActiveFab('none');
  };

  const generateLinkForForm = async () => {
      if (!currentInvoice.clientName || !currentInvoice.total) {
          alert("Cannot generate link: Client Name and Total are required.");
          return;
      }
      
      setIsGeneratingLink(true);
      try {
          const invNum = currentInvoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
          const url = await api.invoices.createPaymentLink(invNum, currentInvoice.total, currentInvoice.clientName);
          
          // Update the current form state
          setCurrentInvoice(prev => ({ ...prev, paymentLink: url }));
      } catch (e: any) {
          alert("Failed to create link: " + e.message);
      } finally {
          setIsGeneratingLink(false);
      }
  };

  const menuActions: ActionItem[] = [
    { label: 'New Invoice', icon: <Plus size={20} />, onClick: handleCreate },
    { label: 'Filter & Sort', icon: <SlidersHorizontal size={20} />, onClick: () => toggleFab('filter') },
    { label: 'Import CSV', icon: <Upload size={20} />, onClick: () => fileInputRef.current?.click() },
    { label: 'AI Import (Text)', icon: <Sparkles size={20} />, onClick: () => setShowAIImport(true) },
    { label: 'Scan Doc/Email', icon: <ScanText size={20} />, onClick: () => setShowInvoiceScanner(true) },
    { label: 'Scan Check', icon: <Camera size={20} />, onClick: () => setShowCheckScanner(true) },
    { label: 'Backup Data', icon: <Database size={20} />, onClick: onBackup },
  ];

  const handleCheckScanPayments = (invoiceIds: string[], checkNumber: string) => {
     const today = getLocalTodayDate();
     invoiceIds.forEach(id => {
         const inv = invoices.find(i => i.id === id);
         if (inv) {
             onUpdate({ 
                 ...inv, 
                 status: 'paid', 
                 checkNumber,
                 datePaid: today
             });
             
             // If this invoice was being edited, close it to avoid conflict
             if (expandedId === id) {
                 setExpandedId(null);
                 setCurrentInvoice({});
             }
         }
     });
     alert(`Processed ${invoiceIds.length} invoices with check #${checkNumber}`);
  };

  // Reusable Form Render Logic
  const renderInvoiceForm = (isInline: boolean) => {
      const items = currentInvoice.items || [];
      const total = items.reduce((sum, i) => sum + i.amount, 0);
      
      return (
        <div className={isInline ? "pt-4" : "space-y-4"}>
            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-surface-outline dark:text-gray-400 font-medium ml-1">Client</label>
                    {!currentInvoice.id ? (
                        <>
                        <input list="clients-list" value={currentInvoice.clientName || ''} onChange={e => setCurrentInvoice({...currentInvoice, clientName: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary" placeholder="Select or type client name"/>
                        <datalist id="clients-list">
                            {clients.map(c => <option key={c.id} value={c.companyName} />)}
                        </datalist>
                        </>
                    ) : (
                        <div className="w-full bg-surface-container dark:bg-gray-700 px-4 py-2 rounded-xl text-surface-on dark:text-gray-200 font-medium">
                            {currentInvoice.clientName}
                        </div>
                    )}
                </div>
                <div>
                    <label className="text-xs text-surface-outline dark:text-gray-400 font-medium ml-1">Invoice #</label>
                    <input value={currentInvoice.invoiceNumber} onChange={e => setCurrentInvoice({...currentInvoice, invoiceNumber: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary"/>
                </div>
                <div>
                    <label className="text-xs text-surface-outline dark:text-gray-400 font-medium ml-1">Date</label>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(true)}
                      className="w-full bg-transparent dark:bg-transparent rounded-lg px-3 py-2.5 text-sm text-surface-on dark:text-gray-100 border-2 border-surface-outline-variant dark:border-gray-600 hover:border-surface-on dark:hover:border-gray-500 focus-within:border-primary dark:focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 dark:focus-within:ring-primary/20 outline-none transition-all cursor-pointer flex items-center justify-between"
                    >
                      <span>{currentInvoice.date ? new Date(currentInvoice.date).toLocaleDateString() : 'Select date'}</span>
                      <CalendarIcon className="h-4 w-4 text-surface-on-variant dark:text-gray-400 flex-shrink-0" />
                    </button>
                </div>
                <div>
                    <label className="text-xs text-surface-outline dark:text-gray-400 font-medium ml-1">Due Date</label>
                    <button
                      type="button"
                      onClick={() => setShowDueDatePicker(true)}
                      className="w-full bg-transparent dark:bg-transparent rounded-lg px-3 py-2.5 text-sm text-surface-on dark:text-gray-100 border-2 border-surface-outline-variant dark:border-gray-600 hover:border-surface-on dark:hover:border-gray-500 focus-within:border-primary dark:focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 dark:focus-within:ring-primary/20 outline-none transition-all cursor-pointer flex items-center justify-between"
                    >
                      <span>{currentInvoice.dueDate ? new Date(currentInvoice.dueDate).toLocaleDateString() : 'Select date'}</span>
                      <CalendarIcon className="h-4 w-4 text-surface-on-variant dark:text-gray-400 flex-shrink-0" />
                    </button>
                </div>
                {/* Date Paid - Visible only if Paid */}
                {currentInvoice.status === 'paid' && (
                    <div>
                        <label className="text-xs text-surface-outline dark:text-gray-400 font-medium ml-1">Date Paid</label>
                        <button
                          type="button"
                          onClick={() => setShowDatePaidPicker(true)}
                          className="w-full bg-transparent dark:bg-transparent rounded-lg px-3 py-2.5 text-sm text-surface-on dark:text-gray-100 border-2 border-surface-outline-variant dark:border-gray-600 hover:border-surface-on dark:hover:border-gray-500 focus-within:border-primary dark:focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 dark:focus-within:ring-primary/20 outline-none transition-all cursor-pointer flex items-center justify-between"
                        >
                          <span>{currentInvoice.datePaid ? new Date(currentInvoice.datePaid).toLocaleDateString() : 'Select date'}</span>
                          <CalendarIcon className="h-4 w-4 text-surface-on-variant dark:text-gray-400 flex-shrink-0" />
                        </button>
                    </div>
                )}
                <div>
                    <label className="text-xs text-surface-outline dark:text-gray-400 font-medium ml-1">Address</label>
                    <input type="text" value={currentInvoice.projectDetails || ''} onChange={e => setCurrentInvoice({...currentInvoice, projectDetails: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary"/>
                </div>
            </div>
            
            <div className="mb-6 mt-6">
                <h4 className="text-lg font-medium mb-3 ml-1">Items</h4>
                {items.map((item) => (
                    <div key={item.id} className="flex flex-col md:flex-row gap-2 mb-2 items-start border-b border-surfaceContainerHigh/30 pb-4 md:pb-0 md:border-none last:border-none">
                    <input placeholder="Description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="w-full md:flex-grow bg-surface-container dark:bg-gray-700 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary"/>
                    <div className="flex gap-2 w-full md:w-auto items-center">
                        <input 
                            type="number" 
                            placeholder="Qty" 
                            value={item.quantity} 
                            onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))} 
                            className="w-12 bg-surface-container dark:bg-gray-700 px-2 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="relative flex-1 md:w-28">
                            <input 
                                type="number" 
                                placeholder="Rate" 
                                value={item.rate}
                                onChange={(e) => updateItem(item.id, 'rate', Number(e.target.value))} 
                                className="w-full bg-surface-container dark:bg-gray-700 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                            />
                        </div>
                        <button onClick={() => deleteItem(item.id)} className="p-2 h-[42px] w-[42px] flex items-center justify-center bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800/30 rounded-full transition-colors shrink-0"><Trash2 size={18} className="text-red-950 dark:text-red-50" style={{ color: 'rgb(127, 29, 29)' }} /></button>
                    </div>
                    </div>
                ))}
                <Button variant="tonal" onClick={handleAddItem} className="mt-2" icon={<Plus size={16} />}>Add Item</Button>
            </div>

            {/* Payment Link Section */}
            <div className="flex flex-col gap-2 pt-4 border-t border-surfaceContainerHigh mb-2">
                <div className="flex justify-start items-center gap-2">
                    {currentInvoice.paymentLink ? (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200">
                            <Check size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider">Payment Link Active</span>
                            <button 
                                onClick={() => setCurrentInvoice(prev => ({ ...prev, paymentLink: undefined }))}
                                className="ml-1 p-1 hover:bg-green-100 rounded-full"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <Button 
                            variant="tonal" 
                            onClick={generateLinkForForm} 
                            disabled={isGeneratingLink || !total}
                            icon={isGeneratingLink ? <Loader2 className="animate-spin" /> : <CreditCard size={16} />}
                            className="h-8 text-xs"
                        >
                            Create Square Payment Link
                        </Button>
                    )}

                    {/* Manual Link Entry Toggle */}
                    <button 
                        onClick={() => setShowManualLinkInput(!showManualLinkInput)}
                        className="p-2 bg-surface-container-high dark:bg-gray-600 hover:bg-surface-container dark:bg-gray-700 text-primary rounded-full transition-colors"
                        title="Enter Link Manually"
                    >
                        <Pencil size={14} />
                    </button>
                </div>
                
                {/* Manual Link Input */}
                {showManualLinkInput && (
                    <div className="flex items-center gap-2 animate-slide-up">
                        <input 
                            type="text"
                            placeholder="Paste payment URL here..."
                            value={currentInvoice.paymentLink || ''}
                            onChange={(e) => setCurrentInvoice(prev => ({ ...prev, paymentLink: e.target.value }))}
                            className="w-full bg-surface-container dark:bg-gray-700 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center pt-2 gap-4">
                <div className="h-9 px-6 rounded-full bg-primary text-primary-on text-sm font-medium flex items-center justify-center">Total: ${total.toFixed(0)}</div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => {
                          if (isInline) {
                            setExpandedId(null);
                          } else {
                            setIsCreating(false);
                            updateSearchParams({ invoiceId: null }); // Close modal via URL
                          }
                        }} 
                        disabled={isSaving} 
                        className="flex-1 md:flex-none h-9 px-6 rounded-full bg-primary text-primary-on hover:bg-primary/90 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex-1 md:flex-none h-9 px-6 rounded-full bg-primary text-primary-on hover:bg-primary/90 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : null}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
            
            {/* Calendar Pickers */}
            {showDatePicker && (
              <CalendarPicker
                isOpen={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                selectedDate={currentInvoice.date ? new Date(currentInvoice.date) : null}
                onSelectDate={(date) => {
                  setCurrentInvoice({...currentInvoice, date: date.toISOString().split('T')[0]});
                }}
              />
            )}
            {showDueDatePicker && (
              <CalendarPicker
                isOpen={showDueDatePicker}
                onClose={() => setShowDueDatePicker(false)}
                selectedDate={currentInvoice.dueDate ? new Date(currentInvoice.dueDate) : null}
                onSelectDate={(date) => {
                  setCurrentInvoice({...currentInvoice, dueDate: date.toISOString().split('T')[0]});
                }}
              />
            )}
            {showDatePaidPicker && (
              <CalendarPicker
                isOpen={showDatePaidPicker}
                onClose={() => setShowDatePaidPicker(false)}
                selectedDate={currentInvoice.datePaid ? new Date(currentInvoice.datePaid) : null}
                onSelectDate={(date) => {
                  setCurrentInvoice({...currentInvoice, datePaid: date.toISOString().split('T')[0]});
                }}
              />
            )}
        </div>
      );
  };

  const InvoiceRow: React.FC<{ inv: Invoice, expanded: boolean, onExpand: () => void, children?: React.ReactNode }> = ({ inv, expanded, onExpand, children }) => {
    const commonPillClass = "h-8 px-3 rounded-full text-xs font-medium flex items-center justify-center whitespace-nowrap";
    const commonBtnClass = "h-8 w-8 rounded-full flex items-center justify-center transition-colors shadow-sm border-0";
    
    // Long-press state for mobile
    const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const touchStartPosRef = React.useRef<{ x: number; y: number } | null>(null);
    const longPressOccurredRef = React.useRef<boolean>(false);
    
    const handleTouchStart = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      longPressOccurredRef.current = false;
      
      longPressTimerRef.current = setTimeout(() => {
        // Long-press detected - enter multiselect mode and select this invoice
        longPressOccurredRef.current = true;
        toggleSelect(inv.id);
        // Provide haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, 500); // 500ms for long-press
    };
    
    const handleTouchMove = (e: React.TouchEvent) => {
      // Cancel long-press if user moves finger too much
      if (touchStartPosRef.current) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
        
        if (deltaX > 10 || deltaY > 10) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      }
    };
    
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      
      // If it was a long-press, prevent the default click behavior
      if (longPressOccurredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        longPressOccurredRef.current = false;
      }
      
      touchStartPosRef.current = null;
    };
    
    const handleMobileClick = (e: React.MouseEvent) => {
      // If in multiselect mode, toggle selection on click
      if (selectedIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        toggleSelect(inv.id);
      } else {
        // Otherwise, expand the invoice
        onExpand();
      }
    };
    
    React.useEffect(() => {
      return () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }
      };
    }, []);

    return (
        <div className={`transition-all duration-300 ${expanded ? 'my-4' : 'my-1'}`}>
            
            {/* DESKTOP ROW (Hidden on Mobile) */}
            <div 
              className={`hidden md:flex flex-wrap items-center gap-2 p-3 bg-surface dark:bg-gray-800 border border-surface-outline-variant dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer ${expanded ? '!rounded-t-3xl !rounded-b-none border-b-0 shadow-none mb-0' : 'rounded-3xl'}`}
              onClick={onExpand}
            >
                
                {/* Checkbox */}
                <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                    <div 
                        onClick={() => toggleSelect(inv.id)}
                        className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${selectedIds.has(inv.id) ? 'bg-primary border-primary' : 'border-surface-outline/50 dark:border-gray-600 hover:border-surface-outline dark:hover:border-gray-500'}`}
                    >
                        {selectedIds.has(inv.id) && <X size={12} className="text-white rotate-45" strokeWidth={4} />}
                    </div>
                </div>

                {/* Status */}
                <div className="shrink-0 flex-initial w-auto">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase block text-center ${
                        inv.status === 'paid' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                        inv.status === 'sent' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>{inv.status}</span>
                </div>

                 {/* Total (Moved next to status as requested previously for desktop too) */}
                 <div className="shrink-0 flex-initial w-auto">
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs font-bold block text-center">${inv.total.toFixed(0)}</span>
                </div>

                {/* Invoice # */}
                <div className="shrink-0 flex-initial w-auto">
                    <span className="bg-surface-container dark:bg-gray-700 px-2 py-1 rounded-full text-xs font-medium text-surface-on dark:text-gray-200 block text-center">{inv.invoiceNumber}</span>
                </div>

                {/* Issued Date */}
                <div className="shrink-0 flex-initial w-auto">
                    <span className="bg-surface-container dark:bg-gray-700 px-2 py-1 rounded-full text-xs font-medium text-surface-on dark:text-gray-200 block text-center">{formatDate(inv.date)}</span>
                </div>

                {/* Due Date OR Paid Date */}
                <div className="shrink-0 flex-initial w-auto">
                    {inv.status === 'paid' && inv.datePaid ? (
                        <span className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full text-xs font-medium text-green-800 dark:text-green-200 block text-center">Paid: {formatDate(inv.datePaid)}</span>
                    ) : (
                        <span className="bg-surface-container dark:bg-gray-700 px-2 py-1 rounded-full text-xs font-medium text-surface-on dark:text-gray-200 block text-center">Due: {formatDate(inv.dueDate)}</span>
                    )}
                </div>

                {/* Builder */}
                <div className="flex-initial w-auto">
                    <span className="bg-surface-container dark:bg-gray-700 px-2 py-1 rounded-full text-xs font-medium text-surface-on dark:text-gray-200 block max-w-[150px] truncate">{inv.clientName}</span>
                </div>

                {/* Project (Pill - Dynamic Layout) */}
                <div className="flex-1 min-w-0">
                    <span className={`bg-surface-container dark:bg-gray-700 px-2 py-1 rounded-full text-xs font-medium text-surface-on dark:text-gray-200 truncate block w-fit max-w-full ${!inv.projectDetails ? 'text-transparent select-none' : ''}`}>
                        {inv.projectDetails || 'Address'}
                    </span>
                </div>
                
                {/* Check Number Input */}
                <div className="shrink-0 w-24 ml-2">
                    <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        defaultValue={inv.checkNumber || ''}
                        placeholder="Check #"
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                            if (e.target.value !== (inv.checkNumber || '')) {
                                onUpdate({ ...inv, checkNumber: e.target.value });
                            }
                        }}
                        onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                                 e.currentTarget.blur();
                             }
                        }}
                        className="w-full h-8 px-3 py-2 rounded-full text-xs font-medium bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary focus:ring-inset placeholder:text-surface-outline dark:placeholder:text-gray-400 text-center"
                    />
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <div className="hidden md:flex gap-1 flex-wrap justify-center">
                        {inv.status !== 'paid' && (
                            <button onClick={() => handleMarkAsPaid(inv)} className={`${commonBtnClass} border border-surface-outline text-primary bg-surface dark:bg-gray-800 hover:bg-primary/10`} title="Mark as Paid">
                                <Check size={16} />
                            </button>
                        )}
                        <button onClick={() => handlePrepareEmail(inv)} className={`${commonBtnClass} border border-surface-outline text-primary bg-surface dark:bg-gray-800 hover:bg-primary/10`} title="Email Invoice">
                            <Mail size={16} />
                        </button>
                        <button onClick={() => window.innerWidth > 768 ? handleDownloadPDF(inv) : handleShare(inv)} className={`${commonBtnClass} border border-surface-outline text-primary bg-surface dark:bg-gray-800 hover:bg-primary/10`} title="Download PDF">
                            <Download size={16} />
                        </button>
                         <button className={`${commonBtnClass} border border-surface-outline text-primary bg-surface dark:bg-gray-800 hover:bg-primary/10`} onClick={() => handleDeleteInvoice(inv.id)} title="Delete">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* MOBILE CARD (Hidden on Desktop) - 3 ROW LAYOUT */}
            <div 
              className={`md:hidden flex flex-col gap-2 p-3 bg-surface dark:bg-gray-800 border border-surface-outline-variant dark:border-gray-700 shadow-sm ${expanded ? '!rounded-t-3xl !rounded-b-none border-b-0 shadow-none mb-0' : 'rounded-3xl'} ${selectedIds.has(inv.id) ? 'ring-2 ring-primary' : ''}`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleMobileClick}
            >
                 {/* Row 1: Status, Invoice#, Date, Due, Total ... Checkbox */}
                 <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0 flex-1" style={{ paddingRight: '8px', WebkitOverflowScrolling: 'touch' }}>
                        {/* Status */}
                        <span className={`${commonPillClass} ${
                            inv.status === 'paid' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                            inv.status === 'sent' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        } uppercase shrink-0`}>{inv.status}</span>
                        
                        {/* Invoice # */}
                        <span className={`${commonPillClass} bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-200 shrink-0`}>{inv.invoiceNumber}</span>
                        
                        {/* Date */}
                        <span className={`${commonPillClass} bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-200 shrink-0`}>{formatDateMobile(inv.date)}</span>
                        
                        {/* Due Date OR Paid Date */}
                        {inv.status === 'paid' && inv.datePaid ? (
                             <span className={`${commonPillClass} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 shrink-0`}>Paid: {formatDateMobile(inv.datePaid)}</span>
                        ) : (
                             <span className={`${commonPillClass} bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-200 shrink-0`}>Due: {formatDateMobile(inv.dueDate)}</span>
                        )}

                        {/* Total (Moved Here) */}
                        <span className={`${commonPillClass} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200`} style={{ flexShrink: 0, minWidth: 'max-content' }}>${inv.total.toFixed(0)}</span>
                    </div>

                    {/* Checkbox (Right Side) - Hidden on mobile, shown on desktop */}
                    <div onClick={(e) => {e.stopPropagation(); toggleSelect(inv.id)}} className="h-8 w-8 shrink-0 hidden md:flex items-center justify-center pl-1">
                         <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.has(inv.id) ? 'bg-primary border-primary' : 'border-surface-outline/50 dark:border-gray-600'}`}>
                            {selectedIds.has(inv.id) && <X size={12} className="text-white rotate-45" strokeWidth={4} />}
                        </div>
                    </div>
                    
                    {/* Selection indicator for mobile (when in multiselect mode) */}
                    {selectedIds.has(inv.id) && (
                      <div className="h-8 w-8 shrink-0 md:hidden flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-primary border-2 border-primary flex items-center justify-center">
                          <X size={12} className="text-white rotate-45" strokeWidth={4} />
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Row 2: Builder, Check #, Project */}
                 <div className="flex items-center gap-2 w-full overflow-hidden">
                    {/* Builder - shrinkable, max 40% */}
                    <div className="h-8 px-3 rounded-full text-xs font-medium bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-200 inline-flex items-center justify-center min-w-0 shrink-0 max-w-[30%]">
                        <span className="truncate min-w-0">
                           <span className="truncate">{inv.clientName}</span>
                        </span>
                    </div>
                    
                    {/* Check # Input */}
                    <input
                        type="text"
                        defaultValue={inv.checkNumber || ''}
                        placeholder="Check #"
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                            if (e.target.value !== (inv.checkNumber || '')) {
                                onUpdate({ ...inv, checkNumber: e.target.value });
                            }
                        }}
                        onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                }
                        }}
                        className="h-8 w-20 px-2 rounded-full text-xs font-medium bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary placeholder:text-surface-outline dark:placeholder:text-gray-400 shrink-0 text-center"
                    />

                    {/* Project - grows to fill right side */}
                    {inv.projectDetails && (
                        <div className="h-8 px-3 rounded-full text-xs font-medium bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-200 flex-grow inline-flex items-center justify-start min-w-0">
                             <span className="truncate min-w-0 w-full">
                                <span className="truncate">{inv.projectDetails}</span>
                             </span>
                        </div>
                    )}
                 </div>

                 {/* Row 3: Paid, Email, Download, Delete (Centered) */}
                 <div className="flex items-center justify-center mt-1 gap-2">
                    {inv.status !== 'paid' && (
                        <button className={`${commonBtnClass} border border-surface-outline text-primary bg-surface dark:bg-gray-800 hover:bg-primary/10`} onClick={() => handleMarkAsPaid(inv)}><Check size={16} /></button>
                    )}
                    <button className={`${commonBtnClass} border border-surface-outline text-primary bg-surface dark:bg-gray-800 hover:bg-primary/10`} onClick={() => handlePrepareEmail(inv)}><Mail size={16} /></button>
                    <button className={`${commonBtnClass} border border-surface-outline text-primary bg-surface dark:bg-gray-800 hover:bg-primary/10`} onClick={() => handleDownloadPDF(inv)}><Download size={16} /></button>
                    <button className={`${commonBtnClass} border border-surface-outline text-primary bg-surface dark:bg-gray-800 hover:bg-primary/10`} onClick={() => handleDeleteInvoice(inv.id)}><Trash2 size={16} /></button>
                 </div>
            </div>

            {/* Expanded Editor Inline */}
            {expanded && (
                <div className="bg-surface dark:bg-gray-800 border border-surface-outline-variant dark:border-gray-700 border-t-0 !rounded-t-none !rounded-b-3xl p-4 animate-slide-down -mt-px">
                    <div className="flex flex-col gap-4">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
  };

  if (isCreating) {
      return (
          <div className="animate-slide-up pb-32">
              <Card title='New Invoice'>
                  {renderInvoiceForm(false)}
              </Card>
          </div>
      );
  }

  return (
    <div className="space-y-4 relative min-h-[calc(100vh-100px)] pb-24 max-w-7xl mx-auto">
      {/* Navigation Bar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <TabBar activeView="invoices" onNavigate={onNavigate} />
      </div>

      <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleCsvUpload}/>
      <CheckScanner isOpen={showCheckScanner} onClose={() => setShowCheckScanner(false)} clients={clients} invoices={invoices} onProcessPayments={handleCheckScanPayments} />
      
      {/* Invoice Scanner Integration */}
      <InvoiceScanner 
        isOpen={showInvoiceScanner} 
        onClose={() => setShowInvoiceScanner(false)}
        onScanComplete={handleParsedInvoice} 
      />
      
      {/* AI Import Modal */}
      {showAIImport && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-surface dark:bg-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-xl border border-surface-outline-variant dark:border-gray-700 animate-slide-up max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="text-primary" />
                    AI Import
                </h3>
                <p className="text-sm text-surface-outline dark:text-gray-400 mb-2">Paste the text from an email or document below. Gemini will extract the invoice details for you.</p>
                
                <textarea 
                    className="w-full bg-surface-container dark:bg-gray-700 p-4 rounded-xl h-40 outline-none focus:ring-2 focus:ring-primary resize-none mb-4 text-sm"
                    placeholder="Paste invoice text here..."
                    value={aiImportText}
                    onChange={e => setAiImportText(e.target.value)}
                />

                <div className="mb-6">
                    <p className="text-xs font-bold text-surface-outline dark:text-gray-400 uppercase tracking-wider mb-2">Custom Instructions (Optional)</p>
                    <textarea 
                        className="w-full bg-surface-container dark:bg-gray-700 p-3 rounded-xl h-20 outline-none focus:ring-2 focus:ring-primary resize-none text-sm placeholder-outline/50"
                        placeholder="E.g., If text says 'Lot 5', set Address to 'Lot 5 - Smith'. Always default Rate to 100."
                        value={aiInstructions}
                        onChange={e => setAiInstructions(e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="text" onClick={() => setShowAIImport(false)}>Cancel</Button>
                    <Button onClick={handleAIParse} disabled={isProcessingAI}>
                        {isProcessingAI ? <Loader2 className="animate-spin" /> : 'Process Text'}
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Email Modal */}
      {emailingInvoice && (
        <div className="fixed inset-0 z-[70] bg-black/50 dark:bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-surface dark:bg-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-surface-outline-variant dark:border-gray-700 animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-surface-on dark:text-gray-100">
                        <Mail className="text-primary" />
                        Email Invoice
                    </h3>
                    <button onClick={() => setEmailingInvoice(null)} className="p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full transition-colors text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-surface-outline dark:text-gray-400 uppercase tracking-wider ml-1 mb-1 block">To</label>
                        <input
                            type="email"
                            className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400"
                            placeholder="client@example.com"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-surface-outline dark:text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Subject</label>
                        <input
                            type="text"
                            className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-surface-outline dark:text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Message</label>
                        <textarea
                            className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary h-32 resize-none text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400"
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-surface-on-variant dark:text-gray-400 bg-surface-container dark:bg-gray-700/50 p-3 rounded-xl">
                        <Download size={16} />
                        <span>Invoice #{emailingInvoice.invoiceNumber}.pdf will be attached.</span>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="text" onClick={() => setEmailingInvoice(null)} disabled={isSendingEmail} className="text-surface-on dark:text-gray-100">Cancel</Button>
                    <Button onClick={handleSendEmail} disabled={isSendingEmail} icon={isSendingEmail ? <Loader2 className="animate-spin" /> : <Send size={16} />}>
                        {isSendingEmail ? 'Sending...' : 'Send Email'}
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 border border-primary text-primary bg-primary/10 px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-slide-up max-w-[95vw]">
              <span className="font-medium text-sm whitespace-nowrap">{selectedIds.size} Selected</span>
              <div className="h-4 w-px bg-primary/30"></div>
              
              {/* Check Input */}
              <input 
                type="text" 
                placeholder="Check #" 
                value={bulkCheckNumber}
                onChange={(e) => setBulkCheckNumber(e.target.value)}
                className="bg-white/20 text-white placeholder-white/70 px-2 py-1 rounded-lg text-sm w-24 outline-none focus:bg-white/30 transition-colors"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleBulkPay();
                    }
                }}
              />
              <button 
                onClick={handleBulkPay} 
                className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors"
                title="Mark Paid"
              >
                  <Check size={16} />
              </button>

              <div className="h-4 w-px bg-white/30 ml-1"></div>
              <button onClick={() => setSelectedIds(new Set())} className="p-1 hover:bg-white/20 rounded-full">
                  <X size={18} />
              </button>
          </div>
      )}

      {/* Filter Modal - shown when filter action is triggered from menu */}
      {activeFab === 'filter' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]" onClick={() => setActiveFab('none')}>
          <div className="w-[calc(100vw-32px)] max-w-xs flex flex-col gap-4 bg-surface-container dark:bg-gray-700 rounded-2xl p-4 shadow-xl border border-surfaceContainerHigh animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-surface-outline dark:text-gray-400 uppercase tracking-wider mb-1">Status</p>
              {(['all', 'draft', 'sent', 'paid'] as const).map(s => (
                <button key={s} onClick={() => handleFilterSelection('status', s)} className={`px-4 h-10 rounded-full text-sm font-medium flex items-center justify-start border transition-all ${statusFilter === s ? 'bg-white border-primary text-primary shadow-sm' : 'bg-gray-100 text-gray-600 hover:text-gray-900 border-transparent'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
            <div className="flex flex-col gap-2 pt-2 border-t border-surface-outline-variant/50 dark:border-gray-600">
              <p className="text-xs font-bold text-surface-outline dark:text-gray-400 uppercase tracking-wider mb-1">Sort By</p>
              {sortOptions.map(opt => (
                <button 
                  key={opt.value} 
                  onClick={() => handleFilterSelection('sort', opt.value)}
                  className={`px-4 h-10 rounded-full text-sm font-medium flex items-center justify-start border transition-all ${sortValue === opt.value ? 'bg-primary text-primary-on border-primary/30' : 'bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 border-surface-outline-variant/50 dark:border-gray-600 hover:bg-surface-container-high/80 dark:hover:bg-gray-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Removed FAB GROUP - Actions now in header dropdown menus */}

      {/* Header Stats & Controls - Reorganized for even distribution */}
      <div className="space-y-3 mb-6">
        {/* Row 1: Metrics - Evenly spaced */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {statusFilter !== 'paid' && (
            <div className="bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 border border-surface-outline-variant/50 dark:border-gray-600 px-4 h-10 rounded-full flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider">Outstanding</p>
              <p className="text-lg font-bold">${stats.outstanding.toFixed(0)}</p>
            </div>
          )}
          <div className="bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 border border-surface-outline-variant/50 dark:border-gray-600 px-4 h-10 rounded-full flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider">Revenue YTD</p>
            <p className="text-lg font-bold">${stats.ytd.toFixed(0)}</p>
          </div>
        </div>

        {/* Row 2: Search & Filters - Evenly distributed */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search - Takes 3 columns */}
          <div className="md:col-span-3 relative transition-all duration-300">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-outline dark:text-gray-400" size={20} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full bg-surface-container-high dark:bg-gray-600 pl-10 pr-10 h-10 rounded-full outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-200 placeholder:text-surface-on-variant dark:placeholder:text-gray-400 text-sm font-medium"
            />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={18} className="text-surface-outline dark:text-gray-400"/></button>}
          </div>
          
          {/* Sort Dropdown - Takes 3 columns */}
          <div className="hidden md:block md:col-span-3">
            <Dropdown 
              value={sortValue} 
              onChange={setSortValue} 
              options={sortOptions} 
              placeholder="Sort By" 
            />
          </div>
          
          {/* Status Filters - Takes 6 columns */}
          <div className="hidden md:flex md:col-span-6 items-center gap-2">
            {(['all', 'draft', 'sent', 'paid'] as const).map(s => (
              <button 
                key={s} 
                onClick={() => setStatusFilter(s)} 
                className={`flex-1 h-10 rounded-full text-sm font-medium transition-all ${
                  statusFilter === s 
                    ? 'bg-white border border-primary text-primary shadow-sm' 
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900 border border-transparent'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice List Header / Count Pill */}
      <div className="flex justify-start items-center mb-2">
          {/* Unified Count Pill on Left */}
          <span className="bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-200 px-3 py-1 rounded-full text-xs font-medium">
              {filteredInvoices.length} Invoices
          </span>
      </div>

      <div className="flex flex-col items-start w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {visibleInvoices.map(inv => {
              // Determine status for InvoiceCard
              let cardStatus: "Draft" | "Sent" | "Overdue" | "Paid" = "Draft";
              if (inv.status === 'paid') {
                cardStatus = "Paid";
              } else if (inv.status === 'sent') {
                // Check if overdue
                const today = new Date();
                const dueDate = new Date(inv.dueDate);
                if (dueDate < today) {
                  cardStatus = "Overdue";
                } else {
                  cardStatus = "Sent";
                }
              }

              return (
                <InvoiceCard
                  key={inv.id}
                  invoiceNumber={inv.invoiceNumber}
                  status={cardStatus}
                  amount={`$${inv.total.toFixed(2)}`}
                  createdDate={formatDateMobile(inv.date)}
                  dueDate={formatDateMobile(inv.dueDate)}
                  builder={inv.clientName}
                  address={inv.projectDetails}
                  checkNumber={inv.checkNumber}
                  onClick={() => {
                    updateSearchParams({ invoiceId: inv.id });
                    setCurrentInvoice(inv);
                  }}
                  onMarkPaid={(checkNum) => {
                    const today = getLocalTodayDate();
                    const updatedInv = { 
                      ...inv, 
                      status: 'paid' as const,
                      datePaid: today,
                      checkNumber: checkNum
                    };
                    onUpdate(updatedInv);
                  }}
                  onEmail={() => {
                    handlePrepareEmail(inv);
                  }}
                  onDownload={() => {
                    handleDownloadPDF(inv);
                  }}
                  onDelete={() => {
                    handleDeleteInvoice(inv.id);
                  }}
                />
              );
            })}
            {filteredInvoices.length === 0 && <div className="col-span-full text-center py-12 text-surface-outline dark:text-gray-400">No invoices found.</div>}
            
            {visibleInvoices.length < filteredInvoices.length && (
                <div className="col-span-full text-center pt-4 pb-8">
                    <Button variant="tonal" onClick={handleShowMore}>Show More</Button>
                </div>
            )}
        </div>
      </div>

      {/* Invoice Editor Modal - Full Screen on Mobile, Centered on Desktop */}
      {selectedInvoice && (
        <div 
          className="fixed inset-0 z-[250] bg-black/50 md:backdrop-blur-sm flex items-center justify-center md:p-4"
          onClick={() => {
            updateSearchParams({ invoiceId: null });
            setCurrentInvoice({});
          }}
        >
          <div 
            className="bg-surface dark:bg-gray-800 shadow-elevation-3 overflow-hidden flex flex-col
                       h-full w-full max-w-none m-0 p-0 rounded-none
                       md:max-w-4xl md:h-auto md:max-h-[90vh] md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-surface-outline-variant dark:border-gray-700 shrink-0">
              {/* Mobile: Back button on left */}
              <button
                onClick={() => {
                  updateSearchParams({ invoiceId: null });
                  setCurrentInvoice({});
                }}
                className="md:hidden p-2 -ml-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full transition-colors touch-manipulation"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
              </button>
              
              <h2 className="text-lg md:text-2xl font-semibold text-surface-on dark:text-gray-100 flex-1 md:flex-none">
                Edit Invoice {selectedInvoice.invoiceNumber}
              </h2>
              
              {/* Desktop: X button on right */}
              <button
                onClick={() => {
                  updateSearchParams({ invoiceId: null });
                  setCurrentInvoice({});
                }}
                className="hidden md:block p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-surface-on-variant dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {renderInvoiceForm(false)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
