
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
import TaskList from './components/TaskList';
import { Claim, UserRole, ClaimStatus, Homeowner, Task, HomeownerDocument, InternalEmployee, MessageThread, Message, Contractor, BuilderGroup, BuilderUser } from './types';
import { MOCK_CLAIMS, MOCK_HOMEOWNERS, MOCK_TASKS, MOCK_INTERNAL_EMPLOYEES, MOCK_CONTRACTORS, MOCK_DOCUMENTS, MOCK_THREADS, MOCK_BUILDER_GROUPS, MOCK_BUILDER_USERS } from './constants';

const PLACEHOLDER_HOMEOWNER: Homeowner = {
  id: 'placeholder',
  name: 'Guest',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  address: '',
  builder: '',
  jobName: '',
  closingDate: new Date()
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);
  
  // Mock logged in user management
  const [activeHomeowner, setActiveHomeowner] = useState<Homeowner>(MOCK_HOMEOWNERS.length > 0 ? MOCK_HOMEOWNERS[0] : PLACEHOLDER_HOMEOWNER);
  const [activeEmployee, setActiveEmployee] = useState<InternalEmployee>(MOCK_INTERNAL_EMPLOYEES[0]); 
  
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
  
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'DETAIL' | 'NEW' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'SUBS'>('DASHBOARD');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  
  // --- Search State (Lifted from Dashboard) ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminHomeownerId, setSelectedAdminHomeownerId] = useState<string | null>(null);

  // Dashboard Control State (Ephemeral)
  const [dashboardConfig, setDashboardConfig] = useState<{
    initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS';
    initialThreadId?: string | null;
  }>({});

  // Enrollment Modal State
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);

  // Helper to get selected claim object safely
  const selectedClaim = claims.find(c => c.id === selectedClaimId);
  const targetHomeowner = selectedAdminHomeownerId ? homeowners.find(h => h.id === selectedAdminHomeownerId) || null : null;

  // Search results for Dropdown
  const availableHomeowners = (userRole === UserRole.BUILDER && currentBuilderId)
    ? homeowners.filter(h => h.builderId === currentBuilderId)
    : homeowners;

  const searchResults = searchQuery 
    ? availableHomeowners.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        h.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.jobName && h.jobName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleLoginSuccess = (user: Homeowner | InternalEmployee | BuilderUser, role: UserRole) => {
    setUserRole(role);
    if (role === UserRole.ADMIN) {
      setActiveEmployee(user as InternalEmployee);
      setCurrentBuilderId(null);
    } else if (role === UserRole.HOMEOWNER) {
      setActiveHomeowner(user as Homeowner);
      setCurrentBuilderId(null);
    } else if (role === UserRole.BUILDER) {
      const builderUser = user as BuilderUser;
      setCurrentBuilderId(builderUser.builderGroupId);
    }
    setIsAuthenticated(true);
  };

  const handleSelectHomeowner = (homeowner: Homeowner) => {
    setSelectedAdminHomeownerId(homeowner.id);
    setSearchQuery('');
    // Reset dashboard config when switching context
    setDashboardConfig({ initialTab: 'CLAIMS', initialThreadId: null });
    setCurrentView('DASHBOARD');
  };

  const handleClearHomeownerSelection = () => {
    setSelectedAdminHomeownerId(null);
  };

  const handleSwitchRole = () => {
    if (userRole === UserRole.ADMIN) {
      setUserRole(UserRole.BUILDER);
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
    setDashboardConfig({});
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
      jobName: subjectHomeowner.jobName, // Use Job Name
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

  const handleImportHomeowners = (newHomeowners: Homeowner[]) => {
    setHomeowners(prev => [...prev, ...newHomeowners]);
  };

  const handleImportBuilderGroups = (newGroups: BuilderGroup[]) => {
    setBuilderGroups(prev => [...prev, ...newGroups]);
  };

  const handleClearHomeowners = () => {
    setHomeowners([]);
    setSelectedAdminHomeownerId(null);
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
      dueDate: taskData.dueDate || new Date(Date.now() + 86400000),
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
    setBuilderUsers(prev => [...prev, user]);
  };
  const handleUpdateBuilderUser = (user: BuilderUser, password?: string) => {
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
      phone: data.phone || '',
      street: data.street || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      address: data.address || '', // Constructed in component
      builder: data.builder || '',
      builderId: data.builderId,
      jobName: data.jobName || '',
      closingDate: data.closingDate || new Date(),
      ...data
    } as Homeowner;

    setHomeowners(prev => [...prev, newHomeowner]);
    if (tradeListFile) {
      handleUploadDocument({
        homeownerId: newId,
        name: tradeListFile.name,
        type: 'PDF',
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
      participants: [sender.name],
      isRead: true,
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

  // Logic to handle "Send Message" from Claim Detail
  const handleContactAboutClaim = (claim: Claim) => {
    // 1. Find the homeowner for this claim to link thread correctly
    // If admin is viewing, use targetHomeowner or find by email. If homeowner viewing, use activeHomeowner.
    let associatedHomeownerId = '';
    if (userRole === UserRole.HOMEOWNER) {
        associatedHomeownerId = activeHomeowner.id;
    } else {
        const h = homeowners.find(h => h.email === claim.homeownerEmail);
        associatedHomeownerId = h ? h.id : (targetHomeowner?.id || '');
    }

    if (!associatedHomeownerId) return;

    // 2. Search for existing thread with exact Subject matching Claim Title
    const existingThread = messages.find(t => 
        t.homeownerId === associatedHomeownerId && t.subject === claim.title
    );

    let threadIdToOpen = '';

    if (existingThread) {
        threadIdToOpen = existingThread.id;
    } else {
        // 3. Create new thread if not found
        threadIdToOpen = `th-${Date.now()}`;
        const sender = userRole === UserRole.ADMIN ? activeEmployee : activeHomeowner;
        
        const newThread: MessageThread = {
          id: threadIdToOpen,
          subject: claim.title,
          homeownerId: associatedHomeownerId,
          participants: [sender.name],
          isRead: true,
          lastMessageAt: new Date(),
          messages: [
            {
              id: `m-sys-${Date.now()}`,
              senderId: sender.id,
              senderName: sender.name,
              senderRole: userRole,
              content: `Started a new conversation regarding claim #${claim.id}: ${claim.title}`,
              timestamp: new Date()
            }
          ]
        };
        setMessages(prev => [newThread, ...prev]);
    }

    // 4. Navigate to Dashboard -> Messages Tab -> Open Thread
    setDashboardConfig({
        initialTab: 'MESSAGES',
        initialThreadId: threadIdToOpen
    });
    setCurrentView('DASHBOARD');
  };

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
      homeowners={availableHomeowners}
      activeHomeowner={activeHomeowner}
      onSwitchHomeowner={handleSwitchHomeowner}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchResults={searchResults}
      onSelectHomeowner={handleSelectHomeowner}
      selectedHomeownerId={selectedAdminHomeownerId}
      onClearSelection={handleClearHomeownerSelection}
      onNavigate={setCurrentView}
      onOpenEnrollment={() => setIsEnrollmentOpen(true)}
    >
      {currentView === 'DASHBOARD' && (
        <Dashboard 
          claims={claims} 
          userRole={userRole} 
          onSelectClaim={handleSelectClaim}
          onNewClaim={handleNewClaimStart}
          homeowners={availableHomeowners}
          activeHomeowner={activeHomeowner}
          employees={employees}
          currentUser={activeEmployee}
          
          targetHomeowner={targetHomeowner}
          onClearHomeownerSelection={handleClearHomeownerSelection}
          onUpdateHomeowner={handleUpdateHomeowner}

          documents={documents}
          onUploadDocument={handleUploadDocument}
          
          messages={messages}
          onSendMessage={handleSendMessage}
          onCreateThread={handleCreateThread}

          builderGroups={builderGroups}

          // Pass props for remote control of dashboard state
          initialTab={dashboardConfig.initialTab}
          initialThreadId={dashboardConfig.initialThreadId}
          
          // Pass tasks and navigation for widget
          tasks={tasks}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onNavigate={setCurrentView}
        />
      )}

      {currentView === 'TASKS' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-surface p-8 rounded-3xl shadow-elevation-1 border border-surface-outline-variant">
            <TaskList 
              tasks={tasks}
              employees={employees}
              currentUser={activeEmployee}
              claims={claims} 
              homeowners={homeowners}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        </div>
      )}

      {(currentView === 'TEAM' || currentView === 'SUBS') && (
        <InternalUserManagement 
          key={currentView} // Force remount to respect initialTab
          employees={employees}
          onAddEmployee={handleAddEmployee}
          onUpdateEmployee={handleUpdateEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          
          contractors={contractors}
          onAddContractor={handleAddContractor}
          onUpdateContractor={handleUpdateContractor}
          onDeleteContractor={handleDeleteContractor}

          onClose={() => setCurrentView('DASHBOARD')}
          initialTab={currentView === 'SUBS' ? 'SUBS' : 'EMPLOYEES'}
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
        <DataImport 
          onImportClaims={handleImportClaims} 
          onImportHomeowners={handleImportHomeowners}
          onClearHomeowners={handleClearHomeowners}
          existingBuilderGroups={builderGroups}
          onImportBuilderGroups={handleImportBuilderGroups}
        />
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
          onSendMessage={handleContactAboutClaim}
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
