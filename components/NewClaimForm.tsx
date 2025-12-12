
import React, { useState } from 'react';
import { CLAIM_CLASSIFICATIONS } from '../constants';
import { Contractor, ClaimClassification, Attachment, Homeowner, ClaimStatus, UserRole } from '../types';
import Button from './Button';
import { X, Upload, Video, FileText, Search, Building2, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useUploadThing } from '../src/lib/uploadthing';

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
  const [uploadError, setUploadError] = useState<string | null>(null);

  // UploadThing Hook
  const { startUpload, isUploading } = useUploadThing("attachmentUploader", {
    onClientUploadComplete: (res) => {
      if (res) {
        const newAttachments: Attachment[] = res.map((file) => {
            let type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' = 'DOCUMENT';
            if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) type = 'IMAGE';
            else if (file.name.match(/\.(mp4|mov|webm)$/i)) type = 'VIDEO';
            
            return {
                id: file.key, // UploadThing returns a key we can use as ID
                name: file.name,
                type: type,
                url: file.url
            };
        });
        setAttachments((prev) => [...prev, ...newAttachments]);
        setUploadError(null);
      }
    },
    onUploadError: (error: Error) => {
      console.error("UploadThing error details:", error);
      const errorMessage = error.message || "Unknown error occurred";
      setUploadError(`Upload failed: ${errorMessage}`);
      
      // Log additional details for debugging
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
    },
  });

  // Only show contractors if user has typed something
  const filteredContractors = contractorSearch.trim() 
    ? contractors.filter(c => c.companyName.toLowerCase().includes(contractorSearch.toLowerCase()) || c.specialty.toLowerCase().includes(contractorSearch.toLowerCase()))
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        // Start the upload immediately upon selection
        await startUpload(files);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // M3 Input Styles
  const inputClass = "peer block w-full rounded-md border border-surface-outline bg-transparent px-3 py-3 text-surface-on focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:text-sm transition-colors placeholder-transparent";
  const labelClass = "absolute left-2 -top-2 z-[1] bg-white px-1 text-xs text-surface-outline-variant transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-primary";
  const selectClass = "block w-full rounded-md border border-surface-outline bg-transparent px-3 py-3 text-surface-on focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:text-sm transition-colors";

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
              placeholder="Title"
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
             <div className="bg-surface-container/20 p-4 rounded-xl border border-surface-outline-variant">
              <h4 className="text-sm font-bold text-surface-on mb-3">Classification & Evaluation</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-surface-on-variant mb-1 block">Classification</label>
                  <select
                    className={selectClass}
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as ClaimClassification)}
                  >
                    {CLAIM_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-surface-on-variant mb-1 block">Date Evaluated</label>
                  <input 
                    type="date"
                    className={selectClass}
                    value={dateEvaluated}
                    onChange={(e) => setDateEvaluated(e.target.value)}
                  />
                </div>

                {classification === 'Non-Warranty' && (
                   <div className="animate-in fade-in slide-in-from-top-2">
                     <label className="text-xs text-surface-on-variant mb-1 block text-error">Non-Warranty Explanation (Required)</label>
                     <textarea
                       required
                       className="w-full rounded-md border border-error bg-error/5 px-3 py-2 text-surface-on focus:outline-none text-sm"
                       rows={3}
                       value={nonWarrantyExplanation}
                       onChange={(e) => setNonWarrantyExplanation(e.target.value)}
                       placeholder="Why is this not covered?"
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
             <div className="bg-surface-container/20 p-4 rounded-xl border border-surface-outline-variant">
                <h4 className="text-sm font-bold text-surface-on mb-3">Sub Assignment</h4>
                
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-surface-outline-variant" />
                  <input 
                    type="text"
                    placeholder="Type to search subs..."
                    className="w-full rounded-md border border-surface-outline bg-surface pl-10 pr-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={contractorSearch}
                    onChange={(e) => setContractorSearch(e.target.value)}
                  />
                </div>

                {contractorSearch.trim().length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-surface-outline-variant rounded-md bg-surface shadow-elevation-1">
                    {filteredContractors.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-surface-on-variant">No subs found.</div>
                    ) : (
                      filteredContractors.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedContractorId(c.id); setContractorSearch(c.companyName); }}
                          className={`w-full text-left px-3 py-2 text-sm flex justify-between hover:bg-surface-container ${selectedContractorId === c.id ? 'bg-primary-container text-primary-on-container' : 'text-surface-on'}`}
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
                    <span>Selected: {contractors.find(c => c.id === selectedContractorId)?.companyName}</span>
                    <button type="button" onClick={() => { setSelectedContractorId(''); setContractorSearch(''); }} className="text-surface-on-variant hover:text-error"><X className="h-3 w-3" /></button>
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
                className={`${inputClass} bg-secondary-container/20 border-secondary-container text-secondary-on-container`}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Internal Notes"
              />
              <label htmlFor="internalNotes" className={labelClass}>Internal Notes (Admin Only)</label>
            </div>
           )}

           {/* Attachments */}
           <div>
            <label className="block text-sm font-medium text-surface-on mb-2">Attachments (Photos, Video, Docs)</label>
            
            {uploadError && (
              <div className="mb-2 p-2 bg-error/10 text-error text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {uploadError}
              </div>
            )}

            <div className={`mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-colors ${isUploading ? 'bg-surface-container border-primary/50' : 'border-surface-outline-variant hover:bg-surface-container'}`}>
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                    <span className="text-xs text-surface-on-variant">Uploading to secure storage...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-surface-outline-variant" />
                    <div className="flex text-sm text-surface-on-variant justify-center mt-2">
                      <label className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
                        <span>Upload files</span>
                        <input type="file" className="sr-only" multiple onChange={handleFileSelect} accept="image/*,video/*,application/pdf" />
                      </label>
                    </div>
                    <p className="text-xs text-surface-outline-variant mt-1">Images, Videos (up to 64MB), Docs</p>
                  </>
                )}
            </div>
            
            {attachments.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {attachments.map(att => (
                  <div key={att.id} className="relative group bg-surface-container border border-surface-outline-variant rounded-lg p-2 flex items-center gap-3">
                    {att.type === 'IMAGE' && <img src={att.url} alt="" className="h-10 w-10 object-cover rounded" />}
                    {att.type === 'VIDEO' && <div className="h-10 w-10 bg-black/10 rounded flex items-center justify-center"><Video className="h-5 w-5 text-surface-on" /></div>}
                    {att.type === 'DOCUMENT' && <div className="h-10 w-10 bg-blue-50 rounded flex items-center justify-center"><FileText className="h-5 w-5 text-blue-600" /></div>}
                    
                    <div className="flex-1 min-w-0">
                        <span className="text-xs truncate block font-medium text-surface-on">{att.name}</span>
                        <span className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3"/> Uploaded</span>
                    </div>
                    
                    <button type="button" onClick={() => removeAttachment(att.id)} className="text-surface-outline-variant hover:text-error">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-surface-outline-variant">
        <Button type="button" variant="text" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="filled" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Create Claim'}
        </Button>
      </div>
    </form>
  );
};

export default NewClaimForm;
