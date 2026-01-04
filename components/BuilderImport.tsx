/**
 * BUILDER IMPORT UI COMPONENT
 * 
 * Allows admins to:
 * 1. Upload a CSV file with builder data
 * 2. Preview the parsed data in a staging table
 * 3. Commit the import to create builder user accounts
 */

import React, { useState } from 'react';
import { Upload, Users, CheckCircle, AlertCircle, X } from 'lucide-react';
import Button from './Button';
import { parseBuilderCSV, importBuilderUsers, BuilderImportRow } from '../actions/import-builder-users';

interface BuilderImportProps {
  onImportComplete: () => void;
}

const BuilderImport: React.FC<BuilderImportProps> = ({ onImportComplete }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [stagingData, setStagingData] = useState<BuilderImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setImportResult(null);

    try {
      const text = await file.text();
      const parsed = parseBuilderCSV(text);
      setStagingData(parsed);
    } catch (error) {
      alert(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
      setCsvFile(null);
      setStagingData([]);
    }
  };

  const handleCommitImport = async () => {
    if (stagingData.length === 0) return;

    setIsImporting(true);
    try {
      const result = await importBuilderUsers(stagingData);
      setImportResult(result);
      
      if (result.success && result.imported > 0) {
        // Wait 2 seconds before triggering refresh
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setCsvFile(null);
    setStagingData([]);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-container dark:bg-gray-700/50 rounded-3xl p-6">
        <h3 className="text-lg font-medium text-surface-on dark:text-gray-100 flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-primary" />
          Import Builder Users
        </h3>
        <p className="text-sm text-surface-on-variant dark:text-gray-400">
          Upload a CSV file with builder data. Required: <strong>Name</strong>. Optional: <strong>Email</strong>, <strong>Phone</strong>, <strong>Company</strong>. 
          <span className="block mt-1 text-xs text-orange-600 dark:text-orange-400">
            ⚠️ Missing emails will be auto-generated as placeholder addresses.
          </span>
        </p>
      </div>

      {/* File Upload */}
      {!csvFile && (
        <div className="bg-surface dark:bg-gray-800 rounded-3xl border-2 border-dashed border-surface-outline-variant dark:border-gray-700 p-12 text-center">
          <Upload className="h-12 w-12 text-surface-on-variant dark:text-gray-400 mx-auto mb-4" />
          <h4 className="text-base font-medium text-surface-on dark:text-gray-100 mb-2">
            Upload CSV File
          </h4>
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
            Drag and drop or click to browse
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <Button 
            onClick={() => document.getElementById('csv-upload')?.click()}
            icon={<Upload className="h-4 w-4" />}
          >
            Choose File
          </Button>
        </div>
      )}

      {/* Staging Table */}
      {stagingData.length > 0 && !importResult && (
        <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex justify-between items-center">
            <div>
              <h4 className="text-base font-medium text-surface-on dark:text-gray-100">
                Preview: {stagingData.length} Builders
              </h4>
              <p className="text-sm text-surface-on-variant dark:text-gray-400">
                Review the data before importing
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="text" onClick={handleReset} icon={<X className="h-4 w-4" />}>
                Cancel
              </Button>
              <Button
                variant="filled"
                onClick={handleCommitImport}
                disabled={isImporting}
                icon={<CheckCircle className="h-4 w-4" />}
              >
                {isImporting ? 'Importing...' : 'Commit Import'}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-container dark:bg-gray-700 z-10">
                <tr className="text-surface-on-variant dark:text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-medium">#</th>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 font-medium">Company</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
                {stagingData.map((builder, index) => (
                  <tr key={index} className="hover:bg-surface-container-high dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-6 py-3 text-sm text-surface-on dark:text-gray-100 font-medium">
                      {builder.name}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {builder.isPlaceholderEmail ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                          <AlertCircle className="h-3.5 w-3.5" />
                          No Email (Generated)
                        </span>
                      ) : (
                        <span className="text-surface-on-variant dark:text-gray-400">
                          {builder.email}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {builder.phone || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {builder.company || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className={`bg-surface dark:bg-gray-800 rounded-3xl border ${
          importResult.success 
            ? 'border-green-500 dark:border-green-600' 
            : 'border-red-500 dark:border-red-600'
        } p-6`}>
          <div className="flex items-start gap-4">
            {importResult.success ? (
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="text-base font-medium text-surface-on dark:text-gray-100 mb-2">
                {importResult.message}
              </h4>
              <div className="space-y-1 text-sm text-surface-on-variant dark:text-gray-400">
                <p>✅ Imported: {importResult.imported}</p>
                <p>⏭️ Skipped: {importResult.skipped}</p>
                {importResult.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-red-600 dark:text-red-500 mb-1">Errors:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index} className="text-red-600 dark:text-red-500 text-xs">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Button variant="filled" onClick={handleReset}>
                  Import More Builders
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuilderImport;

