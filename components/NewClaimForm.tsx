
import React, { useState } from 'react';
import { CLAIM_CLASSIFICATIONS } from '../constants';
import { Contractor, ClaimClassification, Attachment, Homeowner, ClaimStatus, UserRole } from '../types';
import Button from './Button';
import { X, Upload, Video, FileText, Search, Building2, Loader2, AlertTriangle, CheckCircle, Edit2, Image as ImageIcon } from 'lucide-react';
import ImageEditor from './ImageEditor';

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
  const [uploading, setUploading] = useState(false);
  
  // Image Editor State
  const [editingImage, setEditingImage] = useState<{ url: string; name: string; attachmentId: string } | null>(null);

  // Only show contractors if user has typed something
  const filteredContractors = contractorSearch.trim() 
    ? contractors.filter(c => c.companyName.toLowerCase().includes(contractorSearch.toLowerCase()) || c.specialty.toLowerCase().includes(contractorSearch.toLowerCase()))
    : [];

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const fileId = crypto.randomUUID();

      try {
        const formData = new FormData();
        formData.append('file', file);

        console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        console.log('Upload response status:', response.status, response.statusText);

        if (!response.ok) {
          let errorMessage = 'Upload failed';
          const contentType = response.headers.get('content-type');
          console.log('Error response content-type:', contentType);
          
          try {
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.message || errorData.error || `Upload failed with status ${response.status}`;
              console.error('Upload error response (JSON):', errorData);
            } else {
              // Try to get text response
              const textResponse = await response.text();
              console.error('Upload error response (text):', textResponse);
              errorMessage = textResponse || `Upload failed with status ${response.status}`;
            }
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorMessage = `Upload failed with status ${response.status}. Check server logs for details.`;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        
        const newAttachment: Attachment = {
          id: fileId,
          type: result.type,
          url: result.url,
          name: result.name || file.name,
        };

        setAttachments(prev => [...prev, newAttachment]);
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setUploading(false);
    // Reset file input
    if (e.target) e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

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

      {/* File Upload Section */}
      <div className="space-y-4 pt-6 border-t border-surface-outline-variant dark:border-gray-700">
        <div>
          <label className="text-sm font-medium text-surface-on dark:text-gray-100 mb-2 block">
            Attachments (Pictures, Videos, Files)
          </label>
          <input
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-surface-on dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-on hover:file:bg-primary-variant disabled:opacity-50"
          />
          {uploading && (
            <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading files...
            </p>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="space-y-4">
            {/* Image Attachments Section */}
            {attachments.filter(att => att.type === 'IMAGE').length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-surface-on dark:text-gray-100 mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Image Attachments
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {attachments
                    .filter(att => att.type === 'IMAGE' && att.url)
                    .map((att) => (
                      <div key={att.id} className="relative group aspect-square">
                        <div className="w-full h-full bg-surface-container dark:bg-gray-700 rounded-lg overflow-hidden border border-surface-outline-variant dark:border-gray-600">
                          <img 
                            src={att.url} 
                            alt={att.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingImage({ url: att.url, name: att.name, attachmentId: att.id })}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-primary text-primary-on rounded-lg text-sm font-medium hover:bg-primary-variant transition-opacity flex items-center gap-1"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-surface-container text-surface-on rounded-lg text-sm font-medium hover:bg-surface-container-high transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="absolute -top-2 -right-2 bg-error text-error-on rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                          aria-label="Remove attachment"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* Other Attachments (Videos, Documents) */}
            {attachments.filter(att => att.type !== 'IMAGE').length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-surface-on dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Other Attachments
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {attachments
                    .filter(att => att.type !== 'IMAGE')
                    .map((att) => (
                      <div key={att.id} className="relative group">
                        <div className="w-full h-24 bg-surface-container dark:bg-gray-700 rounded-lg overflow-hidden border border-surface-outline-variant dark:border-gray-600">
                          <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            {att.type === 'VIDEO' ? (
                              <Video className="h-6 w-6 text-primary mb-1" />
                            ) : (
                              <FileText className="h-6 w-6 text-primary mb-1" />
                            )}
                            <span className="text-[10px] text-surface-on-variant truncate w-full text-center">
                              {att.name}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="absolute -top-2 -right-2 bg-error text-error-on rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          aria-label="Remove attachment"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
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

      {/* Image Editor Modal */}
      {editingImage && (
        <ImageEditor
          imageUrl={editingImage.url}
          imageName={editingImage.name}
          onSave={async (editedImageUrl) => {
            // Upload edited image to Cloudinary
            try {
              const formData = new FormData();
              // Convert data URL to blob
              const response = await fetch(editedImageUrl);
              const blob = await response.blob();
              formData.append('file', blob, `edited-${editingImage.name}`);

              const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              });

              if (!uploadResponse.ok) {
                throw new Error('Failed to upload edited image');
              }

              const result = await uploadResponse.json();
              
              // Update the attachment URL in the local state
              setAttachments(prev => prev.map(att => 
                att.id === editingImage.attachmentId
                  ? { ...att, url: result.url }
                  : att
              ));

              setEditingImage(null);
            } catch (error) {
              console.error('Failed to save edited image:', error);
              alert('Failed to save edited image. Please try again.');
            }
          }}
          onClose={() => setEditingImage(null)}
        />
      )}
    </form>
  );
};

export default NewClaimForm;
