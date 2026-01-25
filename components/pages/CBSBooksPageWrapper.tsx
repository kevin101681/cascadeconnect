/**
 * CBS Books Page Wrapper
 * 
 * A self-contained wrapper that manages its own state and data loading.
 * This allows it to be used as a drop-in replacement for CBSBooksApp.
 * 
 * Manages invoices, clients, and expenses data internally.
 */

import React, { useState, useEffect } from 'react';
import CBSBooksPage from './CBSBooksPage';
import type { Invoice, Client, Expense } from '../../lib/financial-tools/types';
import { api } from '../../lib/financial-tools/services/api';
import { AlertTriangle, WifiOff, Loader2 } from 'lucide-react';

interface CBSBooksPageWrapperProps {
  prefillInvoice?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
}

const CBSBooksPageWrapper: React.FC<CBSBooksPageWrapperProps> = ({ prefillInvoice }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Track if initial load has completed
  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    // Only load once on mount
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadData();
    }
  }, []); // Empty deps - only run once

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('CBS Books: Loading data...');
      
      // Try to load from cache first for instant display
      try {
        const [cachedInvoices, cachedExpenses, cachedClients] = await Promise.all([
          api.invoices.list(false), // Use cache
          api.expenses.list(false), // Use cache
          api.clients.list(false) // Use cache
        ]);
        
        // If we got cached data, show it immediately
        if (cachedInvoices.length > 0 || cachedExpenses.length > 0 || cachedClients.length > 0) {
          console.log(`✅ Loaded from cache`);
          setInvoices(cachedInvoices);
          setExpenses(cachedExpenses);
          setClients(cachedClients);
          setIsLoading(false); // Stop loading to show cached data immediately
          
          // Refresh from API in background
          refreshDataFromAPI().catch(err => {
            console.warn('Background refresh failed:', err);
          });
          return;
        }
      } catch (cacheError) {
        console.log('No cache available, fetching fresh data');
      }
      
      // No cache available - load from API
      await refreshDataFromAPI();
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.message || "Failed to load data");
      setIsLoading(false);
    }
  };

  const refreshDataFromAPI = async () => {
    try {
      const [freshInvoices, freshExpenses, freshClients] = await Promise.all([
        api.invoices.list(true), // Force refresh
        api.expenses.list(true), // Force refresh
        api.clients.list(true) // Force refresh
      ]);
      
      setInvoices(freshInvoices);
      setExpenses(freshExpenses);
      setClients(freshClients);
      setIsLoading(false);
    } catch (err: any) {
      throw new Error(err.message || "Failed to refresh data");
    }
  };

  const handleError = (message: string, error: any) => {
    console.error(message, error);
    alert(`${message}: ${error.message || 'Unknown error'}`);
  };

  // Invoice handlers
  const handleAddInvoice = async (invoice: Invoice) => {
    try {
      const saved = await api.invoices.add(invoice);
      setInvoices(prev => [saved, ...prev]);
    } catch (e: any) {
      handleError('Failed to save invoice', e);
    }
  };

  const handleUpdateInvoice = async (invoice: Invoice) => {
    try {
      const updated = await api.invoices.update(invoice);
      setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
    } catch (e: any) {
      handleError('Failed to update invoice', e);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await api.invoices.delete(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } catch (e: any) {
      handleError('Failed to delete invoice', e);
    }
  };

  const handleBulkAddInvoices = async (newInvoices: Invoice[]) => {
    setInvoices(prev => [...newInvoices, ...prev]);
    for (const invoice of newInvoices) {
      await api.invoices.add(invoice).catch(console.error);
    }
  };

  const handleBulkDeleteInvoices = async (ids: string[]) => {
    setInvoices(prev => prev.filter(inv => !ids.includes(inv.id)));
    for (const id of ids) {
      await api.invoices.delete(id).catch(console.error);
    }
  };

  // Expense handlers
  const handleAddExpense = async (expense: Expense) => {
    try {
      const saved = await api.expenses.add(expense);
      setExpenses(prev => [saved, ...prev]);
    } catch (e: any) {
      handleError('Failed to save expense', e);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.expenses.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      handleError('Failed to delete expense', e);
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

  // Client handlers
  const handleAddClient = async (client: Client) => {
    try {
      const saved = await api.clients.add(client);
      setClients(prev => [saved, ...prev]);
    } catch (e: any) {
      handleError('Failed to save builder', e);
    }
  };

  const handleUpdateClient = async (client: Client) => {
    try {
      const updated = await api.clients.update(client);
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (e: any) {
      handleError('Failed to update builder', e);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await api.clients.delete(id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      handleError('Failed to delete builder', e);
    }
  };

  const handleBulkAddClients = async (newClients: Client[]) => {
    setClients(prev => [...newClients, ...prev]);
    for (const client of newClients) {
      await api.clients.add(client).catch(console.error);
    }
  };

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-surface-on-variant dark:text-gray-400">Loading CBS Books...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Failed to Load Data
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
                {error}
              </p>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render the main page
  return (
    <CBSBooksPage
      invoices={invoices}
      onAddInvoice={handleAddInvoice}
      onUpdateInvoice={handleUpdateInvoice}
      onDeleteInvoice={handleDeleteInvoice}
      onBulkAddInvoices={handleBulkAddInvoices}
      onBulkDeleteInvoices={handleBulkDeleteInvoices}
      
      clients={clients}
      onAddClient={handleAddClient}
      onUpdateClient={handleUpdateClient}
      onDeleteClient={handleDeleteClient}
      onBulkAddClients={handleBulkAddClients}
      
      expenses={expenses}
      onAddExpense={handleAddExpense}
      onDeleteExpense={handleDeleteExpense}
      onBulkAddExpenses={handleBulkAddExpenses}
      onBulkDeleteExpenses={handleBulkDeleteExpenses}
      
      onBackup={handleFullBackup}
      prefillInvoice={prefillInvoice}
    />
  );
};

export default CBSBooksPageWrapper;
