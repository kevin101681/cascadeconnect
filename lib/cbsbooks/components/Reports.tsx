
import React, { useMemo, useState } from 'react';
import { Invoice, Expense, ViewState } from '../types';
import { Card } from './ui/Card';
import { Dropdown } from './ui/Dropdown';
import { Download, Database, SlidersHorizontal, X, PieChart, Users, Receipt, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';
import { FloatingMenu, ActionItem } from './ui/FloatingMenu';

interface ReportsProps {
  invoices: Invoice[];
  expenses: Expense[];
  onNavigate: (view: ViewState) => void;
  onBackup: () => void;
}

type FilterType = 'Monthly' | 'Quarterly' | 'YTD' | 'Yearly';
type ActiveFab = 'none' | 'menu' | 'filter';

export const Reports: React.FC<ReportsProps> = ({ invoices, expenses, onNavigate, onBackup }) => {
  const [filterType, setFilterType] = useState<FilterType>('Monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3));
  const [activeFab, setActiveFab] = useState<ActiveFab>('none');

  const toggleFab = (fab: ActiveFab) => {
    setActiveFab(prev => prev === fab ? 'none' : fab);
  };

  const filteredData = useMemo(() => {
    let startDate: Date;
    let endDate: Date;
    let dateLabel = '';

    if (filterType === 'Monthly') {
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth + 1, 0); 
      dateLabel = startDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    } else if (filterType === 'Quarterly') {
      startDate = new Date(selectedYear, selectedQuarter * 3, 1);
      endDate = new Date(selectedYear, (selectedQuarter * 3) + 3, 0);
      dateLabel = `Q${selectedQuarter + 1} ${selectedYear}`;
    } else if (filterType === 'Yearly') {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31);
      dateLabel = `${selectedYear}`;
    } else {
      startDate = new Date(new Date().getFullYear(), 0, 1);
      endDate = new Date();
      dateLabel = `YTD ${new Date().getFullYear()}`;
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const filteredInvoices = invoices.filter(inv => inv.date >= startStr && inv.date <= endStr);
    const filteredExpenses = expenses.filter(exp => exp.date >= startStr && exp.date <= endStr);

    const totalIncome = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const expenseCategories = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses, expenseCategories, dateLabel };
  }, [invoices, expenses, filterType, selectedYear, selectedMonth, selectedQuarter]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();
    doc.setFontSize(22); doc.setTextColor(79, 120, 130); doc.text('Profit & Loss Statement', 14, 20);
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Generated on: ${today}`, 14, 30); doc.text(`Period: ${filteredData.dateLabel}`, 14, 35); doc.text('CBS Books', 14, 40);
    let y = 55;
    doc.setFontSize(14); doc.setTextColor(0); doc.text('Income', 14, y); y += 10;
    doc.setFontSize(11); doc.text('Total Sales', 20, y); doc.text(`$${filteredData.totalIncome.toFixed(0)}`, 160, y); y += 15;
    doc.setDrawColor(200); doc.line(14, y-5, 196, y-5);
    doc.setFontSize(14); doc.text('Operating Expenses', 14, y); y += 10;
    doc.setFontSize(11);
    Object.entries(filteredData.expenseCategories).forEach(([category, amount]) => {
      doc.text(String(category), 20, y); doc.text(`$${(amount as number).toFixed(0)}`, 160, y); y += 8;
    });
    y += 5; doc.setFont(undefined, 'bold'); doc.text('Total Expenses', 20, y); doc.text(`$${filteredData.totalExpenses.toFixed(0)}`, 160, y); doc.setFont(undefined, 'normal');
    y += 15; doc.setDrawColor(200); doc.line(14, y-5, 196, y-5);
    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('Net Profit', 14, y); doc.text(`$${filteredData.netProfit.toFixed(0)}`, 160, y);
    doc.save(`Profit_and_Loss_${filteredData.dateLabel.replace(/\s/g, '_')}.pdf`);
  };

  // Dynamic Year Calculation
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let startYear = 2013; // Default requirement

    // Scan data for earlier years
    const allDates = [
        ...invoices.map(i => i.date), 
        ...expenses.map(e => e.date)
    ].filter(Boolean);

    if (allDates.length > 0) {
        const minDataYear = Math.min(...allDates.map(d => new Date(d).getFullYear()));
        if (!isNaN(minDataYear) && minDataYear < startYear) {
            startYear = minDataYear;
        }
    }

    const options = [];
    for (let y = currentYear; y >= startYear; y--) {
        options.push({ value: y, label: String(y) });
    }
    return options;
  }, [invoices, expenses]);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => ({ value: i, label: m }));
  const quarters = [{ value: 0, label: 'Q1 (Jan-Mar)' }, { value: 1, label: 'Q2 (Apr-Jun)' }, { value: 2, label: 'Q3 (Jul-Sep)' }, { value: 3, label: 'Q4 (Oct-Dec)' }];

  const menuActions: ActionItem[] = [
    { label: 'Backup Data', icon: <Database size={20} />, onClick: onBackup }
  ];

  const renderFilters = () => (
    <>
        <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
            {(['Monthly', 'Quarterly', 'YTD', 'Yearly'] as FilterType[]).map((t) => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-4 h-10 rounded-full text-sm font-medium transition-all capitalize whitespace-nowrap flex items-center justify-center ${filterType === t ? 'bg-primary text-primary-on' : 'bg-surface-container-high dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-opacity-80'}`}>{t}</button>
            ))}
        </div>
        <div className="flex gap-2">
            {(filterType === 'Monthly' || filterType === 'Quarterly' || filterType === 'Yearly') && <div className="w-32"><Dropdown value={selectedYear} onChange={setSelectedYear} options={years} placeholder="Year" align="right"/></div>}
            {filterType === 'Monthly' && <div className="w-40"><Dropdown value={selectedMonth} onChange={setSelectedMonth} options={months} placeholder="Month" align="right"/></div>}
            {filterType === 'Quarterly' && <div className="w-40"><Dropdown value={selectedQuarter} onChange={setSelectedQuarter} options={quarters} placeholder="Quarter" align="right"/></div>}
        </div>
    </>
  );

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-100px)]">
      {/* Navigation Bar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        {/* Left-aligned navigation buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('invoices')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 rounded-full hover:bg-opacity-80 transition-all"
          >
            <Receipt size={18} />
            <span className="text-sm font-medium">Invoices</span>
          </button>
          <button
            onClick={() => onNavigate('clients')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 rounded-full hover:bg-opacity-80 transition-all"
          >
            <Users size={18} />
            <span className="text-sm font-medium">Builders</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-on rounded-full transition-opacity"
          >
            <PieChart size={18} />
            <span className="text-sm font-medium">P&L</span>
          </button>
          <button
            onClick={() => onNavigate('expenses')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 rounded-full hover:bg-opacity-80 transition-all"
          >
            <CreditCard size={18} />
            <span className="text-sm font-medium">Expenses</span>
          </button>
        </div>
        {/* Right-aligned Download PDF Button */}
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-on rounded-lg hover:opacity-90 transition-opacity"
        >
          <Download size={18} />
          <span className="text-sm font-medium">Download PDF</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto pt-6">
        <div className="hidden md:flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
           {renderFilters()}
        </div>

        <Card title="Profit & Loss Statement" className="min-h-[500px]">
          <div className="mt-4 space-y-8">
            <div className="text-center border-b border-surfaceContainerHigh pb-6"><p className="text-sm font-medium text-primary px-3 py-1 bg-primary/10 inline-block rounded-full">{filteredData.dateLabel}</p></div>
            <div>
              <h4 className="text-lg font-medium text-primary mb-4">Income</h4>
              <div className="flex justify-between items-center py-3 bg-primary text-primary-on px-4 rounded-lg"><span className="font-bold">Total Income</span><span className="font-bold">${filteredData.totalIncome.toFixed(0)}</span></div>
            </div>
            <div>
              <h4 className="text-lg font-medium text-primary mb-4">Operating Expenses</h4>
              <div className="space-y-2 mb-4">
                {Object.entries(filteredData.expenseCategories).map(([category, amount]) => (<div key={category} className="flex justify-between items-center py-1"><span className="text-surface-on dark:text-gray-200">{category}</span><span className="text-surface-on dark:text-gray-200">${(amount as number).toFixed(0)}</span></div>))}
              </div>
              <div className="flex justify-between items-center py-3 bg-primary text-primary-on px-4 rounded-lg"><span className="font-bold">Total Expenses</span><span className="font-bold">${filteredData.totalExpenses.toFixed(0)}</span></div>
            </div>
            <div className="pt-4 border-t-2 border-surfaceContainerHigh">
               <div className={`flex justify-between items-center py-4 px-4 rounded-xl ${filteredData.netProfit >= 0 ? 'bg-primary text-primary-on' : 'bg-red-800 text-white'}`}><span className="text-lg font-bold">Net Profit</span><span className="text-lg font-bold">${filteredData.netProfit.toFixed(0)}</span></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
