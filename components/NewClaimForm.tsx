
import React, { useState, useRef, useEffect } from 'react';
import { CLAIM_CLASSIFICATIONS } from '../constants';
import { Contractor, ClaimClassification, Attachment, Homeowner, ClaimStatus, UserRole } from '../types';
import Button from './Button';
import ImageViewerModal from './ImageViewerModal';
import CalendarPicker from './CalendarPicker';
import MaterialSelect from './MaterialSelect';
import { X, Upload, Video, FileText, Search, Building2, Loader2, AlertTriangle, CheckCircle, Paperclip, Send, Calendar, Briefcase } from 'lucide-react';

interface NewClaimFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onSendMessage?: () => void;
  contractors: Contractor[];
  activeHomeowner: Homeowner;
  userRole: UserRole;
}

const NewClaimForm: React.FC<NewClaimFormProps> = ({ onSubmit, onCancel, onSendMessage, contractors, activeHomeowner, userRole }) => {
  const isAdmin = userRole === UserRole.ADMIN;

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Classification & Status (Admin Only)
  const [classification, setClassification] = useState<ClaimClassification>('60 Day');
  const [dateEvaluated, setDateEvaluated] = useState(new Date().toISOString().split('T')[0]);
  const [nonWarrantyExplanation, setNonWarrantyExplanation] = useState('');
  
  // Assignment (Admin Only)
  const [contractorSearch, setContractorSearch] = useState('');
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  
  // Internal (Admin Only)
  const [internalNotes, setInternalNotes] = useState('');
  
  // Scheduling state
  const [proposeDate, setProposeDate] = useState('');
  const [proposeTime, setProposeTime] = useState<'AM' | 'PM' | 'All Day'>('AM');
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [showDateEvaluatedPicker, setShowDateEvaluatedPicker] = useState(false);
  const [showClassificationSelect, setShowClassificationSelect] = useState(false);
  const classificationSelectRef = useRef<HTMLDivElement>(null);
  
  // Close classification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (classificationSelectRef.current && !classificationSelectRef.current.contains(event.target as Node)) {
        setShowClassificationSelect(false);
      }
    };
    
    if (showClassificationSelect) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClassificationSelect]);

  // Attachments State
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  // Only show contractors if user has typed something
  const filteredContractors = contractorSearch.trim() 
    ? contractors.filter(c => c.companyName.toLowerCase().includes(contractorSearch.toLowerCase()) || c.specialty.toLowerCase().includes(contractorSearch.toLowerCase()))
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const contractor = contractors.find(c => c.id === selectedContractorId);

    // Classifications that automatically close the claim
    const closingClassifications: ClaimClassification[] = [
      'Non-Warranty',
      'Service Complete',
      'Courtesy Repair (Non-Warranty)',
      'Duplicate'
    ];
    const shouldClose = isAdmin && closingClassifications.includes(classification);

    const payload = {
      title,
      description,
      category: 'General',
      // Admin specific fields default if not admin
      classification: isAdmin ? classification : 'Unclassified',
      dateEvaluated: isAdmin && dateEvaluated ? new Date(dateEvaluated) : undefined,
      nonWarrantyExplanation: isAdmin && classification === 'Non-Warranty' ? nonWarrantyExplanation : undefined,
      internalNotes: isAdmin ? internalNotes : undefined,
      contractorId: isAdmin ? contractor?.id : undefined,
      contractorName: isAdmin ? contractor?.companyName : undefined,
      contractorEmail: isAdmin ? contractor?.email : undefined,
      status: shouldClose ? ClaimStatus.COMPLETED : ClaimStatus.SUBMITTED,
      attachments,
      proposedDates: proposeDate ? [{
        date: new Date(proposeDate).toISOString(),
        timeSlot: proposeTime,
        status: 'PENDING' as const
      }] : []
    };
    
    onSubmit(payload);
  };


  // M3 Input Styles
  const inputClass = "block w-full rounded-md border border-surface-outline dark:border-gray-600 bg-transparent dark:bg-gray-700 px-3 py-3 text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:text-sm transition-colors";
  const labelClass = "block text-xs text-surface-on dark:text-gray-100 mb-1 ml-1 font-medium";
  const internalNotesLabelClass = "block text-xs text-surface-on dark:text-gray-100 mb-1 ml-1 font-medium";
  const selectClass = "block w-full rounded-md border border-surface-outline dark:border-gray-600 bg-transparent dark:bg-gray-700 px-3 py-3 text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:text-sm transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
      {/* Header */}
      <div className="pb-4 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-normal text-surface-on dark:text-gray-100">
          New Claim
        </h2>
      {/* Job Name Pill */}
        <span className="bg-primary text-primary-on text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {activeHomeowner.jobName}
         </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Basic Info */}
        <div className="space-y-6">
          {/* Title and Description Card */}
          <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
            <div className="space-y-4">
           <div>
                <label htmlFor="title" className="block text-sm font-bold text-surface-on dark:text-gray-100 mb-3">Claim Title</label>
            <input
              id="title"
              type="text"
              required
                  className={`${inputClass} bg-secondary-container/20 dark:bg-gray-700/50 border-secondary-container dark:border-gray-600 text-secondary-on-container dark:text-gray-100`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
                <label htmlFor="description" className="block text-sm font-bold text-surface-on dark:text-gray-100 mb-3">Description</label>
            <textarea
              id="description"
              rows={4}
              required
                  className={`${inputClass} bg-secondary-container/20 dark:bg-gray-700/50 border-secondary-container dark:border-gray-600 text-secondary-on-container dark:text-gray-100`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
              </div>
            </div>
        </div>

          {/* Internal Notes (Admin Only) */}
           {isAdmin && (
             <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
              <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-3">Internal Notes (Admin Only)</h4>
              <textarea
                id="internalNotes"
                rows={4}
                className={`${inputClass} bg-secondary-container/20 dark:bg-gray-700/50 border-secondary-container dark:border-gray-600 text-secondary-on-container dark:text-gray-100`}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
            </div>
           )}

      {/* Attachments Section */}
      <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
        <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-3">
          Attachments
        </h4>
        <div className="space-y-4">
          {/* Existing Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {attachments.map((att, i) => {
                const attachmentKey = att.id || `att-${i}`;
                const attachmentUrl = att.url || '';
                const attachmentName = att.name || 'Attachment';
                const attachmentType = att.type || 'DOCUMENT';
                
                    return (
                      <div 
                        key={attachmentKey} 
                        className={`relative w-24 h-24 bg-surface-container dark:bg-gray-700 rounded-lg overflow-hidden border border-surface-outline-variant dark:border-gray-600 hover:shadow-elevation-1 transition-all ${
                          attachmentType === 'IMAGE' && attachmentUrl ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => {
                          if (attachmentType === 'IMAGE' && attachmentUrl) {
                            const imageIndex = attachments
                              .filter(a => a.type === 'IMAGE' && a.url)
                              .findIndex(a => a.url === attachmentUrl);
                            if (imageIndex !== -1) {
                              setImageViewerIndex(imageIndex);
                              setImageViewerOpen(true);
                            }
                          }
                        }}
                      >
                        {attachmentType === 'IMAGE' && attachmentUrl ? (
                          <>
                            <img 
                              src={attachmentUrl} 
                              alt={attachmentName} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.parentElement?.querySelector('.image-fallback');
                                if (fallback) {
                                  (fallback as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                            <div className="image-fallback hidden absolute inset-0 w-full h-full flex flex-col items-center justify-center p-2 text-center bg-surface-container dark:bg-gray-700">
                              <FileText className="h-8 w-8 text-primary mb-1" />
                              <span className="text-[10px] text-surface-on-variant truncate w-full px-1">{attachmentName}</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                            {attachmentType === 'VIDEO' ? (
                              <Video className="h-8 w-8 text-primary mb-2" />
                            ) : (
                              <FileText className="h-8 w-8 text-blue-600 mb-2" />
                            )}
                            <span className="text-[10px] text-surface-on-variant truncate w-full">{attachmentName}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachments(attachments.filter((_, idx) => idx !== i));
                          }}
                          className="absolute top-1 right-1 bg-error/80 hover:bg-error text-white rounded-full p-1 z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
              })}
            </div>
          )}
          
          {/* Upload Section - Always visible */}
          <div className="border-t border-surface-outline-variant dark:border-gray-700 pt-4">
            <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-2">
              Upload Images or Documents
            </label>
            <label className={`cursor-pointer flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-colors ${
              isUploading ? 'bg-surface-container dark:bg-gray-700 border-primary/30 cursor-wait' : 'bg-surface-container/30 dark:bg-gray-700/30 border-surface-outline-variant dark:border-gray-600 hover:border-primary hover:bg-surface-container/50 dark:hover:bg-gray-700/50'
            }`}>
              {isUploading ? (
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              ) : (
                <Upload className="h-8 w-8 text-surface-outline-variant dark:text-gray-500" />
              )}
              <span className="text-sm text-surface-on-variant dark:text-gray-400">
                {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </span>
              <span className="text-xs text-surface-on-variant dark:text-gray-500">
                Images, PDFs, and documents (max 10MB)
              </span>
              <input 
                type="file" 
                className="hidden" 
                multiple
                accept="image/*,application/pdf,.doc,.docx"
                disabled={isUploading}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  
                  setIsUploading(true);
                  const newAttachments: Attachment[] = [];
                  
                  try {
                    for (const file of Array.from(files)) {
                      if (file.size > 10 * 1024 * 1024) {
                        alert(`File ${file.name} is too large (>10MB). Please upload a smaller file.`);
                        continue;
                      }
                      
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                        const apiEndpoint = isLocalDev 
                          ? 'http://localhost:3000/api/upload'
                          : `${window.location.protocol}//${window.location.hostname.startsWith('www.') ? window.location.hostname : `www.${window.location.hostname}`}/api/upload`;
                        
                        const response = await fetch(apiEndpoint, {
                          method: 'POST',
                          body: formData
                        });
                        
                        if (!response.ok) {
                          throw new Error(`Upload failed: ${response.statusText}`);
                        }
                        
                        const result = await response.json();
                        
                        if (result.success && result.url) {
                          newAttachments.push({
                            id: result.publicId || crypto.randomUUID(),
                            url: result.url,
                            name: file.name,
                            type: result.type || 'DOCUMENT'
                          });
                        }
                      } catch (error) {
                        console.error(`Failed to upload ${file.name}:`, error);
                        alert(`Failed to upload ${file.name}. Please try again.`);
                      }
                    }
                    
                    if (newAttachments.length > 0) {
                      setAttachments([...attachments, ...newAttachments]);
                    }
                  } finally {
                    setIsUploading(false);
                    // Reset input
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

        </div>

        {/* Right Column: Sub Assignment, Scheduling, Warranty Assessment */}
        <div className="space-y-6">
           {/* Sub Assignment (Admin Only) */}
           {isAdmin && (
             <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
                <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4">Sub Assignment</h4>
                
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Type to search subs..."
                    className="w-full rounded-md border border-surface-outline dark:border-gray-600 bg-surface dark:bg-gray-700 px-3 py-2 text-sm text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={contractorSearch}
                    onChange={(e) => setContractorSearch(e.target.value)}
                  />
                </div>

                {contractorSearch.trim().length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-surface-outline-variant dark:border-gray-600 rounded-md bg-surface dark:bg-gray-700 shadow-elevation-1">
                    {filteredContractors.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-surface-on-variant dark:text-gray-400">No subs found.</div>
                    ) : (
                      filteredContractors.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedContractorId(c.id); setContractorSearch(''); }}
                          className={`w-full text-left px-3 py-2 text-sm flex justify-between hover:bg-surface-container dark:hover:bg-gray-600 ${selectedContractorId === c.id ? 'bg-primary-container text-primary-on-container' : 'text-surface-on dark:text-gray-100'}`}
                        >
                          <span>{c.companyName}</span>
                          <span className="text-xs opacity-70">{c.specialty}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                
                {selectedContractorId && (
                  <div className="mt-2 flex flex-row items-center gap-3">
                    <div className="flex items-center gap-3 bg-secondary-container px-4 py-3 rounded-xl text-secondary-on-container flex-1 min-w-0">
                      <Briefcase className="h-5 w-5 flex-shrink-0" />
                      <div className="text-sm overflow-hidden min-w-0">
                        <p className="font-bold truncate">{contractors.find(c => c.id === selectedContractorId)?.companyName}</p>
                        <p className="opacity-80 text-xs truncate">{contractors.find(c => c.id === selectedContractorId)?.email}</p>
                      </div>
                    </div>
                    
                    <Button 
                      type="button"
                      variant="filled" 
                      disabled={true}
                      icon={<FileText className="h-4 w-4" />}
                      className="!h-12 whitespace-nowrap flex-shrink-0"
                      title="Save the claim first to send a service order"
                    >
                      Email S.O.
                    </Button>
                  </div>
                )}
             </div>
           )}

           {/* Scheduling */}
           <div className="bg-surface-container/20 dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
             <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4">Scheduling</h4>
             <div className="space-y-3">
               <div>
                 <label className="text-xs text-surface-on-variant dark:text-gray-300 mb-2 block">Scheduled Date</label>
                 <Button
                   type="button"
                   variant="filled"
                   onClick={() => setShowCalendarPicker(true)}
                 >
                   {proposeDate ? new Date(proposeDate).toLocaleDateString() : 'Add'}
                 </Button>
               </div>
               <div>
                 <label className="text-xs text-surface-on-variant dark:text-gray-300 mb-2 block">Time Slot</label>
                 <MaterialSelect
                   value={proposeTime}
                   onChange={(value) => setProposeTime(value as 'AM' | 'PM' | 'All Day')}
                   options={[
                     { value: 'AM', label: 'AM (8am-12pm)' },
                     { value: 'PM', label: 'PM (12pm-4pm)' },
                     { value: 'All Day', label: 'All Day' }
                   ]}
                 />
               </div>
             </div>
           </div>
           
           {showCalendarPicker && (
             <CalendarPicker
               isOpen={showCalendarPicker}
               selectedDate={proposeDate ? new Date(proposeDate) : undefined}
               onSelectDate={(date) => {
                 if (date) {
                   setProposeDate(date.toISOString().split('T')[0]);
                 }
                 setShowCalendarPicker(false);
               }}
               onClose={() => setShowCalendarPicker(false)}
             />
           )}
           
           {showDateEvaluatedPicker && (
             <CalendarPicker
               isOpen={showDateEvaluatedPicker}
               selectedDate={dateEvaluated ? new Date(dateEvaluated) : undefined}
               onSelectDate={(date) => {
                 if (date) {
                   setDateEvaluated(date.toISOString().split('T')[0]);
                 }
                 setShowDateEvaluatedPicker(false);
               }}
               onClose={() => setShowDateEvaluatedPicker(false)}
             />
           )}

           {/* Warranty Assessment (Admin Only) */}
           {isAdmin && (
             <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
              <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4">Warranty Assessment</h4>
              <div className="space-y-4">
                <div className="relative" ref={classificationSelectRef}>
                  <label className="text-xs text-surface-on-variant dark:text-gray-300 mb-2 block">Classification</label>
        <Button 
          type="button" 
                    variant="filled"
                    onClick={() => setShowClassificationSelect(!showClassificationSelect)}
        >
                    {classification || 'Add'}
        </Button>
                  {showClassificationSelect && (
                    <div className="absolute top-full left-0 mt-2 z-50 bg-surface dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-2 min-w-[200px]">
                      {CLAIM_CLASSIFICATIONS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setClassification(c);
                            setShowClassificationSelect(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            classification === c
                              ? 'bg-primary-container dark:bg-primary/20 text-primary dark:text-primary'
                              : 'text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700'
                          } ${c === CLAIM_CLASSIFICATIONS[0] ? 'rounded-t-xl' : ''} ${c === CLAIM_CLASSIFICATIONS[CLAIM_CLASSIFICATIONS.length - 1] ? 'rounded-b-xl' : ''}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-surface-on-variant dark:text-gray-300 mb-2 block">Date Evaluated</label>
                  <Button
                    type="button"
                    variant="filled"
                    onClick={() => setShowDateEvaluatedPicker(true)}
                  >
                    {dateEvaluated ? new Date(dateEvaluated).toLocaleDateString() : 'Add'}
        </Button>
                </div>

                {classification === 'Non-Warranty' && (
                   <div className="animate-in fade-in slide-in-from-top-2">
                     <label className="text-xs text-surface-on-variant dark:text-gray-300 mb-1 block text-error">Non-Warranty Explanation (Required)</label>
                     <textarea
                       required
                       className="w-full rounded-md border border-error bg-error/5 dark:bg-error/10 dark:border-error/50 px-3 py-2 text-surface-on dark:text-gray-100 focus:outline-none text-sm"
                       rows={3}
                       value={nonWarrantyExplanation}
                       onChange={(e) => setNonWarrantyExplanation(e.target.value)}
                     />
                   </div>
                )}
              </div>
            </div>
           )}

        </div>
      </div>


      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        attachments={attachments}
        initialIndex={imageViewerIndex}
        onClose={() => setImageViewerOpen(false)}
        onUpdateAttachment={(index, updatedUrl) => {
          const updatedAttachments = [...attachments];
          const imageAttachments = updatedAttachments.filter(a => a.type === 'IMAGE' && a.url);
          const actualIndex = attachments.findIndex(a => a.url === imageAttachments[index]?.url);
          if (actualIndex !== -1) {
            updatedAttachments[actualIndex] = {
              ...updatedAttachments[actualIndex],
              url: updatedUrl
            };
            setAttachments(updatedAttachments);
          }
        }}
      />
      
      {/* Footer with buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-surface-outline-variant dark:border-gray-700 mt-auto">
        <Button 
          type="button" 
          variant="filled" 
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" variant="filled">
          Save
        </Button>
      </div>
    </form>
  );
};

export default NewClaimForm;
