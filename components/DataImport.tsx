
import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import Button from './Button';
import { Upload, FileText, AlertCircle, CheckCircle, Database, Terminal, Loader2, Trash2 } from 'lucide-react';
import { Claim, ClaimStatus, UserRole, ClaimClassification, Homeowner, BuilderGroup } from '../types';

interface DataImportProps {
  onImportClaims: (claims: Claim[]) => void;
  onImportHomeowners: (homeowners: Homeowner[]) => void;
  onClearHomeowners: () => void;
  existingBuilderGroups: BuilderGroup[];
  onImportBuilderGroups: (groups: BuilderGroup[]) => void;
}

type ImportType = 'CLAIMS' | 'HOMEOWNERS' | 'CONTRACTORS';

const DataImport: React.FC<DataImportProps> = ({ 
  onImportClaims, 
  onImportHomeowners, 
  onClearHomeowners,
  existingBuilderGroups,
  onImportBuilderGroups
}) => {
  const [importType, setImportType] = useState<ImportType>('CLAIMS');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'PARSING' | 'UPLOADING' | 'COMPLETE' | 'ERROR'>('IDLE');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const REQUIRED_HEADERS: Record<ImportType, string[]> = {
    'CLAIMS': ['title', 'description', 'category', 'homeownerEmail', 'address'],
    'HOMEOWNERS': ['name', 'email', 'phone', 'street', 'city', 'state', 'zip', 'jobName', 'builder', 'closingDate'],
    'CONTRACTORS': ['companyName', 'email', 'specialty']
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus('IDLE');
      setProgress(0);
      setLogs([]);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    setUploadStatus('PARSING');
    addLog(`Parsing file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)...`);
    
    Papa.parse(file, {
      header: true,
      preview: 5, // Just preview first 5 for UI
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData(results.data);
        setHeaders(results.meta.fields || []);
        addLog(`Preview loaded. Detected columns: ${results.meta.fields?.join(', ')}`);
        
        // Validation
        const required = REQUIRED_HEADERS[importType];
        const missing = required.filter(h => !results.meta.fields?.includes(h));
        
        if (missing.length > 0) {
          setUploadStatus('ERROR');
          addLog(`ERROR: Missing required columns: ${missing.join(', ')}`);
        } else {
          setUploadStatus('IDLE');
          addLog('Validation successful. Ready to import.');
        }
      },
      error: (error) => {
        setUploadStatus('ERROR');
        addLog(`ERROR: Parsing failed - ${error.message}`);
      }
    });
  };

  const handleStartImport = () => {
    if (!file) return;
    
    setIsProcessing(true);
    setUploadStatus('UPLOADING');
    setProgress(0);
    addLog('Starting batch import process...');

    // Parse the full file now
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const totalRows = results.data.length;
        addLog(`Found ${totalRows} records. Initializing upload to Neon DB...`);
        
        const importedClaims: Claim[] = [];
        const importedHomeowners: Homeowner[] = [];

        // Pre-processing for Homeowners: Extract and Create Builder Groups
        let builderMap = new Map<string, string>(); // Name -> ID
        
        if (importType === 'HOMEOWNERS') {
            // Load existing builders into map
            existingBuilderGroups.forEach(bg => {
                builderMap.set(bg.name.toLowerCase(), bg.id);
            });

            // Extract unique builder names from CSV
            const allRows = results.data as any[];
            const uniqueBuilders = Array.from(new Set(allRows.map(r => r.builder).filter(b => !!b))) as string[];
            const newGroups: BuilderGroup[] = [];

            uniqueBuilders.forEach((bName) => {
                if (!builderMap.has(bName.toLowerCase())) {
                    const newId = `bg-imp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    const newGroup: BuilderGroup = {
                        id: newId,
                        name: bName,
                        email: '' // No email in CSV for builder typically
                    };
                    newGroups.push(newGroup);
                    builderMap.set(bName.toLowerCase(), newId);
                }
            });

            if (newGroups.length > 0) {
                 onImportBuilderGroups(newGroups);
                 addLog(`Registered ${newGroups.length} new Builder Groups.`);
            }
        }
        
        // Simulating Chunked Upload
        const CHUNK_SIZE = 100;
        const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);
        
        for (let i = 0; i < totalChunks; i++) {
          const chunk = results.data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          
          // Simulate network latency for backend upload
          await new Promise(resolve => setTimeout(resolve, 500)); 
          
          // Transform chunk to internal format (Mocking backend transformation)
          if (importType === 'CLAIMS') {
            const transformed: Claim[] = chunk.map((row: any, idx: number) => ({
              id: `IMP-${Date.now()}-${i}-${idx}`,
              title: row.title || 'Untitled Claim',
              description: row.description || 'No description provided.',
              category: row.category || 'General',
              address: row.address || 'Unknown Address',
              homeownerName: row.homeownerName || 'Unknown Homeowner', // Assuming name might not be in CSV, ideally join with Homeowner DB
              homeownerEmail: row.homeownerEmail,
              status: row.status as ClaimStatus || ClaimStatus.SUBMITTED,
              classification: 'Unclassified' as ClaimClassification,
              dateSubmitted: row.dateSubmitted ? new Date(row.dateSubmitted) : new Date(),
              proposedDates: [],
              comments: [],
              attachments: []
            }));
            importedClaims.push(...transformed);
          } else if (importType === 'HOMEOWNERS') {
            const transformed: Homeowner[] = chunk.map((row: any, idx: number) => {
              const builderName = row.builder || '';
              const builderId = builderMap.get(builderName.toLowerCase()) || '';
              
              return {
                id: `imp-h-${Date.now()}-${i}-${idx}`,
                name: row.name,
                email: row.email,
                phone: row.phone || '',
                street: row.street,
                city: row.city,
                state: row.state,
                zip: row.zip,
                address: `${row.street}, ${row.city}, ${row.state} ${row.zip}`,
                jobName: row.jobName,
                builder: builderName,
                builderId: builderId, // Link to the BuilderGroup ID
                closingDate: row.closingDate ? new Date(row.closingDate) : new Date(),
              };
            });
            importedHomeowners.push(...transformed);
          }

          const currentProgress = Math.round(((i + 1) / totalChunks) * 100);
          setProgress(currentProgress);
          addLog(`Processed batch ${i + 1}/${totalChunks} (${chunk.length} records)`);
        }

        addLog('Upload complete. Syncing state...');
        if (importType === 'CLAIMS') {
          onImportClaims(importedClaims);
        } else if (importType === 'HOMEOWNERS') {
          onImportHomeowners(importedHomeowners);
        }
        
        setIsProcessing(false);
        setUploadStatus('COMPLETE');
        addLog('Success: Data successfully imported into Cascade Connect.');
      }
    });
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to delete ALL homeowners? This action cannot be undone.')) {
      onClearHomeowners();
      addLog('System: All homeowners cleared from database.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Configuration Card */}
        <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant">
          <h2 className="text-xl font-normal text-surface-on mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Bulk Data Import
          </h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-surface-on-variant mb-2">Data Type</label>
            <div className="flex gap-2">
              {(['CLAIMS', 'HOMEOWNERS', 'CONTRACTORS'] as ImportType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => { setImportType(type); setFile(null); setPreviewData([]); setLogs([]); setUploadStatus('IDLE'); }}
                  disabled={isProcessing}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    importType === type 
                      ? 'bg-secondary-container text-secondary-on-container ring-1 ring-secondary-on-container' 
                      : 'bg-surface-container text-surface-on-variant hover:bg-surface-container-high'
                  }`}
                >
                  {type === 'CONTRACTORS' ? 'Subs' : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              uploadStatus === 'ERROR' ? 'border-error bg-error/5' : 
              'border-surface-outline-variant hover:bg-surface-container hover:border-primary/50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                const f = e.dataTransfer.files[0];
                setFile(f);
                parseFile(f);
              }
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange} 
              accept=".csv,.json"
              className="hidden" 
            />
            
            {file ? (
              <div className="flex flex-col items-center">
                <FileText className="h-12 w-12 text-primary mb-2" />
                <p className="text-surface-on font-medium">{file.name}</p>
                <p className="text-sm text-surface-on-variant">{(file.size / 1024).toFixed(2)} KB</p>
                <button onClick={() => fileInputRef.current?.click()} className="text-primary text-sm mt-2 hover:underline">
                  Change file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-12 w-12 text-surface-outline-variant mb-2" />
                <p className="text-surface-on font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-surface-on-variant mt-1">CSV or JSON files up to 50MB</p>
              </div>
            )}
          </div>

          {/* Validation Feedback */}
          {uploadStatus === 'ERROR' && (
             <div className="mt-4 p-4 bg-error/10 text-error rounded-xl flex items-start gap-3">
               <AlertCircle className="h-5 w-5 flex-shrink-0" />
               <div className="text-sm">
                 <p className="font-bold">Validation Failed</p>
                 <p>The uploaded file is missing required columns. Please check the logs.</p>
               </div>
             </div>
          )}

          {/* Action Bar */}
          <div className="mt-6 flex justify-between items-center">
            <div className="text-xs text-surface-on-variant">
              Target: <span className="font-mono bg-surface-container px-1 rounded">production-db (Neon)</span>
            </div>
            <Button 
              onClick={handleStartImport} 
              disabled={!file || uploadStatus === 'ERROR' || isProcessing || uploadStatus === 'COMPLETE'}
              icon={isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <Database className="h-4 w-4" />}
            >
              {isProcessing ? 'Importing...' : 'Start Import'}
            </Button>
          </div>
        </div>

        {/* Progress Card */}
        {(isProcessing || uploadStatus === 'COMPLETE') && (
          <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-surface-on">Import Progress</span>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {uploadStatus === 'COMPLETE' && (
              <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-xl">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Import completed successfully! Records added to system.</span>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone - Homeowners Only */}
        {importType === 'HOMEOWNERS' && (
           <div className="bg-error/5 p-6 rounded-3xl border border-error/20">
              <h3 className="text-sm font-bold text-error flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                Danger Zone
              </h3>
              <div className="flex items-center justify-between gap-4">
                 <p className="text-xs text-error/80">
                    Need to restart? This will permanently delete all homeowner records from the database.
                 </p>
                 <Button 
                    variant="danger" 
                    onClick={handleClearData} 
                    icon={<Trash2 className="h-4 w-4" />}
                    className="!h-8 !text-xs !px-3"
                 >
                    Clear All Homeowners
                 </Button>
              </div>
           </div>
        )}
      </div>

      {/* Right Column: Logs & Preview */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Logs Console */}
        <div className="bg-surface-on text-surface rounded-3xl overflow-hidden flex flex-col h-64 md:h-auto md:min-h-[300px]">
          <div className="bg-surface-on-variant/50 p-3 flex items-center gap-2 border-b border-surface-outline/20">
            <Terminal className="h-4 w-4 text-surface" />
            <span className="text-xs font-mono tracking-wide text-surface/80">SYSTEM LOGS</span>
          </div>
          <div className="flex-1 p-4 font-mono text-xs space-y-1 overflow-y-auto max-h-[300px]">
             {logs.length === 0 && <span className="text-surface/30">Waiting for events...</span>}
             {logs.map((log, i) => (
               <div key={i} className="break-all">{log}</div>
             ))}
             {/* Auto-scroll anchor */}
             <div className="h-0" />
          </div>
        </div>

        {/* Mini Preview */}
        {previewData.length > 0 && (
          <div className="bg-surface rounded-3xl border border-surface-outline-variant overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-outline-variant bg-surface-container">
              <h3 className="text-sm font-bold text-surface-on">Data Preview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-container-high text-surface-on-variant">
                  <tr>
                    {headers.slice(0,3).map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-outline-variant">
                  {previewData.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {headers.slice(0,3).map(h => <td key={h} className="px-3 py-2 text-surface-on truncate max-w-[100px]">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 text-xs text-center text-surface-outline-variant border-t border-surface-outline-variant">
                Showing 5 of {previewData.length} (preview)
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DataImport;
