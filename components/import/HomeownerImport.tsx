/**
 * HOMEOWNER IMPORT COMPONENT
 * 
 * Features:
 * - CSV upload for Buildertrend data
 * - Builder matching (searches users table for role='BUILDER')
 * - Preview table with "Builder Found?" indicator
 * - Staging before commit
 */

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import Button from '../Button';
import { importHomeowners, HomeownerImportRow, HomeownerImportResult } from '../../actions/import-homeowners';

const HomeownerImport: React.FC = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [stagingData, setStagingData] = useState<HomeownerImportRow[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<HomeownerImportResult | null>(null);
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
            
            setTotalRows(rows.length);
            let skipped = 0;
            
            // Transform CSV rows into HomeownerImportRow format
            // CRITICAL: DO NOT de-duplicate by email - allow multiple homes per user
            const parsed: HomeownerImportRow[] = rows.map((row, index) => {
              // Debug: Log raw row data for first few rows
              if (index < 3) {
                console.log(`Row ${index + 1} raw data:`, row);
              }
              
              // Extract data from CSV
              const name = row['First Name'] && row['Last Name']
                ? `${row['First Name']} ${row['Last Name']}`.trim()
                : row['Name'] || row['Client Name'] || '';
              
              const email = row['Email'] || row['Email Address'] || '';
              const phone = row['Phone'] || row['Phone Number'] || row['Primary Phone'] || '';
              
              // Address components - Try multiple possible header variations
              const street = row['Street'] || row['Street Address'] || row['Address 1'] || '';
              const city = row['City'] || '';
              const state = row['State'] || '';
              const zip = row['Zip'] || row['Zip Code'] || row['ZIP'] || '';
              
              // Full address - with robust fallback
              let fullAddress = row['Address'] || row['Property Address'] || '';
              
              // Debug address parsing
              if (index < 3) {
                console.log(`Row ${index + 1} Address field:`, fullAddress);
              }
              
              // FALLBACK: If no full address, construct from components
              if (!fullAddress || fullAddress.trim() === '') {
                if (street) {
                  fullAddress = `${street}, ${city}, ${state} ${zip}`.trim();
                  // Clean up extra commas
                  fullAddress = fullAddress.replace(/,\s*,/g, ',').replace(/,\s*$/g, '');
                }
              }
              
              // If still empty, use street as fallback
              if (!fullAddress || fullAddress.trim() === '') {
                fullAddress = street || 'Address not provided';
              }
              
              // Builder info
              const builderGroup = row['Groups'] || row['Builder'] || row['Builder Name'] || '';
              
              // Job/Property info
              const jobName = row['Job Name'] || row['Project Name'] || row['Project'] || '';
              
              // Closing date - SANITIZE Excel "1/0/1900" artifacts
              let closingDate: Date | undefined;
              const closingDateStr = row['Closing Date'] || row['Close Date'] || '';
              if (closingDateStr) {
                const parsed = new Date(closingDateStr);
                // Rule: Date must be valid AND year must be > 2000
                // Excel empty dates show as "1/0/1900" which parses to 1899/1900
                // This filters them out safely
                if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
                  closingDate = parsed;
                  if (index < 3) {
                    console.log(`Row ${index + 1} Valid closing date:`, closingDate);
                  }
                } else {
                  // Debug: Log rejected dates
                  if (index < 3 || closingDateStr.includes('1900')) {
                    console.warn(`Row ${index + 1} Invalid date filtered: "${closingDateStr}" (Year: ${parsed.getFullYear() || 'invalid'})`);
                  }
                  closingDate = undefined; // Explicitly set to undefined for clarity
                }
              }

              return {
                rowIndex: index + 1,
                name,
                email,
                phone,
                street,
                city,
                state,
                zip,
                address: fullAddress,
                builderGroup,
                jobName,
                closingDate,
                builderFound: false, // Will be set by server action
              };
            }).filter(row => {
              // Only skip if BOTH name AND email are missing
              const isValid = row.name && row.email;
              if (!isValid) {
                skipped++;
                console.warn(`⏭️ Skipping row ${row.rowIndex}: Missing name or email`);
              }
              return isValid;
            });

            if (parsed.length === 0) {
              throw new Error('No valid rows found. Make sure CSV has Name and Email columns.');
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
      const result = await importHomeowners(stagingData);
      setImportResult(result);

      if (result.success && result.imported > 0) {
        // Auto-close after 3 seconds on success
        setTimeout(() => {
          handleReset();
        }, 3000);
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Import failed',
        imported: 0,
        updated: 0,
        buildersMatched: 0,
        buildersNotMatched: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setCsvFile(null);
    setStagingData([]);
    setImportResult(null);
    setParseError(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Info */}
      <div className="bg-surface-container dark:bg-gray-700/50 rounded-xl p-4">
        <h3 className="text-base font-medium text-surface-on dark:text-gray-100 mb-2">
          Import Homeowners from CSV
        </h3>
        <p className="text-sm text-surface-on-variant dark:text-gray-400">
          Upload a CSV with columns: <strong>Name</strong> (or First Name + Last Name), <strong>Email</strong>, 
          <strong> Phone</strong>, <strong>Address</strong>, <strong>Groups</strong> (builder name), 
          <strong>Closing Date</strong>, and <strong>Job Name</strong>.
        </p>
      </div>

      {/* File Upload */}
      {!csvFile && (
        <div className="bg-surface dark:bg-gray-800 rounded-xl border-2 border-dashed border-surface-outline-variant dark:border-gray-700 p-12 text-center">
          <Upload className="h-12 w-12 text-surface-on-variant dark:text-gray-400 mx-auto mb-4" />
          <h4 className="text-base font-medium text-surface-on dark:text-gray-100 mb-2">
            Upload Homeowner CSV
          </h4>
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
            Drag and drop or click to browse
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="homeowner-csv-upload"
          />
          <Button 
            onClick={() => document.getElementById('homeowner-csv-upload')?.click()}
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
                Preview: {stagingData.length} Valid Homeowners
                {skippedCount > 0 && (
                  <span className="ml-2 text-sm text-orange-600 dark:text-orange-400">
                    ({skippedCount} skipped - empty rows)
                  </span>
                )}
              </h4>
              <p className="text-sm text-surface-on-variant dark:text-gray-400">
                Builders will be automatically matched on import
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
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Job Name</th>
                  <th className="px-4 py-3 font-medium">Closing Date</th>
                  <th className="px-4 py-3 font-medium">Builder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
                {stagingData.map((row) => (
                  <tr key={`${row.email}-${row.jobName}-${row.rowIndex}`} className="hover:bg-surface-container-high dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {row.rowIndex}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100 font-medium">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {row.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {row.phone ? (
                        <span className="text-surface-on dark:text-gray-100">{row.phone}</span>
                      ) : (
                        <span className="text-orange-500 dark:text-orange-400 italic">No phone</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                      {row.address || `${row.street}, ${row.city}, ${row.state} ${row.zip}`.trim()}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100 font-medium">
                      {row.jobName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.closingDate ? (
                        <span className="text-surface-on dark:text-gray-100">
                          {new Date(row.closingDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-container-high dark:bg-gray-700 text-surface-on-variant dark:text-gray-400">
                          TBD
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-surface-on-variant dark:text-gray-400">
                          {row.builderGroup || 'None'}
                        </span>
                      </div>
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
          <div className="flex items-start gap-4">
            {importResult.success ? (
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="text-base font-medium text-surface-on dark:text-gray-100 mb-2">
                {importResult.message}
              </h4>
              <div className="space-y-1 text-sm text-surface-on-variant dark:text-gray-400">
                <p>✅ Imported: {importResult.imported}</p>
                <p>🔄 Updated: {importResult.updated}</p>
                <p>🔗 Builders Matched: {importResult.buildersMatched}</p>
                {importResult.buildersNotMatched > 0 && (
                  <p className="text-orange-600 dark:text-orange-400">
                    ⚠️ Builders Not Matched: {importResult.buildersNotMatched}
                  </p>
                )}
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
                  Import More Homeowners
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeownerImport;

