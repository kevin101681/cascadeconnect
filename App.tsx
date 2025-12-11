
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClaimDetail from './components/ClaimDetail';
import NewClaimForm from './components/NewClaimForm';
import HomeownerEnrollment from './components/HomeownerEnrollment';
import AuthScreen from './components/AuthScreen';
import InternalUserManagement from './components/InternalUserManagement';
import BuilderManagement from './components/BuilderManagement';
import DataImport from './components/DataImport';
import { Claim, UserRole, ClaimStatus, Homeowner, Task, HomeownerDocument, InternalEmployee, MessageThread, Message, Contractor, BuilderGroup, BuilderUser } from './types';
import { MOCK_CLAIMS, MOCK_HOMEOWNERS, MOCK_TASKS, MOCK_INTERNAL_EMPLOYEES, MOCK_CONTRACTORS, MOCK_DOCUMENTS, MOCK_THREADS, MOCK_BUILDER_GROUPS, MOCK_BUILDER_USERS } from './constants';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);
  
  // Mock logged in user management
  const [activeHomeowner, setActiveHomeowner] = useState<Homeowner>(MOCK_HOMEOWNERS[0]);
  const [activeEmployee, setActiveEmployee] = useState<InternalEmployee>(MOCK_INTERNAL_EMPLOYEES[0]); 
  // Add active builder user if needed for simulation
  // const [activeBuilderUser, setActiveBuilderUser] = useState<BuilderUser>(MOCK_BUILDER_USERS[0]);
  // Use a generic placeholder for now as we don't have a full auth context object in this simple demo
  // In a real app, `currentUser` would be a union type.

  // Current Builder User ID (for simulation filtering)
  const [currentBuilderId, setCurrentBuilderId] = useState<string | null>(null);

  const [claims, setClaims] = useState<Claim[]>(MOCK_CLAIMS);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [documents, setDocuments] = useState<HomeownerDocument[]>(MOCK_DOCUMENTS);
  const [homeowners, setHomeowners] = useState<Homeowner[]>(MOCK_HOMEOWNERS);
  const [employees, setEmployees] = useState<InternalEmployee[]>(MOCK_INTERNAL_EMPLOYEES);
  const [contractors, setContractors] = useState<Contractor[]>(MOCK_CONTRACTORS);
  const [messages, setMessages] = useState<MessageThread[]>(MOCK_THREADS);
  
  // Builder State
  const [builderGroups, setBuilderGroups] = useState<BuilderGroup[]>(MOCK_BUILDER_GROUPS);
  const [builderUsers, setBuilderUsers] = useState<BuilderUser[]>(MOCK_BUILDER_USERS);
  
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'DETAIL' | 'NEW' | 'TEAM' | 'BUILDERS' | 'DATA'>('DASHBOARD');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  
  // --- Search State (Lifted from Dashboard) ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminHomeownerId, setSelectedAdminHomeownerId] = useState<string | null>(null);

  // Enrollment Modal State
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);

  // Helper to get selected claim object safely
  const selectedClaim = claims.find(c => c.id === selectedClaimId);
  const targetHomeowner = selectedAdminHomeownerId ? homeowners.find(h => h.id === selectedAdminHomeownerId) || null : null;

  // Search results for Dropdown
  // Filter search results based on role permissions
  const availableHomeowners = (userRole === UserRole.BUILDER && currentBuilderId)
    ? homeowners.filter(h => h.builderId === currentBuilderId)
    : homeowners;

  const searchResults = searchQuery 
    ? availableHomeowners.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        h.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleLoginSuccess = (user: Homeowner | InternalEmployee, role: UserRole) => {
    setUserRole(role);
    if (role === UserRole.ADMIN) {
      setActiveEmployee(user as InternalEmployee);
      setCurrentBuilderId(null);
    } else if (role === UserRole.HOMEOWNER) {
      setActiveHomeowner(user as Homeowner);
      setCurrentBuilderId(null);
    }
    // Note: Builder login simulation isn't fully built out in AuthScreen yet, 
    // but structure is ready.
    setIsAuthenticated(true);
  };

  const handleSelectHomeowner = (homeowner: Homeowner) => {
    setSelectedAdminHomeownerId(homeowner.id);
    setSearchQuery('');
    // Ensure we are on the dashboard view when selecting a homeowner to see their profile
    setCurrentView('DASHBOARD');
  };

  const handleClearHomeownerSelection = () => {
    setSelectedAdminHomeownerId(null);
  };

  const handleSwitchRole = () => {
    // Cycle through roles for demo purposes
    if (userRole === UserRole.ADMIN) {
      setUserRole(UserRole.BUILDER);
      // Simulate logging in as the first builder group
      if (builderGroups.length > 0) {
        setCurrentBuilderId(builderGroups[0].id);
      }
    } else if (userRole === UserRole.BUILDER) {
      setUserRole(UserRole.HOMEOWNER);
      setCurrentBuilderId(null);
    } else {
      setUserRole(UserRole.ADMIN);
      setCurrentBuilderId(null);
    }
    
    setCurrentView('DASHBOARD');
    setSelectedClaimId(null);
    setSelectedAdminHomeownerId(null);
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
    // Builders cannot create claims
    if (userRole === UserRole.BUILDER) return;
    setCurrentView('NEW');
  };

  const handleCreateClaim = (data: Partial<Claim>) => {
    const subjectHomeowner = ((userRole === UserRole.ADMIN || userRole === UserRole.BUILDER) && targetHomeowner) ? targetHomeowner : activeHomeowner;
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

  // Subcontractor Management
  const handleAddContractor = (sub: Contractor) => {
    setContractors(prev => [...prev, sub]);
  };

  const handleUpdateContractor = (sub: Contractor) => {
    setContractors(prev => prev.map(c => c.id === sub.id ? sub : c));
  };

  const handleDeleteContractor = (id: string) => {
    setContractors(prev => prev.filter(c => c.id !== id));
  };

  // Builder Management
  const handleAddBuilderGroup = (group: BuilderGroup) => {
    setBuilderGroups(prev => [...prev, group]);
  };
  const handleUpdateBuilderGroup = (group: BuilderGroup) => {
    setBuilderGroups(prev => prev.map(g => g.id === group.id ? group : g));
  };
  const handleDeleteBuilderGroup = (id: string) => {
    setBuilderGroups(prev => prev.filter(g => g.id !== id));
  };

  const handleAddBuilderUser = (user: BuilderUser, password?: string) => {
    console.log(`Creating builder user with password: ${password}`); // Mock password handling
    setBuilderUsers(prev => [...prev, user]);
  };
  const handleUpdateBuilderUser = (user: BuilderUser, password?: string) => {
    if (password) console.log(`Updating builder user password to: ${password}`);
    setBuilderUsers(prev => prev.map(u => u.id === user.id ? user : u));
  };
  const handleDeleteBuilderUser = (id: string) => {
    setBuilderUsers(prev => prev.filter(u => u.id !== id));
  };

  // Homeowner Management
  const handleEnrollHomeowner = (data: Partial<Homeowner>, tradeListFile: File | null) => {
    const newId = `h${Date.now()}`;
    const newHomeowner: Homeowner = {
      id: newId,
      name: data.name || 'Unknown',
      email: data.email || '',
      address: data.address || '',
      phone: data.phone || '',
      builder: data.builder || '',
      builderId: data.builderId,
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

  const handleUpdateHomeowner = (updatedHomeowner: Homeowner) => {
    setHomeowners(prev => prev.map(h => h.id === updatedHomeowner.id ? updatedHomeowner : h));
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

  // Message Handling
  const handleSendMessage = (threadId: string, content: string) => {
    const newMessage: Message = {
      id: `m-${Date.now()}`,
      senderId: userRole === UserRole.ADMIN ? activeEmployee.id : activeHomeowner.id,
      senderName: userRole === UserRole.ADMIN ? activeEmployee.name : activeHomeowner.name,
      senderRole: userRole,
      content,
      timestamp: new Date()
    };

    setMessages(prev => prev.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          lastMessageAt: newMessage.timestamp,
          messages: [...t.messages, newMessage]
        };
      }
      return t;
    }));
  };

  const handleCreateThread = (homeownerId: string, subject: string, content: string) => {
    const sender = userRole === UserRole.ADMIN ? activeEmployee : activeHomeowner;
    
    const newThread: MessageThread = {
      id: `th-${Date.now()}`,
      subject,
      homeownerId,
      participants: [sender.name], // In a real app we'd fetch the recipient name
      isRead: true, // Read by sender
      lastMessageAt: new Date(),
      messages: [
        {
          id: `m-init-${Date.now()}`,
          senderId: sender.id,
          senderName: sender.name,
          senderRole: userRole,
          content,
          timestamp: new Date()
        }
      ]
    };

    setMessages(prev => [newThread, ...prev]);
  };

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout 
      userRole={userRole} 
      onSwitchRole={handleSwitchRole}
      homeowners={availableHomeowners} // Pass filtered list to layout for switcher/search context
      activeHomeowner={activeHomeowner}
      onSwitchHomeowner={handleSwitchHomeowner}
      
      // Search Props
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchResults={searchResults}
      onSelectHomeowner={handleSelectHomeowner}
      selectedHomeownerId={selectedAdminHomeownerId}
      onClearSelection={handleClearHomeownerSelection}

      // Nav
      onNavigate={setCurrentView}
      onOpenEnrollment={() => setIsEnrollmentOpen(true)}
    >
      {currentView === 'DASHBOARD' && (
        <Dashboard 
          claims={claims} 
          tasks={tasks}
          userRole={userRole} 
          onSelectClaim={handleSelectClaim}
          onNewClaim={handleNewClaimStart}
          homeowners={availableHomeowners}
          activeHomeowner={activeHomeowner}
          employees={employees}
          currentUser={activeEmployee}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          
          targetHomeowner={targetHomeowner}
          onClearHomeownerSelection={handleClearHomeownerSelection}
          onUpdateHomeowner={handleUpdateHomeowner}

          documents={documents}
          onUploadDocument={handleUploadDocument}
          
          messages={messages}
          onSendMessage={handleSendMessage}
          onCreateThread={handleCreateThread}

          builderGroups={builderGroups}
        />
      )}

      {currentView === 'TEAM' && (
        <InternalUserManagement 
          employees={employees}
          onAddEmployee={handleAddEmployee}
          onUpdateEmployee={handleUpdateEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          
          contractors={contractors}
          onAddContractor={handleAddContractor}
          onUpdateContractor={handleUpdateContractor}
          onDeleteContractor={handleDeleteContractor}

          onClose={() => setCurrentView('DASHBOARD')}
        />
      )}

      {currentView === 'BUILDERS' && (
        <BuilderManagement 
          builderGroups={builderGroups}
          builderUsers={builderUsers}
          onAddGroup={handleAddBuilderGroup}
          onUpdateGroup={handleUpdateBuilderGroup}
          onDeleteGroup={handleDeleteBuilderGroup}
          onAddUser={handleAddBuilderUser}
          onUpdateUser={handleUpdateBuilderUser}
          onDeleteUser={handleDeleteBuilderUser}
          onClose={() => setCurrentView('DASHBOARD')}
        />
      )}

      {currentView === 'DATA' && (
        <DataImport onImportClaims={handleImportClaims} />
      )}

      {currentView === 'NEW' && (
        <div className="max-w-4xl mx-auto bg-surface p-8 rounded-3xl shadow-elevation-1 border border-surface-outline-variant">
          <h2 className="text-2xl font-normal text-surface-on mb-6">Create Warranty Claim</h2>
          <NewClaimForm 
            onSubmit={handleCreateClaim} 
            onCancel={() => setCurrentView('DASHBOARD')} 
            contractors={contractors}
            activeHomeowner={(userRole === UserRole.ADMIN || userRole === UserRole.BUILDER) && targetHomeowner ? targetHomeowner : activeHomeowner}
            userRole={userRole}
          />
        </div>
      )}

      {currentView === 'DETAIL' && selectedClaim && (
        <ClaimDetail 
          claim={selectedClaim} 
          currentUserRole={userRole}
          onUpdateClaim={handleUpdateClaim}
          onBack={() => setCurrentView('DASHBOARD')}
          contractors={contractors}
        />
      )}

      <HomeownerEnrollment 
        isOpen={isEnrollmentOpen}
        onClose={() => setIsEnrollmentOpen(false)}
        onEnroll={handleEnrollHomeowner}
        builderGroups={builderGroups}
      />
    </Layout>
  );
}

export default App;
