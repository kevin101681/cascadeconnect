
import React, { useState, useRef, useEffect } from 'react';
import { Claim, UserRole, ClaimStatus, ProposedDate, Contractor } from '../types';
import Button from './Button';
import StatusBadge from './StatusBadge';
import { Calendar, CheckCircle, FileText, Mail, MessageSquare, ArrowLeft, Clock, HardHat, Briefcase, Info, Lock, Paperclip, Video, X, Edit2, Save, ChevronDown, Send } from 'lucide-react';
import { generateServiceOrderPDF } from '../services/pdfService';
import { sendEmail } from '../services/emailService';

interface ClaimDetailProps {
  claim: Claim;
  currentUserRole: UserRole;
  onUpdateClaim: (updatedClaim: Claim) => void;
  onBack: () => void;
  contractors: Contractor[]; // Pass list of contractors
  onSendMessage: (claim: Claim) => void;
}

const ClaimDetail: React.FC<ClaimDetailProps> = ({ claim, currentUserRole, onUpdateClaim, onBack, contractors, onSendMessage }) => {
  const [proposeDate, setProposeDate] = useState('');
  const [proposeTime, setProposeTime] = useState<'AM' | 'PM' | 'All Day'>('AM');

  // Edit Mode State (Admin Only) - Always start in view mode
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(claim.title);
  const [editDescription, setEditDescription] = useState(claim.description);
  
  // Reset edit state when claim changes - ensure we always start in view mode
  useEffect(() => {
    setIsEditing(false);
    setEditTitle(claim.title);
    setEditDescription(claim.description);
  }, [claim.id]);

  // Service Order Email Modal State
  const [showSOModal, setShowSOModal] = useState(false);
  const [soPdfUrl, setSoPdfUrl] = useState<string | null>(null);
  const [soSubject, setSoSubject] = useState('');
  const [soBody, setSoBody] = useState('');
  const [isSendingSO, setIsSendingSO] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUserRole === UserRole.ADMIN;
  const isScheduled = claim.status === ClaimStatus.SCHEDULED && claim.proposedDates.length > 0;
  const scheduledDate = isScheduled ? claim.proposedDates[0] : null;

  const handleSaveDetails = () => {
    onUpdateClaim({
      ...claim,
      title: editTitle,
      description: editDescription
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(claim.title);
    setEditDescription(claim.description);
    setIsEditing(false);
  };

  const handlePrepareServiceOrder = async () => {
    if (!claim.contractorId) return;

    // 1. Generate PDF Blob URL directly using description as summary
    const url = generateServiceOrderPDF(claim, claim.description, true);
    if (typeof url === 'string') {
        setSoPdfUrl(url);
    }

    // 2. Pre-fill Email Details
    setSoSubject(`Service Order: ${claim.builderName} - ${claim.jobName} - ${claim.title}`);
    setSoBody(`Hi ${claim.contractorName},\n\nPlease find attached the service order for the warranty claim referenced above.\n\nAddress: ${claim.address}\nIssue: ${claim.description}\n\nPlease let us know when you can schedule this.\n\nThanks,\nCascade Builder Services`);
    
    setShowSOModal(true);
  };

  const handleSendServiceOrder = async () => {
    setIsSendingSO(true);
    if (claim.contractorEmail) {
        await sendEmail({
            to: claim.contractorEmail,
            subject: soSubject,
            body: soBody,
            fromName: 'Cascade Admin',
            fromRole: UserRole.ADMIN
        });
        alert('Service Order sent to Sub successfully!');
    }
    setIsSendingSO(false);
    setShowSOModal(false);
    setSoPdfUrl(null);
  };

  const handleConfirmSchedule = () => {
    if (!proposeDate) return;
    
    const newDate: ProposedDate = {
      date: new Date(proposeDate).toISOString(),
      timeSlot: proposeTime,
      status: 'ACCEPTED'
    };

    onUpdateClaim({
      ...claim,
      status: ClaimStatus.SCHEDULED,
      proposedDates: [newDate] // Overwrite with the single confirmed date
    });
    
    setProposeDate('');
  };

  const handleReschedule = () => {
    onUpdateClaim({
      ...claim,
      status: ClaimStatus.SCHEDULING,
      proposedDates: []
    });
  };

  const handleAssignContractor = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId);
    if (contractor) {
      onUpdateClaim({
        ...claim,
        contractorId: contractor.id,
        contractorName: contractor.companyName,
        contractorEmail: contractor.email
      });
    }
  };

  return (
    <div className="flex flex-col h-full relative max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="text" onClick={onBack} icon={<ArrowLeft className="h-5 w-5" />} className="!px-2" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-bold text-surface-outline-variant bg-surface-container px-2 py-0.5 rounded">{claim.id}</span>
              
              {isEditing ? (
                 <input 
                   type="text" 
                   value={editTitle}
                   onChange={e => setEditTitle(e.target.value)}
                   className="text-xl font-normal bg-surface-container border border-primary rounded px-2 py-1 focus:outline-none"
                 />
              ) : (
                 <h2 className="text-2xl font-normal text-surface-on">{claim.title}</h2>
              )}
              
              <StatusBadge status={claim.status} />
            </div>
            <div className="text-sm text-surface-on-variant mt-1 flex items-center gap-2 flex-wrap">
              <Clock className="h-4 w-4" />
              <span>{new Date(claim.dateSubmitted).toLocaleDateString()}</span>
              <span className="text-surface-outline">|</span>
              <span>{claim.category}</span>
              <span className="text-surface-outline">|</span>
              <span className="font-medium text-primary">{claim.builderName}</span>
              <span className="text-surface-outline">•</span>
              <span>{claim.jobName}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
           <Button 
             variant="tonal" 
             onClick={() => onSendMessage(claim)} 
             icon={<MessageSquare className="h-4 w-4" />}
           >
             Send Message
           </Button>

           {isAdmin && (
              <>
                {isEditing ? (
                   <>
                     <Button variant="text" onClick={handleCancelEdit} className="!text-error">Cancel</Button>
                     <Button variant="filled" onClick={handleSaveDetails} icon={<Save className="h-4 w-4" />}>Save</Button>
                   </>
                ) : (
                   <Button variant="outlined" onClick={() => setIsEditing(true)} icon={<Edit2 className="h-4 w-4" />}>Edit Claim</Button>
                )}
              </>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Description Card */}
        <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant shadow-sm">
          <h3 className="text-lg font-normal text-surface-on mb-4">Description</h3>
          {isEditing ? (
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={6}
                className="w-full bg-surface-container border border-primary rounded-lg p-3 text-surface-on focus:outline-none"
              />
          ) : (
              <p className="text-surface-on-variant whitespace-pre-wrap leading-relaxed">
                {claim.description}
              </p>
          )}
          
          {/* Rich Attachments */}
          {claim.attachments && claim.attachments.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-surface-on mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </p>
              <div className="flex flex-wrap gap-3">
                {claim.attachments.map((att, i) => {
                  const attachmentKey = att.id || `att-${i}`;
                  const attachmentUrl = att.url || '';
                  const attachmentName = att.name || 'Attachment';
                  const attachmentType = att.type || 'DOCUMENT';
                  
                  return (
                    <div key={attachmentKey} className="group relative w-24 h-24 bg-surface-container rounded-lg overflow-hidden border border-surface-outline-variant hover:shadow-elevation-1 transition-all">
                      {attachmentType === 'IMAGE' && attachmentUrl ? (
                        <>
                          <img 
                            src={attachmentUrl} 
                            alt={attachmentName} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.parentElement?.querySelector('.image-fallback');
                              if (fallback) {
                                (fallback as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                          <div className="image-fallback hidden absolute inset-0 w-full h-full flex flex-col items-center justify-center p-2 text-center bg-surface-container">
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
                      {/* Hover Overlay */}
                      {attachmentUrl && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a 
                            href={attachmentUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-white text-xs font-medium hover:underline"
                            onClick={(e) => {
                              if (!attachmentUrl) {
                                e.preventDefault();
                                alert('Attachment URL is missing');
                              }
                            }}
                          >
                            View
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Warranty Assessment Card */}
        <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant shadow-sm">
          <h3 className="text-lg font-normal text-surface-on mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Warranty Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-surface-on-variant mb-1">Classification</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                claim.classification === 'Non-Warranty' ? 'bg-error-container text-error-on-container' : 'bg-surface-container text-surface-on'
              }`}>
                {claim.classification}
              </span>
            </div>
            <div>
              <p className="text-xs text-surface-on-variant mb-1">Date Evaluated</p>
              <p className="text-sm text-surface-on">
                {claim.dateEvaluated ? new Date(claim.dateEvaluated).toLocaleDateString() : 'Pending Evaluation'}
              </p>
            </div>
            {claim.classification === 'Non-Warranty' && (
              <div className="md:col-span-2 bg-error/5 border border-error/20 p-3 rounded-xl">
                <p className="text-xs text-error font-bold mb-1">Non-Warranty Explanation</p>
                <p className="text-sm text-surface-on">{claim.nonWarrantyExplanation || 'No explanation provided.'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Internal Notes (Admin Only) */}
        {isAdmin && (
            <div className="bg-secondary-container p-6 rounded-3xl border border-secondary-container">
              <h3 className="text-lg font-normal text-secondary-on-container mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Internal Notes <span className="text-xs font-normal opacity-70">(Not visible to Homeowner)</span>
              </h3>
              <p className="text-sm text-secondary-on-container whitespace-pre-wrap leading-relaxed">
                {claim.internalNotes || "No internal notes."}
              </p>
            </div>
        )}

        {/* Sub Assignment (Admin Only) */}
        {isAdmin && (
          <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant shadow-sm">
            <h3 className="text-lg font-normal text-surface-on mb-4 flex items-center gap-2">
              <HardHat className="h-5 w-5 text-primary" />
              Sub Assignment
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-full sm:flex-1 relative">
                <div className="relative">
                  <select 
                    className="w-full bg-surface-container rounded-lg pl-4 pr-10 py-3 appearance-none border-r-8 border-transparent outline outline-1 outline-surface-outline-variant focus:outline-primary cursor-pointer text-sm"
                    value={claim.contractorId || ""}
                    onChange={(e) => handleAssignContractor(e.target.value)}
                  >
                    <option value="" disabled>Select a sub...</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.specialty})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-on-variant pointer-events-none" />
                </div>
              </div>
              {claim.contractorId && (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-3 bg-secondary-container px-4 py-3 rounded-xl text-secondary-on-container flex-1 w-full sm:w-auto">
                      <Briefcase className="h-5 w-5 flex-shrink-0" />
                      <div className="text-sm overflow-hidden">
                        <p className="font-bold truncate">{claim.contractorName}</p>
                        <p className="opacity-80 text-xs truncate">{claim.contractorEmail}</p>
                      </div>
                    </div>
                    
                    <Button 
                        variant="outlined" 
                        onClick={handlePrepareServiceOrder} 
                        icon={<FileText className="h-4 w-4" />}
                        className="!h-12 w-full sm:w-auto whitespace-nowrap"
                    >
                        Service Order
                    </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scheduling Card */}
        <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant shadow-sm">
          <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-normal text-surface-on flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Scheduling
            </h3>
          </div>

          {isScheduled && scheduledDate ? (
            // Active Schedule View
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-700">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-800 uppercase tracking-wide mb-1">Appointment Confirmed</p>
                    <div className="text-xl font-medium text-surface-on">
                      {new Date(scheduledDate.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <p className="text-surface-on-variant mt-1 font-medium">
                      Time Slot: {scheduledDate.timeSlot}
                    </p>
                    {claim.contractorName && (
                      <p className="text-xs text-surface-on-variant mt-2 flex items-center gap-1">
                        <HardHat className="h-3 w-3" />
                        Sub: {claim.contractorName}
                      </p>
                    )}
                  </div>
                </div>
                
                {isAdmin && (
                  <Button variant="outlined" onClick={handleReschedule} className="!border-green-300 text-green-800 hover:bg-green-100">
                    Reschedule / Edit
                  </Button>
                )}
            </div>
          ) : (
            // Scheduling Input View
            isAdmin ? (
              <div className="bg-surface-container/30 p-6 rounded-2xl border border-surface-outline-variant/50">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-surface-on">Confirm Appointment Details</h4>
                  <p className="text-xs text-surface-on-variant mt-1">
                    Enter the final date and time agreed upon with the homeowner via messaging.
                  </p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  {/* Date Input */}
                  <div className="w-full flex-1">
                    <label className="block text-xs text-surface-on-variant mb-1 ml-1 font-medium">Scheduled Date</label>
                    <div 
                      className="relative w-full rounded-lg border border-surface-outline bg-surface hover:border-surface-on-variant focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all cursor-pointer"
                      onClick={() => dateInputRef.current?.showPicker()}
                    >
                      <input 
                        ref={dateInputRef}
                        type="date" 
                        className="w-full bg-transparent p-3 pl-10 text-sm outline-none cursor-pointer text-surface-on" 
                        value={proposeDate} 
                        onChange={e => setProposeDate(e.target.value)}
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-on-variant pointer-events-none" />
                    </div>
                  </div>

                  {/* Time Slot Select */}
                  <div className="w-full md:w-auto md:min-w-[200px]">
                    <label className="block text-xs text-surface-on-variant mb-1 ml-1 font-medium">Time Slot</label>
                    <div className="relative">
                      <select 
                        className="block w-full rounded-lg border border-surface-outline bg-surface p-3 pr-10 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer text-surface-on"
                        value={proposeTime} 
                        onChange={(e: any) => setProposeTime(e.target.value)}
                      >
                        <option value="AM">AM (8am - 12pm)</option>
                        <option value="PM">PM (12pm - 4pm)</option>
                        <option value="All Day">All Day</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-on-variant pointer-events-none" />
                    </div>
                  </div>

                  <Button 
                    variant="filled" 
                    onClick={handleConfirmSchedule} 
                    disabled={!proposeDate} 
                    className="w-full md:w-auto h-[46px]"
                    icon={<CheckCircle className="h-4 w-4" />}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-surface-on-variant bg-surface-container/20 rounded-2xl border border-dashed border-surface-outline-variant">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Scheduling is currently pending coordination.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Service Order Email Modal */}
      {showSOModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-surface w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-surface-outline-variant flex justify-between items-center bg-surface-container">
                <h2 className="text-lg font-normal text-surface-on flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Send Service Order
                </h2>
                <button onClick={() => { setShowSOModal(false); setSoPdfUrl(null); }} className="text-surface-on-variant hover:text-surface-on">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Recipient Display */}
                <div className="bg-surface-container p-3 rounded-xl flex items-center justify-between">
                   <div>
                     <span className="text-xs font-bold text-surface-on-variant uppercase">To Sub</span>
                     <p className="font-medium text-surface-on">{claim.contractorName}</p>
                     <p className="text-xs text-surface-on-variant">{claim.contractorEmail}</p>
                   </div>
                   <div className="bg-surface p-2 rounded-full border border-surface-outline-variant">
                      <HardHat className="h-4 w-4 text-surface-outline"/>
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on-variant mb-1">Subject</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={soSubject}
                    onChange={(e) => setSoSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-on-variant mb-1">Message</label>
                  <textarea 
                    rows={6}
                    className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                    value={soBody}
                    onChange={(e) => setSoBody(e.target.value)}
                  />
                </div>

                {/* Simulated Attachment Display */}
                {soPdfUrl && (
                  <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium truncate flex-1">ServiceOrder_{claim.id}.pdf</span>
                      <a href={soPdfUrl} target="_blank" rel="noreferrer" className="text-xs underline hover:text-primary-on-container">Preview</a>
                  </div>
                )}
              </div>

              <div className="p-4 bg-surface-container flex justify-end gap-3">
                <Button variant="text" onClick={() => { setShowSOModal(false); setSoPdfUrl(null); }}>Cancel</Button>
                <Button 
                  variant="filled" 
                  onClick={handleSendServiceOrder} 
                  disabled={isSendingSO} 
                  icon={isSendingSO ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <Send className="h-4 w-4" />}
                >
                  Send Order
                </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClaimDetail;
