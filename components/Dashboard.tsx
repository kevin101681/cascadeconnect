import React, { useState } from 'react';
import { Claim, ClaimStatus, UserRole, Homeowner, Task, InternalEmployee, HomeownerDocument } from '../types';
import StatusBadge from './StatusBadge';
import { ArrowRight, Calendar, Plus, CheckSquare, ClipboardList, Database, Mail, X, Send, Sparkles, Building2, MapPin, Phone, Hash, Clock, FileText, Download, Upload, Users, UserPlus } from 'lucide-react';
import Button from './Button';
import TaskList from './TaskList';
import DataImport from './DataImport';
import InternalUserManagement from './InternalUserManagement';
import { draftInviteEmail } from '../services/geminiService';

interface DashboardProps {
  claims: Claim[];
  tasks: Task[];
  userRole: UserRole;
  onSelectClaim: (claim: Claim) => void;
  onNewClaim: (homeownerId?: string) => void;
  homeowners: Homeowner[];
  activeHomeowner: Homeowner;
  employees: InternalEmployee[];
  currentUser: InternalEmployee;
  onAddTask: (task: Partial<Task>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onImportClaims: (claims: Claim[]) => void;
  
  // Passed from App based on Search
  targetHomeowner: Homeowner | null;
  onClearHomeownerSelection: () => void;
  
  // Documents
  documents: HomeownerDocument[];
  onUploadDocument: (doc: Partial<HomeownerDocument>) => void;

  // Employee Management
  onAddEmployee: (emp: InternalEmployee) => void;
  onUpdateEmployee: (emp: InternalEmployee) => void;
  onDeleteEmployee: (id: string) => void;

  // Enrollment
  onOpenEnrollment: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  claims, 
  tasks,
  userRole, 
  onSelectClaim, 
  onNewClaim,
  homeowners,
  activeHomeowner,
  employees,
  currentUser,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onImportClaims,
  targetHomeowner,
  onClearHomeownerSelection,
  documents,
  onUploadDocument,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onOpenEnrollment
}) => {
  const isAdmin = userRole === UserRole.ADMIN;
  const [activeTab, setActiveTab] = useState<'CLAIMS' | 'TASKS' | 'TEAM' | 'DATA'>('CLAIMS');
  
  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBody, setInviteBody] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  // Document Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // --- Filtering Logic ---
  const effectiveHomeowner = isAdmin ? targetHomeowner : activeHomeowner;

  // Filter Claims
  const displayClaims = claims.filter(c => {
    if (effectiveHomeowner) {
      return c.homeownerEmail === effectiveHomeowner.email;
    }
    return true; // Admin viewing all if no specific homeowner selected
  });

  // Filter Tasks
  const displayTasks = tasks.filter(t => {
    if (effectiveHomeowner) {
      if (!t.relatedClaimIds || t.relatedClaimIds.length === 0) return false;
      const linkedClaims = claims.filter(c => t.relatedClaimIds?.includes(c.id));
      return linkedClaims.some(lc => lc.homeownerEmail === effectiveHomeowner.email);
    }
    return true; 
  });

  // Filter Documents
  const displayDocuments = documents.filter(d => {
    if (effectiveHomeowner) {
      return d.homeownerId === effectiveHomeowner.id;
    }
    return false; // Don't show documents if no homeowner is selected in Admin view
  });


  // --- Handlers ---

  const handleDraftInvite = async () => {
    if (!inviteName) return;
    setIsDrafting(true);
    const draft = await draftInviteEmail(inviteName);
    setInviteBody(draft);
    setIsDrafting(false);
  };

  const handleSendInvite = () => {
    // Simulation
    alert(`Invite sent to ${inviteEmail} via Internal Mail System!`);
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setInviteBody('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Simulate upload immediately
      if (effectiveHomeowner) {
        onUploadDocument({
          homeownerId: effectiveHomeowner.id,
          name: file.name,
          type: 'PDF', // Mock
          uploadedBy: isAdmin ? 'Admin' : 'Homeowner'
        });
      }
    }
  };

  const stats = [
    { name: 'Total Claims', value: displayClaims.length },
    { name: 'Open Claims', value: displayClaims.filter(c => c.status !== ClaimStatus.COMPLETED).length },
    { name: 'Scheduling', value: displayClaims.filter(c => c.status === ClaimStatus.SCHEDULING).length },
    { name: 'Tasks', value: displayTasks.filter(t => !t.isCompleted).length }, 
  ];

  return (
    <div className="space-y-6 relative">
      
      {/* Admin Specific: Selected Homeowner Detailed Profile View */}
      {isAdmin && targetHomeowner && (
        <div className="animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-normal text-surface-on flex items-center gap-3">
                  {targetHomeowner.name}
                  <span className="bg-tertiary-container text-tertiary-on-container text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {targetHomeowner.builder}
                  </span>
                </h2>
                <p className="text-surface-on-variant mt-1">Account Details & Warranty Profile</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setInviteName(targetHomeowner.name);
                    setInviteEmail(targetHomeowner.email);
                    setShowInviteModal(true);
                  }} 
                  variant="tonal" 
                  icon={<Mail className="h-4 w-4" />}
                >
                  Invite / Reset
                </Button>
                <Button 
                  variant="filled" 
                  onClick={() => onNewClaim(targetHomeowner.id)} 
                  icon={<Plus className="h-4 w-4" />}
                >
                  New Claim
                </Button>
                <Button variant="outlined" onClick={onClearHomeownerSelection} icon={<X className="h-4 w-4" />}>
                  Close
                </Button>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Contact Info Card */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface p-6 rounded-3xl border border-surface-outline-variant shadow-elevation-1">
                <div className="flex items-start gap-3">
                  <div className="bg-surface-container p-2 rounded-lg text-primary"><MapPin className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs text-surface-on-variant font-medium uppercase">Address</p>
                    <p className="text-sm text-surface-on font-medium">{targetHomeowner.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-surface-container p-2 rounded-lg text-primary"><Phone className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs text-surface-on-variant font-medium uppercase">Phone</p>
                    <p className="text-sm text-surface-on font-medium">{targetHomeowner.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-surface-container p-2 rounded-lg text-primary"><Mail className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs text-surface-on-variant font-medium uppercase">Email</p>
                    <p className="text-sm text-surface-on font-medium">{targetHomeowner.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-surface-container p-2 rounded-lg text-primary"><Hash className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs text-surface-on-variant font-medium uppercase">Lot / Unit</p>
                    <p className="text-sm text-surface-on font-medium">{targetHomeowner.lotNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-surface-container p-2 rounded-lg text-primary"><Clock className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs text-surface-on-variant font-medium uppercase">Closing Date</p>
                    <p className="text-sm text-surface-on font-medium">
                      {targetHomeowner.closingDate ? new Date(targetHomeowner.closingDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {targetHomeowner.agentName && (
                  <div className="flex items-start gap-3 md:col-span-2 bg-surface-container-high/30 p-2 rounded-lg">
                    <div className="bg-surface-container p-2 rounded-lg text-secondary"><UserPlus className="h-5 w-5" /></div>
                    <div>
                      <p className="text-xs text-surface-on-variant font-medium uppercase">Buyer's Agent</p>
                      <p className="text-sm text-surface-on font-medium">{targetHomeowner.agentName} <span className="text-xs opacity-70 font-normal">({targetHomeowner.agentPhone})</span></p>
                    </div>
                  </div>
                )}
            </div>

            {/* Documents Card */}
            <div className="bg-surface p-6 rounded-3xl border border-surface-outline-variant shadow-elevation-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-medium text-surface-on flex items-center gap-2">
                   <FileText className="h-5 w-5 text-primary" />
                   Documents
                 </h3>
                 <label className="cursor-pointer text-xs font-medium text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Upload
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                 </label>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-40 space-y-2 pr-1">
                {displayDocuments.length === 0 ? (
                  <div className="text-center text-xs text-surface-on-variant py-4 italic">No documents uploaded.</div>
                ) : (
                  displayDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container group">
                      <div className="flex items-center gap-2 min-w-0">
                         <div className="p-1.5 bg-red-50 text-red-600 rounded">
                           <FileText className="h-4 w-4" />
                         </div>
                         <div className="min-w-0">
                           <p className="text-sm font-medium text-surface-on truncate">{doc.name}</p>
                           <p className="text-[10px] text-surface-on-variant">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                         </div>
                      </div>
                      <button className="text-surface-outline-variant hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Tabs */}
      {isAdmin && (
        <div className="flex justify-between items-end border-b border-surface-outline-variant">
          <div className="flex gap-6 px-2 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('CLAIMS')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'CLAIMS' ? 'border-primary text-primary' : 'border-transparent text-surface-on-variant hover:text-surface-on'}`}
            >
              <ClipboardList className="h-4 w-4" />
              Warranty Claims
            </button>
            <button 
              onClick={() => setActiveTab('TASKS')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'TASKS' ? 'border-primary text-primary' : 'border-transparent text-surface-on-variant hover:text-surface-on'}`}
            >
              <CheckSquare className="h-4 w-4" />
              Internal Tasks
              {tasks.filter(t => !t.isCompleted && t.assignedToId === currentUser.id).length > 0 && (
                <span className="bg-error text-white text-[10px] px-1.5 rounded-full">
                  {tasks.filter(t => !t.isCompleted && t.assignedToId === currentUser.id).length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('TEAM')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'TEAM' ? 'border-primary text-primary' : 'border-transparent text-surface-on-variant hover:text-surface-on'}`}
            >
              <Users className="h-4 w-4" />
              Team
            </button>
            <button 
              onClick={() => setActiveTab('DATA')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'DATA' ? 'border-primary text-primary' : 'border-transparent text-surface-on-variant hover:text-surface-on'}`}
            >
              <Database className="h-4 w-4" />
              Data
            </button>
          </div>

          {!targetHomeowner && activeTab === 'CLAIMS' && (
            <div className="pb-2">
               <Button onClick={onOpenEnrollment} variant="tonal" className="!h-8 text-xs px-3" icon={<UserPlus className="h-3 w-3" />}>
                 Enroll Homeowner
               </Button>
            </div>
          )}
        </div>
      )}

      {/* ADMIN DATA VIEW */}
      {isAdmin && activeTab === 'DATA' && (
        <DataImport onImportClaims={onImportClaims} />
      )}

      {/* ADMIN TEAM VIEW */}
      {isAdmin && activeTab === 'TEAM' && (
        <InternalUserManagement 
          employees={employees}
          onAddEmployee={onAddEmployee}
          onUpdateEmployee={onUpdateEmployee}
          onDeleteEmployee={onDeleteEmployee}
        />
      )}

      {/* ADMIN TASK VIEW */}
      {isAdmin && activeTab === 'TASKS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 bg-surface rounded-3xl border border-surface-outline-variant p-6">
             <TaskList 
                tasks={displayTasks}
                employees={employees}
                currentUser={currentUser}
                claims={claims} 
                homeowners={homeowners}
                onAddTask={onAddTask}
                onToggleTask={onToggleTask}
                onDeleteTask={onDeleteTask}
                preSelectedHomeowner={effectiveHomeowner}
             />
          </div>
        </div>
      )}

      {/* CLAIMS VIEW (Common for Admin & Homeowner) */}
      {((isAdmin && activeTab === 'CLAIMS') || !isAdmin) && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-surface-container p-5 rounded-2xl">
                <dt className="text-sm font-medium text-surface-on-variant">{stat.name}</dt>
                <dd className="mt-1 text-4xl font-normal text-primary">{stat.value}</dd>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main List */}
            <div className="lg:col-span-2 bg-surface rounded-3xl border border-surface-outline-variant overflow-hidden">
              <div className="px-6 py-6 border-b border-surface-outline-variant flex justify-between items-center">
                <h3 className="text-xl font-normal text-surface-on">
                  {effectiveHomeowner ? `Claims for ${effectiveHomeowner.name}` : 'Recent Claims'}
                </h3>
                {effectiveHomeowner && (
                  <span className="text-xs text-surface-on-variant bg-surface-container px-2 py-1 rounded">
                    {displayClaims.length} records
                  </span>
                )}
              </div>
              <ul className="divide-y divide-surface-outline-variant">
                {displayClaims.length === 0 ? (
                  <li className="p-12 text-center text-surface-on-variant flex flex-col items-center">
                    {isAdmin && effectiveHomeowner ? 'No claims found for this homeowner.' : 'No claims found.'}
                    {!effectiveHomeowner && isAdmin && 'Search for a homeowner to view their claims.'}
                  </li>
                ) : (
                  displayClaims.map((claim) => (
                    <li key={claim.id} className="hover:bg-surface-container-high transition-colors">
                      <button 
                        onClick={() => onSelectClaim(claim)}
                        className="w-full text-left px-6 py-4 flex items-center justify-between group"
                      >
                        <div>
                          <div className="flex items-center space-x-3 mb-1">
                            <span className="text-xs font-bold text-primary tracking-wide">#{claim.id}</span>
                            <StatusBadge status={claim.status} />
                          </div>
                          <h4 className="text-lg font-normal text-surface-on group-hover:text-primary transition-colors">
                            {claim.title}
                          </h4>
                          <div className="mt-1 flex items-center text-sm text-surface-on-variant space-x-3">
                            <span>{new Date(claim.dateSubmitted).toLocaleDateString()}</span>
                            <span className="w-1 h-1 bg-surface-outline rounded-full"></span>
                            <span>{claim.category}</span>
                            {/* Only show homeowner name if viewing all (admin view without filter) */}
                            {isAdmin && !effectiveHomeowner && (
                              <>
                                <span className="w-1 h-1 bg-surface-outline rounded-full"></span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {claim.homeownerName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-6 w-6 text-surface-outline-variant group-hover:text-primary" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Schedule Card */}
              <div className="bg-secondary-container p-6 rounded-3xl text-secondary-on-container">
                <h3 className="font-medium text-lg mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-3" />
                  Upcoming Schedule
                </h3>
                <div className="space-y-3">
                  {displayClaims
                    .filter(c => c.status === ClaimStatus.SCHEDULED)
                    .slice(0, 3)
                    .map(c => {
                      const acceptedDate = c.proposedDates.find(d => d.status === 'ACCEPTED');
                      return (
                        <div key={c.id} className="bg-surface/50 p-4 rounded-xl text-sm backdrop-blur-sm border border-white/20">
                          <p className="font-medium">{c.title}</p>
                          <p className="opacity-80 mt-1">
                            {acceptedDate ? new Date(acceptedDate.date).toLocaleDateString() : 'N/A'} - {acceptedDate?.timeSlot}
                          </p>
                        </div>
                      )
                    })}
                  {displayClaims.filter(c => c.status === ClaimStatus.SCHEDULED).length === 0 && (
                    <p className="text-sm opacity-70">No confirmed appointments.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-outline-variant flex justify-between items-center bg-surface-container">
              <h2 className="text-lg font-normal text-surface-on flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Invite Homeowner
              </h2>
              <button onClick={() => setShowInviteModal(false)} className="text-surface-on-variant hover:text-surface-on">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant mb-1">Full Name</label>
                <input 
                  type="text" 
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-on-variant mb-1">Email Address</label>
                <input 
                  type="email" 
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-surface-on-variant">Invitation Message</label>
                  <Button 
                    variant="text" 
                    onClick={handleDraftInvite} 
                    disabled={isDrafting || !inviteName} 
                    className="!h-6 !text-xs !px-2"
                    icon={isDrafting ? <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"/> : <Sparkles className="h-3 w-3" />}
                  >
                    {isDrafting ? 'Drafting...' : 'Auto-Draft'}
                  </Button>
                </div>
                <textarea 
                  rows={6}
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                  value={inviteBody}
                  onChange={(e) => setInviteBody(e.target.value)}
                  placeholder="Enter message or auto-draft..."
                />
              </div>
            </div>

            <div className="p-4 bg-surface-container flex justify-end gap-3">
              <Button variant="text" onClick={() => setShowInviteModal(false)}>Cancel</Button>
              <Button variant="filled" onClick={handleSendInvite} disabled={!inviteEmail || !inviteBody} icon={<Send className="h-4 w-4" />}>
                Send Invitation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;