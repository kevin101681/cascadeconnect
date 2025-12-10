import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClaimDetail from './components/ClaimDetail';
import NewClaimForm from './components/NewClaimForm';
import HomeownerEnrollment from './components/HomeownerEnrollment';
import { Claim, UserRole, ClaimStatus, Homeowner, Task, HomeownerDocument, InternalEmployee } from './types';
import { MOCK_CLAIMS, MOCK_HOMEOWNERS, MOCK_TASKS, MOCK_INTERNAL_EMPLOYEES, MOCK_CONTRACTORS, MOCK_DOCUMENTS } from './constants';

function App() {
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [claims, setClaims] = useState<Claim[]>(MOCK_CLAIMS);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [documents, setDocuments] = useState<HomeownerDocument[]>(MOCK_DOCUMENTS);
  const [homeowners, setHomeowners] = useState<Homeowner[]>(MOCK_HOMEOWNERS);
  const [employees, setEmployees] = useState<InternalEmployee[]>(MOCK_INTERNAL_EMPLOYEES);
  
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'DETAIL' | 'NEW'>('DASHBOARD');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  
  // Mock logged in user management
  const [activeHomeowner, setActiveHomeowner] = useState<Homeowner>(MOCK_HOMEOWNERS[0]);
  const [activeEmployee, setActiveEmployee] = useState(MOCK_INTERNAL_EMPLOYEES[0]); // Default admin

  // --- Search State (Lifted from Dashboard) ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminHomeownerId, setSelectedAdminHomeownerId] = useState<string | null>(null);

  // Enrollment Modal State
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);

  // Helper to get selected claim object safely
  const selectedClaim = claims.find(c => c.id === selectedClaimId);
  const targetHomeowner = selectedAdminHomeownerId ? homeowners.find(h => h.id === selectedAdminHomeownerId) || null : null;

  // Search results for Dropdown
  const searchResults = searchQuery 
    ? homeowners.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        h.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectHomeowner = (homeowner: Homeowner) => {
    setSelectedAdminHomeownerId(homeowner.id);
    setSearchQuery('');
  };

  const handleClearHomeownerSelection = () => {
    setSelectedAdminHomeownerId(null);
  };

  const handleSwitchRole = () => {
    setUserRole(prev => prev === UserRole.HOMEOWNER ? UserRole.ADMIN : UserRole.HOMEOWNER);
    setCurrentView('DASHBOARD');
    setSelectedClaimId(null);
  };
  
  const handleSwitchHomeowner = (id: string) => {
    const homeowner = homeowners.find(h => h.id === id);
    if (homeowner) {
      setActiveHomeowner(homeowner);
      setCurrentView('DASHBOARD');
    }
  };

  const handleSelectClaim = (claim: Claim) => {
    setSelectedClaimId(claim.id);
    setCurrentView('DETAIL');
  };

  const handleUpdateClaim = (updatedClaim: Claim) => {
    setClaims(prev => prev.map(c => c.id === updatedClaim.id ? updatedClaim : c));
  };

  const handleNewClaimStart = (homeownerId?: string) => {
    if (homeownerId) {
      const target = homeowners.find(h => h.id === homeownerId);
      if (target) {
        // If Admin is starting claim for a specific user, logic is handled in CreateClaim
      }
    }
    setCurrentView('NEW');
  };

  const handleCreateClaim = (data: Partial<Claim>) => {
    // If admin has selected a homeowner, use that one. Otherwise use activeHomeowner (which is the user themselves if logged in as user)
    const subjectHomeowner = (userRole === UserRole.ADMIN && targetHomeowner) ? targetHomeowner : activeHomeowner;
    if (!subjectHomeowner) return;

    const newClaim: Claim = {
      id: `CLM-${Math.floor(1000 + Math.random() * 9000)}`,
      title: data.title || '',
      description: data.description || '',
      category: data.category || 'Other',
      address: subjectHomeowner.address,
      homeownerName: subjectHomeowner.name,
      homeownerEmail: subjectHomeowner.email,
      builderName: subjectHomeowner.builder,
      projectName: subjectHomeowner.lotNumber,
      closingDate: subjectHomeowner.closingDate,
      
      status: data.status || ClaimStatus.SUBMITTED,
      classification: data.classification || 'Unclassified',
      dateEvaluated: data.dateEvaluated,
      nonWarrantyExplanation: data.nonWarrantyExplanation,
      internalNotes: data.internalNotes,
      
      contractorId: data.contractorId,
      contractorName: data.contractorName,
      contractorEmail: data.contractorEmail,

      dateSubmitted: new Date(),
      proposedDates: [],
      comments: [],
      attachments: data.attachments || []
    };
    setClaims(prev => [newClaim, ...prev]);
    setCurrentView('DASHBOARD');
  };

  const handleImportClaims = (newClaims: Claim[]) => {
    setClaims(prev => [...newClaims, ...prev]);
  };

  // Task Management
  const handleAddTask = (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: `t${Date.now()}`,
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      assignedToId: taskData.assignedToId || activeEmployee.id,
      assignedById: activeEmployee.id,
      isCompleted: false,
      dateAssigned: new Date(),
      dueDate: taskData.dueDate || new Date(Date.now() + 86400000), // Default to next day
      relatedClaimIds: taskData.relatedClaimIds || []
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    ));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // Employee Management
  const handleAddEmployee = (emp: InternalEmployee) => {
    setEmployees(prev => [...prev, emp]);
  };

  const handleUpdateEmployee = (emp: InternalEmployee) => {
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  // Enrollment
  const handleEnrollHomeowner = (data: Partial<Homeowner>, tradeListFile: File | null) => {
    const newId = `h${Date.now()}`;
    const newHomeowner: Homeowner = {
      id: newId,
      name: data.name || 'Unknown',
      email: data.email || '',
      address: data.address || '',
      phone: data.phone || '',
      builder: data.builder || '',
      lotNumber: data.lotNumber || '',
      closingDate: data.closingDate || new Date(),
      ...data // Spread remaining fields
    } as Homeowner;

    setHomeowners(prev => [...prev, newHomeowner]);

    // Handle File Upload
    if (tradeListFile) {
      handleUploadDocument({
        homeownerId: newId,
        name: tradeListFile.name,
        type: 'PDF', // Assuming
        uploadedBy: 'Builder (Enrollment)',
        url: '#'
      });
    }

    alert(`Successfully enrolled ${newHomeowner.name}!`);
  };

  const handleUploadDocument = (doc: Partial<HomeownerDocument>) => {
    const newDoc: HomeownerDocument = {
      id: `doc-${Date.now()}`,
      homeownerId: doc.homeownerId || '',
      name: doc.name || 'Untitled Document',
      uploadedBy: doc.uploadedBy || 'System',
      uploadDate: new Date(),
      url: doc.url || '#',
      type: doc.type || 'FILE'
    };
    setDocuments(prev => [newDoc, ...prev]);
  };

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  return (
    <Layout 
      userRole={userRole} 
      onSwitchRole={handleSwitchRole}
      homeowners={homeowners}
      activeHomeowner={activeHomeowner}
      onSwitchHomeowner={handleSwitchHomeowner}
      
      // Search Props
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchResults={searchResults}
      onSelectHomeowner={handleSelectHomeowner}
      selectedHomeownerId={selectedAdminHomeownerId}
      onClearSelection={handleClearHomeownerSelection}
    >
      {currentView === 'DASHBOARD' && (
        <Dashboard 
          claims={claims} 
          tasks={tasks}
          userRole={userRole} 
          onSelectClaim={handleSelectClaim}
          onNewClaim={handleNewClaimStart}
          homeowners={homeowners}
          activeHomeowner={activeHomeowner}
          employees={employees}
          currentUser={activeEmployee}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onImportClaims={handleImportClaims}
          
          targetHomeowner={targetHomeowner}
          onClearHomeownerSelection={handleClearHomeownerSelection}

          documents={documents}
          onUploadDocument={handleUploadDocument}

          onAddEmployee={handleAddEmployee}
          onUpdateEmployee={handleUpdateEmployee}
          onDeleteEmployee={handleDeleteEmployee}

          onOpenEnrollment={() => setIsEnrollmentOpen(true)}
        />
      )}

      {currentView === 'NEW' && (
        <div className="max-w-4xl mx-auto bg-surface p-8 rounded-3xl shadow-elevation-1 border border-surface-outline-variant">
          <h2 className="text-2xl font-normal text-surface-on mb-6">Create Warranty Claim</h2>
          <NewClaimForm 
            onSubmit={handleCreateClaim} 
            onCancel={() => setCurrentView('DASHBOARD')} 
            contractors={MOCK_CONTRACTORS}
            activeHomeowner={userRole === UserRole.ADMIN && targetHomeowner ? targetHomeowner : activeHomeowner}
          />
        </div>
      )}

      {currentView === 'DETAIL' && selectedClaim && (
        <ClaimDetail 
          claim={selectedClaim} 
          currentUserRole={userRole}
          onUpdateClaim={handleUpdateClaim}
          onBack={() => setCurrentView('DASHBOARD')}
          contractors={MOCK_CONTRACTORS}
        />
      )}

      <HomeownerEnrollment 
        isOpen={isEnrollmentOpen}
        onClose={() => setIsEnrollmentOpen(false)}
        onEnroll={handleEnrollHomeowner}
      />
    </Layout>
  );
}

export default App;