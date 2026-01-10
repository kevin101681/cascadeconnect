import React from 'react';
import { ViewState } from '../../types';

interface TabBarProps {
  activeView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeView, onNavigate }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onNavigate('invoices')}
        className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
          activeView === 'invoices'
            ? 'bg-white border border-primary text-primary shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:text-gray-900 border border-transparent'
        }`}
      >
        Invoices
      </button>
      <button
        onClick={() => onNavigate('clients')}
        className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
          activeView === 'clients'
            ? 'bg-white border border-primary text-primary shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:text-gray-900 border border-transparent'
        }`}
      >
        Builders
      </button>
      <button
        onClick={() => onNavigate('reports')}
        className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
          activeView === 'reports'
            ? 'bg-white border border-primary text-primary shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:text-gray-900 border border-transparent'
        }`}
      >
        P&L
      </button>
      <button
        onClick={() => onNavigate('expenses')}
        className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
          activeView === 'expenses'
            ? 'bg-white border border-primary text-primary shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:text-gray-900 border border-transparent'
        }`}
      >
        Expenses
      </button>
    </div>
  );
};

