import React, { useState } from 'react';
import { Claim, UserRole, ClaimStatus, ProposedDate, Contractor } from '../types';
import Button from './Button';
import StatusBadge from './StatusBadge';
import { Calendar, CheckCircle, FileText, Mail, MessageSquare, Send, Sparkles, ArrowLeft, Clock, HardHat, Briefcase, Info, Lock, Paperclip, Video, Image as ImageIcon, X } from 'lucide-react';
import { summarizeClaim, draftSchedulingEmail } from '../services/geminiService';
import { generateServiceOrderPDF } from '../services/pdfService';
import { sendEmail, generateNotificationBody } from '../services/emailService';

interface ClaimDetailProps {
  claim: Claim;
  currentUserRole: UserRole;
  onUpdateClaim: (updatedClaim: Claim) => void;
  onBack: () => void;
  contractors: Contractor[]; // Pass list of contractors
}

const ClaimDetail: React.FC<ClaimDetailProps> = ({ claim, currentUserRole, onUpdateClaim, onBack, contractors }) => {
  const [newComment, setNewComment] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [draftEmail, setDraftEmail] = useState<string | null>(null);
  
  const [proposeDate, setProposeDate] = useState('');
  const [proposeTime, setProposeTime] = useState<'AM' | 'PM'>('AM');

  // Service Order Email Modal State
  const [showSOModal, setShowSOModal] = useState(false);
  const [soPdfUrl, setSoPdfUrl] = useState<string | null>(null);
  const [soSubject, setSoSubject] = useState('');
  const [soBody, setSoBody] = useState('');
  const [isSendingSO, setIsSendingSO] = useState(false);

  const isAdmin = currentUserRole === UserRole.ADMIN;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const authorName = isAdmin ? 'Admin' : claim.homeownerName;
    
    const comment = {
      id: Date.now().toString(),
      author: authorName,
      role: currentUserRole,
      text: newComment,
      timestamp: new Date()
    };
    onUpdateClaim({
      ...claim,
      comments: [...claim.comments, comment]
    });
    
    // Notify via email service
    const isHomeownerSender = currentUserRole === UserRole.HOMEOWNER;
    const recipientEmail = isHomeownerSender ? 'info@cascadebuilderservices.com' : claim.homeownerEmail;
    
    await sendEmail({
      to: recipientEmail,
      subject: `Update on Warranty Claim #${claim.id}: ${claim.title}`,
      body: generateNotificationBody(authorName, newComment, 'CLAIM', claim.id, `https://cascadebuilderservices.com/claims/${claim.id}`),
      fromName: authorName,
      fromRole: currentUserRole,
      replyToId: claim.id
    });

    // If Admin sends, and Contractor is assigned, copy the contractor (Sub)
    if (isAdmin && claim.contractorEmail) {
       await sendEmail({
        to: claim.contractorEmail,
        subject: `Update on Warranty Claim #${claim.id} (Sub Notification)`,
        body: generateNotificationBody(authorName, newComment, 'CLAIM', claim.id, `https://cascadebuilderservices.com/claims/${claim.id}`),
        fromName: authorName,
        fromRole: currentUserRole
      });
    }

    setNewComment('');
  };

  const handlePrepareServiceOrder = async () => {
    if (!claim.contractorId) return;

    setIsAiLoading(true);
    
    // 1. Generate Summary if needed
    let summary = claim.summary;
    if (!summary) {
      summary = await summarizeClaim(claim);
      onUpdateClaim({...claim, summary});
    }

    // 2. Generate PDF Blob URL
    const url = generateServiceOrderPDF(claim, summary || claim.description, true);
    if (typeof url === 'string') {
        setSoPdfUrl(url);
    }

    // 3. Pre-fill Email Details
    setSoSubject(`Service Order: ${claim.builderName} - Lot ${claim.projectName} - ${claim.title}`);
    setSoBody(`Hi ${claim.contractorName},\n\nPlease find attached the service order for the warranty claim referenced above.\n\nAddress: ${claim.address}\nIssue: ${claim.description}\n\nPlease let us know when you can schedule this.\n\nThanks,\nCascade Builder Services`);
    
    setIsAiLoading(false);
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

  const handleDraftEmail = async () => {
    if (claim.proposedDates.length === 0) {
      alert("Please add proposed dates first.");
      return;
    }
    setIsAiLoading(true);
    const dates = claim.proposedDates.map(d => `${new Date(d.date).toLocaleDateString()} (${d.timeSlot})`);
    const draft = await draftSchedulingEmail(claim, dates);
    setDraftEmail(draft);
    setIsAiLoading(false);
  };

  const handleAddDate = () => {
    if (!proposeDate) return;
    const newDate: ProposedDate = {
      date: new Date(proposeDate).toISOString(),
      timeSlot: proposeTime,
      status: 'PROPOSED'
    };
    onUpdateClaim({
      ...claim,
      status: ClaimStatus.SCHEDULING,
      proposedDates: [...claim.proposedDates, newDate]
    });
    setProposeDate('');
  };

  const handleDateAction = (dateIndex: number, action: 'ACCEPTED' | 'REJECTED') => {
    const updatedDates = [...claim.proposedDates];
    updatedDates[dateIndex].status = action;
    const newStatus = action === 'ACCEPTED' ? ClaimStatus.SCHEDULED : claim.status;
    onUpdateClaim({ ...claim, status: newStatus, proposedDates: updatedDates });
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
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="text" onClick={onBack} icon={<ArrowLeft className="h-5 w-5" />} className="!px-2" />
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-surface-outline-variant bg-surface-container px-2 py-0.5 rounded">{claim.id}</span>
              <h2 className="text-2xl font-normal text-surface-on">{claim.title}</h2>
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
              <span>Lot {claim.projectName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Schedule */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Description Card */}
          <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant">
            <h3 className="text-lg font-normal text-surface-on mb-4">Description</h3>
            <p className="text-surface-on-variant whitespace-pre-wrap leading-relaxed">
              {claim.description}
            </p>
            
            {/* Rich Attachments */}
            {claim.attachments && claim.attachments.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-surface-on mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {claim.attachments.map((att, i) => (
                    <div key={i} className="group relative aspect-square bg-surface-container rounded-xl overflow-hidden border border-surface-outline-variant hover:shadow-elevation-1 transition-all">
                      {att.type === 'IMAGE' ? (
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                          {att.type === 'VIDEO' ? <Video className="h-8 w-8 text-primary mb-2" /> : <FileText className="h-8 w-8 text-blue-600 mb-2" />}
                          <span className="text-xs text-surface-on-variant truncate w-full">{att.name}</span>
                        </div>
                      )}
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <a href={att.url} target="_blank" rel="noreferrer" className="text-white text-xs font-medium hover:underline">View</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Warranty Assessment Card */}
          <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant">
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

          {/* 3. Internal Notes (Admin Only) */}
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

          {/* 4. Sub Assignment (Admin Only) */}
          {isAdmin && (
            <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant">
              <h3 className="text-lg font-normal text-surface-on mb-4 flex items-center gap-2">
                <HardHat className="h-5 w-5 text-primary" />
                Sub Assignment
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-full sm:flex-1">
                  <select 
                    className="w-full bg-surface-container rounded-lg px-4 py-3 border-r-8 border-transparent outline outline-1 outline-surface-outline-variant"
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
                      
                      {/* Send Service Order Button */}
                      <Button 
                         variant="outlined" 
                         onClick={handlePrepareServiceOrder} 
                         isLoading={isAiLoading}
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

          {/* 5. Scheduling Card */}
          <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant">
            <div className="flex justify-between items-start mb-6">
               <h3 className="text-lg font-normal text-surface-on flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Scheduling
              </h3>
              {claim.contractorName && (
                <span className="text-xs bg-primary-container text-primary-on-container px-3 py-1 rounded-full">
                  with {claim.contractorName}
                </span>
              )}
            </div>

            <div className="space-y-3 mb-8">
              {claim.proposedDates.length === 0 ? (
                <div className="bg-surface-container-high rounded-xl p-8 text-center text-surface-on-variant">
                   No appointments proposed yet.
                </div>
              ) : (
                claim.proposedDates.map((d, idx) => (
                  <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${d.status === 'ACCEPTED' ? 'bg-green-50 border-green-200' : 'bg-surface border-surface-outline-variant'}`}>
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${d.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-secondary-container text-secondary-on-container'}`}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-surface-on">
                          {new Date(d.date).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2 text-sm text-surface-on-variant">
                          <span>{d.timeSlot}</span>
                          <span className="text-surface-outline">•</span>
                          <span className={`${d.status === 'ACCEPTED' ? 'text-green-700 font-medium' : ''}`}>{d.status}</span>
                        </div>
                      </div>
                    </div>

                    {!isAdmin && d.status === 'PROPOSED' && (
                      <div className="flex gap-2">
                        <Button variant="filled" onClick={() => handleDateAction(idx, 'ACCEPTED')} className="!h-8 !px-4 text-xs">Accept</Button>
                        <Button variant="outlined" onClick={() => handleDateAction(idx, 'REJECTED')} className="!h-8 !px-4 text-xs">Reject</Button>
                      </div>
                    )}
                    {d.status === 'ACCEPTED' && <CheckCircle className="h-6 w-6 text-green-600 hidden sm:block" />}
                  </div>
                ))
              )}
            </div>

            {isAdmin && claim.status !== ClaimStatus.COMPLETED && claim.status !== ClaimStatus.SCHEDULED && (
              <div className="bg-surface-container p-5 rounded-2xl">
                <h4 className="text-sm font-bold text-surface-on mb-4">Propose New Date</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="w-full">
                    <label className="block text-xs text-surface-on-variant mb-1 ml-1">Date</label>
                    <input type="date" className="block w-full rounded-lg border-surface-outline bg-surface p-2.5 text-sm" 
                      value={proposeDate} onChange={e => setProposeDate(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs text-surface-on-variant mb-1 ml-1">Slot</label>
                    <select className="block w-full rounded-lg border-surface-outline bg-surface p-2.5 text-sm"
                      value={proposeTime} onChange={(e: any) => setProposeTime(e.target.value)}
                    >
                      <option value="AM">AM (8-12)</option>
                      <option value="PM">PM (12-4)</option>
                    </select>
                  </div>
                  <Button variant="tonal" onClick={handleAddDate} disabled={!proposeDate} className="w-full sm:w-auto">Add</Button>
                </div>

                <div className="mt-6 pt-4 border-t border-surface-outline-variant/50">
                   <div className="flex justify-between items-center mb-3">
                     <h4 className="text-sm font-bold text-surface-on flex items-center gap-2">
                       <Mail className="h-4 w-4" />
                       Email Coordination
                     </h4>
                     <Button variant="text" onClick={handleDraftEmail} disabled={isAiLoading || claim.proposedDates.length === 0} className="!h-8 text-xs !px-2">
                        {isAiLoading ? 'Drafting...' : 'Draft with Gemini'}
                     </Button>
                  </div>
                  
                  {draftEmail && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <textarea 
                        readOnly 
                        className="w-full h-32 text-sm p-3 border border-surface-outline-variant rounded-xl bg-surface text-surface-on resize-none focus:outline-none" 
                        value={draftEmail}
                      />
                      <Button variant="filled" onClick={() => { alert('Email sent! (Simulation)'); setDraftEmail(null); }} className="w-full">
                        Send Email
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat - Sticky & Fixed Height */}
        <div className="lg:sticky lg:top-24 bg-surface rounded-3xl border border-surface-outline-variant flex flex-col h-[600px] shadow-elevation-1">
          <div className="p-4 border-b border-surface-outline-variant bg-surface-container-high/30">
            <h3 className="font-medium text-surface-on flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Communication
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-high/10">
            {claim.comments.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-surface-outline-variant">
                <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No messages yet.</p>
              </div>
            )}
            
            {claim.comments.map(c => {
              const isMe = c.role === currentUserRole;
              return (
                <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    isMe 
                      ? 'bg-primary text-primary-on rounded-br-none' 
                      : 'bg-surface-container-high text-surface-on rounded-bl-none'
                  }`}>
                    <p>{c.text}</p>
                  </div>
                  <span className="text-[10px] text-surface-outline mt-1 px-1">
                    {c.author} • {new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-surface border-t border-surface-outline-variant">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                className="block w-full rounded-full border border-surface-outline-variant bg-surface-container-high/20 px-4 py-3 pr-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none placeholder-surface-outline"
                placeholder="Type a message..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              />
              <button 
                className="absolute right-2 p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <div className="text-[10px] text-center text-surface-outline-variant mt-2">
               Replies will be sent to the registered email address.
            </div>
          </div>
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