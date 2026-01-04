/**
 * SUBCONTRACTOR IMPORT COMPONENT
 * 
 * Features:
 * - CSV upload for subcontractor data
 * - Preview table with Company, Contact, Email, Phone
 * - Staging before commit
 * - Upserts existing records by company name
 */

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import Button from '../Button';
import { importSubcontractors, SubcontractorImportRow, SubcontractorImportResult } from '../../actions/import-subcontractors';

const SubImport: React.FC = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [stagingData, setStagingData] = useState<SubcontractorImportRow[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<SubcontractorImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setImportResult(null);
    setParseError(null);

    try {
      const text = await file.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const rows = results.data as any[];
            console.log(`📊 CSV Parse Complete: ${rows.length} total rows`);
            
            if (rows.length > 0) {
              console.log('🔑 CSV Headers Found:', Object.keys(rows[0]));
            }
            
            setTotalRows(rows.length);
            let skipped = 0;
            
            // Transform CSV rows into SubcontractorImportRow format
            const parsed: SubcontractorImportRow[] = rows.map((row, index) => {
              if (index < 3) {
                console.log(`Row ${index + 1} raw data:`, row);
              }
              
              // Extract company name (REQUIRED)
              const companyName = row['Company Name'] || row['Company'] || row['company_name'] || '';
              
              // Extract other fields (OPTIONAL)
              const contactName = row['Contact'] || row['Contact Name'] || row['contact_name'] || '';
              const email = row['Email'] || row['email'] || '';
              const phone = row['Phone'] || row['Phone Number'] || row['phone'] || '';

              return {
                rowIndex: index + 1,
                companyName: companyName.trim(),
                contactName: contactName.trim(),
                email: email.trim(),
                phone: phone.trim(),
              };
            }).filter(row => {
              // Only require company name
              const hasCompanyName = row.companyName && row.companyName.length > 0;
              
              if (!hasCompanyName) {
                skipped++;
                console.warn(`⏭️ Skipping row ${row.rowIndex}: Missing company name`);
              }
              
              return hasCompanyName;
            });

            if (parsed.length === 0) {
              throw new Error('No valid rows found. Make sure CSV has a Company Name column.');
            }

            console.log(`✅ Parsed ${parsed.length} valid rows, ${skipped} skipped`);
            setSkippedCount(skipped);
            setStagingData(parsed);
          } catch (error) {
            setParseError(error instanceof Error ? error.message : 'Failed to parse CSV');
            setStagingData([]);
            setSkippedCount(0);
          }
        },
        error: (error) => {
          setParseError(`CSV parse error: ${error.message}`);
          setStagingData([]);
          setSkippedCount(0);
        },
      });
    } catch (error) {
      setParseError(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
      setCsvFile(null);
      setStagingData([]);
    }
  };

  const handleCommitImport = async () => {
    if (stagingData.length === 0) return;

    setIsImporting(true);
    try {
      const result = await importSubcontractors(stagingData);
      setImportResult(result);
      console.log('Import Result:', result);
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed',
        imported: 0,
        updated: 0,
        errors: [String(error)],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setCsvFile(null);
    setStagingData([]);
    setSkippedCount(0);
    setTotalRows(0);
    setImportResult(null);
    setParseError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-surface-on dark:text-gray-100 mb-2">
          Import Subcontractors from CSV
        </h3>
        <p className="text-sm text-surface-on-variant dark:text-gray-400">
          Upload a CSV with columns: <strong>Company Name</strong> (required), 
          <strong>Contact</strong>, <strong>Email</strong>, and <strong>Phone</strong>.
        </p>
      </div>

      {/* File Upload */}
      {!csvFile && (
        <div className="bg-surface dark:bg-gray-800 rounded-xl border-2 border-dashed border-surface-outline-variant dark:border-gray-700 p-12 text-center">
          <Upload className="h-12 w-12 text-surface-on-variant dark:text-gray-400 mx-auto mb-4" />
          <h4 className="text-base font-medium text-surface-on dark:text-gray-100 mb-2">
            Upload Subcontractor CSV
          </h4>
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
            Drag and drop or click to browse
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="sub-csv-upload"
          />
          <Button 
            onClick={() => document.getElementById('sub-csv-upload')?.click()}
            icon={<Upload className="h-4 w-4" />}
          >
            Choose File
          </Button>
        </div>
      )}

      {/* Parse Error */}
      {parseError && (
        <div className="bg-error/10 dark:bg-error/20 border border-error rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-error text-sm">Parse Error</p>
            <p className="text-sm text-error/90 mt-1">{parseError}</p>
          </div>
          <Button variant="text" onClick={handleReset}>
            Try Again
          </Button>
        </div>
      )}

      {/* Staging Table */}
      {stagingData.length > 0 && !importResult && (
        <div className="bg-surface dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex justify-between items-center">
            <div>
              <h4 className="text-base font-medium text-surface-on dark:text-gray-100">
                Preview: {stagingData.length} Valid Subcontractors
                {skippedCount > 0 && (
                  <span className="ml-2 text-sm text-orange-600 dark:text-orange-400">
                    ({skippedCount} skipped - empty rows)
                  </span>
                )}
              </h4>
              <p className="text-sm text-surface-on-variant dark:text-gray-400">
                Review before importing
                {totalRows > 0 && (
                  <span className="ml-2 font-medium">
                    • Total CSV rows: {totalRows}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="text" onClick={handleReset} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                variant="filled"
                onClick={handleCommitImport}
                disabled={isImporting}
                icon={isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              >
                {isImporting ? 'Importing...' : 'Commit Import'}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-container dark:bg-gray-700 z-10">
                <tr className="text-surface-on-variant dark:text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
                {stagingData.map((row) => (
                  <tr key={row.rowIndex} className="hover:bg-surface-container-high dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {row.rowIndex}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100 font-medium">
                      {row.companyName}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {row.contactName || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {row.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {row.phone || '—'}
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
        <div className={`bg-surface dark:bg-gray-800 rounded-xl border ${
          importResult.success 
            ? 'border-green-500 dark:border-green-600' 
            : 'border-red-500 dark:border-red-600'
        } p-6`}>
          <div className="flex items-start gap-3">
            {importResult.success ? (
              <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400 flex-shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500 dark:text-red-400 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className={`font-medium mb-2 ${
                importResult.success 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {importResult.message}
              </h4>
              
              {importResult.success && (
                <div className="space-y-2 text-sm">
                  <p className="text-surface-on-variant dark:text-gray-400">
                    ✅ <strong>{importResult.imported}</strong> new subcontractors imported
                  </p>
                  <p className="text-surface-on-variant dark:text-gray-400">
                    🔄 <strong>{importResult.updated}</strong> subcontractors updated
                  </p>
                </div>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-sm text-red-700 dark:text-red-300 mb-2">
                    Errors ({importResult.errors.length}):
                  </p>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 max-h-40 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((error, i) => (
                      <p key={i} className="text-xs text-red-600 dark:text-red-400 mb-1">
                        • {error}
                      </p>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p className="text-xs text-red-500 dark:text-red-400 italic">
                        ... and {importResult.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="filled" onClick={handleReset}>
              Import Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubImport;

