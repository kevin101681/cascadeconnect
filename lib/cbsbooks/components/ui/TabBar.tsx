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
            ? 'bg-primary text-primary-on'
            : 'bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 hover:bg-opacity-80'
        }`}
      >
        Invoices
      </button>
      <button
        onClick={() => onNavigate('clients')}
        className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
          activeView === 'clients'
            ? 'bg-primary text-primary-on'
            : 'bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 hover:bg-opacity-80'
        }`}
      >
        Builders
      </button>
      <button
        onClick={() => onNavigate('reports')}
        className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
          activeView === 'reports'
            ? 'bg-primary text-primary-on'
            : 'bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 hover:bg-opacity-80'
        }`}
      >
        P&L
      </button>
      <button
        onClick={() => onNavigate('expenses')}
        className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
          activeView === 'expenses'
            ? 'bg-primary text-primary-on'
            : 'bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 hover:bg-opacity-80'
        }`}
      >
        Expenses
      </button>
    </div>
  );
};

