/**
 * Smart CSV Importer for Buildertrend Data
 * 
 * Location: /dashboard/admin/import
 * 
 * Features:
 * - CSV dropzone
 * - Pre-flight preview (first 5 transformed rows)
 * - Address parsing verification (separate columns)
 * - Progress bar for chunked uploads (50 rows/batch)
 */

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, CheckCircle, Database, Loader2, X } from 'lucide-react';
import { transformRow, BuildertrendRow, TransformedHomeowner } from '../../../../lib/buildertrend-transformer';
import { importHomeowners, ImportResult } from '../../../../lib/import-homeowners-action';
import Button from '../../../../components/Button';

interface SmartCSVImporterProps {
  onClose?: () => void;
}

const SmartCSVImporter: React.FC<SmartCSVImporterProps> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<TransformedHomeowner[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'PARSING' | 'UPLOADING' | 'COMPLETE' | 'ERROR'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus('IDLE');
      setProgress(0);
      setError(null);
      setImportResult(null);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    setUploadStatus('PARSING');
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          const criticalErrors = results.errors.filter(e => e.type !== 'Quotes' && e.type !== 'Delimiter');
          if (criticalErrors.length > 0) {
            setError(`CSV parsing error: ${criticalErrors[0].message || 'Please check the file format.'}`);
            setUploadStatus('ERROR');
            return;
          }
        }

        if (!results.data || results.data.length === 0) {
          setError('No data found in CSV file.');
          setUploadStatus('ERROR');
          return;
        }

        // Transform rows
        const transformed = (results.data as BuildertrendRow[])
          .map(row => {
            try {
              return transformRow(row);
            } catch (err) {
              console.error('Error transforming row:', err, row);
              return null;
            }
          })
          .filter((row): row is TransformedHomeowner => row !== null);

        if (transformed.length === 0) {
          setError('No valid rows found after transformation.');
          setUploadStatus('ERROR');
          return;
        }

        // Show preview of first 5 rows
        setPreviewData(transformed.slice(0, 5));
        setUploadStatus('IDLE');
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
        setUploadStatus('ERROR');
      },
    });
  };

  const handleStartImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus('UPLOADING');
    setProgress(0);
    setError(null);
    setImportResult(null);

    try {
      // Re-parse the full file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // Transform all rows
            const transformed = (results.data as BuildertrendRow[])
              .map(row => {
                try {
                  return transformRow(row);
                } catch (err) {
                  console.error('Error transforming row:', err, row);
                  return null;
                }
              })
              .filter((row): row is TransformedHomeowner => row !== null);

            if (transformed.length === 0) {
              throw new Error('No valid rows to import.');
            }

            // Import with progress tracking
            const result = await importHomeowners(transformed, (progressPercent, current, total) => {
              setProgress(progressPercent);
            });

            setImportResult(result);
            setUploadStatus(result.success ? 'COMPLETE' : 'ERROR');
            if (!result.success && result.errors.length > 0) {
              setError(`Import completed with ${result.errors.length} errors. Check console for details.`);
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(`Import failed: ${errorMsg}`);
            setUploadStatus('ERROR');
          } finally {
            setIsProcessing(false);
          }
        },
        error: (error) => {
          setError(`Failed to parse CSV: ${error.message}`);
          setUploadStatus('ERROR');
          setIsProcessing(false);
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Import failed: ${errorMsg}`);
      setUploadStatus('ERROR');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface dark:bg-gray-800 w-full max-w-7xl rounded-3xl shadow-elevation-3 overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-normal text-surface-on dark:text-gray-100 mb-2 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Smart CSV Importer - Buildertrend Data
            </h2>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">
              Import homeowners from Buildertrend CSV with automatic address parsing and builder lookup
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

        <div className="p-6 space-y-6">
          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              uploadStatus === 'ERROR'
                ? 'border-error bg-error/5 dark:bg-error/10'
                : 'border-surface-outline-variant dark:border-gray-600 hover:bg-surface-container dark:hover:bg-gray-700 hover:border-primary/50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                const f = e.dataTransfer.files[0];
                if (f.name.endsWith('.csv')) {
                  setFile(f);
                  parseFile(f);
                } else {
                  setError('Please upload a CSV file.');
                }
              }
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center">
                <FileText className="h-12 w-12 text-primary mb-2" />
                <p className="text-surface-on dark:text-gray-100 font-medium">{file.name}</p>
                <p className="text-sm text-surface-on-variant dark:text-gray-400">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary text-sm mt-2 hover:underline"
                >
                  Change file
                </button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-surface-outline-variant dark:text-gray-500 mb-2" />
                <p className="text-surface-on dark:text-gray-100 font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
                  CSV files only
                </p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-error/10 dark:bg-error/20 text-error rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {previewData.length > 0 && uploadStatus !== 'UPLOADING' && (
            <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
                <h3 className="text-sm font-bold text-surface-on dark:text-gray-100">
                  Preview (First 5 Transformed Rows)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-container-high dark:bg-gray-700 text-surface-on-variant dark:text-gray-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Phone</th>
                      <th className="px-3 py-2 font-medium">Street</th>
                      <th className="px-3 py-2 font-medium">City</th>
                      <th className="px-3 py-2 font-medium">State</th>
                      <th className="px-3 py-2 font-medium">Zip</th>
                      <th className="px-3 py-2 font-medium">Job Name</th>
                      <th className="px-3 py-2 font-medium">Builder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
                    {previewData.map((row, i) => (
                      <tr key={i} className="text-surface-on dark:text-gray-100">
                        <td className="px-3 py-2">{row.full_name}</td>
                        <td className="px-3 py-2">{row.email}</td>
                        <td className="px-3 py-2">{row.phone}</td>
                        <td className="px-3 py-2">{row.street_address}</td>
                        <td className="px-3 py-2">{row.city}</td>
                        <td className="px-3 py-2">{row.state}</td>
                        <td className="px-3 py-2">{row.zip_code}</td>
                        <td className="px-3 py-2">{row.job_name}</td>
                        <td className="px-3 py-2">{row.builder_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {(isProcessing || uploadStatus === 'COMPLETE') && (
            <div className="bg-surface dark:bg-gray-800 p-6 rounded-3xl border border-surface-outline-variant dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-surface-on dark:text-gray-100">
                  Import Progress
                </span>
                <span className="text-sm font-bold text-primary">{progress}%</span>
              </div>
              <div className="w-full bg-surface-container-high dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              {uploadStatus === 'COMPLETE' && importResult && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
                    <CheckCircle className="h-5 w-5" />
                    <div className="text-sm">
                      <p className="font-medium">Import completed successfully!</p>
                      <p className="text-xs mt-1">
                        {importResult.imported} new records, {importResult.updated} updated,
                        {importResult.builderCreated > 0 && ` ${importResult.builderCreated} builders created`}
                      </p>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="p-3 bg-error/10 dark:bg-error/20 text-error rounded-xl text-xs">
                      <p className="font-bold mb-1">Errors ({importResult.errors.length}):</p>
                      <ul className="list-disc list-inside space-y-1">
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>... and {importResult.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex justify-end items-center gap-4">
            {onClose && (
            <Button variant="tonal" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            )}
            <Button
              onClick={handleStartImport}
              disabled={!file || uploadStatus === 'ERROR' || isProcessing || uploadStatus === 'COMPLETE'}
              icon={isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <Database className="h-4 w-4" />}
            >
              {isProcessing ? 'Importing...' : 'Start Import'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartCSVImporter;

