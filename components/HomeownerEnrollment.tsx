
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Button from './Button';
import CalendarPicker from './CalendarPicker';
import { Homeowner, HomeownerDocument, BuilderGroup } from '../types';
import { UserPlus, Home, User, Calendar, FileText, Upload, X, Building2, MapPin, HardHat } from 'lucide-react';

interface HomeownerEnrollmentProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (data: Partial<Homeowner>, tradeListFile: File | null, subcontractorList?: any[]) => void;
  builderGroups: BuilderGroup[];
}

const HomeownerEnrollment: React.FC<HomeownerEnrollmentProps> = ({ isOpen, onClose, onEnroll, builderGroups }) => {
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Lock body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const parseSubcontractorFile = (file: File) => {
    setIsParsing(true);
    setParsedSubs([]);

    // Check if it's a CSV file
    const isCSV = file.type === 'text/csv' || 
                  file.type === 'application/vnd.ms-excel' ||
                  file.name.toLowerCase().endsWith('.csv');
    
    // Check if it's an Excel file
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel' ||
                    file.name.toLowerCase().endsWith('.xlsx') ||
                    file.name.toLowerCase().endsWith('.xls');

    if (isCSV) {
      // Parse CSV file directly
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
            // Only show error if it's not just a warning about missing fields
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
            alert('No data found in CSV file. Please ensure the file contains rows of data.');
            setIsParsing(false);
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          alert(`Error reading CSV file: ${error.message || 'Please try again.'}`);
          setIsParsing(false);
        }
      });
    } else if (isExcel) {
      // Parse Excel file using xlsx library
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            alert('Error reading Excel file. Please try again.');
            setIsParsing(false);
            return;
          }

          // Read the workbook
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get the first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            raw: false
          });

          if (jsonData.length === 0) {
            alert('No data found in Excel file. Please ensure the file contains rows of data.');
            setIsParsing(false);
            return;
          }

          // First row is headers
          const headers = jsonData[0] as string[];
          if (!headers || headers.length === 0) {
            alert('No headers found in Excel file. Please ensure the first row contains column names.');
            setIsParsing(false);
            return;
          }

          // Convert to array of objects
          const rows = jsonData.slice(1) as any[][];
          const parsedData = rows
            .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined)) // Skip empty rows
            .map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || '';
              });
              return obj;
            });

          if (parsedData.length === 0) {
            alert('No data rows found in Excel file. Please ensure the file contains data rows.');
            setIsParsing(false);
            return;
          }

          setParsedSubs(parsedData);
          setIsParsing(false);
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          alert(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Please ensure the file is a valid Excel file.'}`);
          setIsParsing(false);
        }
      };
      reader.onerror = () => {
        alert('Error reading Excel file. Please try again.');
        setIsParsing(false);
      };
      reader.readAsBinaryString(file);
    } else {
      // Try to parse as CSV anyway (might be a CSV with wrong extension)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('File parsing errors:', results.errors);
            const criticalErrors = results.errors.filter(e => e.type !== 'Quotes' && e.type !== 'Delimiter');
            if (criticalErrors.length > 0) {
              alert(`Error parsing file: ${criticalErrors[0].message || 'Please ensure the file is a valid CSV or Excel file.'}`);
              setIsParsing(false);
              return;
            }
          }
          if (results.data && results.data.length > 0) {
            setParsedSubs(results.data);
            setIsParsing(false);
          } else {
            alert('No data found in file. Please ensure the file contains rows of data.');
            setIsParsing(false);
          }
        },
        error: (error) => {
          console.error('File parsing error:', error);
          alert(`Error reading file: ${error.message || 'Please ensure the file is a valid CSV or Excel file.'}`);
          setIsParsing(false);
        }
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setTradeFile(selectedFile);
      parseSubcontractorFile(selectedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate File Upload
    if (!tradeFile) {
      alert("Please upload the Contractor List before submitting.");
      return;
    }

    // Validate Closing Date
    if (!closingDate) {
      alert("Please select a Closing Date before submitting.");
      return;
    }
    
    const newHomeowner: Partial<Homeowner> = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      phone,
      buyer2Email,
      buyer2Phone,
      // Defaults for fields removed from form
      builder: 'Pending Assignment',
      builderId: '',
      jobName: 'Pending Assignment',
      street,
      city,
      state,
      zip,
      address: `${street}, ${city}, ${state} ${zip}`, // Construct full address
      agentName,
      agentEmail,
      agentPhone,
      closingDate: new Date(closingDate),
      preferredWalkThroughDate: walkThroughDate ? new Date(walkThroughDate) : undefined,
      enrollmentComments: comments
    };
    
    onEnroll(newHomeowner, tradeFile, parsedSubs.length > 0 ? parsedSubs : undefined);
    onClose();
  };

  if (!isOpen) return null;

  const inputClass = "w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder-surface-outline-variant dark:placeholder-gray-500";
  const labelClass = "block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1";
  const sectionClass = "bg-surface-container/30 dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant/50 dark:border-gray-600/50";
  
  // Material 3 date input field style - Outlined variant
  const dateInputClass = "w-full bg-transparent dark:bg-transparent rounded-lg px-3 py-2.5 text-sm text-surface-on dark:text-gray-100 border-2 border-surface-outline-variant dark:border-gray-600 hover:border-surface-on dark:hover:border-gray-500 focus-within:border-primary dark:focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 dark:focus-within:ring-primary/20 outline-none transition-all cursor-pointer";
  const dateInputContainerClass = "relative";
  
  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-[backdrop-fade-in_0.2s_ease-out]">
      <div className="bg-surface dark:bg-gray-800 w-full max-w-4xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-primary" />
              New Homebuyer Enrollment Form
            </h2>
          </div>
          <button onClick={onClose} className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 p-2 rounded-full hover:bg-white/10 dark:hover:bg-gray-600/50">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-surface dark:bg-gray-800">
          
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
                           className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-1.5 py-2 text-sm text-center text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder-surface-outline-variant dark:placeholder-gray-500 min-w-0" 
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
                   <Calendar className="h-4 w-4 text-primary dark:text-primary" />
                   Important Dates
                 </h3>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className={labelClass}>Preferred Walk Through</label>
                     <button
                       type="button"
                       onClick={() => setShowWalkThroughDatePicker(true)}
                       className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-left text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none hover:bg-surface-container dark:hover:bg-gray-600 transition-colors flex items-center justify-between"
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
                       className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-left text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none hover:bg-surface-container dark:hover:bg-gray-600 transition-colors flex items-center justify-between"
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
                     <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl hover:bg-surface-container dark:hover:bg-gray-700 transition-colors ${!tradeFile ? 'border-primary/50 dark:border-primary/30 bg-primary/5 dark:bg-primary/10' : 'border-surface-outline-variant dark:border-gray-600'}`}>
                       <div className="space-y-1 text-center">
                         <Upload className="mx-auto h-8 w-8 text-surface-outline-variant dark:text-gray-500" />
                         <div className="flex text-sm text-surface-on-variant dark:text-gray-400 justify-center">
                           <label className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
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
                     
                     {/* Parsed Subcontractors Table */}
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
                         <div className="overflow-x-auto max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
            <Button type="button" variant="text" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="filled" icon={<UserPlus className="h-4 w-4" />}>
              Submit Enrollment
            </Button>
          </div>
        </form>
      </div>
      
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

export default HomeownerEnrollment;
