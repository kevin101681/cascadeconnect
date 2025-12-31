
import React, { useState, useRef, useMemo } from 'react';
import { Expense, ViewState } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Upload, Plus, Trash2, FileSpreadsheet, Database, SlidersHorizontal, X, PieChart, Users, Receipt, CreditCard } from 'lucide-react';
import { FloatingMenu, ActionItem } from './ui/FloatingMenu';

interface ExpensesProps {
  expenses: Expense[];
  onAdd: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onBulkAdd: (expenses: Expense[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onNavigate: (view: ViewState) => void;
  onBackup: () => void;
}

const parseCSVDate = (dateStr: string): string => {
    // Try to parse MM/DD/YYYY to YYYY-MM-DD
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Check if already YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

    // Check for MM/DD/YYYY or M/D/YYYY
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

type ActiveFab = 'none' | 'menu' | 'filter';

export const Expenses: React.FC<ExpensesProps> = ({ expenses, onAdd, onDelete, onBulkAdd, onBulkDelete, onNavigate, onBackup }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [filterTime, setFilterTime] = useState<'all' | 'month' | 'year'>('all');
  const [activeFab, setActiveFab] = useState<ActiveFab>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ date: new Date().toISOString().split('T')[0], category: 'General' });

  const toggleFab = (fab: ActiveFab) => {
    setActiveFab(prev => prev === fab ? 'none' : fab);
  };

  const handleAdd = () => {
    if (!newExpense.payee || !newExpense.amount) return;
    onAdd({ id: crypto.randomUUID(), date: newExpense.date!, payee: newExpense.payee!, category: newExpense.category!, amount: Number(newExpense.amount), description: newExpense.description } as Expense);
    setIsAdding(false);
    setNewExpense({ date: new Date().toISOString().split('T')[0], category: 'General' });
    setActiveFab('none');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newExpenses: Expense[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = parseCSVLine(line);
        if (parts.length >= 4) {
          const clean = (s: string | undefined): string => (s || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();
          newExpenses.push({ 
              id: crypto.randomUUID(), 
              date: parseCSVDate(parts[0]?.trim()), 
              payee: clean(parts[1]) || 'Unknown', 
              category: clean(parts[2]) || 'Uncategorized', 
              amount: parseFloat(parts[3]?.replace(/[$,]/g, '')) || 0, 
              description: clean(parts[4]) 
          });
        }
      }
      
      if (newExpenses.length > 0) {
          onBulkAdd(newExpenses);
          alert(`Importing ${newExpenses.length} expenses. This may take a moment.`);
      } else {
          alert("No valid expenses found in CSV.");
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };
  
  const handleClearAll = () => {
      if (expenses.length === 0) return;
      if (confirm(`Are you sure you want to delete ALL ${expenses.length} expenses? This cannot be undone.`)) {
          onBulkDelete(expenses.map(e => e.id));
      }
  };

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return expenses.filter(expense => {
      if (filterTime === 'all') return true;
      const expenseDate = new Date(expense.date);
      if (filterTime === 'year') return expenseDate.getFullYear() === currentYear;
      if (filterTime === 'month') return expenseDate.getFullYear() === currentYear && expenseDate.getMonth() === currentMonth;
      return true;
    });
  }, [expenses, filterTime]);

  const menuActions: ActionItem[] = [
      { label: 'Import CSV', icon: <Upload size={20} />, onClick: () => fileInputRef.current?.click() },
      { label: 'Clear All Expenses', icon: <Trash2 size={20} />, onClick: handleClearAll },
      { label: 'Backup Data', icon: <Database size={20} />, onClick: onBackup },
  ];

  const renderFilters = () => (
      <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
        {(['all', 'month', 'year'] as const).map((time) => (
          <button key={time} onClick={() => setFilterTime(time)} className={`px-4 h-10 rounded-full text-sm font-medium transition-all capitalize whitespace-nowrap flex items-center justify-center ${filterTime === time ? 'bg-primary text-primary-on' : 'bg-surface-container-high dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-opacity-80'}`}>
            {time === 'all' ? 'All Time' : time === 'month' ? 'This Month' : 'This Year'}
          </button>
        ))}
      </div>
  );

  return (
    <div className="flex flex-col gap-6 relative min-h-[calc(100vh-100px)]">
      {/* Navigation Bar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        {/* Left-aligned navigation buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('invoices')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 rounded-lg hover:bg-opacity-80 transition-all"
          >
            <Receipt size={18} />
            <span className="text-sm font-medium">Invoices</span>
          </button>
          <button
            onClick={() => onNavigate('clients')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 rounded-lg hover:bg-opacity-80 transition-all"
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
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-on rounded-lg transition-opacity"
          >
            <CreditCard size={18} />
            <span className="text-sm font-medium">Expenses</span>
          </button>
        </div>
        {/* Right-aligned Import CSV Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-on rounded-lg hover:opacity-90 transition-opacity"
        >
          <Upload size={18} />
          <span className="text-sm font-medium">Import CSV</span>
        </button>
      </div>

      <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload}/>
      
      <div className="block">
        {renderFilters()}
      </div>

      {isAdding && (
        <Card title="Add New Expense" className="animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/>
            <input type="text" placeholder="Payee" value={newExpense.payee || ''} onChange={e => setNewExpense({...newExpense, payee: e.target.value})} className="bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/>
            <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary">
              <option value="General">General</option><option value="Office Supplies">Office Supplies</option><option value="Travel">Travel</option><option value="Meals">Meals</option><option value="Software">Software</option><option value="Contractors">Contractors</option>
            </select>
            <input type="number" placeholder="Amount" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="bg-surface-container dark:bg-gray-700 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="text" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Save Expense</Button>
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody>
              {filteredExpenses.slice(0, 100).map(expense => (
                <tr key={expense.id} className="border-t first:border-t-0 border-surfaceContainerHigh hover:bg-surface-container dark:bg-gray-700/50 transition-colors">
                  <td className="p-4 text-sm">{expense.date}</td><td className="p-4 font-medium">{expense.payee}</td>
                  <td className="p-4"><span className="bg-secondaryContainer text-onSecondaryContainer px-2 py-1 rounded-lg text-xs font-medium">{expense.category}</span></td>
                  <td className="p-4 text-right font-medium">${expense.amount.toFixed(0)}</td>
                  <td className="p-4 text-center"><button onClick={() => onDelete(expense.id)} className="text-surface-outline dark:text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button></td>
                </tr>
              ))}
              {filteredExpenses.length > 100 && <tr><td colSpan={5} className="p-4 text-center text-surface-outline dark:text-gray-400 text-sm">Showing 100 of {filteredExpenses.length} expenses...</td></tr>}
              {filteredExpenses.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-surface-outline dark:text-gray-400"><div className="flex flex-col items-center gap-2"><FileSpreadsheet size={32} className="opacity-20"/><span>No expenses found.</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
