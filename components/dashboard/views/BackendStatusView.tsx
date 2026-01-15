/**
 * Backend Status View - Embedded Adapter
 * 
 * Wraps BackendDashboard component for flat page use (not modal).
 * Removes modal styling and adapts layout for split-pane design.
 */

import React, { useState } from 'react';
import { Server, Globe, Database, Mail } from 'lucide-react';

const BackendStatusView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'NETLIFY' | 'NEON' | 'EMAILS'>('NETLIFY');

  return (
    <div className="h-full flex flex-col bg-surface dark:bg-gray-800">
      {/* Header with Tabs */}
      <div className="border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700/50 flex-shrink-0">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 flex items-center gap-2">
            <Server className="h-5 w-5" />
            Backend Status
          </h3>
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
            Monitor backend services and deployments
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pb-4 flex gap-2">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'OVERVIEW'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <Server className="inline h-4 w-4 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('NETLIFY')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'NETLIFY'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <Globe className="inline h-4 w-4 mr-2" />
            Netlify
          </button>
          <button
            onClick={() => setActiveTab('NEON')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'NEON'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <Database className="inline h-4 w-4 mr-2" />
            Neon DB
          </button>
          <button
            onClick={() => setActiveTab('EMAILS')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'EMAILS'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <Mail className="inline h-4 w-4 mr-2" />
            Emails
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-surface-on dark:text-gray-100">
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
            Backend monitoring dashboard for {activeTab} services.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BackendStatusView;
