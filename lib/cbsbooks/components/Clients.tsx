
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Client, Invoice, ViewState } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Plus, Trash2, Mail, MapPin, Building, TrendingUp, AlertCircle, Banknote, Upload, Database, Search, X, Pencil, PieChart, Users, Receipt, CreditCard } from 'lucide-react';
import { FloatingMenu, ActionItem } from './ui/FloatingMenu';

interface ClientsProps {
  clients: Client[];
  invoices: Invoice[];
  onAdd: (client: Client) => void;
  onUpdate: (client: Client) => void;
  onDelete: (id: string) => void;
  onBulkAdd: (clients: Client[]) => void;
  onNavigate: (view: ViewState) => void;
  onBackup: () => void;
}

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

type ActiveFab = 'none' | 'menu' | 'search';

export const Clients: React.FC<ClientsProps> = ({ clients, invoices, onAdd, onUpdate, onDelete, onBulkAdd, onNavigate, onBackup }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<Partial<Client>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFab, setActiveFab] = useState<ActiveFab>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when search FAB is activated
  useEffect(() => {
    if (activeFab === 'search') {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeFab]);

  const toggleFab = (fab: ActiveFab) => {
    setActiveFab(prev => prev === fab ? 'none' : fab);
  };

  const handleEdit = (client: Client) => {
    setNewClient({ ...client });
    setEditingId(client.id);
    setIsAdding(true);
    // Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveFab('none');
  };

  const handleSave = () => {
    if (!newClient.companyName || !newClient.email) return;

    const clientData: Client = { 
        id: editingId || crypto.randomUUID(), 
        companyName: newClient.companyName, 
        checkPayorName: newClient.checkPayorName || '', 
        email: newClient.email, 
        addressLine1: newClient.addressLine1 || '', 
        addressLine2: newClient.addressLine2 || '', 
        city: newClient.city || '', 
        state: newClient.state || '', 
        zip: newClient.zip || '',
        address: newClient.address // Preserve existing if present, though backend will update it
    };

    if (editingId) {
        onUpdate(clientData);
    } else {
        onAdd(clientData);
    }

    setIsAdding(false);
    setNewClient({});
    setEditingId(null);
    setActiveFab('none');
  };

  const handleCancel = () => {
      setIsAdding(false);
      setNewClient({});
      setEditingId(null);
  };

  const handleDelete = (id: string) => { 
      if (confirm('Are you sure?')) {
          onDelete(id);
          // If we deleted the one being edited, close the form
          if (editingId === id) {
              handleCancel();
          }
      } 
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newClients: Client[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = parseCSVLine(line);
        if (parts.length >= 2) {
          const clean = (s: string | undefined): string => (s || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();
          newClients.push({ 
              id: crypto.randomUUID(), 
              companyName: clean(parts[0]), 
              email: clean(parts[1]), 
              addressLine1: clean(parts[2]), 
              addressLine2: clean(parts[3]), 
              city: clean(parts[4]), 
              state: clean(parts[5]), 
              zip: clean(parts[6]), 
              checkPayorName: clean(parts[7]) 
          });
        }
      }
      onBulkAdd(newClients);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const getClientFinancials = (clientName: string) => {
    const currentYear = new Date().getFullYear();
    const clientInvoices = invoices.filter(inv => inv.clientName === clientName);
    const revenueYTD = clientInvoices.filter(inv => inv.status === 'paid' && new Date(inv.date).getFullYear() === currentYear).reduce((sum, inv) => sum + inv.total, 0);
    const totalOwed = clientInvoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.total, 0);
    return { revenueYTD, totalOwed };
  };

  const renderAddress = (client: Client) => {
    if (client.addressLine1) return <span className="block">{client.addressLine1}{client.addressLine2 && <><br />{client.addressLine2}</>}<br />{client.city}, {client.state} {client.zip}</span>;
    return <span>{client.address || 'No address provided'}</span>;
  };

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const lowerQuery = searchQuery.toLowerCase();
    return clients.filter(client => 
      client.companyName.toLowerCase().includes(lowerQuery) ||
      client.email.toLowerCase().includes(lowerQuery) ||
      (client.checkPayorName && client.checkPayorName.toLowerCase().includes(lowerQuery)) ||
      (client.addressLine1 && client.addressLine1.toLowerCase().includes(lowerQuery)) ||
      (client.city && client.city.toLowerCase().includes(lowerQuery))
    );
  }, [clients, searchQuery]);

  const menuActions: ActionItem[] = [
      { label: 'Import Builders', icon: <Upload size={20} />, onClick: () => fileInputRef.current?.click() },
      { label: 'Backup Data', icon: <Database size={20} />, onClick: onBackup }
  ];

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-100px)]">
      {/* Navigation Bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => onNavigate('invoices')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 rounded-lg hover:bg-opacity-80 transition-all"
        >
          <Receipt size={18} />
          <span className="text-sm font-medium">Invoices</span>
        </button>
        <button
          onClick={() => onNavigate('clients')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-on rounded-lg transition-opacity"
        >
          <Users size={18} />
          <span className="text-sm font-medium">Builders</span>
        </button>
        <button
          onClick={() => onNavigate('reports')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 rounded-lg hover:bg-opacity-80 transition-all"
        >
          <PieChart size={18} />
          <span className="text-sm font-medium">Profit and Loss</span>
        </button>
        <button
          onClick={() => onNavigate('expenses')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 rounded-lg hover:bg-opacity-80 transition-all"
        >
          <CreditCard size={18} />
          <span className="text-sm font-medium">Expenses</span>
        </button>
      </div>

      <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload}/>
      
      {/* FAB GROUP */}
      <div className="fixed bottom-8 right-8 z-50 flex items-end gap-3">
        {/* Search FAB */}
        <button 
            onClick={() => toggleFab('search')}
            className="md:hidden w-14 h-14 bg-primary text-primary-on rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
            {activeFab === 'search' ? <X size={24} /> : <Search size={24} />}
        </button>

        {/* Menu FAB */}
        <FloatingMenu 
          currentView="clients" 
          onNavigate={onNavigate} 
          customActions={menuActions}
          isOpen={activeFab === 'menu'}
          onToggle={(open) => setActiveFab(open ? 'menu' : 'none')}
        />

        <button 
            onClick={() => {
                setEditingId(null);
                setNewClient({});
                setIsAdding(true);
            }} 
            className="w-14 h-14 bg-primary text-primary-on rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" 
            title="Add Builder"
        >
            <Plus size={24} />
        </button>
      </div>

      {/* Search Bar - Hidden on Mobile unless Toggled */}
      <div className={`transition-all duration-300 -mt-2 ${activeFab === 'search' ? 'block' : 'hidden md:block'}`}>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={20} className="text-surface-outline dark:text-gray-400" />
            </div>
            <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search builders..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container dark:bg-gray-700 pl-10 pr-10 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-200 placeholder-outline/50 transition-all shadow-sm"
            />
            {searchQuery && (
                <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center p-1 text-surface-outline dark:text-gray-400 hover:text-surface-on dark:text-gray-200"
                >
                <X size={18} />
                </button>
            )}
          </div>
       </div>

      {isAdding && (
        <Card title={editingId ? "Edit Builder" : "Add New Builder"} className="animate-slide-up">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="block text-xs font-medium text-surface-outline dark:text-gray-400 mb-1">Builder Name</label><input type="text" value={newClient.companyName || ''} onChange={e => setNewClient({...newClient, companyName: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/></div>
              <div className="md:col-span-2"><label className="block text-xs font-medium text-surface-outline dark:text-gray-400 mb-1">Email</label><input type="email" value={newClient.email || ''} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/></div>
              <div><label className="block text-xs font-medium text-surface-outline dark:text-gray-400 mb-1">Address Line 1</label><input type="text" value={newClient.addressLine1 || ''} onChange={e => setNewClient({...newClient, addressLine1: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/></div>
              <div><label className="block text-xs font-medium text-surface-outline dark:text-gray-400 mb-1">Address Line 2</label><input type="text" value={newClient.addressLine2 || ''} onChange={e => setNewClient({...newClient, addressLine2: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/></div>
              <div><label className="block text-xs font-medium text-surface-outline dark:text-gray-400 mb-1">City</label><input type="text" value={newClient.city || ''} onChange={e => setNewClient({...newClient, city: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/></div>
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-surface-outline dark:text-gray-400 mb-1">State</label><input type="text" value={newClient.state || ''} onChange={e => setNewClient({...newClient, state: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/></div>
                  <div><label className="block text-xs font-medium text-surface-outline dark:text-gray-400 mb-1">Zip</label><input type="text" value={newClient.zip || ''} onChange={e => setNewClient({...newClient, zip: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/></div>
              </div>
              <div className="md:col-span-2"><label className="block text-xs font-medium text-surface-outline dark:text-gray-400 mb-1">Name on Check (Optional)</label><input type="text" value={newClient.checkPayorName || ''} onChange={e => setNewClient({...newClient, checkPayorName: e.target.value})} className="w-full bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary" placeholder="If different from Builder Name"/></div>
           </div>
           <div className="mt-6 flex justify-end gap-3"><Button variant="text" onClick={handleCancel}>Cancel</Button><Button onClick={handleSave}>{editingId ? "Update Builder" : "Save Builder"}</Button></div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {filteredClients.map(client => {
          const { revenueYTD, totalOwed } = getClientFinancials(client.companyName);
          return (
            <Card key={client.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 text-primary font-medium"><Building size={20} /><h3 className="text-lg text-surface-on dark:text-gray-200">{client.companyName}</h3></div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(client)} className="text-surface-outline dark:text-gray-400 hover:text-primary transition-colors p-2 hover:bg-surface-container dark:bg-gray-700 rounded-full"><Pencil size={18} /></button>
                    <button onClick={() => handleDelete(client.id)} className="text-surface-outline dark:text-gray-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-surface-outline dark:text-gray-400 mb-6">
                   {client.checkPayorName && <div className="flex items-start gap-3 text-xs bg-surface-container dark:bg-gray-700 px-2 py-1 rounded"><Banknote size={14} className="mt-0.5 shrink-0" /><span>Checks pay from: <strong>{client.checkPayorName}</strong></span></div>}
                  <div className="flex items-start gap-3"><MapPin size={16} className="mt-0.5 shrink-0" />{renderAddress(client)}</div>
                  <div className="flex items-center gap-3"><Mail size={16} className="shrink-0" /><a href={`mailto:${client.email}`} className="hover:text-primary transition-colors">{client.email}</a></div>
                </div>
              </div>
              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 space-y-3 mt-auto">
                 <div className="flex justify-between items-center text-sm"><div className="flex items-center gap-2 text-surface-outline dark:text-gray-400"><TrendingUp size={16} /><span>Revenue {new Date().getFullYear()}</span></div><span className="font-medium text-surface-on dark:text-gray-200">${revenueYTD.toFixed(0)}</span></div>
                 <div className="w-full h-px bg-surface-container dark:bg-gray-700High"></div>
                 <div className="flex justify-between items-center text-sm"><div className="flex items-center gap-2 text-surface-outline dark:text-gray-400"><AlertCircle size={16} /><span>Total Owed</span></div><span className={`font-medium ${totalOwed > 0 ? 'text-red-600' : 'text-surface-on dark:text-gray-200'}`}>${totalOwed.toFixed(0)}</span></div>
              </div>
            </Card>
          );
        })}
        {filteredClients.length === 0 && (
            <div className="col-span-full text-center py-12 text-surface-outline dark:text-gray-400">
                <p>No builders found matching "{searchQuery}"</p>
            </div>
        )}
      </div>
    </div>
  );
};
