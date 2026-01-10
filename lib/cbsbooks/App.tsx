
import React, { useState, useEffect } from 'react';
import { ViewState, Invoice, Expense, Client } from './types';
import { Invoices } from './components/Invoices';
import { Expenses } from './components/Expenses';
import { Reports } from './components/Reports';
import { Clients } from './components/Clients';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { api } from './services/api';

interface CBSBooksAppProps {
  prefillInvoice?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
}

const App: React.FC<CBSBooksAppProps> = ({ prefillInvoice }) => {
  const [view, setView] = useState<ViewState>('invoices');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Migrate localStorage data to database if API is available
  const migrateLocalStorageData = async () => {
    if (typeof window === 'undefined') return;
    
    const STORAGE_KEYS = {
      INVOICES: 'cbs_invoices',
      EXPENSES: 'cbs_expenses',
      CLIENTS: 'cbs_clients',
    };

    // Check if migration has already been done
    const migrationKey = 'cbs_localstorage_migrated';
    if (localStorage.getItem(migrationKey) === 'true') {
      return; // Already migrated
    }

    // Get data from localStorage
    const invoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || '[]');
    const clients = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || '[]');

    // Only migrate if there's data and API is available
    if ((invoices.length > 0 || expenses.length > 0 || clients.length > 0) && !api.isOffline) {
      try {
        console.log('CBS Books: Migrating localStorage data to database...');
        const response = await fetch('/api/cbsbooks/migrate-localstorage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoices, expenses, clients })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('CBS Books: Migration completed:', result);
          
          // Mark as migrated and optionally clear localStorage (keep as backup for now)
          localStorage.setItem(migrationKey, 'true');
          
          // Optionally clear localStorage after successful migration
          // Uncomment these lines if you want to clear localStorage after migration:
          // localStorage.removeItem(STORAGE_KEYS.INVOICES);
          // localStorage.removeItem(STORAGE_KEYS.EXPENSES);
          // localStorage.removeItem(STORAGE_KEYS.CLIENTS);
        }
      } catch (error) {
        console.warn('CBS Books: Failed to migrate localStorage data:', error);
        // Don't mark as migrated if it failed - will retry next time
      }
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('CBS Books: Loading data...');
      
      // Start migration in background (non-blocking)
      migrateLocalStorageData().catch(err => {
        console.warn('Background migration failed:', err);
      });
      
      // Try to load from cache first for instant display
      try {
        const cacheStartTime = performance.now();
        const [cachedInvoices, cachedExpenses, cachedClients] = await Promise.all([
          api.invoices.list(false), // Use cache
          api.expenses.list(false), // Use cache
          api.clients.list(false) // Use cache
        ]);
        
        // If we got cached data, show it immediately
        if (cachedInvoices.length > 0 || cachedExpenses.length > 0 || cachedClients.length > 0) {
          const cacheTime = performance.now() - cacheStartTime;
          console.log(`✅ Loaded from cache in ${cacheTime.toFixed(0)}ms`);
          setInvoices(cachedInvoices);
          setExpenses(cachedExpenses);
          setClients(cachedClients);
          setIsLoading(false); // Stop loading to show cached data immediately
          
          // Refresh from API in background (don't await - let it run async)
          refreshDataFromAPI().catch(err => {
            console.warn('Background refresh failed:', err);
            // Don't show error to user if we have cached data
          });
          return;
        }
      } catch (cacheError) {
        console.log('No cache available, fetching fresh data');
        // Continue to fetch fresh data below
      }
      
      // No cache available or failed - load from API
      await refreshDataFromAPI();
    } catch (err: any) {
      console.error("Failed to load data:", err);
      const errorMessage = err.message || "Unknown error occurred";
      
      // Provide helpful error messages for common issues
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('does not exist')) {
        userFriendlyMessage = `Database table missing. Please run: npm run create-cbsbooks-tables\n\nOriginal error: ${errorMessage}`;
      } else if (errorMessage.includes('Connection') || errorMessage.includes('ECONNREFUSED')) {
        userFriendlyMessage = `Cannot connect to server. Make sure the server is running on port 3000.\n\nOriginal error: ${errorMessage}`;
      } else if (errorMessage.includes('Database configuration')) {
        userFriendlyMessage = `Database not configured. Please set NETLIFY_DATABASE_URL or DATABASE_URL in your .env.local file.\n\nOriginal error: ${errorMessage}`;
      }
      
      setError(userFriendlyMessage);
      setIsLoading(false);
    }
  };

  const refreshDataFromAPI = async () => {
    try {
      const startTime = performance.now();
      
      // Load fresh data from API
      const [fetchedInvoices, fetchedExpenses, fetchedClients] = await Promise.all([
        api.invoices.list(true), // Force fresh
        api.expenses.list(true), // Force fresh
        api.clients.list(true) // Force fresh
      ]);
      
      const loadTime = performance.now() - startTime;
      console.log(`CBS Books: Fresh data loaded from API in ${loadTime.toFixed(0)}ms`);
      console.log('CBS Books: Data loaded:', {
        invoices: fetchedInvoices.length,
        expenses: fetchedExpenses.length,
        clients: fetchedClients.length
      });
      
      // Log detailed info for debugging
      if (fetchedInvoices.length === 0) {
        console.log('⚠️  No invoices found in database');
        console.log('   - Check if tables exist: npm run create-cbsbooks-tables');
        console.log('   - Check localStorage: localStorage.getItem("cbs_invoices")');
        console.log('   - Check API: http://localhost:3000/api/cbsbooks/invoices');
      } else {
        console.log('✅ Invoices loaded:', fetchedInvoices.map(i => `${i.invoiceNumber} - ${i.clientName}`));
      }
      
      setInvoices(fetchedInvoices);
      setExpenses(fetchedExpenses);
      setClients(fetchedClients);
    } catch (err: any) {
      console.error("Failed to refresh data from API:", err);
      throw err; // Re-throw so loadData can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceOffline = () => { localStorage.setItem('FORCE_OFFLINE', 'true'); window.location.reload(); };
  const handleRetry = () => { localStorage.removeItem('FORCE_OFFLINE'); window.location.reload(); };

  const handleError = (context: string, e: any) => {
      console.error(context, e);
      let msg = e.message || 'Unknown Error';
      if (msg.includes('column "check_number" of relation "invoices" does not exist')) { alert(`DATABASE UPDATE REQUIRED:\n\nThe database is missing the 'check_number' column. Please run this SQL command in Neon:\n\nALTER TABLE invoices ADD COLUMN IF NOT EXISTS check_number TEXT;`); return; }
      if (msg.includes('column "date_paid" of relation "invoices" does not exist')) { alert(`DATABASE UPDATE REQUIRED:\n\nThe database is missing the 'date_paid' column. Please run this SQL command in Neon:\n\nALTER TABLE invoices ADD COLUMN IF NOT EXISTS date_paid DATE;`); return; }
      if (msg.includes('column "check_payor_name" of relation "clients" does not exist')) { alert(`DATABASE UPDATE REQUIRED:\n\nThe database is missing the 'check_payor_name' column. Please run this SQL command in Neon:\n\nALTER TABLE clients ADD COLUMN IF NOT EXISTS check_payor_name TEXT;`); return; }
      if (msg.includes('column "address_line1" of relation "clients" does not exist')) { alert(`DATABASE UPDATE REQUIRED:\n\nThe database is missing address columns. Please run these SQL commands in Neon:\n\nALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line1 TEXT;\nALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line2 TEXT;\nALTER TABLE clients ADD COLUMN IF NOT EXISTS city TEXT;\nALTER TABLE clients ADD COLUMN IF NOT EXISTS state TEXT;\nALTER TABLE clients ADD COLUMN IF NOT EXISTS zip TEXT;`); return; }
      alert(`${context}: ${msg}`);
  };

  const handleAddInvoice = async (invoice: Invoice) => { try { const saved = await api.invoices.add(invoice); setInvoices(prev => [saved, ...prev]); } catch (e: any) { handleError('Failed to save invoice', e); } };
  const handleUpdateInvoice = async (invoice: Invoice) => { try { const updated = await api.invoices.update(invoice); setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv)); } catch (e: any) { handleError('Failed to update invoice', e); } };
  const handleDeleteInvoice = async (id: string) => { try { await api.invoices.delete(id); setInvoices(prev => prev.filter(inv => inv.id !== id)); } catch (e: any) { handleError('Failed to delete invoice', e); } };
  
  const handleBulkAddInvoices = async (newInvoices: Invoice[]) => { 
      // Optimistic UI Update
      setInvoices(prev => [...newInvoices, ...prev]); 
      
      try {
          // Optimized Bulk API Call
          await api.invoices.bulkAdd(newInvoices);
      } catch (e: any) {
          console.error("Bulk add failed", e);
          alert("Some invoices might not have been saved to the database due to a connection error. Please refresh and check.");
      }
  };

  const handleBulkDeleteInvoices = async (ids: string[]) => {
      // Optimistic Update
      setInvoices(prev => prev.filter(inv => !ids.includes(inv.id)));
      
      try {
          await api.invoices.bulkDelete(ids);
      } catch (e: any) {
          handleError('Failed to delete invoices', e);
          // Revert on failure (simplified, usually would reload data)
          loadData();
      }
  };

  const handleAddExpense = async (expense: Expense) => { try { const saved = await api.expenses.add(expense); setExpenses(prev => [saved, ...prev]); } catch (e: any) { handleError('Failed to save expense', e); } };
  const handleDeleteExpense = async (id: string) => { try { await api.expenses.delete(id); setExpenses(prev => prev.filter(e => e.id !== id)); } catch (e: any) { handleError('Failed to delete expense', e); } };
  
  const handleBulkAddExpenses = async (newExpenses: Expense[]) => { 
    setExpenses(prev => [...newExpenses, ...prev]); 
    try {
      await api.expenses.bulkAdd(newExpenses);
    } catch (e: any) {
      console.error("Bulk add expenses failed", e);
      alert("Error saving some expenses. Please check connection.");
    }
  };

  const handleBulkDeleteExpenses = async (ids: string[]) => {
    setExpenses(prev => prev.filter(e => !ids.includes(e.id)));
    try {
      await api.expenses.bulkDelete(ids);
    } catch (e: any) {
      handleError('Failed to delete expenses', e);
      loadData();
    }
  };

  const handleAddClient = async (client: Client) => { try { const saved = await api.clients.add(client); setClients(prev => [saved, ...prev]); } catch (e: any) { handleError('Failed to save builder', e); } };
  const handleUpdateClient = async (client: Client) => { try { const updated = await api.clients.update(client); setClients(prev => prev.map(c => c.id === updated.id ? updated : c)); } catch (e: any) { handleError('Failed to update builder', e); } };
  const handleDeleteClient = async (id: string) => { try { await api.clients.delete(id); setClients(prev => prev.filter(c => c.id !== id)); } catch (e: any) { handleError('Failed to delete builder', e); } };
  const handleBulkAddClients = async (newClients: Client[]) => { setClients(prev => [...newClients, ...prev]); for (const client of newClients) { await api.clients.add(client).catch(console.error); } };

  const handleFullBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        invoices,
        expenses,
        clients
      }
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cbs_books_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show UI immediately - no loading indicator needed for fast loads
  if (isLoading) {
    return (
      <div className="min-h-full bg-white dark:bg-gray-900">
        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full pb-32">
          {view === 'invoices' && <Invoices invoices={[]} clients={[]} onAdd={handleAddInvoice} onUpdate={handleUpdateInvoice} onDelete={handleDeleteInvoice} onBulkAdd={handleBulkAddInvoices} onBulkDelete={handleBulkDeleteInvoices} onNavigate={setView} onBackup={handleFullBackup} prefillInvoice={prefillInvoice} />}
          {view === 'expenses' && <Expenses expenses={[]} onAdd={handleAddExpense} onDelete={handleDeleteExpense} onBulkAdd={handleBulkAddExpenses} onBulkDelete={handleBulkDeleteExpenses} onNavigate={setView} onBackup={handleFullBackup} />}
          {view === 'clients' && <Clients clients={[]} invoices={[]} onAdd={handleAddClient} onUpdate={handleUpdateClient} onDelete={handleDeleteClient} onBulkAdd={handleBulkAddClients} onNavigate={setView} onBackup={handleFullBackup} />}
          {view === 'reports' && <Reports invoices={[]} expenses={[]} onNavigate={setView} onBackup={handleFullBackup} />}
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-full bg-surface p-4">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 max-w-md w-full shadow-sm">
          <div className="flex items-center gap-4 text-red-700 mb-4"><AlertTriangle size={32} /><h2 className="text-xl font-bold">Connection Failed</h2></div>
          <p className="text-red-900 mb-4 font-medium">Could not load application data.</p>
          <div className="bg-white/50 p-4 rounded-xl mb-6 text-sm font-mono text-red-800 break-all">{error}</div>
          <div className="space-y-4">
            <p className="text-sm text-red-700"><strong>Possible Fixes:</strong><ul className="list-disc ml-5 mt-1 space-y-1"><li>Check your internet connection.</li><li>Ensure <code>NETLIFY_DATABASE_URL</code> is set.</li></ul></p>
            <div className="flex flex-col gap-3 mt-6"><button onClick={handleForceOffline} className="w-full bg-surfaceContainerHigh hover:bg-surfaceContainer text-onSurface font-medium py-3 rounded-full flex items-center justify-center gap-2 transition-colors"><WifiOff size={18} /> Switch to Offline Mode</button><button onClick={() => window.location.reload()} className="w-full border border-primary text-primary hover:bg-primary/10 font-medium py-3 rounded-full transition-colors">Retry Connection</button></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white dark:bg-gray-900">
      {/* Only show offline banner if FORCE_OFFLINE is explicitly set, not just when using mock data */}
      {typeof window !== 'undefined' && localStorage.getItem('FORCE_OFFLINE') === 'true' && (
        <div className="sticky top-0 left-0 right-0 z-50 flex justify-center p-2">
          <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 px-4 py-2 rounded-full shadow-md text-sm font-medium flex items-center gap-2 border border-orange-200 dark:border-orange-800">
            <WifiOff size={16} />
            <span>Offline Mode</span>
            <button onClick={handleRetry} className="underline ml-2">Retry</button>
          </div>
        </div>
      )}
      
      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full pb-32">
        {view === 'invoices' && <Invoices invoices={invoices} clients={clients} onAdd={handleAddInvoice} onUpdate={handleUpdateInvoice} onDelete={handleDeleteInvoice} onBulkAdd={handleBulkAddInvoices} onBulkDelete={handleBulkDeleteInvoices} onNavigate={setView} onBackup={handleFullBackup} prefillInvoice={prefillInvoice} />}
        {view === 'expenses' && <Expenses expenses={expenses} onAdd={handleAddExpense} onDelete={handleDeleteExpense} onBulkAdd={handleBulkAddExpenses} onBulkDelete={handleBulkDeleteExpenses} onNavigate={setView} onBackup={handleFullBackup} />}
        {view === 'clients' && <Clients clients={clients} invoices={invoices} onAdd={handleAddClient} onUpdate={handleUpdateClient} onDelete={handleDeleteClient} onBulkAdd={handleBulkAddClients} onNavigate={setView} onBackup={handleFullBackup} />}
        {view === 'reports' && <Reports invoices={invoices} expenses={expenses} onNavigate={setView} onBackup={handleFullBackup} />}
      </main>
    </div>
  );
};

export default App;
