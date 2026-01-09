
import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { CLAIM_CLASSIFICATIONS } from '../constants';
import { Contractor, ClaimClassification, Attachment, Homeowner, ClaimStatus, UserRole } from '../types';
import Button from './Button';
import ImageViewerModal from './ImageViewerModal';
import CalendarPicker from './CalendarPicker';
import MaterialSelect from './MaterialSelect';
import { ToastContainer, Toast } from './Toast';
import { uploadMultipleFiles } from '../lib/services/uploadService';
import { analyzeWarrantyImage } from '../actions/analyze-image';
import { getTemplates, type ResponseTemplate } from '../actions/templates';
import { X, Upload, Video, FileText, Search, Building2, Loader2, AlertTriangle, CheckCircle, Paperclip, Send, Calendar, Trash2, Plus, Sparkles, FileSignature, Calendar as CalendarIcon, Clock, Tag } from 'lucide-react';

interface StagedClaim {
  id: string;
  title: string;
  description: string;
  attachments: Attachment[];
}

interface NewClaimFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onSendMessage?: () => void;
  contractors: Contractor[];
  activeHomeowner: Homeowner;
  userRole: UserRole;
}

const NewClaimForm: React.FC<NewClaimFormProps> = ({ onSubmit, onCancel, onSendMessage, contractors, activeHomeowner, userRole }) => {
  const { user } = useUser();
  const isAdmin = userRole === UserRole.ADMIN;

  // Staged Claims for Batch Submission (Homeowners only)
  const [stagedClaims, setStagedClaims] = useState<StagedClaim[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Classification & Status (Admin Only)
  const [classification, setClassification] = useState<ClaimClassification>('60 Day');
  const [dateEvaluated, setDateEvaluated] = useState(new Date().toISOString().split('T')[0]);
  const [nonWarrantyExplanation, setNonWarrantyExplanation] = useState('');
  
  // Response Templates State
  const [responseTemplates, setResponseTemplates] = useState<ResponseTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
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

  // Load response templates for admin users
  useEffect(() => {
    if (isAdmin && user?.id) {
      setLoadingTemplates(true);
      getTemplates(user.id)
        .then((templates) => setResponseTemplates(templates))
        .catch((error) => {
          console.error('Failed to load response templates:', error);
        })
        .finally(() => setLoadingTemplates(false));
    }
  }, [isAdmin, user?.id]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = responseTemplates.find(t => t.id === templateId);
    if (template) {
      setNonWarrantyExplanation(template.content);
    }
  };

  // Attachments State
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Assistant State
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Toast management
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  // AI Assistant Handler
  const handleAnalyze = async () => {
    // Find first image attachment
    const firstImage = attachments.find(att => att.type === 'IMAGE' && att.url);
    
    if (!firstImage || !firstImage.url) {
      addToast('Please upload an image first', 'error');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      console.log('🤖 Analyzing image with AI...');
      const result = await analyzeWarrantyImage(firstImage.url, description);
      
      // Update title if empty
      if (!title.trim() && result.title) {
        setTitle(result.title);
      }
      
      // Update description based on whether it's empty or not
      if (!description.trim()) {
        // Case A: Empty description - just set it
        setDescription(result.description);
      } else {
        // Case B: Existing description - append AI suggestion with separator
        const separator = "\n\n--- 🤖 AI Suggestion ---\n";
        const newText = description + separator + result.description;
        setDescription(newText);
      }
      
      addToast('✨ AI analysis complete!', 'success');
    } catch (error) {
      console.error('AI analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
      addToast(`AI analysis failed: ${errorMessage}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Only show contractors if user has typed something
  const filteredContractors = contractorSearch.trim() 
    ? contractors.filter(c => (c.companyName || "").toLowerCase().includes((contractorSearch || "").toLowerCase()) || (c.specialty || "").toLowerCase().includes((contractorSearch || "").toLowerCase()))
    : [];

  // Handle adding item to staging (for homeowners)
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!title.trim()) {
      addToast('Please enter a claim title', 'error');
      return;
    }
    
    if (!description.trim()) {
      addToast('Please enter a description', 'error');
      return;
    }

    // Add to staged claims
    const newStagedClaim: StagedClaim = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      attachments: [...attachments] // Copy attachments (already uploaded URLs)
    };

    setStagedClaims(prev => [...prev, newStagedClaim]);
    addToast('Item added. Add another or submit below.', 'success');

    // Clear form
    setTitle('');
    setDescription('');
    setAttachments([]);
  };

  // Handle batch submission
  const handleSubmitAll = async () => {
    // Check for orphan data (form fields that have data but weren't added to staged claims)
    const hasOrphanData = title.trim().length > 0 || description.trim().length > 0 || attachments.length > 0;
    let orphanIncluded = false;
    let finalClaimsList = [...stagedClaims];

    // Scenario B: Form has data - attempt to auto-include
    if (hasOrphanData) {
      // Validate the orphan data
      if (!title.trim()) {
        addToast('Please complete the claim you are currently typing, or clear the form to submit the others.', 'error');
        return;
      }
      
      if (!description.trim()) {
        addToast('Please complete the claim you are currently typing, or clear the form to submit the others.', 'error');
        return;
      }

      // Orphan data is valid - create claim object and append to list
      const orphanClaim: StagedClaim = {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        attachments: [...attachments] // Copy attachments (already uploaded URLs)
      };

      finalClaimsList = [...stagedClaims, orphanClaim];
      orphanIncluded = true;
    }

    // Scenario A: Form is empty - proceed with staged claims only
    // Check if we have any claims to submit (either staged or orphan)
    if (finalClaimsList.length === 0) {
      addToast('Please add at least one item before submitting', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert claims to payload format
      const batchPayload = finalClaimsList.map(staged => ({
        title: staged.title,
        description: staged.description,
        category: 'General', // Default category for homeowner submissions
        attachments: staged.attachments,
        classification: 'Unclassified',
        status: ClaimStatus.SUBMITTED,
        proposedDates: []
      }));

      // Submit batch
      await onSubmit(batchPayload);

      // Clear staged claims and form if orphan was included
      setStagedClaims([]);
      if (orphanIncluded) {
        setTitle('');
        setDescription('');
        setAttachments([]);
        // Show success message with orphan note
        addToast(`Submitted ${finalClaimsList.length} item${finalClaimsList.length > 1 ? 's' : ''} (including the one you were typing).`, 'success');
      }
    } catch (error) {
      console.error('Batch submission error:', error);
      addToast('Failed to submit claims. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle single submission (Admin mode - legacy behavior)
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
      category: 'General', // Default category
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
      proposedDates: (isAdmin && proposeDate) ? [{
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
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <form onSubmit={isAdmin ? handleSubmit : handleAddItem} className="space-y-6 flex flex-col h-full">
        {/* Header */}
        <div className="pb-4 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-normal text-surface-on dark:text-gray-100">
            {isAdmin ? 'New Claim' : 'Submit Warranty Request'}
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
                    className={`${inputClass} bg-white dark:bg-gray-700/50 border-secondary-container dark:border-gray-600 text-secondary-on-container dark:text-gray-100`}
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
                    className={`${inputClass} bg-white dark:bg-gray-700/50 border-secondary-container dark:border-gray-600 text-secondary-on-container dark:text-gray-100`}
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
                className={`${inputClass} bg-white dark:bg-gray-700/50 border-secondary-container dark:border-gray-600 text-secondary-on-container dark:text-gray-100`}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
            </div>
           )}
          </div>

          {/* Right Column: Attachments (Homeowner) or Admin Sections */}
          <div className="space-y-6">
            {/* Attachments Section */}
            <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-surface-on dark:text-gray-100">
                  Attachments
                </h4>
                {/* AI Assistant Button */}
                {attachments.some(att => att.type === 'IMAGE' && att.url) && (
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-[10px] text-surface-on-variant dark:text-gray-400 italic">
                      Need help with a description? Have Gemini help!
                    </p>
                    <button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || isUploading}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isAnalyzing
                          ? 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 cursor-wait'
                          : 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary hover:bg-primary/20 dark:hover:bg-primary/30 hover:shadow-sm'
                      }`}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{description.trim() ? 'Refine with AI' : 'Auto-Fill with AI'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
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
                              src={attachmentUrl.includes('cloudinary.com') 
                                ? attachmentUrl.replace('/upload/', '/upload/w_200,h_200,c_fill,q_auto,f_auto/')
                                : attachmentUrl
                              }
                              alt={attachmentName} 
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
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
                <>
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                  {uploadProgress.total > 0 && (
                    <span className="text-sm text-surface-on-variant dark:text-gray-400">
                      Uploading {uploadProgress.current}/{uploadProgress.total}...
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-surface-outline-variant dark:text-gray-500" />
                  <span className="text-sm text-surface-on-variant dark:text-gray-400">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-surface-on-variant dark:text-gray-500">
                    Images, PDFs, and documents (max 10MB)
                  </span>
                </>
              )}
              <span className="text-xs text-surface-on-variant dark:text-gray-400 font-medium">
                {isUploading ? 'Optimized for mobile uploads' : 'Multiple files supported'}
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
                  
                  const fileArray = Array.from(files);
                  setIsUploading(true);
                  setUploadProgress({ current: 0, total: fileArray.length });
                  
                  try {
                    console.log(`📤 Starting upload of ${fileArray.length} file(s) on ${/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop'}`);
                    
                    // Use centralized upload service with progress tracking
                    // The service will automatically adjust strategy for mobile vs desktop
                    const { successes, failures } = await uploadMultipleFiles(fileArray, {
                      maxRetries: 3,
                      timeoutMs: 120000, // 2 minutes for mobile compatibility
                      maxFileSizeMB: 10,
                    });
                    
                    // Handle successes
                    if (successes.length > 0) {
                      setAttachments([...attachments, ...successes]);
                      addToast(`✓ Successfully uploaded ${successes.length} file${successes.length > 1 ? 's' : ''}`, 'success');
                    }
                    
                    // Handle failures with detailed info
                    if (failures.length > 0) {
                      console.error('Upload failures:', failures);
                      
                      // Show detailed error message with file names and reasons
                      let errorMessage = `⚠️ ${failures.length} of ${fileArray.length} file(s) failed:\n\n`;
                      failures.forEach((f, idx) => {
                        const sizeMB = (f.file.size / 1024 / 1024).toFixed(1);
                        errorMessage += `${idx + 1}. ${f.file.name} (${sizeMB}MB)\n   Error: ${f.error}\n\n`;
                      });
                      errorMessage += `💡 Tip: Try uploading files one at a time, or check your connection.`;
                      
                      alert(errorMessage); // Use alert for multiline messages
                      addToast(`${failures.length} file(s) failed to upload`, 'error');
                      
                      // Log detailed error info to console
                      failures.forEach(f => {
                        console.error(`❌ ${f.file.name} (${(f.file.size / 1024 / 1024).toFixed(2)}MB): ${f.error}`);
                      });
                    }
                  } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
                    console.error('❌ Upload error:', errorMessage);
                    addToast(`Upload failed: ${errorMessage}`, 'error');
                  } finally {
                    setIsUploading(false);
                    setUploadProgress({ current: 0, total: 0 });
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
        </div>
        
        {/* Sub Assignment, Scheduling, Warranty Assessment (Admin Only) */}
        {isAdmin && (
          <>
            {/* Sub Assignment (Admin Only) */}
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
                  <div className="flex items-center bg-secondary-container px-4 py-3 rounded-xl text-secondary-on-container flex-1 min-w-0">
                    <div className="text-sm overflow-hidden min-w-0">
                      <p className="font-bold truncate">{contractors.find(c => c.id === selectedContractorId)?.companyName}</p>
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

            {/* Scheduling - Admin Only */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4">
              <h3 className="font-semibold leading-none tracking-tight">Scheduling</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Scheduled Date Field - Material 3 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                    Scheduled Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCalendarPicker(true)}
                    className="w-full h-[56px] flex items-center px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 hover:bg-surface-container-highest dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <CalendarIcon className="h-5 w-5 text-surface-on-variant dark:text-gray-400 mr-3" />
                    <span className="text-surface-on dark:text-gray-100">
                      {proposeDate ? new Date(proposeDate).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Select date...'}
                    </span>
                  </button>
                  
                  {/* Material 3 Calendar Picker */}
                  <CalendarPicker
                    isOpen={showCalendarPicker}
                    onClose={() => setShowCalendarPicker(false)}
                    onSelectDate={(date) => {
                      setProposeDate(date.toISOString().split('T')[0]);
                      setShowCalendarPicker(false);
                    }}
                    selectedDate={proposeDate ? new Date(proposeDate) : null}
                  />
                </div>

                {/* Time Slot Field - Material 3 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                    Time Slot
                  </label>
                  <MaterialSelect
                    value={proposeTime}
                    onChange={(value) => setProposeTime(value as 'AM' | 'PM' | 'All Day')}
                    options={[
                      { value: 'AM', label: 'AM (8am - 12pm)' },
                      { value: 'PM', label: 'PM (12pm - 4pm)' },
                      { value: 'All Day', label: 'All Day' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Warranty Assessment (Admin Only) */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4">
              <h3 className="font-semibold leading-none tracking-tight">Warranty Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Classification Field - Material 3 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                    Classification
                  </label>
                  <MaterialSelect
                    value={classification}
                    onChange={(value) => setClassification(value as ClaimClassification)}
                    options={CLAIM_CLASSIFICATIONS.map(c => ({ value: c, label: c }))}
                  />
                </div>

                {/* Date Evaluated Field - Material 3 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                    Date Evaluated
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDateEvaluatedPicker(true)}
                    className="w-full h-[56px] flex items-center px-4 rounded-lg border border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-800 hover:bg-surface-container-highest dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <CalendarIcon className="h-5 w-5 text-surface-on-variant dark:text-gray-400 mr-3" />
                    <span className="text-surface-on dark:text-gray-100">
                      {dateEvaluated ? new Date(dateEvaluated).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Select date...'}
                    </span>
                  </button>
                  
                  {/* Material 3 Calendar Picker */}
                  <CalendarPicker
                    isOpen={showDateEvaluatedPicker}
                    onClose={() => setShowDateEvaluatedPicker(false)}
                    onSelectDate={(date) => {
                      setDateEvaluated(date.toISOString().split('T')[0]);
                      setShowDateEvaluatedPicker(false);
                    }}
                    selectedDate={dateEvaluated ? new Date(dateEvaluated) : null}
                  />
                </div>
              </div>

              {classification === 'Non-Warranty' && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                  {/* Template Selector */}
                  {responseTemplates.length > 0 && (
                    <div>
                      <label className="text-xs text-surface-on-variant dark:text-gray-300 mb-2 block flex items-center gap-2">
                        <FileSignature className="h-3.5 w-3.5" />
                        Use Response Template
                      </label>
                      <select
                        className="w-full rounded-md border border-surface-outline-variant dark:border-gray-600 bg-surface dark:bg-gray-800 px-3 py-2 text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        value={selectedTemplateId}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                      >
                        <option value="">-- Select a template --</option>
                        {responseTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.title} {template.category !== 'General' ? `(${template.category})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Non-Warranty Explanation Text Area */}
                  <div>
                    <label className="text-xs text-surface-on-variant dark:text-gray-300 mb-1 block text-error">
                      Non-Warranty Explanation (Required)
                    </label>
                    <textarea
                      required
                      className="w-full rounded-md border border-error bg-error/5 dark:bg-error/10 dark:border-error/50 px-3 py-2 text-surface-on dark:text-gray-100 focus:outline-none text-sm"
                      rows={4}
                      value={nonWarrantyExplanation}
                      onChange={(e) => setNonWarrantyExplanation(e.target.value)}
                      placeholder="Enter the explanation for why this claim is not covered under warranty..."
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Staging Area (Homeowners only) */}
        {!isAdmin && stagedClaims.length > 0 && (
        <div className="bg-surface-container dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant dark:border-gray-600">
          <h3 className="text-sm font-bold text-surface-on dark:text-gray-100 mb-4">Pending Items ({stagedClaims.length})</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stagedClaims.map((staged, index) => (
              <div key={staged.id} className="bg-surface dark:bg-gray-800 p-3 rounded-lg border border-surface-outline-variant dark:border-gray-600 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-surface-on dark:text-gray-100 truncate">
                      {staged.title}
                    </span>
                  </div>
                  <p className="text-xs text-surface-on-variant dark:text-gray-400 line-clamp-2">
                    {staged.description}
                  </p>
                  {staged.attachments.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {staged.attachments.slice(0, 3).map((att, i) => (
                        <div key={i} className="w-12 h-12 rounded overflow-hidden border border-surface-outline-variant dark:border-gray-600">
                          {att.type === 'IMAGE' && att.url ? (
                            <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface-container dark:bg-gray-700">
                              <FileText className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                      {staged.attachments.length > 3 && (
                        <div className="w-12 h-12 rounded border border-surface-outline-variant dark:border-gray-600 flex items-center justify-center bg-surface-container dark:bg-gray-700 text-xs text-surface-on-variant dark:text-gray-400">
                          +{staged.attachments.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStagedClaims(stagedClaims.filter((_, i) => i !== index))}
                  className="p-1.5 rounded hover:bg-error/10 text-error hover:text-error transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        )}

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
        <div className="flex justify-end gap-2 pt-6 border-t border-surface-outline-variant dark:border-gray-700 mt-auto flex-wrap">
          {onSendMessage && (
            <Button 
              type="button" 
              variant="filled" 
              onClick={onSendMessage}
              className="whitespace-nowrap"
            >
              Message
            </Button>
          )}
          <Button 
            type="button" 
            variant="filled" 
            onClick={onCancel}
            className="whitespace-nowrap"
          >
            Cancel
          </Button>
          {isAdmin ? (
            <Button type="submit" variant="filled" className="whitespace-nowrap">
              Save
            </Button>
          ) : (
            <>
              <Button 
                type="submit" 
                variant="filled"
                icon={<Plus className="h-4 w-4 flex-shrink-0" />}
                className="whitespace-nowrap"
              >
                Add Item to Request
              </Button>
              {stagedClaims.length > 0 && (
                <Button 
                  type="button"
                  variant="filled"
                  onClick={handleSubmitAll}
                  disabled={isSubmitting}
                  icon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" /> : <Send className="h-4 w-4 flex-shrink-0" />}
                  className="whitespace-nowrap"
                >
                  Submit All ({stagedClaims.length})
                </Button>
              )}
            </>
          )}
        </div>
      </form>
    </>
  );
};

export default NewClaimForm;
