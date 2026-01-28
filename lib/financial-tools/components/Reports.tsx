
import React, { useMemo, useState } from 'react';
import { Invoice, Expense, ViewState } from '../types';
import { Card } from './ui/Card';
import { Dropdown } from './ui/Dropdown';
import { Download, Database, SlidersHorizontal, X } from 'lucide-react';
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


  return (
    <div className="space-y-6 relative min-h-[calc(100vh-100px)]">
      <div className="max-w-4xl mx-auto pt-6">
        {/* Report Type Filters + Download PDF Button */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
          {/* Left: Report Type Filters */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
            {(['Monthly', 'Quarterly', 'YTD', 'Yearly'] as FilterType[]).map((t) => (
              <button 
                key={t} 
                onClick={() => setFilterType(t)} 
                className={`px-4 py-2 transition-all duration-200 rounded-xl font-medium flex items-center justify-center gap-2 ${
                  filterType === t 
                    ? 'bg-white text-primary shadow-md -translate-y-0.5 border-none' 
                    : 'bg-transparent text-gray-600 hover:text-primary hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          
          {/* Middle: Dropdowns */}
          <div className="flex gap-2">
            {(filterType === 'Monthly' || filterType === 'Quarterly' || filterType === 'Yearly') && (
              <div className="w-32">
                <Dropdown 
                  value={selectedYear} 
                  onChange={setSelectedYear} 
                  options={years} 
                  placeholder="Year" 
                  align="right"
                />
              </div>
            )}
            {filterType === 'Monthly' && (
              <div className="w-40">
                <Dropdown 
                  value={selectedMonth} 
                  onChange={setSelectedMonth} 
                  options={months} 
                  placeholder="Month" 
                  align="right"
                />
              </div>
            )}
            {filterType === 'Quarterly' && (
              <div className="w-40">
                <Dropdown 
                  value={selectedQuarter} 
                  onChange={setSelectedQuarter} 
                  options={quarters} 
                  placeholder="Quarter" 
                  align="right"
                />
              </div>
            )}
          </div>
          
          {/* Right: Download PDF Button (Icon Only) */}
          <button
            onClick={handleDownloadPDF}
            className="w-10 h-10 bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-medium flex items-center justify-center"
            title="Download PDF"
            aria-label="Download PDF"
          >
            <Download size={18} />
          </button>
        </div>

        <Card className="min-h-[500px]">
          <div className="mt-4 space-y-8">
            {/* Title Section */}
            <div className="text-center border-b border-surfaceContainerHigh pb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Profit & Loss Statement</h3>
              <span className="bg-blue-50 text-primary border border-blue-100 px-4 py-1.5 rounded-full text-sm font-medium inline-block shadow-sm">
                {filteredData.dateLabel}
              </span>
            </div>
            <div>
              <h4 className="text-lg font-medium text-primary mb-4">Income</h4>
              <div className="flex justify-between items-center py-3 bg-white border-2 border-primary text-primary px-4 rounded-lg"><span className="font-bold">Total Income</span><span className="font-bold">${filteredData.totalIncome.toFixed(0)}</span></div>
            </div>
            <div>
              <h4 className="text-lg font-medium text-primary mb-4">Operating Expenses</h4>
              <div className="space-y-2 mb-4">
                {Object.entries(filteredData.expenseCategories).map(([category, amount]) => (<div key={category} className="flex justify-between items-center py-1"><span className="text-surface-on dark:text-gray-200">{category}</span><span className="text-surface-on dark:text-gray-200">${(amount as number).toFixed(0)}</span></div>))}
              </div>
              <div className="flex justify-between items-center py-3 bg-white border-2 border-primary text-primary px-4 rounded-lg"><span className="font-bold">Total Expenses</span><span className="font-bold">${filteredData.totalExpenses.toFixed(0)}</span></div>
            </div>
            <div className="pt-4 border-t-2 border-surfaceContainerHigh">
               <div className={`flex justify-between items-center py-4 px-4 rounded-xl ${filteredData.netProfit >= 0 ? 'bg-white border-2 border-primary text-primary' : 'bg-white border-2 border-red-600 text-red-600'}`}><span className="text-lg font-bold">Net Profit</span><span className="text-lg font-bold">${filteredData.netProfit.toFixed(0)}</span></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
