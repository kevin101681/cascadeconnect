
import React, { useState } from 'react';
import { CLAIM_CLASSIFICATIONS } from '../constants';
import { Contractor, ClaimClassification, Attachment, Homeowner, ClaimStatus, UserRole } from '../types';
import Button from './Button';
import { X, Upload, Video, FileText, Search, Building2, Loader2, AlertTriangle, CheckCircle, Paperclip } from 'lucide-react';

interface NewClaimFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  contractors: Contractor[];
  activeHomeowner: Homeowner;
  userRole: UserRole;
}

const NewClaimForm: React.FC<NewClaimFormProps> = ({ onSubmit, onCancel, contractors, activeHomeowner, userRole }) => {
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

  // Attachments State
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Only show contractors if user has typed something
  const filteredContractors = contractorSearch.trim() 
    ? contractors.filter(c => c.companyName.toLowerCase().includes(contractorSearch.toLowerCase()) || c.specialty.toLowerCase().includes(contractorSearch.toLowerCase()))
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const contractor = contractors.find(c => c.id === selectedContractorId);

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
      status: (isAdmin && classification === 'Non-Warranty') ? ClaimStatus.COMPLETED : ClaimStatus.SUBMITTED,
      attachments
    };
    
    onSubmit(payload);
  };


  // M3 Input Styles
  const inputClass = "peer block w-full rounded-md border border-surface-outline dark:border-gray-600 bg-transparent dark:bg-gray-700 px-3 py-3 text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:text-sm transition-colors placeholder-transparent";
  const labelClass = "absolute left-2 -top-2 z-[1] bg-surface dark:bg-gray-800 px-1 text-xs text-surface-outline-variant dark:text-gray-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-primary";
  const selectClass = "block w-full rounded-md border border-surface-outline dark:border-gray-600 bg-transparent dark:bg-gray-700 px-3 py-3 text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:text-sm transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Job Name Pill */}
      <div className="flex justify-end">
         <span className="bg-primary-container text-primary-on-container text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {activeHomeowner.jobName}
         </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Basic Info */}
        <div className="space-y-6">
           <div className="relative">
            <input
              id="title"
              type="text"
              required
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label htmlFor="title" className={labelClass}>Claim Title</label>
          </div>

          <div className="relative">
            <textarea
              id="description"
              rows={4}
              required
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
            <label htmlFor="description" className={labelClass}>Problem Description</label>
          </div>

           {/* Classification Section (Admin Only) */}
           {isAdmin && (
             <div className="bg-surface-container/20 dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
              <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-3">Classification & Evaluation</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-surface-on-variant dark:text-gray-300 mb-1 block">Classification</label>
                  <select
                    className={selectClass + " dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"}
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as ClaimClassification)}
                  >
                    {CLAIM_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-surface-on-variant dark:text-gray-300 mb-1 block">Date Evaluated</label>
                  <input 
                    type="date"
                    className={selectClass + " dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"}
                    value={dateEvaluated}
                    onChange={(e) => setDateEvaluated(e.target.value)}
                  />
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

        {/* Right Column: Assignment & Admin */}
        <div className="space-y-6">
           {/* Assignment (Admin Only) */}
           {isAdmin && (
             <div className="bg-surface-container/20 dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
                <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-3">Sub Assignment</h4>
                
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-surface-outline-variant dark:text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Type to search subs..."
                    className="w-full rounded-md border border-surface-outline dark:border-gray-600 bg-surface dark:bg-gray-700 pl-10 pr-3 py-2 text-sm text-surface-on dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
                          onClick={() => { setSelectedContractorId(c.id); setContractorSearch(c.companyName); }}
                          className={`w-full text-left px-3 py-2 text-sm flex justify-between hover:bg-surface-container dark:hover:bg-gray-600 ${selectedContractorId === c.id ? 'bg-primary-container text-primary-on-container' : 'text-surface-on dark:text-gray-100'}`}
                        >
                          <span>{c.companyName}</span>
                          <span className="text-xs opacity-70">{c.specialty}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                
                {selectedContractorId && !contractorSearch.trim() && (
                  <div className="mt-2 text-xs text-primary font-medium flex items-center justify-between">
                    <span className="dark:text-gray-100">Selected: {contractors.find(c => c.id === selectedContractorId)?.companyName}</span>
                    <button type="button" onClick={() => { setSelectedContractorId(''); setContractorSearch(''); }} className="text-surface-on-variant dark:text-gray-400 hover:text-error"><X className="h-3 w-3" /></button>
                  </div>
                )}
             </div>
           )}

           {/* Internal Notes (Admin Only) */}
           {isAdmin && (
             <div className="relative">
              <textarea
                id="internalNotes"
                rows={4}
                className={`${inputClass} bg-secondary-container/20 dark:bg-gray-700/50 border-secondary-container dark:border-gray-600 text-secondary-on-container dark:text-gray-100`}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
              <label htmlFor="internalNotes" className={labelClass}>Internal Notes (Admin Only)</label>
            </div>
           )}

        </div>
      </div>

      {/* Attachments Section */}
      <div className="bg-surface-container/20 dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
        <h4 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-3 flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
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
                  <div key={attachmentKey} className="group relative w-24 h-24 bg-surface-container dark:bg-gray-700 rounded-lg overflow-hidden border border-surface-outline-variant dark:border-gray-600 hover:shadow-elevation-1 transition-all">
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
                    {attachmentUrl && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a 
                          href={attachmentUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-white text-xs font-medium hover:underline"
                        >
                          View
                        </a>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAttachments(attachments.filter((_, idx) => idx !== i));
                      }}
                      className="absolute top-1 right-1 bg-error/80 hover:bg-error text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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

      <div className="flex justify-end space-x-3 pt-6 border-t border-surface-outline-variant dark:border-gray-700">
        <Button 
          type="button" 
          variant="text" 
          onClick={onCancel}
          className="bg-surface-container-high dark:bg-gray-700 hover:bg-surface-container dark:hover:bg-gray-600"
        >
          Cancel
        </Button>
        <Button type="submit" variant="filled">
          Create Claim
        </Button>
      </div>
    </form>
  );
};

export default NewClaimForm;
