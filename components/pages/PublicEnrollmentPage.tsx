import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, isDbConfigured } from '../../db';
import { builderGroups, homeowners as homeownersTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { Homeowner } from '../../types';

// Import EnrollmentForm from the component directory
import Button from '../Button';
import CalendarPicker from '../CalendarPicker';
import { User, Building2, Calendar, FileText, Upload, HardHat, Loader2 } from 'lucide-react';

const PublicEnrollmentPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [builder, setBuilder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [buyer2Phone, setBuyer2Phone] = useState('');
  const [buyer2Email, setBuyer2Email] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [walkThroughDate, setWalkThroughDate] = useState('');
  const [comments, setComments] = useState('');
  const [tradeFile, setTradeFile] = useState<File | null>(null);
  const [parsedSubs, setParsedSubs] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [showClosingDatePicker, setShowClosingDatePicker] = useState(false);
  const [showWalkThroughDatePicker, setShowWalkThroughDatePicker] = useState(false);

  useEffect(() => {
    const loadBuilder = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!isDbConfigured) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const result = await db
          .select()
          .from(builderGroups)
          .where(eq(builderGroups.enrollmentSlug, slug))
          .limit(1);

        if (!result || result.length === 0) {
          setNotFound(true);
        } else {
          setBuilder(result[0]);
        }
      } catch (error) {
        console.error('Failed to load builder:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadBuilder();
  }, [slug]);

  const parseSubcontractorFile = async (file: File) => {
    setIsParsing(true);
    setParsedSubs([]);

    const isCSV = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

    try {
      if (isCSV) {
        const Papa = (await import('papaparse')).default;
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              setParsedSubs(results.data);
            }
            setIsParsing(false);
          },
          error: () => {
            alert('Error parsing CSV file');
            setIsParsing(false);
          }
        });
      } else if (isExcel) {
        const XLSX = await import('xlsx');
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
            
            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1) as any[][];
            const parsedData = rows
              .filter(row => row.some(cell => cell))
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
            alert('Error parsing Excel file');
            setIsParsing(false);
          }
        };
        reader.readAsBinaryString(file);
      }
    } catch (error) {
      alert('Error reading file');
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setTradeFile(selectedFile);
      parseSubcontractorFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tradeFile) {
      alert('Please upload the Contractor List');
      return;
    }

    if (!closingDate) {
      alert('Please select a Closing Date');
      return;
    }

    setSubmitting(true);

    try {
      const homeownerData: Partial<Homeowner> = {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        phone,
        buyer2Email,
        buyer2Phone,
        builder: builder.name,
        builderGroupId: builder.id,
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
        enrollmentComments: comments,
      };

      // Insert into database
      await db.insert(homeownersTable).values({
        name: homeownerData.name!,
        firstName: homeownerData.firstName,
        lastName: homeownerData.lastName,
        email: homeownerData.email!,
        phone: homeownerData.phone,
        buyer2Email: homeownerData.buyer2Email || null,
        buyer2Phone: homeownerData.buyer2Phone || null,
        builder: homeownerData.builder,
        builderGroupId: homeownerData.builderGroupId || null,
        street: homeownerData.street,
        city: homeownerData.city,
        state: homeownerData.state,
        zip: homeownerData.zip,
        address: homeownerData.address!,
        agentName: homeownerData.agentName || null,
        agentEmail: homeownerData.agentEmail || null,
        agentPhone: homeownerData.agentPhone || null,
        closingDate: homeownerData.closingDate,
        preferredWalkThroughDate: homeownerData.preferredWalkThroughDate || null,
        enrollmentComments: homeownerData.enrollmentComments || null,
      });

      // TODO: Handle trade file upload and contractor import

      alert('Enrollment submitted successfully!');
      
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setStreet('');
      setCity('');
      setState('');
      setZip('');
      setClosingDate('');
      setTradeFile(null);
      setParsedSubs([]);
      
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Failed to submit enrollment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
  const labelClass = "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1";
  const sectionClass = "bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-600";

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-4">🏗️</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Builder Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The enrollment link you're looking for doesn't exist or has been disabled.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your builder for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-5xl mx-auto py-8">
        {/* Builder Branding Header */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome to {builder.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your homeowner enrollment below
          </p>
        </div>

        {/* Enrollment Form */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Column 1 */}
              <div className="space-y-6">
                <div className={sectionClass}>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
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
                      <label className={labelClass}>Email *</label>
                      <input type="email" required className={inputClass} value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Phone *</label>
                      <input type="tel" required className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className={sectionClass}>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400" />
                    Buyer 2 (Optional)
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Phone</label>
                      <input type="tel" className={inputClass} value={buyer2Phone} onChange={e => setBuyer2Phone(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" className={inputClass} value={buyer2Email} onChange={e => setBuyer2Email(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className={sectionClass}>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-600" />
                    Buyer's Agent
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Name</label>
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

              {/* Column 2 */}
              <div className="space-y-6">
                <div className={sectionClass}>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Property
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Street *</label>
                      <input type="text" required className={inputClass} value={street} onChange={e => setStreet(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-6 gap-3">
                      <div className="col-span-3">
                        <label className={labelClass}>City *</label>
                        <input type="text" required className={inputClass} value={city} onChange={e => setCity(e.target.value)} />
                      </div>
                      <div className="col-span-1">
                        <label className={labelClass}>State</label>
                        <input type="text" required maxLength={2} className={inputClass + " text-center"} value={state} onChange={e => setState(e.target.value.toUpperCase())} />
                      </div>
                      <div className="col-span-2">
                        <label className={labelClass}>Zip *</label>
                        <input type="text" required className={inputClass} value={zip} onChange={e => setZip(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={sectionClass}>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Dates
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Walk Through</label>
                      <button type="button" onClick={() => setShowWalkThroughDatePicker(true)} className={inputClass + " flex items-center justify-between"}>
                        <span className={walkThroughDate ? '' : 'text-gray-400'}>{walkThroughDate ? formatDateForDisplay(walkThroughDate) : 'Select'}</span>
                        <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <label className={labelClass}>Closing Date *</label>
                      <button type="button" onClick={() => setShowClosingDatePicker(true)} className={inputClass + " flex items-center justify-between"}>
                        <span className={closingDate ? '' : 'text-gray-400'}>{closingDate ? formatDateForDisplay(closingDate) : 'Select'}</span>
                        <Calendar className="h-4 w-4" />
                      </button>
                      <input type="hidden" required value={closingDate} />
                    </div>
                  </div>
                </div>

                <div className={sectionClass}>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Documents
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Contractor List *</label>
                      <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl ${!tradeFile ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}>
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                          <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">
                            <span>{tradeFile ? tradeFile.name : 'Upload file'}</span>
                            <input type="file" className="sr-only" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
                          </label>
                          <p className="text-xs text-gray-500">CSV or Excel</p>
                        </div>
                      </div>
                      {isParsing && <p className="text-sm text-gray-500 mt-2">Parsing...</p>}
                      {parsedSubs.length > 0 && <p className="text-sm text-green-600 mt-2">✓ {parsedSubs.length} contractors found</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Comments</label>
                      <textarea rows={3} className={inputClass} value={comments} onChange={e => setComments(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button type="submit" variant="filled" disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
                {submitting ? 'Submitting...' : 'Submit Enrollment'}
              </Button>
            </div>
          </form>
        </div>
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

export default PublicEnrollmentPage;
