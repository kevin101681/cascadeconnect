/**
 * Data Import View - Full Implementation
 * 
 * Provides builder data import and test data reset functionality.
 * Extracted from AdminDataPanel.tsx modal component.
 */

import React, { useState } from 'react';
import { Database, AlertTriangle, Trash2, Upload } from 'lucide-react';
import BuilderImport from '../../BuilderImport';
import Button from '../../Button';
import { resetTestData } from '../../../actions/reset-test-data';

interface DataImportViewProps {
  onDataReset?: () => void;
}

type TabType = 'IMPORT' | 'RESET';

const DataImportView: React.FC<DataImportViewProps> = ({ onDataReset }) => {
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
    <div className="h-full flex flex-col bg-surface dark:bg-gray-800">
      {/* Header with Tabs */}
      <div className="border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700/50 flex-shrink-0">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100">
            Data Management
          </h3>
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
            Import builder data and manage test records
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
            Reset Test Data
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'IMPORT' && (
          <div className="p-6">
            <BuilderImport onImportComplete={() => console.log('Import completed')} />
          </div>
        )}

        {activeTab === 'RESET' && (
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              {/* Warning Banner */}
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
                <div className="flex gap-4">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                      Danger Zone
                    </h4>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      This action will permanently delete all test data including builder groups, 
                      homeowners, and user accounts. This operation cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              {!resetResult && (
                <div className="text-center">
                  {!showResetConfirm ? (
                    <Button
                      onClick={() => setShowResetConfirm(true)}
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Reset All Test Data
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-surface-on dark:text-gray-200">
                        Are you absolutely sure?
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={() => setShowResetConfirm(false)}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleResetTestData}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={isResetting}
                        >
                          {isResetting ? 'Resetting...' : 'Yes, Reset Everything'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reset Results */}
              {resetResult && (
                <div
                  className={`rounded-xl p-6 ${
                    resetResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
                  }`}
                >
                  <h4
                    className={`text-lg font-semibold mb-4 ${
                      resetResult.success
                        ? 'text-green-900 dark:text-green-200'
                        : 'text-red-900 dark:text-red-200'
                    }`}
                  >
                    {resetResult.success ? '✓ Reset Complete' : '✗ Reset Failed'}
                  </h4>

                  {resetResult.success ? (
                    <div className="space-y-2 text-sm text-green-800 dark:text-green-300">
                      <p>Successfully deleted:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>{resetResult.deleted.builderGroups} builder groups</li>
                        <li>{resetResult.deleted.builderUsers} builder user accounts</li>
                        <li>{resetResult.deleted.homeowners} homeowner records</li>
                        <li>{resetResult.deleted.homeownerUsers} homeowner user accounts</li>
                      </ul>
                      <p className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
                        The application will refresh automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm text-red-800 dark:text-red-300">
                      <p className="font-medium mb-2">{resetResult.message}</p>
                      {resetResult.error && (
                        <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg overflow-x-auto text-xs">
                          {resetResult.error}
                        </pre>
                      )}
                    </div>
                  )}

                  {resetResult.success && (
                    <div className="mt-6 flex justify-center">
                      <Button onClick={() => window.location.reload()}>
                        Refresh Now
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataImportView;
