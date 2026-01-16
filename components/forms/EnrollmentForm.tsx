'use client';

import React, { useState } from 'react';
import { User, Building2, Calendar, FileText, Upload, HardHat, X } from 'lucide-react';
import Button from '../Button';
import CalendarPicker from '../CalendarPicker';

interface EnrollmentFormProps {
  forcedGroupId?: string; // If provided, builder group selection is hidden and this ID is used
  onSubmit?: (data: any, tradeFile: File | null, parsedSubs?: any[]) => void;
  builderGroups?: Array<{ id: string; name: string }>; // Only required if forcedGroupId is not provided
}

const EnrollmentForm: React.FC<EnrollmentFormProps> = ({
  forcedGroupId,
  onSubmit,
  builderGroups = [],
}) => {
  // Buyer 1
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Buyer 2
  const [buyer2Phone, setBuyer2Phone] = useState('');
  const [buyer2Email, setBuyer2Email] = useState('');

  // Property
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // Agent
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');

  // Dates & Other
  const [closingDate, setClosingDate] = useState('');
  const [walkThroughDate, setWalkThroughDate] = useState('');
  const [comments, setComments] = useState('');
  const [tradeFile, setTradeFile] = useState<File | null>(null);
  const [parsedSubs, setParsedSubs] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [showClosingDatePicker, setShowClosingDatePicker] = useState(false);
  const [showWalkThroughDatePicker, setShowWalkThroughDatePicker] = useState(false);
  const [selectedBuilderId, setSelectedBuilderId] = useState('');

  const parseSubcontractorFile = async (file: File) => {
    setIsParsing(true);
    setParsedSubs([]);

    const isCSV = file.type === 'text/csv' || 
                  file.type === 'application/vnd.ms-excel' ||
                  file.name.toLowerCase().endsWith('.csv');
    
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel' ||
                    file.name.toLowerCase().endsWith('.xlsx') ||
                    file.name.toLowerCase().endsWith('.xls');

    if (isCSV) {
      const Papa = (await import('papaparse')).default;
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          if (results.errors.length > 0) {
            const criticalErrors = results.errors.filter(e => e.type !== 'Quotes' && e.type !== 'Delimiter');
            if (criticalErrors.length > 0) {
              alert(`Error parsing CSV file: ${criticalErrors[0].message || 'Please check the file format.'}`);
              setIsParsing(false);
              return;
            }
          }
          if (results.data && results.data.length > 0) {
            setParsedSubs(results.data);
            setIsParsing(false);
          } else {
            alert('No data found in CSV file.');
            setIsParsing(false);
          }
        },
        error: (error) => {
          alert(`Error reading CSV file: ${error.message || 'Please try again.'}`);
          setIsParsing(false);
        }
      });
    } else if (isExcel) {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            alert('Error reading Excel file.');
            setIsParsing(false);
            return;
          }

          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            raw: false
          });

          if (jsonData.length === 0) {
            alert('No data found in Excel file.');
            setIsParsing(false);
            return;
          }

          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];
          const parsedData = rows
            .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
            .map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || '';
              });
              return obj;
            });

          setParsedSubs(parsedData);
          setIsParsing(false);
        } catch (error) {
          alert(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Invalid file.'}`);
          setIsParsing(false);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      alert('Please upload a valid CSV or Excel file.');
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setTradeFile(selectedFile);
      void parseSubcontractorFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tradeFile) {
      alert("Please upload the Contractor List before submitting.");
      return;
    }

    if (!closingDate) {
      alert("Please select a Closing Date.");
      return;
    }

    if (!forcedGroupId && !selectedBuilderId) {
      alert("Please select a builder.");
      return;
    }

    const enrollmentData = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      phone,
      buyer2Email,
      buyer2Phone,
      builderGroupId: forcedGroupId || selectedBuilderId,
      street,
      city,
      state,
      zip,
      address: `${street}, ${city}, ${state} ${zip}`,
      agentName,
      agentEmail,
      agentPhone,
      closingDate: new Date(closingDate),
      preferredWalkThroughDate: walkThroughDate ? new Date(walkThroughDate) : undefined,
      enrollmentComments: comments
    };

    if (onSubmit) {
      onSubmit(enrollmentData, tradeFile, parsedSubs.length > 0 ? parsedSubs : undefined);
    } else {
      // Default: Submit to API endpoint
      const formData = new FormData();
      formData.append('data', JSON.stringify(enrollmentData));
      formData.append('tradeFile', tradeFile);
      if (parsedSubs.length > 0) {
        formData.append('parsedSubs', JSON.stringify(parsedSubs));
      }

      try {
        const response = await fetch('/api/enroll', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          alert('Enrollment submitted successfully!');
          window.location.href = '/enrollment-success';
        } else {
          throw new Error('Failed to submit enrollment');
        }
      } catch (error) {
        alert('Failed to submit enrollment. Please try again.');
        console.error(error);
      }
    }
  };

  const inputClass = "w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder-surface-outline-variant dark:placeholder-gray-500";
  const labelClass = "block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1";
  const sectionClass = "bg-surface-container/30 dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant/50 dark:border-gray-600/50";

  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Column 1: Buyers & Agent */}
          <div className="space-y-6">
            <div className={sectionClass}>
              <h3 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Buyer 1 Information (Primary)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input type="text" required className={inputClass} value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input type="text" required className={inputClass} value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Email Address *</label>
                  <input type="email" required className={inputClass} value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Phone Number *</label>
                  <input type="tel" required className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-primary opacity-50" />
                Buyer 2 Information (Optional)
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="tel" className={inputClass} value={buyer2Phone} onChange={e => setBuyer2Phone(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="email" className={inputClass} value={buyer2Email} onChange={e => setBuyer2Email(e.target.value)} />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-secondary" />
                Buyer's Agent
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Agent Name</label>
                  <input type="text" className={inputClass} value={agentName} onChange={e => setAgentName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="tel" className={inputClass} value={agentPhone} onChange={e => setAgentPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" className={inputClass} value={agentEmail} onChange={e => setAgentEmail(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Property & Meta */}
          <div className="space-y-6">

            {/* Builder Group Selection (only if not forced) */}
            {!forcedGroupId && builderGroups.length > 0 && (
              <div className={sectionClass}>
                <h3 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Select Your Builder *
                </h3>
                <select 
                  required 
                  className={inputClass} 
                  value={selectedBuilderId} 
                  onChange={e => setSelectedBuilderId(e.target.value)}
                >
                  <option value="">-- Select a builder --</option>
                  {builderGroups.map(bg => (
                    <option key={bg.id} value={bg.id}>{bg.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={sectionClass}>
              <h3 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Property Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Street Address *</label>
                  <input type="text" required className={inputClass} value={street} onChange={e => setStreet(e.target.value)} />
                </div>
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-3">
                    <label className={labelClass}>City *</label>
                    <input type="text" required className={inputClass} value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <label className={labelClass}>State</label>
                    <input 
                      type="text" 
                      required 
                      maxLength={2}
                      className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-1.5 py-2 text-sm text-center text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                      value={state} 
                      onChange={e => setState(e.target.value.toUpperCase())} 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Zip *</label>
                    <input type="text" required className={inputClass} value={zip} onChange={e => setZip(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Important Dates
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Preferred Walk Through</label>
                  <button
                    type="button"
                    onClick={() => setShowWalkThroughDatePicker(true)}
                    className={inputClass + " flex items-center justify-between"}
                  >
                    <span className={walkThroughDate ? '' : 'text-surface-on-variant dark:text-gray-400'}>
                      {walkThroughDate ? formatDateForDisplay(walkThroughDate) : 'Select date'}
                    </span>
                    <Calendar className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                  </button>
                </div>
                <div>
                  <label className={labelClass}>Closing Date *</label>
                  <button
                    type="button"
                    onClick={() => setShowClosingDatePicker(true)}
                    className={inputClass + " flex items-center justify-between"}
                  >
                    <span className={closingDate ? '' : 'text-surface-on-variant dark:text-gray-400'}>
                      {closingDate ? formatDateForDisplay(closingDate) : 'Select date'}
                    </span>
                    <Calendar className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                  </button>
                  <input type="hidden" required value={closingDate} />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Documentation
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Contractor List (Upload) *</label>
                  <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-colors ${!tradeFile ? 'border-primary/50 dark:border-primary/30 bg-primary/5 dark:bg-primary/10' : 'border-surface-outline-variant dark:border-gray-600'}`}>
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-8 w-8 text-surface-outline-variant dark:text-gray-500" />
                      <div className="flex text-sm text-surface-on-variant dark:text-gray-400 justify-center">
                        <label className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80">
                          <span>{tradeFile ? 'Change file' : 'Upload a file'}</span>
                          <input 
                            type="file" 
                            className="sr-only" 
                            accept=".csv,.xlsx,.xls,.txt"
                            onChange={handleFileChange} 
                          />
                        </label>
                        {!tradeFile && <p className="pl-1">or drag and drop</p>}
                      </div>
                      <p className="text-xs text-surface-outline-variant dark:text-gray-500">
                        {tradeFile ? tradeFile.name : 'CSV, XLS, XLSX up to 10MB'}
                      </p>
                    </div>
                  </div>
                  
                  {isParsing && (
                    <div className="mt-4 p-4 bg-surface-container dark:bg-gray-700 rounded-lg text-center">
                      <p className="text-sm text-surface-on-variant dark:text-gray-400">Parsing spreadsheet...</p>
                    </div>
                  )}
                  
                  {!isParsing && parsedSubs.length > 0 && (
                    <div className="mt-4 bg-surface-container dark:bg-gray-700 rounded-xl border border-surface-outline-variant dark:border-gray-600 overflow-hidden">
                      <div className="p-3 border-b border-surface-outline-variant dark:border-gray-600 bg-surface-container-high dark:bg-gray-800">
                        <h4 className="text-sm font-semibold text-surface-on dark:text-gray-100 flex items-center gap-2">
                          <HardHat className="h-4 w-4 text-primary" />
                          Subcontractors ({parsedSubs.length})
                        </h4>
                      </div>
                      <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-surface-container-high dark:bg-gray-800 sticky top-0">
                            <tr>
                              {Object.keys(parsedSubs[0] || {}).map((header, idx) => (
                                <th 
                                  key={idx}
                                  className="px-3 py-2 text-left text-xs font-semibold text-surface-on-variant dark:text-gray-400 uppercase tracking-wider border-b border-surface-outline-variant dark:border-gray-600"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
                            {parsedSubs.map((row, rowIdx) => (
                              <tr 
                                key={rowIdx}
                                className="hover:bg-surface-container-high dark:hover:bg-gray-800 transition-colors"
                              >
                                {Object.values(row).map((cell: any, cellIdx) => (
                                  <td 
                                    key={cellIdx}
                                    className="px-3 py-2 text-surface-on dark:text-gray-200 text-xs"
                                  >
                                    {cell || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Additional Comments</label>
                  <textarea 
                    rows={3} 
                    className={inputClass} 
                    value={comments} 
                    onChange={e => setComments(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-surface-outline-variant dark:border-gray-700">
          <Button type="submit" variant="filled" className="bg-primary text-white hover:bg-primary/90">
            Submit Enrollment
          </Button>
        </div>
      </form>
      
      {/* Calendar Pickers */}
      {showClosingDatePicker && (
        <CalendarPicker
          isOpen={showClosingDatePicker}
          onClose={() => setShowClosingDatePicker(false)}
          onSelectDate={(date) => {
            setClosingDate(formatDateForInput(date));
            setShowClosingDatePicker(false);
          }}
          selectedDate={closingDate ? new Date(closingDate) : null}
        />
      )}
      
      {showWalkThroughDatePicker && (
        <CalendarPicker
          isOpen={showWalkThroughDatePicker}
          onClose={() => setShowWalkThroughDatePicker(false)}
          onSelectDate={(date) => {
            setWalkThroughDate(formatDateForInput(date));
            setShowWalkThroughDatePicker(false);
          }}
          selectedDate={walkThroughDate ? new Date(walkThroughDate) : null}
        />
      )}
    </div>
  );
};

export default EnrollmentForm;
