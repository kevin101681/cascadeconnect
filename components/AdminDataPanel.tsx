/**
 * ADMIN DATA MANAGEMENT PANEL
 * 
 * Provides:
 * 1. Builder Import (CSV upload & staging)
 * 2. Test Data Reset (dangerous operation)
 */

import React, { useState } from 'react';
import { X, Database, AlertTriangle, Trash2 } from 'lucide-react';
import BuilderImport from './BuilderImport';
import Button from './Button';
import { resetTestData } from '../actions/reset-test-data';

interface AdminDataPanelProps {
  onClose: () => void;
  onDataReset?: () => void; // Callback to refresh app data after reset
}

type TabType = 'IMPORT' | 'RESET';

const AdminDataPanel: React.FC<AdminDataPanelProps> = ({ onClose, onDataReset }) => {
  const [activeTab, setActiveTab] = useState<TabType>('IMPORT');
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{
    success: boolean;
    message: string;
    deleted: {
      builderGroups: number;
      homeowners: number;
      builderUsers: number;
      homeownerUsers: number;
    };
    error?: string;
  } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetTestData = async () => {
    setIsResetting(true);
    setShowResetConfirm(false);

    try {
      const result = await resetTestData();
      setResetResult(result);

      if (result.success && onDataReset) {
        // Wait 2 seconds before refreshing
        setTimeout(() => {
          onDataReset();
        }, 2000);
      }
    } catch (error) {
      setResetResult({
        success: false,
        message: 'Reset failed',
        deleted: { builderGroups: 0, homeowners: 0, builderUsers: 0, homeownerUsers: 0 },
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8 h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Admin Data Management
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">Import data and manage test records</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-surface-outline-variant dark:border-gray-700 flex-shrink-0">
          <button
            onClick={() => setActiveTab('IMPORT')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'IMPORT'
                ? 'border-primary text-primary'
                : 'border-transparent text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100'
            }`}
          >
            Import Builders
          </button>
          <button
            onClick={() => setActiveTab('RESET')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'RESET'
                ? 'border-primary text-primary'
                : 'border-transparent text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100'
            }`}
          >
            Reset Test Data
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'IMPORT' && (
            <BuilderImport onImportComplete={onDataReset || (() => {})} />
          )}

          {activeTab === 'RESET' && (
            <div className="space-y-6">
              {/* Warning Banner */}
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-3xl p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-base font-medium text-red-900 dark:text-red-100 mb-2">
                      Danger Zone: Reset Test Data
                    </h4>
                    <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                      This action will permanently delete:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-200 mb-4">
                      <li>All Builder Groups (companies)</li>
                      <li>All Homeowner records</li>
                      <li>All Builder user accounts</li>
                      <li>All Homeowner user accounts</li>
                    </ul>
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      ✅ Admin and Employee accounts will NOT be deleted (you'll stay logged in).
                    </p>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              {!resetResult && !showResetConfirm && (
                <div className="flex justify-center">
                  <Button
                    variant="filled"
                    onClick={() => setShowResetConfirm(true)}
                    icon={<Trash2 className="h-4 w-4" />}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Reset Test Data
                  </Button>
                </div>
              )}

              {/* Confirmation Dialog */}
              {showResetConfirm && !resetResult && (
                <div className="bg-surface-container dark:bg-gray-700/50 rounded-3xl p-6">
                  <h4 className="text-base font-medium text-surface-on dark:text-gray-100 mb-4">
                    Are you absolutely sure?
                  </h4>
                  <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-6">
                    This action cannot be undone. All test data will be permanently deleted.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="text"
                      onClick={() => setShowResetConfirm(false)}
                      disabled={isResetting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="filled"
                      onClick={handleResetTestData}
                      disabled={isResetting}
                      icon={<Trash2 className="h-4 w-4" />}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isResetting ? 'Resetting...' : 'Yes, Delete Everything'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Reset Result */}
              {resetResult && (
                <div className={`bg-surface dark:bg-gray-800 rounded-3xl border ${
                  resetResult.success 
                    ? 'border-green-500 dark:border-green-600' 
                    : 'border-red-500 dark:border-red-600'
                } p-6`}>
                  <h4 className="text-base font-medium text-surface-on dark:text-gray-100 mb-4">
                    {resetResult.message}
                  </h4>
                  {resetResult.success && (
                    <div className="space-y-2 text-sm text-surface-on-variant dark:text-gray-400">
                      <p>🗑️ Builder Groups: {resetResult.deleted.builderGroups}</p>
                      <p>🗑️ Homeowners: {resetResult.deleted.homeowners}</p>
                      <p>🗑️ Builder Users: {resetResult.deleted.builderUsers}</p>
                      <p>🗑️ Homeowner Users: {resetResult.deleted.homeownerUsers}</p>
                    </div>
                  )}
                  {resetResult.error && (
                    <p className="text-sm text-red-600 dark:text-red-500 mt-2">
                      Error: {resetResult.error}
                    </p>
                  )}
                  <div className="mt-4">
                    <Button
                      variant="filled"
                      onClick={() => {
                        setResetResult(null);
                        setShowResetConfirm(false);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDataPanel;

