
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

// DB Imports
import { db } from './db';
import { claims as claimsTable, homeowners as homeownersTable, builderGroups as builderGroupsTable, users as usersTable } from './db/schema';
import { desc } from 'drizzle-orm';

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

// --- Persistence Helpers ---
const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved, (k, v) => {
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
        return new Date(v);
      }
      return v;
    });
  } catch (e) {
    return fallback;
  }
};

const saveState = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save state to LocalStorage", e);
  }
};

function App() {
  // --- LAZY INITIALIZATION FOR PERSISTENCE ---
  // Initialize state directly from LocalStorage to prevent flash of empty state/logout
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = loadState('cascade_session', null);
    return !!session;
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    const session = loadState<any>('cascade_session', null);
    return session?.role || UserRole.ADMIN;
  });

  const [activeEmployee, setActiveEmployee] = useState<InternalEmployee>(() => {
    const session = loadState<any>('cascade_session', null);
    return (session?.role === UserRole.ADMIN && session.user) ? session.user : MOCK_INTERNAL_EMPLOYEES[0];
  });

  const [activeHomeowner, setActiveHomeowner] = useState<Homeowner>(() => {
    const session = loadState<any>('cascade_session', null);
    return (session?.role === UserRole.HOMEOWNER && session.user) ? session.user : PLACEHOLDER_HOMEOWNER;
  });

  const [currentBuilderId, setCurrentBuilderId] = useState<string | null>(() => {
    const session = loadState<any>('cascade_session', null);
    return (session?.role === UserRole.BUILDER) ? session.builderId : null;
  });

  const [isDbConnected, setIsDbConnected] = useState(false);
  
  // Data State - Lazy Load from LS first, then sync with DB
  const [homeowners, setHomeowners] = useState<Homeowner[]>(() => loadState('cascade_homeowners', MOCK_HOMEOWNERS));
  const [claims, setClaims] = useState<Claim[]>(() => loadState('cascade_claims', MOCK_CLAIMS));
  const [tasks, setTasks] = useState<Task[]>(() => loadState('cascade_tasks', MOCK_TASKS));
  const [documents, setDocuments] = useState<HomeownerDocument[]>(() => loadState('cascade_documents', MOCK_DOCUMENTS));
  const [employees, setEmployees] = useState<InternalEmployee[]>(() => loadState('cascade_employees', MOCK_INTERNAL_EMPLOYEES));
  const [contractors, setContractors] = useState<Contractor[]>(() => loadState('cascade_contractors', MOCK_CONTRACTORS));
  const [messages, setMessages] = useState<MessageThread[]>(() => loadState('cascade_messages', MOCK_THREADS));
  const [builderGroups, setBuilderGroups] = useState<BuilderGroup[]>(() => loadState('cascade_builder_groups', MOCK_BUILDER_GROUPS));
  const [builderUsers, setBuilderUsers] = useState<BuilderUser[]>(() => loadState('cascade_builder_users', MOCK_BUILDER_USERS));

  // --- DATABASE SYNC ---
  useEffect(() => {
    const syncWithDb = async () => {
      try {
        console.log("Initializing App Data from DB...");
        
        // 1. Fetch Homeowners
        const dbHomeowners = await db.select().from(homeownersTable);
        if (dbHomeowners.length > 0) {
           const mappedHomeowners: Homeowner[] = dbHomeowners.map(h => ({
             id: h.id,
             name: h.name,
             firstName: h.firstName || '',
             lastName: h.lastName || '',
             email: h.email,
             phone: h.phone || '',
             buyer2Email: h.buyer2Email || '',
             buyer2Phone: h.buyer2Phone || '',
             street: h.street || '',
             city: h.city || '',
             state: h.state || '',
             zip: h.zip || '',
             address: h.address,
             builder: h.builder || '',
             builderId: h.builderGroupId || undefined,
             jobName: h.jobName || '',
             closingDate: h.closingDate ? new Date(h.closingDate) : new Date(),
             agentName: h.agentName || '',
             agentEmail: h.agentEmail || '',
             agentPhone: h.agentPhone || '',
             enrollmentComments: h.enrollmentComments || '',
             password: h.password || undefined
           }));
           setHomeowners(mappedHomeowners);
           // Also update LocalStorage to keep it fresh with DB truth
           saveState('cascade_homeowners', mappedHomeowners);
        }

        // 2. Fetch Users (Employees & Builders)
        try {
          const dbUsers = await db.select().from(usersTable);
          if (dbUsers.length > 0) {
             const fetchedEmployees: InternalEmployee[] = dbUsers
                .filter(u => u.role === 'ADMIN')
                .map(u => ({
                   id: u.id,
                   name: u.name,
                   email: u.email,
                   role: 'Administrator', // Simplified role mapping
                   password: u.password || undefined
                }));
             
             const fetchedBuilders: BuilderUser[] = dbUsers
                .filter(u => u.role === 'BUILDER')
                .map(u => ({
                   id: u.id,
                   name: u.name,
                   email: u.email,
                   role: UserRole.BUILDER,
                   builderGroupId: u.builderGroupId || '',
                   password: u.password || undefined
                }));

             if (fetchedEmployees.length > 0) {
               setEmployees(fetchedEmployees);
               saveState('cascade_employees', fetchedEmployees);
             }
             if (fetchedBuilders.length > 0) {
               setBuilderUsers(fetchedBuilders);
               saveState('cascade_builder_users', fetchedBuilders);
             }
          }
        } catch (e) {
          console.error("Failed to fetch users", e);
        }

        // 3. Fetch Claims
        const dbClaims = await db.select().from(claimsTable).orderBy(desc(claimsTable.dateSubmitted));
        if (dbClaims.length > 0) {
          const mappedClaims: Claim[] = dbClaims.map(c => ({
             id: c.id,
             title: c.title,
             description: c.description,
             category: c.category || 'General',
             address: c.address || '',
             homeownerName: c.homeownerName || '',
             homeownerEmail: c.homeownerEmail || '',
             builderName: c.builderName || '',
             jobName: c.jobName || '',
             status: c.status as ClaimStatus,
             classification: (c.classification as any) || 'Unclassified',
             dateSubmitted: c.dateSubmitted ? new Date(c.dateSubmitted) : new Date(),
             dateEvaluated: c.dateEvaluated ? new Date(c.dateEvaluated) : undefined,
             internalNotes: c.internalNotes || '',
             nonWarrantyExplanation: c.nonWarrantyExplanation || '',
             contractorId: c.contractorId || undefined,
             contractorName: c.contractorName || '',
             contractorEmail: c.contractorEmail || '',
             proposedDates: c.proposedDates as any[] || [],
             attachments: c.attachments as any[] || [],
             comments: []
          }));
          setClaims(mappedClaims);
          saveState('cascade_claims', mappedClaims);
        }
        
        // 4. Fetch Builder Groups
        const dbBuilderGroups = await db.select().from(builderGroupsTable);
        if (dbBuilderGroups.length > 0) {
           const mappedGroups = dbBuilderGroups.map(bg => ({
             id: bg.id,
             name: bg.name,
             email: bg.email || ''
           }));
           setBuilderGroups(mappedGroups);
           saveState('cascade_builder_groups', mappedGroups);
        }

        console.log("Successfully connected to Neon DB.");
        setIsDbConnected(true);
      } catch (e) {
        console.warn("Neon DB Connection Failed (Using Local Persistence):", e);
        // Do NOT overwrite state with defaults here.
        // We trust the lazy initialization from LocalStorage.
        setIsDbConnected(false);
      }
    };

    syncWithDb();
  }, []); // Run once on mount

  // UI State
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'DETAIL' | 'NEW' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'SUBS'>('DASHBOARD');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminHomeownerId, setSelectedAdminHomeownerId] = useState<string | null>(null);

  const [dashboardConfig, setDashboardConfig] = useState<{
    initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS';
    initialThreadId?: string | null;
  }>({});

  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  const selectedClaim = claims.find(c => c.id === selectedClaimId);
  const targetHomeowner = selectedAdminHomeownerId ? homeowners.find(h => h.id === selectedAdminHomeownerId) || null : null;

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
    let builderId = null;
    if (role === UserRole.ADMIN) {
      setActiveEmployee(user as InternalEmployee);
      setCurrentBuilderId(null);
    } else if (role === UserRole.HOMEOWNER) {
      setActiveHomeowner(user as Homeowner);
      setCurrentBuilderId(null);
    } else if (role === UserRole.BUILDER) {
      const builderUser = user as BuilderUser;
      setCurrentBuilderId(builderUser.builderGroupId);
      builderId = builderUser.builderGroupId;
    }
    setIsAuthenticated(true);
    // Persist Session
    saveState('cascade_session', { user, role, builderId });
  };

  const handleSelectHomeowner = (homeowner: Homeowner) => {
    setSelectedAdminHomeownerId(homeowner.id);
    setSearchQuery('');
    setDashboardConfig({ initialTab: 'CLAIMS', initialThreadId: null });
    setCurrentView('DASHBOARD');
  };

  const handleClearHomeownerSelection = () => {
    setSelectedAdminHomeownerId(null);
  };

  const handleSwitchRole = () => {
    if (userRole === UserRole.ADMIN) {
      setUserRole(UserRole.BUILDER);
      if (builderGroups.length > 0) setCurrentBuilderId(builderGroups[0].id);
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
    // Optimistic UI Update
    setClaims(prev => {
        const updated = prev.map(c => c.id === updatedClaim.id ? updatedClaim : c);
        saveState('cascade_claims', updated);
        return updated;
    });
    // TODO: DB Update (omitted for brevity)
  };

  const handleNewClaimStart = (homeownerId?: string) => {
    if (userRole === UserRole.BUILDER) return;
    setCurrentView('NEW');
  };

  const handleCreateClaim = async (data: Partial<Claim>) => {
    const subjectHomeowner = ((userRole === UserRole.ADMIN || userRole === UserRole.BUILDER) && targetHomeowner) ? targetHomeowner : activeHomeowner;
    if (!subjectHomeowner) return;

    const newClaim: Claim = {
      id: crypto.randomUUID(), // Optimistic ID
      title: data.title || '',
      description: data.description || '',
      category: data.category || 'Other',
      address: subjectHomeowner.address,
      homeownerName: subjectHomeowner.name,
      homeownerEmail: subjectHomeowner.email,
      builderName: subjectHomeowner.builder,
      jobName: subjectHomeowner.jobName,
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
    
    // Optimistic Update & Persistence
    setClaims(prev => {
        const updated = [newClaim, ...prev];
        saveState('cascade_claims', updated);
        return updated;
    });
    setCurrentView('DASHBOARD');

    // DB Insert
    if (isDbConnected) {
      try {
        await db.insert(claimsTable).values({
          homeownerId: subjectHomeowner.id !== 'placeholder' ? subjectHomeowner.id : null,
          title: newClaim.title,
          description: newClaim.description,
          category: newClaim.category,
          address: newClaim.address,
          homeownerName: newClaim.homeownerName,
          homeownerEmail: newClaim.homeownerEmail,
          builderName: newClaim.builderName,
          jobName: newClaim.jobName,
          status: newClaim.status,
          classification: newClaim.classification,
          dateSubmitted: newClaim.dateSubmitted,
          attachments: newClaim.attachments,
          // Add optional fields explicitly
          dateEvaluated: newClaim.dateEvaluated || null,
          nonWarrantyExplanation: newClaim.nonWarrantyExplanation || null,
          internalNotes: newClaim.internalNotes || null,
          contractorId: newClaim.contractorId || null,
          contractorName: newClaim.contractorName || null,
          contractorEmail: newClaim.contractorEmail || null,
          proposedDates: [],
          summary: null
        } as any); // Cast to any to bypass TS schema inference lag
      } catch (e) {
        console.error("Failed to save claim to DB:", e);
      }
    }
  };

  const handleEnrollHomeowner = async (data: Partial<Homeowner>, tradeListFile: File | null) => {
    const newId = crypto.randomUUID(); // Optimistic ID
    const newHomeowner: Homeowner = {
      id: newId,
      name: data.name || 'Unknown',
      email: data.email || '',
      phone: data.phone || '',
      street: data.street || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      address: data.address || '',
      builder: data.builder || '',
      builderId: data.builderId,
      jobName: data.jobName || '',
      closingDate: data.closingDate || new Date(),
      firstName: data.firstName,
      lastName: data.lastName,
      buyer2Email: data.buyer2Email,
      buyer2Phone: data.buyer2Phone,
      agentName: data.agentName,
      agentEmail: data.agentEmail,
      agentPhone: data.agentPhone,
      enrollmentComments: data.enrollmentComments,
      password: data.password
    } as Homeowner;

    // Optimistic Update & Persistence
    setHomeowners(prev => {
        const updated = [...prev, newHomeowner];
        saveState('cascade_homeowners', updated);
        return updated;
    });
    
    if (tradeListFile) {
      handleUploadDocument({
        homeownerId: newId,
        name: tradeListFile.name,
        type: 'PDF',
        uploadedBy: 'Builder (Enrollment)',
        url: '#'
      });
    }

    // DB Insert
    if (isDbConnected) {
      try {
        await db.insert(homeownersTable).values({
          name: newHomeowner.name,
          email: newHomeowner.email,
          phone: newHomeowner.phone || null,
          street: newHomeowner.street,
          city: newHomeowner.city,
          state: newHomeowner.state,
          zip: newHomeowner.zip,
          address: newHomeowner.address,
          builder: newHomeowner.builder || null,
          builderGroupId: newHomeowner.builderId || null,
          jobName: newHomeowner.jobName,
          closingDate: newHomeowner.closingDate,
          firstName: newHomeowner.firstName || null,
          lastName: newHomeowner.lastName || null,
          buyer2Email: newHomeowner.buyer2Email || null,
          buyer2Phone: newHomeowner.buyer2Phone || null,
          agentName: newHomeowner.agentName || null,
          agentEmail: newHomeowner.agentEmail || null,
          agentPhone: newHomeowner.agentPhone || null,
          enrollmentComments: newHomeowner.enrollmentComments || null,
          password: newHomeowner.password || null
        } as any); // Cast to any to bypass TS schema inference lag
      } catch (e) {
        console.error("Failed to save homeowner to DB:", e);
      }
    }
    
    alert(`Successfully enrolled ${newHomeowner.name}!`);
  };

  // Import Handlers with DB Sync and LS persistence
  const handleImportClaims = async (newClaims: Claim[]) => { 
      setClaims(prev => {
          const updated = [...newClaims, ...prev];
          saveState('cascade_claims', updated);
          return updated;
      });
      
      if (isDbConnected) {
          try {
             // Basic batch insert attempt - simplified for prototype
             await db.insert(claimsTable).values(newClaims.map(c => ({
                 title: c.title,
                 description: c.description,
                 category: c.category,
                 status: c.status,
                 address: c.address,
                 homeownerEmail: c.homeownerEmail,
                 dateSubmitted: c.dateSubmitted,
                 // other required fields or defaults
             } as any)));
          } catch(e) { console.error("Batch import claims to DB failed", e); }
      }
  };
  
  const handleImportHomeowners = async (newHomeowners: Homeowner[]) => { 
      setHomeowners(prev => {
          const updated = [...prev, ...newHomeowners];
          saveState('cascade_homeowners', updated);
          return updated;
      });
      
      if (isDbConnected) {
          try {
             await db.insert(homeownersTable).values(newHomeowners.map(h => ({
                 name: h.name,
                 email: h.email,
                 phone: h.phone,
                 address: h.address,
                 street: h.street,
                 city: h.city,
                 state: h.state,
                 zip: h.zip,
                 builder: h.builder,
                 builderGroupId: h.builderId || null,
                 jobName: h.jobName,
                 closingDate: h.closingDate
             } as any)));
          } catch(e) { console.error("Batch import homeowners to DB failed", e); }
      }
  };
  
  const handleImportBuilderGroups = async (newGroups: BuilderGroup[]) => { 
      setBuilderGroups(prev => {
          const updated = [...prev, ...newGroups];
          saveState('cascade_builder_groups', updated);
          return updated;
      });
      
      if (isDbConnected) {
          try {
              await db.insert(builderGroupsTable).values(newGroups.map(g => ({
                  name: g.name,
                  email: g.email
              } as any)));
          } catch(e) { console.error("Batch import groups to DB failed", e); }
      }
  };
  
  const handleClearHomeowners = () => { 
      setHomeowners([]); 
      setSelectedAdminHomeownerId(null); 
      saveState('cascade_homeowners', []);
      // Warning: DB clear not implemented for safety in this snippet
  };
  
  // Handlers for Tasks/Employees/Contractors (LS only for prototype simplicity)
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
    setTasks(prev => {
        const updated = [newTask, ...prev];
        saveState('cascade_tasks', updated);
        return updated;
    });
  };
  const handleToggleTask = (taskId: string) => { 
      setTasks(prev => {
          const updated = prev.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t);
          saveState('cascade_tasks', updated);
          return updated;
      });
  };
  const handleDeleteTask = (taskId: string) => { 
      setTasks(prev => {
          const updated = prev.filter(t => t.id !== taskId);
          saveState('cascade_tasks', updated);
          return updated;
      });
  };
  
  const handleAddEmployee = (emp: InternalEmployee) => { 
      setEmployees(prev => {
          const updated = [...prev, emp];
          saveState('cascade_employees', updated);
          return updated;
      });
  };
  const handleUpdateEmployee = (emp: InternalEmployee) => { 
      setEmployees(prev => {
          const updated = prev.map(e => e.id === emp.id ? emp : e);
          saveState('cascade_employees', updated);
          return updated;
      });
  };
  const handleDeleteEmployee = (id: string) => { 
      setEmployees(prev => {
          const updated = prev.filter(e => e.id !== id);
          saveState('cascade_employees', updated);
          return updated;
      });
  };
  
  const handleAddContractor = (sub: Contractor) => { 
      setContractors(prev => {
          const updated = [...prev, sub];
          saveState('cascade_contractors', updated);
          return updated;
      });
  };
  const handleUpdateContractor = (sub: Contractor) => { 
      setContractors(prev => {
          const updated = prev.map(c => c.id === sub.id ? sub : c);
          saveState('cascade_contractors', updated);
          return updated;
      });
  };
  const handleDeleteContractor = (id: string) => { 
      setContractors(prev => {
          const updated = prev.filter(c => c.id !== id);
          saveState('cascade_contractors', updated);
          return updated;
      });
  };
  
  const handleAddBuilderGroup = (group: BuilderGroup) => { 
      setBuilderGroups(prev => {
          const updated = [...prev, group];
          saveState('cascade_builder_groups', updated);
          return updated;
      });
  };
  const handleUpdateBuilderGroup = (group: BuilderGroup) => { 
      setBuilderGroups(prev => {
          const updated = prev.map(g => g.id === group.id ? group : g);
          saveState('cascade_builder_groups', updated);
          return updated;
      });
  };
  const handleDeleteBuilderGroup = (id: string) => { 
      setBuilderGroups(prev => {
          const updated = prev.filter(g => g.id !== id);
          saveState('cascade_builder_groups', updated);
          return updated;
      });
  };
  
  const handleAddBuilderUser = (user: BuilderUser, password?: string) => { 
      setBuilderUsers(prev => {
          const updated = [...prev, user];
          saveState('cascade_builder_users', updated);
          return updated;
      });
  };
  const handleUpdateBuilderUser = (user: BuilderUser, password?: string) => { 
      setBuilderUsers(prev => {
          const updated = prev.map(u => u.id === user.id ? user : u);
          saveState('cascade_builder_users', updated);
          return updated;
      });
  };
  const handleDeleteBuilderUser = (id: string) => { 
      setBuilderUsers(prev => {
          const updated = prev.filter(u => u.id !== id);
          saveState('cascade_builder_users', updated);
          return updated;
      });
  };
  
  const handleUpdateHomeowner = (updatedHomeowner: Homeowner) => {
    setHomeowners(prev => {
        const updated = prev.map(h => h.id === updatedHomeowner.id ? updatedHomeowner : h);
        saveState('cascade_homeowners', updated);
        return updated;
    });
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
    setDocuments(prev => {
        const updated = [newDoc, ...prev];
        saveState('cascade_documents', updated);
        return updated;
    });
  };
  
  const handleSendMessage = (threadId: string, content: string) => {
    const newMessage: Message = {
      id: `m-${Date.now()}`,
      senderId: userRole === UserRole.ADMIN ? activeEmployee.id : activeHomeowner.id,
      senderName: userRole === UserRole.ADMIN ? activeEmployee.name : activeHomeowner.name,
      senderRole: userRole,
      content,
      timestamp: new Date()
    };
    setMessages(prev => {
        const updated = prev.map(t => t.id === threadId ? { ...t, lastMessageAt: newMessage.timestamp, messages: [...t.messages, newMessage] } : t);
        saveState('cascade_messages', updated);
        return updated;
    });
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
      messages: [{ id: `m-init-${Date.now()}`, senderId: sender.id, senderName: sender.name, senderRole: userRole, content, timestamp: new Date() }]
    };
    setMessages(prev => {
        const updated = [newThread, ...prev];
        saveState('cascade_messages', updated);
        return updated;
    });
  };

  const handleContactAboutClaim = (claim: Claim) => {
    let associatedHomeownerId = '';
    if (userRole === UserRole.HOMEOWNER) {
        associatedHomeownerId = activeHomeowner.id;
    } else {
        const h = homeowners.find(h => h.email === claim.homeownerEmail);
        associatedHomeownerId = h ? h.id : (targetHomeowner?.id || '');
    }
    if (!associatedHomeownerId) return;

    const existingThread = messages.find(t => t.homeownerId === associatedHomeownerId && t.subject === claim.title);
    let threadIdToOpen = '';

    if (existingThread) {
        threadIdToOpen = existingThread.id;
    } else {
        threadIdToOpen = `th-${Date.now()}`;
        const sender = userRole === UserRole.ADMIN ? activeEmployee : activeHomeowner;
        const newThread: MessageThread = {
          id: threadIdToOpen,
          subject: claim.title,
          homeownerId: associatedHomeownerId,
          participants: [sender.name],
          isRead: true,
          lastMessageAt: new Date(),
          messages: [{ id: `m-sys-${Date.now()}`, senderId: sender.id, senderName: sender.name, senderRole: userRole, content: `Started a new conversation regarding claim #${claim.id}: ${claim.title}`, timestamp: new Date() }]
        };
        setMessages(prev => {
            const updated = [newThread, ...prev];
            saveState('cascade_messages', updated);
            return updated;
        });
    }
    setDashboardConfig({ initialTab: 'MESSAGES', initialThreadId: threadIdToOpen });
    setCurrentView('DASHBOARD');
  };

  useEffect(() => { window.scrollTo(0, 0); }, [currentView]);

  if (!isAuthenticated) return <AuthScreen onLoginSuccess={handleLoginSuccess} homeowners={homeowners} employees={employees} builderUsers={builderUsers} />;

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
          initialTab={dashboardConfig.initialTab}
          initialThreadId={dashboardConfig.initialThreadId}
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
            <TaskList tasks={tasks} employees={employees} currentUser={activeEmployee} claims={claims} homeowners={homeowners} onAddTask={handleAddTask} onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask} />
          </div>
        </div>
      )}
      {(currentView === 'TEAM' || currentView === 'SUBS') && (
        <InternalUserManagement 
          key={currentView}
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
        <BuilderManagement builderGroups={builderGroups} builderUsers={builderUsers} onAddGroup={handleAddBuilderGroup} onUpdateGroup={handleUpdateBuilderGroup} onDeleteGroup={handleDeleteBuilderGroup} onAddUser={handleAddBuilderUser} onUpdateUser={handleUpdateBuilderUser} onDeleteUser={handleDeleteBuilderUser} onClose={() => setCurrentView('DASHBOARD')} />
      )}
      {currentView === 'DATA' && (
        <DataImport onImportClaims={handleImportClaims} onImportHomeowners={handleImportHomeowners} onClearHomeowners={handleClearHomeowners} existingBuilderGroups={builderGroups} onImportBuilderGroups={handleImportBuilderGroups} />
      )}
      {currentView === 'NEW' && (
        <div className="max-w-4xl mx-auto bg-surface p-8 rounded-3xl shadow-elevation-1 border border-surface-outline-variant">
          <h2 className="text-2xl font-normal text-surface-on mb-6">Create Warranty Claim</h2>
          <NewClaimForm onSubmit={handleCreateClaim} onCancel={() => setCurrentView('DASHBOARD')} contractors={contractors} activeHomeowner={(userRole === UserRole.ADMIN || userRole === UserRole.BUILDER) && targetHomeowner ? targetHomeowner : activeHomeowner} userRole={userRole} />
        </div>
      )}
      {currentView === 'DETAIL' && selectedClaim && (
        <ClaimDetail claim={selectedClaim} currentUserRole={userRole} onUpdateClaim={handleUpdateClaim} onBack={() => setCurrentView('DASHBOARD')} contractors={contractors} onSendMessage={handleContactAboutClaim} />
      )}
      <HomeownerEnrollment isOpen={isEnrollmentOpen} onClose={() => setIsEnrollmentOpen(false)} onEnroll={handleEnrollHomeowner} builderGroups={builderGroups} />
    </Layout>
  );
}

export default App;
