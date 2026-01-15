/**
 * Data Import View - Embedded Adapter
 * 
 * Wraps AdminDataPanel component for flat page use (not modal).
 * Removes modal styling and adapts layout for split-pane design.
 */

import React, { useState } from 'react';
import { Database, Upload, Trash2 } from 'lucide-react';

interface DataImportViewProps {
  onDataReset?: () => void;
}

const DataImportView: React.FC<DataImportViewProps> = ({ onDataReset }) => {
  const [activeTab, setActiveTab] = useState<'IMPORT' | 'RESET'>('IMPORT');

  return (
    <div className="h-full flex flex-col bg-surface dark:bg-gray-800">
      {/* Header with Tabs */}
      <div className="border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700/50 flex-shrink-0">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </h3>
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
            Import builder data and manage test data
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pb-4 flex gap-2">
          <button
            onClick={() => setActiveTab('IMPORT')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'IMPORT'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <Upload className="inline h-4 w-4 mr-2" />
            Import Data
          </button>
          <button
            onClick={() => setActiveTab('RESET')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'RESET'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <Trash2 className="inline h-4 w-4 mr-2" />
            Reset Data
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'IMPORT' && (
          <div className="text-surface-on dark:text-gray-100">
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
              Upload CSV files to import builder data.
            </p>
          </div>
        )}

        {activeTab === 'RESET' && (
          <div className="text-surface-on dark:text-gray-100">
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
              Dangerous operation: Reset all test data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataImportView;
