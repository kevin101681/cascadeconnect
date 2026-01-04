/**
 * Unified Data Import Dashboard
 * 
 * Location: /dashboard/admin/import
 * 
 * Features:
 * - Tab 1: Builder Users Import (CSV with Name, Email, Phone, Company)
 * - Tab 2: Homeowners Import (CSV with Buildertrend data + builder matching)
 */

import React, { useState } from 'react';
import { Database, X } from 'lucide-react';
import BuilderImport from '../../../../components/BuilderImport';
import HomeownerImport from '../../../../components/import/HomeownerImport';

interface UnifiedImportDashboardProps {
  onClose?: () => void;
}

type TabType = 'builders' | 'homeowners';

const UnifiedImportDashboard: React.FC<UnifiedImportDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('homeowners');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface dark:bg-gray-800 w-full max-w-7xl rounded-3xl shadow-elevation-3 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-normal text-surface-on dark:text-gray-100 mb-2 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Data Import Dashboard
            </h2>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">
              Import builders and homeowners from CSV files
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-full hover:bg-surface-container-high dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface dark:bg-gray-800 flex-shrink-0">
          <button
            onClick={() => setActiveTab('homeowners')}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl ${
              activeTab === 'homeowners'
                ? 'bg-surface-container dark:bg-gray-700 text-primary border-b-2 border-primary'
                : 'text-surface-on-variant dark:text-gray-400 hover:bg-surface-container/50 dark:hover:bg-gray-700/50'
            }`}
          >
            Homeowners
          </button>
          <button
            onClick={() => setActiveTab('builders')}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl ${
              activeTab === 'builders'
                ? 'bg-surface-container dark:bg-gray-700 text-primary border-b-2 border-primary'
                : 'text-surface-on-variant dark:text-gray-400 hover:bg-surface-container/50 dark:hover:bg-gray-700/50'
            }`}
          >
            Builders
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'homeowners' && (
            <HomeownerImport />
          )}
          {activeTab === 'builders' && (
            <div className="p-6">
              <BuilderImport onImportComplete={() => {
                console.log('✅ Builder import complete');
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedImportDashboard;
