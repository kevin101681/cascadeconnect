
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  projectDetails?: string;
  paymentLink?: string; // URL for Square Checkout
  checkNumber?: string; // For payments made by check
  date: string;
  dueDate: string;
  datePaid?: string; // Date the payment was received
  items: InvoiceItem[];
  total: number;
  status: 'draft' | 'sent' | 'paid';
}

export interface Expense {
  id: string;
  date: string;
  payee: string;
  category: string;
  amount: number;
  description?: string;
}

export interface Client {
  id: string;
  companyName: string;
  checkPayorName?: string; // Alternate name found on checks
  email: string;
  
  // Expanded Address Fields
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  
  // Legacy field support
  address?: string; 
}

export type ViewState = 'invoices' | 'expenses' | 'reports' | 'clients';

export interface ChartDataPoint {
  name: string;
  income: number;
  expense: number;
  profit: number;
}