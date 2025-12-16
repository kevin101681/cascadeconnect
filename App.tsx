
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClaimDetail from './components/ClaimDetail';
import NewClaimForm from './components/NewClaimForm';
import HomeownerEnrollment from './components/HomeownerEnrollment';
import AuthScreenWrapper from './components/AuthScreenWrapper';
import InternalUserManagement from './components/InternalUserManagement';
import BuilderManagement from './components/BuilderManagement';
import DataImport from './components/DataImport';
import TaskList from './components/TaskList';
import MessageSummaryModal, { ClaimMessage } from './components/MessageSummaryModal';
import InvoicesModal from './components/InvoicesModal';
import HomeownersList from './components/HomeownersList';
import EmailHistory from './components/EmailHistory';
import BackendDashboard from './components/BackendDashboard';
import HomeownerSelector from './components/HomeownerSelector';
import { Claim, UserRole, ClaimStatus, Homeowner, Task, HomeownerDocument, InternalEmployee, MessageThread, Message, Contractor, BuilderGroup, BuilderUser } from './types';
import { MOCK_CLAIMS, MOCK_HOMEOWNERS, MOCK_TASKS, MOCK_INTERNAL_EMPLOYEES, MOCK_CONTRACTORS, MOCK_DOCUMENTS, MOCK_THREADS, MOCK_BUILDER_GROUPS, MOCK_BUILDER_USERS, MOCK_CLAIM_MESSAGES } from './constants';
import { sendEmail } from './services/emailService';

// DB Imports
import { db, isDbConfigured } from './db';
import { 
  claims as claimsTable, 
  homeowners as homeownersTable, 
  builderGroups as builderGroupsTable, 
  users as usersTable,
  tasks as tasksTable,
  documents as documentsTable,
  contractors as contractorsTable,
  messageThreads as messageThreadsTable
} from './db/schema';
import { desc, eq } from 'drizzle-orm';

// Better Auth integration
import { authClient } from './lib/auth-client';
import { useNoAuthContext } from './components/NoAuthProvider';

// Better Auth hooks with error handling
const useUser = () => {
  // Try to use Better Auth session, but handle errors gracefully
  let session = null;
  let isPending = true; // Start as pending
  let hasError = false;
  
  try {
    const sessionResult = authClient.useSession();
    if (sessionResult) {
      session = sessionResult.data || null;
      isPending = sessionResult.isPending !== undefined ? sessionResult.isPending : false;
      hasError = !!sessionResult.error;
      
      // Log errors for debugging
      if (sessionResult.error) {
        console.error("Better Auth session error:", sessionResult.error);
      }
    }
  } catch (err) {
    console.error("Better Auth useSession hook error:", err);
    // If hook fails, treat as no session but mark as loaded
    session = null;
    isPending = false;
    hasError = true;
  }
  
  // Map Better Auth session to standard format for compatibility
  return {
    isSignedIn: !!session?.user && !hasError,
    user: session?.user ? {
      id: session.user.id,
      primaryEmailAddress: { emailAddress: session.user.email || '' },
      firstName: session.user.name?.split(' ')[0] || '',
      lastName: session.user.name?.split(' ').slice(1).join(' ') || '',
      fullName: session.user.name || session.user.email || '',
    } : null,
    isLoaded: !isPending,
  };
};

const useAuth = () => {
  return { 
    signOut: async () => {
      try {
        // Sign out from Better Auth
        await authClient.signOut();
        
        // Clear any cached session data
        if (typeof window !== 'undefined') {
          // Clear localStorage items that might cache auth state
          localStorage.removeItem('cascade_user_email');
          localStorage.removeItem('cascade_selected_homeowner');
          
          // Clear all cascade-related localStorage items
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cascade_')) {
              localStorage.removeItem(key);
            }
          });
        }
        
        // Reload to reset app state
        window.location.href = '/';
      } catch (err) {
        console.error("Better Auth signOut error:", err);
        // Even if signOut fails, clear local storage and redirect
        if (typeof window !== 'undefined') {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cascade_')) {
              localStorage.removeItem(key);
            }
          });
          window.location.href = '/';
        }
      }
    }
  };
};

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
      // Simple ISO date regex
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
  // --- BETTER AUTH INTEGRATION ---
  // Use Better Auth hooks with timeout protection
  const [authTimeout, setAuthTimeout] = useState(false);
  const { isSignedIn, user: authUser, isLoaded } = useUser();
  const { signOut } = useAuth();
  
  // Timeout protection: if auth doesn't load within 3 seconds, allow app to proceed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded) {
        console.warn("Auth loading timeout - allowing app to proceed");
        setAuthTimeout(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isLoaded]);
  
  // State for mapped user roles
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [activeEmployee, setActiveEmployee] = useState<InternalEmployee>(MOCK_INTERNAL_EMPLOYEES[0]);
  const [activeHomeowner, setActiveHomeowner] = useState<Homeowner>(PLACEHOLDER_HOMEOWNER);
  const [currentBuilderId, setCurrentBuilderId] = useState<string | null>(null);

  // Data State - Lazy Load from LS first
  // CRITICAL: FORCE_MOCK_DATA should be false in production to preserve data
  // Only set to true temporarily for testing/development
  const FORCE_MOCK_DATA = false; // Set to true ONLY for testing - will overwrite all data!
  
  const [homeowners, setHomeowners] = useState<Homeowner[]>(() => 
    FORCE_MOCK_DATA ? MOCK_HOMEOWNERS : loadState('cascade_homeowners', MOCK_HOMEOWNERS)
  );
  const [claims, setClaims] = useState<Claim[]>(() => 
    FORCE_MOCK_DATA ? MOCK_CLAIMS : loadState('cascade_claims', MOCK_CLAIMS)
  );
  const [tasks, setTasks] = useState<Task[]>(() => 
    FORCE_MOCK_DATA ? MOCK_TASKS : loadState('cascade_tasks', MOCK_TASKS)
  );
  const [documents, setDocuments] = useState<HomeownerDocument[]>(() => 
    FORCE_MOCK_DATA ? MOCK_DOCUMENTS : loadState('cascade_documents', MOCK_DOCUMENTS)
  );
  const [employees, setEmployees] = useState<InternalEmployee[]>(() => 
    FORCE_MOCK_DATA ? MOCK_INTERNAL_EMPLOYEES : loadState('cascade_employees', MOCK_INTERNAL_EMPLOYEES)
  );
  const [contractors, setContractors] = useState<Contractor[]>(() => 
    FORCE_MOCK_DATA ? MOCK_CONTRACTORS : loadState('cascade_contractors', MOCK_CONTRACTORS)
  );
  const [messages, setMessages] = useState<MessageThread[]>(() => 
    FORCE_MOCK_DATA ? MOCK_THREADS : loadState('cascade_messages', MOCK_THREADS)
  );
  const [builderGroups, setBuilderGroups] = useState<BuilderGroup[]>(() => 
    FORCE_MOCK_DATA ? MOCK_BUILDER_GROUPS : loadState('cascade_builder_groups', MOCK_BUILDER_GROUPS)
  );
  const [builderUsers, setBuilderUsers] = useState<BuilderUser[]>(() => 
    FORCE_MOCK_DATA ? MOCK_BUILDER_USERS : loadState('cascade_builder_users', MOCK_BUILDER_USERS)
  );
  const [claimMessages, setClaimMessages] = useState<ClaimMessage[]>(() =>
    FORCE_MOCK_DATA ? MOCK_CLAIM_MESSAGES : loadState('cascade_claim_messages', MOCK_CLAIM_MESSAGES)
  );

  // --- LOAD MOCK DATA ON FIRST MOUNT IF LOCALSTORAGE IS EMPTY ---
  useEffect(() => {
    // Check if localStorage is empty for key data, if so, load mock data
    const hasHomeowners = localStorage.getItem('cascade_homeowners');
    const hasClaims = localStorage.getItem('cascade_claims');
    const hasBuilders = localStorage.getItem('cascade_builder_groups');
    const hasContractors = localStorage.getItem('cascade_contractors');
    
    if (!hasHomeowners && MOCK_HOMEOWNERS.length > 0) {
      setHomeowners(MOCK_HOMEOWNERS);
    }
    if (!hasClaims && MOCK_CLAIMS.length > 0) {
      setClaims(MOCK_CLAIMS);
    }
    if (!hasBuilders && MOCK_BUILDER_GROUPS.length > 0) {
      setBuilderGroups(MOCK_BUILDER_GROUPS);
      setBuilderUsers(MOCK_BUILDER_USERS);
    }
    if (!hasContractors && MOCK_CONTRACTORS.length > 0) {
      setContractors(MOCK_CONTRACTORS);
    }
  }, []); // Only run once on mount

  // --- PERSISTENCE EFFECTS ---
  // Automatically save state to LocalStorage whenever it changes
  useEffect(() => { saveState('cascade_homeowners', homeowners); }, [homeowners]);
  useEffect(() => { saveState('cascade_claims', claims); }, [claims]);
  useEffect(() => { saveState('cascade_tasks', tasks); }, [tasks]);
  useEffect(() => { saveState('cascade_documents', documents); }, [documents]);
  useEffect(() => { saveState('cascade_employees', employees); }, [employees]);
  useEffect(() => { saveState('cascade_contractors', contractors); }, [contractors]);
  useEffect(() => { saveState('cascade_messages', messages); }, [messages]);
  useEffect(() => { saveState('cascade_builder_groups', builderGroups); }, [builderGroups]);
  useEffect(() => { saveState('cascade_builder_users', builderUsers); }, [builderUsers]);

  // --- DATABASE & USER SYNC ---
  useEffect(() => {
    const syncDataAndUser = async () => {
      if (!isLoaded) return;
      
      try {
        console.log("Attempting DB connection...");
        
        let loadedHomeowners = homeowners;
        let loadedEmployees = employees;
        let loadedBuilders = builderUsers;

        if (isDbConfigured) {
             // 1. Fetch Homeowners with retry logic
            let dbHomeowners: any[] = [];
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
              try {
                dbHomeowners = await db.select().from(homeownersTable);
                break; // Success, exit retry loop
              } catch (error) {
                retryCount++;
                console.warn(`Database query attempt ${retryCount} failed:`, error);
                if (retryCount >= maxRetries) {
                  console.error("❌ Failed to fetch homeowners from database after retries");
                  // Don't throw - continue with local storage data
                  break;
                }
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
            }
            
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
              
              // CRITICAL: Merge strategy - Database is source of truth, but preserve any local-only homeowners
              // that might be pending database sync (added in same session before refresh)
              setHomeowners(prev => {
                const dbIds = new Set(mappedHomeowners.map(h => h.id));
                const dbEmails = new Set(mappedHomeowners.map(h => h.email.toLowerCase()));
                
                // Find local-only homeowners that aren't in DB yet
                // Match by both ID and email to catch duplicates
                const localOnly = prev.filter(h => {
                  const notInDbById = !dbIds.has(h.id);
                  const notInDbByEmail = !dbEmails.has(h.email.toLowerCase());
                  // Include if not in DB by ID OR email (to catch cases where ID differs but email matches)
                  return notInDbById && notInDbByEmail;
                });
                
                // Combine: DB data (source of truth) + local-only (pending sync)
                const merged = [...mappedHomeowners, ...localOnly];
                console.log(`✅ Loaded ${mappedHomeowners.length} homeowners from DB, ${localOnly.length} from local storage`);
                return merged;
              });
              loadedHomeowners = mappedHomeowners;
            } else {
              console.log("⚠️ No homeowners found in database");
              
              // RECOVERY: If database is empty but we have local storage data, 
              // attempt to sync local storage data to database (backup recovery)
              const localHomeowners = loadState('cascade_homeowners', []);
              if (localHomeowners.length > 0 && localHomeowners !== MOCK_HOMEOWNERS) {
                console.log(`🔄 Attempting to recover ${localHomeowners.length} homeowners from local storage to database...`);
                
                // Try to sync local storage homeowners to database (one by one to avoid errors)
                let syncedCount = 0;
                for (const localH of localHomeowners) {
                  // Skip mock data and placeholder homeowners
                  if (localH.id === 'placeholder' || localH.id.startsWith('homeowner')) {
                    continue;
                  }
                  
                  try {
                    // Check if already exists in DB
                    const existing = await db.select().from(homeownersTable).where(eq(homeownersTable.id, localH.id));
                    if (existing.length === 0) {
                      // Not in DB, try to insert
                      await db.insert(homeownersTable).values({
                        id: localH.id,
                        name: localH.name,
                        email: localH.email,
                        phone: localH.phone || null,
                        street: localH.street || '',
                        city: localH.city || '',
                        state: localH.state || '',
                        zip: localH.zip || '',
                        address: localH.address,
                        builder: localH.builder || null,
                        builderGroupId: localH.builderId || null,
                        jobName: localH.jobName || '',
                        closingDate: localH.closingDate,
                        firstName: localH.firstName || null,
                        lastName: localH.lastName || null,
                        buyer2Email: localH.buyer2Email || null,
                        buyer2Phone: localH.buyer2Phone || null,
                        agentName: localH.agentName || null,
                        agentEmail: localH.agentEmail || null,
                        agentPhone: localH.agentPhone || null,
                        enrollmentComments: localH.enrollmentComments || null,
                        password: localH.password || null
                      } as any);
                      syncedCount++;
                    }
                  } catch (syncError) {
                    console.warn(`Failed to sync homeowner ${localH.id} to database:`, syncError);
                    // Continue with other homeowners
                  }
                }
                
                if (syncedCount > 0) {
                  console.log(`✅ Recovered ${syncedCount} homeowners from local storage to database`);
                  // Reload from database after sync
                  const recoveredHomeowners = await db.select().from(homeownersTable);
                  if (recoveredHomeowners.length > 0) {
                    const mappedRecovered = recoveredHomeowners.map(h => ({
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
                    setHomeowners(mappedRecovered);
                    loadedHomeowners = mappedRecovered;
                  }
                }
              }
              
              // Keep existing homeowners from state/localStorage as fallback
            }

            // 2. Fetch Users (Employees & Builders)
            const dbUsers = await db.select().from(usersTable);
            if (dbUsers.length > 0) {
                const fetchedEmployees: InternalEmployee[] = dbUsers
                  .filter(u => u.role === 'ADMIN')
                  .map(u => ({
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      role: 'Administrator', // Map generic ADMIN to display role
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
                   loadedEmployees = fetchedEmployees;
                }
                if (fetchedBuilders.length > 0) {
                   setBuilderUsers(fetchedBuilders);
                   loadedBuilders = fetchedBuilders;
                }
            }

            // 3. Fetch Claims
            const dbClaims = await db.select().from(claimsTable).orderBy(desc(claimsTable.dateSubmitted));
            if (dbClaims.length > 0) {
              const mappedClaims: Claim[] = dbClaims.map(c => ({
                id: c.id,
                claimNumber: (c as any).claimNumber || undefined, // Optional field, may not exist in DB
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
            }

            // 5. Fetch Tasks
            const dbTasks = await db.select().from(tasksTable);
            if (dbTasks.length > 0) {
              const mappedTasks: Task[] = dbTasks.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description || '',
                assignedToId: t.assignedToId || '',
                assignedById: t.assignedById || '',
                isCompleted: t.isCompleted || false,
                dateAssigned: t.dateAssigned ? new Date(t.dateAssigned) : new Date(),
                dueDate: t.dueDate ? new Date(t.dueDate) : new Date(),
                relatedClaimIds: t.relatedClaimIds || []
              }));
              setTasks(mappedTasks);
            }

            // 6. Fetch Documents
            const dbDocs = await db.select().from(documentsTable);
            if (dbDocs.length > 0) {
              const mappedDocs: HomeownerDocument[] = dbDocs.map(d => ({
                id: d.id,
                homeownerId: d.homeownerId || '',
                name: d.name,
                url: d.url,
                type: d.type || 'FILE',
                uploadedBy: d.uploadedBy || 'System',
                uploadDate: d.uploadedAt ? new Date(d.uploadedAt) : new Date()
              }));
              setDocuments(mappedDocs);
            }

            // 7. Fetch Contractors
            try {
              const dbContractors = await db.select().from(contractorsTable);
              if (dbContractors.length > 0) {
                const mappedContractors: Contractor[] = dbContractors.map(c => ({
                  id: c.id,
                  companyName: c.companyName,
                  contactName: c.contactName || '',
                  email: c.email,
                  specialty: c.specialty
                }));
                setContractors(mappedContractors);
              }
            } catch (error: any) {
              // Contractors table might not exist yet - that's okay, use local storage
              console.log('Contractors table not found, using local storage:', error.message);
            }

             // 8. Fetch Messages
            try {
              const dbThreads = await db.select().from(messageThreadsTable);
              if (dbThreads.length > 0) {
                const mappedThreads: MessageThread[] = dbThreads.map(t => ({
                  id: t.id,
                  subject: t.subject,
                  homeownerId: t.homeownerId || '',
                  participants: t.participants || [],
                  isRead: t.isRead || false,
                  lastMessageAt: t.lastMessageAt ? new Date(t.lastMessageAt) : new Date(),
                  messages: (t.messages || []).map((m: any) => ({
                      ...m,
                      timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
                  }))
                }));
                setMessages(mappedThreads);
              }
            } catch (error: any) {
              // Message threads table might not exist yet - that's okay, use local storage
              console.log('Message threads table not found, using local storage:', error.message);
            }

            console.log("Successfully synced with Neon DB.");
        } 

        // --- MAP STACK AUTH USER TO INTERNAL USER ---
        if (isSignedIn && authUser) {
           // Stack Auth user is mapped to authUser format in useUser hook
           const email = authUser.primaryEmailAddress?.emailAddress.toLowerCase();
           if (email) {
              // 1. Check Employees
              const emp = loadedEmployees.find(e => e.email.toLowerCase() === email);
              if (emp) {
                 setUserRole(UserRole.ADMIN);
                 setActiveEmployee(emp);
                 return;
              }

              // 2. Check Builders
              const builder = loadedBuilders.find(b => b.email.toLowerCase() === email);
              if (builder) {
                 setUserRole(UserRole.BUILDER);
                 setCurrentBuilderId(builder.builderGroupId);
                 return;
              }

              // 3. Check Homeowners - handle multiple homeowners with same email
              const matchingHomeowners = loadedHomeowners.filter(home => home.email.toLowerCase() === email);
              if (matchingHomeowners.length > 0) {
                 setUserRole(UserRole.HOMEOWNER);
                 
                 // If multiple homeowners with same email, show selector
                 if (matchingHomeowners.length > 1) {
                   // Check if user has previously selected a homeowner for this email
                   const storedHomeownerId = typeof window !== 'undefined' 
                     ? localStorage.getItem(`cascade_selected_homeowner_${email.toLowerCase()}`)
                     : null;
                   
                   const preselected = storedHomeownerId 
                     ? matchingHomeowners.find(h => h.id === storedHomeownerId)
                     : null;
                   
                   if (preselected) {
                     // User has a stored selection, use it
                     setActiveHomeowner(preselected);
                     setSelectedHomeownerId(preselected.id);
                   } else {
                     // Show selector to let user choose
                     setMatchingHomeowners(matchingHomeowners);
                     // Set a temporary placeholder until selection is made
                     setActiveHomeowner(matchingHomeowners[0]);
                   }
                 } else {
                   // Only one homeowner with this email
                   setActiveHomeowner(matchingHomeowners[0]);
                   setSelectedHomeownerId(matchingHomeowners[0].id);
                 }
                 
                 // Store user email for later reference
                 if (typeof window !== 'undefined') {
                   localStorage.setItem('cascade_user_email', email);
                 }
                 
                 return;
              }

              // 4. Default / Fallback (New Homeowner via Social Login)
              // If user logs in via Google/Apple but isn't in DB yet, create temporary homeowner profile context
              const newHomeowner: Homeowner = {
                 ...PLACEHOLDER_HOMEOWNER,
                 id: authUser.id,
                 name: authUser.fullName || 'Homeowner',
                 email: email,
                 firstName: authUser.firstName || '',
                 lastName: authUser.lastName || ''
              };
              setUserRole(UserRole.HOMEOWNER);
              setActiveHomeowner(newHomeowner);
           }
        }

      } catch (e) {
        console.warn("Neon DB Connection Failed (Using Local Persistence):", e);
      }
    };

    syncDataAndUser();
  }, [isLoaded, isSignedIn, authUser?.id]); // Re-run when auth state changes

  // UI State - Persistent (but reset INVOICES on page load to prevent auto-opening)
  // Check URL hash for invoice creation link
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'DETAIL' | 'NEW' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'SUBS' | 'INVOICES' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND'>(() => {
    // Check if URL has invoice creation parameters
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      
      // Parse params from hash (e.g., #invoices?createInvoice=true) or from search
      let urlParams: URLSearchParams;
      if (hash.includes('?')) {
        // Hash contains query params: #invoices?createInvoice=true&...
        const hashParts = hash.split('?');
        urlParams = new URLSearchParams(hashParts[1] || '');
      } else {
        // Use regular search params
        urlParams = new URLSearchParams(search);
      }
      
      // Check for invoice creation
      if (hash.includes('#invoices') || urlParams.get('createInvoice') === 'true') {
        // Store pre-fill data in sessionStorage for CBS Books to pick up
        const prefillData = {
          clientName: urlParams.get('clientName') || '',
          clientEmail: urlParams.get('clientEmail') || '',
          projectDetails: urlParams.get('projectDetails') || '',
          homeownerId: urlParams.get('homeownerId') || ''
        };
        
        if (prefillData.clientName) {
          sessionStorage.setItem('invoicePrefill', JSON.stringify(prefillData));
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
          return 'INVOICES';
        }
      }
    }
    const saved = loadState<'DASHBOARD' | 'DETAIL' | 'NEW' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'SUBS' | 'INVOICES' | 'HOMEOWNERS' | 'EMAIL_HISTORY'>('cascade_ui_view', 'DASHBOARD');
    // Don't auto-open modals on page load - always start at DASHBOARD
    return saved === 'INVOICES' ? 'DASHBOARD' : saved;
  });
  
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(() => 
    loadState('cascade_ui_claim_id', null)
  );
  
  const [selectedAdminHomeownerId, setSelectedAdminHomeownerId] = useState<string | null>(() => 
    loadState('cascade_ui_homeowner_id', null)
  );
  
  // State for handling multiple homeowners with same email
  const [matchingHomeowners, setMatchingHomeowners] = useState<Homeowner[] | null>(null);
  const [selectedHomeownerId, setSelectedHomeownerId] = useState<string | null>(() => {
    // Load the selected homeowner ID for the current user's email from localStorage
    if (typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('cascade_user_email');
      if (userEmail) {
        const stored = localStorage.getItem(`cascade_selected_homeowner_${userEmail.toLowerCase()}`);
        return stored || null;
      }
    }
    return null;
  });

  const [searchQuery, setSearchQuery] = useState('');

  const [dashboardConfig, setDashboardConfig] = useState<{
    initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS';
    initialThreadId?: string | null;
  }>({});

  // --- UI PERSISTENCE EFFECTS ---
  useEffect(() => { saveState('cascade_ui_view', currentView); }, [currentView]);
  useEffect(() => { saveState('cascade_ui_claim_id', selectedClaimId); }, [selectedClaimId]);
  useEffect(() => { saveState('cascade_ui_homeowner_id', selectedAdminHomeownerId); }, [selectedAdminHomeownerId]);

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

  const handleSelectHomeowner = (homeowner: Homeowner) => {
    setSelectedAdminHomeownerId(homeowner.id);
    setSearchQuery('');
    setDashboardConfig({ initialTab: 'CLAIMS', initialThreadId: null });
    setCurrentView('DASHBOARD');
  };

  const handleClearHomeownerSelection = () => {
    setSelectedAdminHomeownerId(null);
  };

  const handleSwitchRole = async () => {
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
      
      // Save selection for users with multiple properties (same email)
      if (typeof window !== 'undefined' && authUser?.primaryEmailAddress?.emailAddress) {
        const email = authUser.primaryEmailAddress.emailAddress.toLowerCase();
        localStorage.setItem(`cascade_selected_homeowner_${email}`, id);
      }
    }
  };

  const [claimEditMode, setClaimEditMode] = useState(false);
  
  const handleSelectClaim = (claim: Claim, startInEditMode: boolean = true) => {
    setSelectedClaimId(claim.id);
    setClaimEditMode(startInEditMode);
    setCurrentView('DETAIL');
  };

  // Helper function to track claim-related messages
  const trackClaimMessage = (claimId: string, messageData: {
    type: 'HOMEOWNER' | 'SUBCONTRACTOR';
    threadId?: string;
    subject: string;
    recipient: string;
    recipientEmail: string;
    content: string;
    senderName: string;
  }) => {
    const newClaimMessage: ClaimMessage = {
      id: crypto.randomUUID(),
      claimId,
      ...messageData,
      timestamp: new Date()
    };
    
    setClaimMessages(prev => {
      const updated = [...prev, newClaimMessage];
      saveState('cascade_claim_messages', updated);
      return updated;
    });
  };

  // Helper function to add an internal note to a claim
  const addInternalNoteToClaim = async (claimId: string, noteText: string, userName: string = activeEmployee.name) => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const timestamp = `${dateStr} at ${timeStr} by ${userName}`;
    const noteWithTimestamp = `[${timestamp}] ${noteText}`;
    
    const currentNotes = claim.internalNotes || '';
    const updatedNotes = currentNotes 
      ? `${currentNotes}\n\n${noteWithTimestamp}`
      : noteWithTimestamp;
    
    await handleUpdateClaim({
      ...claim,
      internalNotes: updatedNotes
    });
  };

  const handleUpdateClaim = async (updatedClaim: Claim) => {
    setClaims(prev => prev.map(c => c.id === updatedClaim.id ? updatedClaim : c));

    if (isDbConfigured) {
      try {
        await db.update(claimsTable).set({
          title: updatedClaim.title,
          description: updatedClaim.description,
          status: updatedClaim.status as any,
          classification: updatedClaim.classification,
          dateEvaluated: updatedClaim.dateEvaluated || null,
          internalNotes: updatedClaim.internalNotes || null,
          nonWarrantyExplanation: updatedClaim.nonWarrantyExplanation || null,
          contractorId: updatedClaim.contractorId || null,
          contractorName: updatedClaim.contractorName || null,
          contractorEmail: updatedClaim.contractorEmail || null,
          proposedDates: updatedClaim.proposedDates,
        } as any).where(eq(claimsTable.id, updatedClaim.id));
      } catch (e) {
        console.error("Failed to update claim in DB:", e);
      }
    }
  };

  const handleNewClaimStart = (homeownerId?: string) => {
    if (userRole === UserRole.BUILDER) return;
    setCurrentView('NEW');
  };

  const handleCreateClaim = async (data: Partial<Claim>) => {
    const subjectHomeowner = ((userRole === UserRole.ADMIN || userRole === UserRole.BUILDER) && targetHomeowner) ? targetHomeowner : activeHomeowner;
    if (!subjectHomeowner) return;

    // Generate a readable claim number (CLM-YYYY-NNN format)
    const year = new Date().getFullYear();
    const existingClaimsThisYear = claims.filter(c => {
      if (!c.claimNumber) return false;
      return c.claimNumber.startsWith(`CLM-${year}-`);
    });
    // Find the highest number for this year
    let maxNumber = 0;
    existingClaimsThisYear.forEach(c => {
      if (c.claimNumber) {
        const match = c.claimNumber.match(/CLM-\d{4}-(\d{3})/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      }
    });
    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    const claimNumber = `CLM-${year}-${nextNumber}`;

    const newClaim: Claim = {
      id: crypto.randomUUID(),
      claimNumber: claimNumber,
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
    
    // Update State (useEffect handles persistence)
    setClaims(prev => [newClaim, ...prev]);
    setCurrentView('DASHBOARD');

    // DB Insert
    if (isDbConfigured) {
      try {
        // Validate homeownerId is a valid UUID
        const isValidUUID = (str: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(str);
        };
        const dbHomeownerId = (subjectHomeowner.id && isValidUUID(subjectHomeowner.id)) ? subjectHomeowner.id : null;
        
        const result = await db.insert(claimsTable).values({
          id: newClaim.id, // Explicit ID
          homeownerId: dbHomeownerId, // Use validated UUID or null
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
          dateEvaluated: newClaim.dateEvaluated || null,
          nonWarrantyExplanation: newClaim.nonWarrantyExplanation || null,
          internalNotes: newClaim.internalNotes || null,
          contractorId: newClaim.contractorId || null,
          contractorName: newClaim.contractorName || null,
          contractorEmail: newClaim.contractorEmail || null,
          proposedDates: [],
          summary: null
        } as any);
        console.log("✅ Claim saved to Neon database:", newClaim.id);
      } catch (e) {
        console.error("❌ Failed to save claim to DB:", e);
        // Show user-friendly error
        alert("Warning: Claim saved locally but failed to sync to database. Please check your connection.");
      }
    } else if (isDbConfigured && !db) {
      console.warn("⚠️ Database configured but connection failed. Data saved to localStorage only.");
    }
  };

  const handleEnrollHomeowner = async (data: Partial<Homeowner>, tradeListFile: File | null, subcontractorList?: any[]) => {
    const newId = crypto.randomUUID();
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
      password: data.password,
      subcontractorList: subcontractorList
    } as Homeowner;

    // DUAL-WRITE STRATEGY: Save to both database AND localStorage for redundancy
    // This ensures data is never lost even if database fails
    
    // Step 1: Create punch list report with pre-filled data
    const createPunchListReport = (homeowner: Homeowner) => {
      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
      };

      const PREDEFINED_LOCATIONS = [
        "General Interior", "Master Bathroom", "Master Bedroom", "Kitchen", "Living Room",
        "Dining Room", "Garage", "Exterior", "Basement", "Attic", "Rewalk Notes"
      ];

      const project: any = {
        fields: [
          { id: generateUUID(), label: 'Name(s)', value: homeowner.name, icon: 'User' },
          { id: generateUUID(), label: 'Project Lot/Unit Number', value: homeowner.jobName || '', icon: 'Hash' },
          { id: generateUUID(), label: 'Address', value: homeowner.address, icon: 'MapPin' },
          { id: generateUUID(), label: 'Phone Number', value: homeowner.phone || '', icon: 'Phone' },
          { id: generateUUID(), label: 'Email Address', value: homeowner.email, icon: 'Mail' }
        ]
      };

      const locations = PREDEFINED_LOCATIONS.map(name => ({
        id: generateUUID(),
        name,
        issues: []
      }));

      const reportData = {
        project,
        locations,
        lastModified: Date.now()
      };

      // Save report to localStorage with homeowner ID as key
      const reportKey = `bluetag_report_${homeowner.id}`;
      localStorage.setItem(reportKey, JSON.stringify(reportData));
      console.log('✅ Punch list report created for homeowner:', homeowner.id);
    };

    // Create punch list report
    createPunchListReport(newHomeowner);

    // Step 2: Save to localStorage FIRST (fast, always available)
    setHomeowners(prev => {
      const updated = [...prev, newHomeowner];
      // Force immediate localStorage save
      saveState('cascade_homeowners', updated);
      return updated;
    });
    
    // Step 2: Save to database with retry logic
    let dbInsertSuccess = false;
    if (isDbConfigured) {
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !dbInsertSuccess) {
        try {
          // Build homeowner data object - exclude report_app fields for now
          // These columns may not exist in the database yet
          const homeownerData: any = {
            id: newId, // Explicit ID
            name: newHomeowner.name,
            email: newHomeowner.email,
            phone: newHomeowner.phone || null,
            street: newHomeowner.street || '',
            city: newHomeowner.city || '',
            state: newHomeowner.state || '',
            zip: newHomeowner.zip || '',
            address: newHomeowner.address,
            builder: newHomeowner.builder || null,
            builderGroupId: newHomeowner.builderId || null,
            jobName: newHomeowner.jobName || '',
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
            // Note: report_app_user_id, report_app_linked, report_app_linked_at
            // are excluded here to avoid errors if columns don't exist
            // They can be added via UPDATE after the row is created if needed
          };
          
          await db.insert(homeownersTable).values(homeownerData);
          
          // Step 3: VERIFY the insert by querying the database
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for DB consistency
          const verification = await db.select().from(homeownersTable).where(eq(homeownersTable.id, newId));
          
          if (verification.length > 0) {
            dbInsertSuccess = true;
            console.log("✅ Homeowner saved and verified in database:", newId);
          } else {
            throw new Error("Insert verification failed - homeowner not found in database");
          }
        } catch (e) {
          retryCount++;
          const errorMessage = e instanceof Error ? e.message : String(e);
          const errorDetails = e instanceof Error ? e.stack : JSON.stringify(e);
          console.error(`❌ Failed to save homeowner to DB (attempt ${retryCount}/${maxRetries}):`, errorMessage);
          console.error("Error details:", errorDetails);
          
          if (retryCount >= maxRetries) {
            console.error("❌ CRITICAL: Failed to save homeowner to database after retries");
            // Check if we can access the connection string from the environment
            const envCheck = typeof window !== 'undefined' 
              ? (import.meta as any).env?.VITE_DATABASE_URL 
              : undefined;
            
            console.error("Database configuration check:", {
              isDbConfigured,
              hasViteEnvVar: !!envCheck,
              envVarLength: envCheck?.length || 0,
              environment: typeof window !== 'undefined' ? 'browser' : 'server',
              errorType: e instanceof Error ? e.constructor.name : typeof e
            });
            
            // Show detailed error message
            const userMessage = `Warning: Homeowner saved locally but database sync failed.\n\n` +
              `Error: ${errorMessage}\n\n` +
              `Data is safe in browser storage.\n\n` +
              `Please check:\n` +
              `1. VITE_DATABASE_URL is set in Netlify environment variables\n` +
              `2. Database connection string is correct\n` +
              `3. Browser console for detailed error logs`;
            alert(userMessage);
            // Don't return - allow app to continue with localStorage data
          } else {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
    } else {
      // If DB not configured, localStorage is the only storage
      dbInsertSuccess = true;
      console.log("⚠️ Database not configured - homeowner saved to localStorage only");
    }
    
    // Send email notification to administrator
    try {
      // Find administrator email - check multiple sources
      // PRIORITIZE: Database query first (most reliable), then activeEmployee, then employees array
      let adminEmail: string | undefined;
      
      // Mock email addresses to exclude
      const mockEmails = ['admin@cascade.com', 'admin@example.com', 'test@example.com'];
      const isMockEmail = (email: string) => mockEmails.some(mock => email.toLowerCase() === mock.toLowerCase());
      
      console.log('🔍 Starting admin email lookup...');
      console.log('   isDbConfigured:', isDbConfigured);
      console.log('   userRole:', userRole);
      console.log('   activeEmployee:', activeEmployee ? { name: activeEmployee.name, email: activeEmployee.email, role: activeEmployee.role } : 'none');
      console.log('   employees count:', employees.length);
      console.log('   employees:', employees.map(e => ({ name: e.name, email: e.email, role: e.role })));
      
      // 1. Query database directly for ADMIN role users FIRST (most reliable source)
      if (isDbConfigured) {
        try {
          console.log('🔍 Querying database for ADMIN users...');
          const dbAdmins = await db.select().from(usersTable).where(eq(usersTable.role, 'ADMIN'));
          console.log('   Found', dbAdmins.length, 'admin users in database');
          console.log('   Database admins:', dbAdmins.map(a => ({ id: a.id, email: a.email, role: a.role })));
          
          if (dbAdmins.length > 0) {
            // Filter out mock emails and use first real admin
            const realAdmin = dbAdmins.find(admin => !isMockEmail(admin.email));
            if (realAdmin) {
              adminEmail = realAdmin.email;
              console.log('✅ 📧 Found admin email from database:', adminEmail);
            } else {
              // If all are mock, DON'T use them - continue to next source
              console.warn('⚠️ All database admins are mock emails, skipping database result');
              console.warn('   Mock admins found:', dbAdmins.map(a => a.email));
            }
          } else {
            console.log('   No admin users found in database');
          }
        } catch (dbError) {
          console.warn('❌ Could not query database for admin email:', dbError);
        }
      } else {
        console.log('   Database not configured, skipping database query');
      }
      
      // 2. Use activeEmployee if user is logged in as admin (and not a mock email)
      if (!adminEmail && userRole === UserRole.ADMIN && activeEmployee?.email) {
        console.log('🔍 Checking activeEmployee...');
        console.log('   activeEmployee.email:', activeEmployee.email);
        console.log('   isMockEmail:', isMockEmail(activeEmployee.email));
        if (!isMockEmail(activeEmployee.email)) {
          adminEmail = activeEmployee.email;
          console.log('✅ 📧 Using active employee email:', adminEmail);
        } else {
          console.warn('⚠️ Active employee email is a mock email, skipping');
        }
      }
      
      // 3. Check employees array for any admin-like role (case-insensitive), excluding mock emails
      if (!adminEmail && employees.length > 0) {
        console.log('🔍 Checking employees array for admin...');
        const adminEmployee = employees.find(e => {
          if (isMockEmail(e.email || '')) {
            console.log('   Skipping mock email:', e.email);
            return false;
          }
          const roleLower = (e.role || '').toLowerCase();
          const isAdmin = roleLower.includes('admin') || roleLower === 'administrator' || e.role === 'ADMIN';
          if (isAdmin) {
            console.log('   Found admin employee:', { name: e.name, email: e.email, role: e.role });
          }
          return isAdmin;
        });
        if (adminEmployee?.email) {
          adminEmail = adminEmployee.email;
          console.log('✅ 📧 Found admin email from employees array:', adminEmail);
        } else {
          console.log('   No admin found in employees array');
        }
      }
      
      // 4. Fallback to first employee if available (excluding mock emails)
      if (!adminEmail && employees.length > 0) {
        console.log('🔍 Using fallback: checking for any real employee...');
        const realEmployee = employees.find(e => e.email && !isMockEmail(e.email));
        if (realEmployee?.email) {
          adminEmail = realEmployee.email;
          console.warn('⚠️ No admin found, using first real employee email:', adminEmail);
        } else {
          console.warn('⚠️ No real employees found (all are mock emails)');
        }
      }
      
      if (!adminEmail) {
        console.error('❌ No valid admin email found after checking all sources!');
      }
      
      if (adminEmail) {
        // Create invoice link with pre-filled data
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : 'https://cascadeconnect.netlify.app';
        const invoiceParams = new URLSearchParams({
          createInvoice: 'true',
          clientName: newHomeowner.name,
          clientEmail: newHomeowner.email || '',
          projectDetails: `${newHomeowner.jobName || ''} - ${newHomeowner.address || ''}`.trim() || newHomeowner.address || '',
          homeownerId: newHomeowner.id
        });
        const createInvoiceLink = `${baseUrl}/#invoices?${invoiceParams.toString()}`;

        const emailBody = `
New Homeowner Enrollment

A new homeowner has been enrolled in Cascade Connect:

Name: ${newHomeowner.name}
Email: ${newHomeowner.email}
Phone: ${newHomeowner.phone || 'Not provided'}
Address: ${newHomeowner.address}
Builder: ${newHomeowner.builder || 'Not specified'}
Job Name: ${newHomeowner.jobName || 'Not specified'}
Closing Date: ${newHomeowner.closingDate ? new Date(newHomeowner.closingDate).toLocaleDateString() : 'Not provided'}

${newHomeowner.enrollmentComments ? `Comments: ${newHomeowner.enrollmentComments}` : ''}

---
<div style="margin: 20px 0;">
  <a href="${createInvoiceLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">Create Invoice</a>
</div>

You can view and manage this homeowner in the Cascade Connect dashboard.
        `.trim();

        console.log('📧 Sending enrollment notification email to:', adminEmail);
        const emailResult = await sendEmail({
          to: adminEmail,
          subject: `New Homeowner Enrollment: ${newHomeowner.name}`,
          body: emailBody,
          fromName: 'Cascade Connect System',
          fromRole: UserRole.ADMIN
        });
        
        if (emailResult) {
          console.log('✅ Enrollment notification email sent successfully to:', adminEmail);
        } else {
          console.warn('⚠️ Email service returned false - email may not have been sent');
        }
      } else {
        console.warn('⚠️ No administrator email found - enrollment notification not sent');
        console.warn('   Available employees:', employees.map(e => ({ name: e.name, email: e.email, role: e.role })));
        console.warn('   Active employee:', activeEmployee ? { name: activeEmployee.name, email: activeEmployee.email, role: activeEmployee.role } : 'none');
        console.warn('   User role:', userRole);
      }
    } catch (error) {
      console.error('❌ Failed to send enrollment notification email:', error);
      console.error('   Error details:', error instanceof Error ? error.message : String(error));
      console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');
      // Don't block enrollment if email fails
    }
    
    let fileUrl = '#';
    if (tradeListFile) {
        // Convert to Base64 to persist file data to DB since no backend upload service
        const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
        
        try {
            fileUrl = await toBase64(tradeListFile);
        } catch (e) {
            console.error("Error converting file", e);
        }

        handleUploadDocument({
            homeownerId: newId,
            name: tradeListFile.name,
            type: 'PDF',
            uploadedBy: 'Builder (Enrollment)',
            url: fileUrl
        });
    }
    
    alert(`Successfully enrolled ${newHomeowner.name}!`);
  };

  // Import Handlers with DB Sync and LS persistence via Effects
  const handleImportClaims = async (newClaims: Claim[]) => { 
      setClaims(prev => [...newClaims, ...prev]);
      
      if (isDbConfigured) {
          try {
             // Reduced Batch Insert to prevent "value too large" DB errors
             // Also added a fallback to single insert
             const BATCH_SIZE = 10;
             for (let i = 0; i < newClaims.length; i += BATCH_SIZE) {
               const batch = newClaims.slice(i, i + BATCH_SIZE);
               try {
                  await db.insert(claimsTable).values(batch.map(c => ({
                      id: c.id, // Explicit ID
                      title: c.title,
                      description: c.description,
                      category: c.category,
                      status: c.status,
                      address: c.address,
                      homeownerEmail: c.homeownerEmail,
                      dateSubmitted: c.dateSubmitted,
                  } as any)));
               } catch (batchErr) {
                   console.warn("Batch failed, trying sequential insert...", batchErr);
                   // Fallback: One by one
                   for (const c of batch) {
                       await db.insert(claimsTable).values({
                           id: c.id,
                           title: c.title,
                           description: c.description,
                           category: c.category,
                           status: c.status,
                           address: c.address,
                           homeownerEmail: c.homeownerEmail,
                           dateSubmitted: c.dateSubmitted,
                       } as any);
                   }
               }
             }
          } catch(e) { 
              console.error("Critical: Claims DB Import Failed", e);
              alert("Database Error: Could not save claims to the backend. Please check your network connection or database schema.");
              // Don't throw - allow app to continue with local storage
          }
      }
  };
  
  const handleImportHomeowners = async (newHomeowners: Homeowner[]) => {
      // DUAL-WRITE STRATEGY: Save to localStorage FIRST, then database
      // Step 1: Update state and localStorage immediately
      setHomeowners(prev => {
        const updated = [...prev, ...newHomeowners];
        // Force immediate localStorage save
        saveState('cascade_homeowners', updated);
        return updated;
      });
      
      // Step 2: Save to database with retry logic
      if (isDbConfigured) {
        let successCount = 0;
        let failCount = 0;
        
        // Process one by one with retry logic for maximum reliability
        for (const h of newHomeowners) {
          let retryCount = 0;
          const maxRetries = 3;
          let inserted = false;
          
          while (retryCount < maxRetries && !inserted) {
            try {
              // Check if already exists
              const existing = await db.select().from(homeownersTable).where(eq(homeownersTable.id, h.id));
              if (existing.length > 0) {
                // Already exists, skip
                inserted = true;
                successCount++;
                continue;
              }
              
              // Insert new homeowner
              await db.insert(homeownersTable).values({
                id: h.id,
                name: h.name,
                email: h.email,
                phone: h.phone || null,
                street: h.street || '',
                city: h.city || '',
                state: h.state || '',
                zip: h.zip || '',
                address: h.address,
                builder: h.builder || null,
                builderGroupId: h.builderId || null,
                jobName: h.jobName || '',
                closingDate: h.closingDate,
                firstName: h.firstName || null,
                lastName: h.lastName || null,
                buyer2Email: h.buyer2Email || null,
                buyer2Phone: h.buyer2Phone || null,
                agentName: h.agentName || null,
                agentEmail: h.agentEmail || null,
                agentPhone: h.agentPhone || null,
                enrollmentComments: h.enrollmentComments || null,
                password: h.password || null
              } as any);
              
              // Verify insert
              await new Promise(resolve => setTimeout(resolve, 100));
              const verification = await db.select().from(homeownersTable).where(eq(homeownersTable.id, h.id));
              if (verification.length > 0) {
                inserted = true;
                successCount++;
              } else {
                throw new Error("Verification failed");
              }
            } catch (e) {
              retryCount++;
              if (retryCount >= maxRetries) {
                console.error(`❌ Failed to import homeowner ${h.id} after ${maxRetries} retries:`, e);
                failCount++;
              } else {
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
            }
          }
        }
        
        if (failCount > 0) {
          alert(`Import completed: ${successCount} saved to database, ${failCount} failed (saved to local storage).`);
        } else {
          console.log(`✅ Successfully imported ${successCount} homeowners to database`);
        }
      } else {
        console.log("⚠️ Database not configured - homeowners saved to localStorage only");
      }
  };
  
  const handleImportBuilderGroups = async (newGroups: BuilderGroup[]) => { 
      setBuilderGroups(prev => [...prev, ...newGroups]);
      
      if (isDbConfigured) {
          try {
              const BATCH_SIZE = 10;
              for (let i = 0; i < newGroups.length; i += BATCH_SIZE) {
                  const batch = newGroups.slice(i, i + BATCH_SIZE);
                  await db.insert(builderGroupsTable).values(batch.map(g => ({
                      id: g.id, // Explicit ID
                      name: g.name,
                      email: g.email
                  } as any)));
              }
          } catch(e) { 
              console.error("Batch import groups to DB failed", e); 
              // Don't throw - allow app to continue with local storage
          }
      }
  };
  
  const handleImportTasks = async (newTasks: Task[]) => {
    setTasks(prev => [...prev, ...newTasks]);
    
    if (isDbConfigured) {
      try {
        const BATCH_SIZE = 10;
        for (let i = 0; i < newTasks.length; i += BATCH_SIZE) {
          const batch = newTasks.slice(i, i + BATCH_SIZE);
          await db.insert(tasksTable).values(batch.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            assignedToId: t.assignedToId,
            assignedById: t.assignedById,
            isCompleted: t.isCompleted,
            dateAssigned: t.dateAssigned,
            dueDate: t.dueDate,
            relatedClaimIds: t.relatedClaimIds || []
          } as any)));
        }
      } catch(e) {
        console.error("Batch import tasks to DB failed", e);
      }
    }
  };

  const handleImportMessages = async (newThreads: MessageThread[]) => {
    setMessages(prev => [...prev, ...newThreads]);
    
    if (isDbConfigured) {
      try {
        const BATCH_SIZE = 10;
        for (let i = 0; i < newThreads.length; i += BATCH_SIZE) {
          const batch = newThreads.slice(i, i + BATCH_SIZE);
          await db.insert(messageThreadsTable).values(batch.map(t => ({
            id: t.id,
            subject: t.subject,
            homeownerId: t.homeownerId,
            participants: t.participants,
            lastMessageAt: t.lastMessageAt,
            isRead: t.isRead,
            messages: t.messages
          } as any)));
        }
      } catch(e) {
        console.error("Batch import messages to DB failed", e);
      }
    }
  };

  const handleImportBuilderUsers = async (newUsers: BuilderUser[], passwords: Map<string, string>) => {
    setBuilderUsers(prev => [...prev, ...newUsers]);
    
    if (isDbConfigured) {
      try {
        const BATCH_SIZE = 10;
        for (let i = 0; i < newUsers.length; i += BATCH_SIZE) {
          const batch = newUsers.slice(i, i + BATCH_SIZE);
          await db.insert(usersTable).values(batch.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: 'BUILDER',
            builderGroupId: u.builderGroupId,
            password: passwords.get(u.id) || ''
          } as any)));
        }
      } catch(e) {
        console.error("Batch import builder users to DB failed", e);
      }
    }
  };

  const handleClearHomeowners = async () => { 
      setHomeowners([]); 
      setSelectedAdminHomeownerId(null); 
      if (isDbConfigured) {
         try {
           await db.delete(homeownersTable);
         } catch (e) {
           console.error("Failed to clear homeowners from DB", e);
         }
      }
  };

  const handleDeleteHomeowner = async (id: string) => {
    // Get homeowner before deletion for cleanup
    const homeownerToDelete = homeowners.find(h => h.id === id);
    
    // Remove from state
    setHomeowners(prev => prev.filter(h => h.id !== id));
    
    // Also remove related claims, documents, and messages from state
    if (homeownerToDelete) {
      setClaims(prev => prev.filter(c => c.homeownerEmail !== homeownerToDelete.email));
    }
    setDocuments(prev => prev.filter(d => d.homeownerId !== id));
    setMessages(prev => prev.filter(m => m.homeownerId !== id));
    
    // Clear selection if this homeowner was selected
    if (selectedAdminHomeownerId === id) {
      setSelectedAdminHomeownerId(null);
    }
    if (activeHomeowner.id === id) {
      setActiveHomeowner(PLACEHOLDER_HOMEOWNER);
    }
    
    // Delete from database (cascade deletes should handle related records)
    if (isDbConfigured) {
      try {
        // Delete related records first (if foreign keys don't cascade)
        if (homeownerToDelete) {
          // Delete related claims
          try {
            await db.delete(claimsTable).where(eq(claimsTable.homeownerId, id));
          } catch (e) {
            console.warn("Failed to delete related claims:", e);
          }
          
          // Delete related documents
          try {
            await db.delete(documentsTable).where(eq(documentsTable.homeownerId, id));
          } catch (e) {
            console.warn("Failed to delete related documents:", e);
          }
          
          // Delete related message threads
          try {
            await db.delete(messageThreadsTable).where(eq(messageThreadsTable.homeownerId, id));
          } catch (e) {
            console.warn("Failed to delete related messages:", e);
          }
        }
        
        // Delete homeowner
        await db.delete(homeownersTable).where(eq(homeownersTable.id, id));
        console.log("✅ Homeowner and related data deleted from database");
      } catch (e) {
        console.error("Failed to delete homeowner from DB:", e);
      }
    }
  };
  
  // Handlers for Tasks/Employees/Contractors
  const handleAddTask = async (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
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

    if (isDbConfigured) {
      try {
        await db.insert(tasksTable).values({
          id: newTask.id,
          title: newTask.title,
          description: newTask.description,
          assignedToId: newTask.assignedToId,
          assignedById: newTask.assignedById,
          isCompleted: newTask.isCompleted,
          dateAssigned: newTask.dateAssigned,
          dueDate: newTask.dueDate,
          relatedClaimIds: newTask.relatedClaimIds
        } as any);
      } catch (e) {
        console.error("Failed to save task to DB", e);
      }
    }
  };
  
  const handleToggleTask = async (taskId: string) => { 
      const task = tasks.find(t => t.id === taskId);
      const newStatus = !task?.isCompleted;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: newStatus } : t));

      if (isDbConfigured) {
         try {
           await db.update(tasksTable).set({ isCompleted: newStatus } as any).where(eq(tasksTable.id, taskId));
         } catch(e) { console.error(e); }
      }
  };
  
  const handleDeleteTask = async (taskId: string) => { 
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (isDbConfigured) {
         try {
           await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
         } catch(e) { console.error(e); }
      }
  };
  
  const handleAddEmployee = async (emp: InternalEmployee) => { 
      setEmployees(prev => [...prev, emp]); 
      if (isDbConfigured) {
         try {
           await db.insert(usersTable).values({
             id: emp.id,
             name: emp.name,
             email: emp.email,
             role: 'ADMIN',
             password: emp.password
           } as any);
         } catch(e) { console.error(e); }
      }
  };

  const handleUpdateEmployee = async (emp: InternalEmployee) => { 
      setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e)); 
      if (isDbConfigured) {
        try {
          await db.update(usersTable).set({
            name: emp.name,
            email: emp.email,
            // role update ignored for now to map to enum
          }).where(eq(usersTable.id, emp.id));
        } catch(e) { console.error(e); }
      }
  };

  const handleDeleteEmployee = async (id: string) => { 
      setEmployees(prev => prev.filter(e => e.id !== id)); 
      if (isDbConfigured) {
        try {
          await db.delete(usersTable).where(eq(usersTable.id, id));
        } catch(e) { console.error(e); }
      }
  };
  
  const handleAddContractor = async (sub: Contractor) => {
      setContractors(prev => [...prev, sub]);
      if (isDbConfigured) {
        try {
          await db.insert(contractorsTable).values({
             companyName: sub.companyName,
             contactName: sub.contactName,
             email: sub.email,
             specialty: sub.specialty
          } as any);
          console.log("✅ Contractor saved to database");
        } catch(e: any) { 
          console.log("Contractors table not found, using local storage:", e.message);
          // Contractor is still saved to local storage, so user can continue
        }
      }
  };

  const handleUpdateContractor = async (sub: Contractor) => {
      setContractors(prev => prev.map(c => c.id === sub.id ? sub : c));
      if (isDbConfigured) {
        try {
          await db.update(contractorsTable).set({
             companyName: sub.companyName,
             contactName: sub.contactName,
             email: sub.email,
             specialty: sub.specialty
          } as any).where(eq(contractorsTable.id, sub.id));
          console.log("✅ Contractor updated in database");
        } catch(e: any) { 
          console.log("Contractors table not found, using local storage:", e.message);
          // Contractor is still saved to local storage, so user can continue
        }
      }
  };

  const handleDeleteContractor = async (id: string) => {
      setContractors(prev => prev.filter(c => c.id !== id));
      if (isDbConfigured) {
         try {
           await db.delete(contractorsTable).where(eq(contractorsTable.id, id));
           console.log("✅ Contractor deleted from database");
         } catch(e: any) { 
           console.log("Contractors table not found, using local storage:", e.message);
           // Contractor is still deleted from local storage, so user can continue
         }
      }
  };
  
  const handleAddBuilderGroup = async (group: BuilderGroup) => { 
      setBuilderGroups(prev => [...prev, group]); 
      if (isDbConfigured) {
        try {
           await db.insert(builderGroupsTable).values({
              name: group.name,
              email: group.email
           } as any);
        } catch(e) { console.error(e); }
      }
  };

  const handleUpdateBuilderGroup = async (group: BuilderGroup) => { 
      setBuilderGroups(prev => prev.map(g => g.id === group.id ? group : g)); 
      if (isDbConfigured) {
         try {
           await db.update(builderGroupsTable).set({
              name: group.name,
              email: group.email
           } as any).where(eq(builderGroupsTable.id, group.id));
         } catch(e) { console.error(e); }
      }
  };

  const handleDeleteBuilderGroup = async (id: string) => { 
      setBuilderGroups(prev => prev.filter(g => g.id !== id)); 
      if (isDbConfigured) {
         try {
           await db.delete(builderGroupsTable).where(eq(builderGroupsTable.id, id));
         } catch(e) { console.error(e); }
      }
  };
  
  const handleAddBuilderUser = async (user: BuilderUser, password?: string) => { 
      setBuilderUsers(prev => [...prev, user]); 
      if (isDbConfigured) {
         try {
           await db.insert(usersTable).values({
              id: user.id,
              name: user.name,
              email: user.email,
              role: 'BUILDER',
              builderGroupId: user.builderGroupId,
              password: password
           } as any);
         } catch(e) { console.error(e); }
      }
  };

  const handleUpdateBuilderUser = async (user: BuilderUser, password?: string) => { 
      setBuilderUsers(prev => prev.map(u => u.id === user.id ? user : u)); 
      if (isDbConfigured) {
         try {
           await db.update(usersTable).set({
              name: user.name,
              email: user.email,
              builderGroupId: user.builderGroupId,
              // Password update if provided
              ...(password ? { password } : {})
           } as any).where(eq(usersTable.id, user.id));
         } catch(e) { console.error(e); }
      }
  };

  const handleDeleteBuilderUser = async (id: string) => { 
      setBuilderUsers(prev => prev.filter(u => u.id !== id)); 
      if (isDbConfigured) {
         try {
           await db.delete(usersTable).where(eq(usersTable.id, id));
         } catch(e) { console.error(e); }
      }
  };
  
  const handleUpdateHomeowner = async (updatedHomeowner: Homeowner) => {
    setHomeowners(prev => prev.map(h => h.id === updatedHomeowner.id ? updatedHomeowner : h));

    if (isDbConfigured) {
      // Validate homeowner ID is a valid UUID
      const isValidUUID = (str: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      if (!isValidUUID(updatedHomeowner.id)) {
        console.log("Homeowner ID is not a valid UUID, skipping database update:", updatedHomeowner.id);
        return; // Skip database update but keep local storage update
      }

      try {
        await db.update(homeownersTable).set({
          name: updatedHomeowner.name,
          email: updatedHomeowner.email,
          phone: updatedHomeowner.phone || null,
          street: updatedHomeowner.street,
          city: updatedHomeowner.city,
          state: updatedHomeowner.state,
          zip: updatedHomeowner.zip,
          address: updatedHomeowner.address,
          builder: updatedHomeowner.builder || null,
          builderGroupId: updatedHomeowner.builderId || null,
          jobName: updatedHomeowner.jobName,
          closingDate: updatedHomeowner.closingDate,
        } as any).where(eq(homeownersTable.id, updatedHomeowner.id));
        console.log("✅ Homeowner updated in database");
      } catch (e) {
        console.error("Failed to update homeowner in DB:", e);
      }
    }
  };
  
  const handleUploadDocument = async (doc: Partial<HomeownerDocument>) => {
    // Get the actual homeowner ID - use targetHomeowner if admin, otherwise activeHomeowner
    const subjectHomeowner = ((userRole === UserRole.ADMIN || userRole === UserRole.BUILDER) && targetHomeowner) ? targetHomeowner : activeHomeowner;
    const homeownerId = doc.homeownerId || subjectHomeowner?.id || '';
    
    // Validate UUID format - if not a valid UUID, set to null for DB (but keep for local storage)
    const isValidUUID = (str: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };
    
    const dbHomeownerId = (homeownerId && isValidUUID(homeownerId)) ? homeownerId : null;
    
    const newDoc: HomeownerDocument = {
      id: crypto.randomUUID(),
      homeownerId: homeownerId, // Keep original for local storage
      name: doc.name || 'Untitled Document',
      uploadedBy: doc.uploadedBy || 'System',
      uploadDate: new Date(),
      url: doc.url || '#',
      type: doc.type || 'FILE'
    };
    setDocuments(prev => [newDoc, ...prev]);

    if (isDbConfigured) {
      try {
        await db.insert(documentsTable).values({
           id: newDoc.id,
           homeownerId: dbHomeownerId, // Use validated UUID or null
           name: newDoc.name,
           url: newDoc.url,
           type: newDoc.type,
           uploadedBy: newDoc.uploadedBy,
           uploadedAt: newDoc.uploadDate
        } as any);
        console.log("✅ Document saved to database");
      } catch(e) { 
        console.error("Failed to save document to DB:", e);
        // Document is still saved to local storage, so user can continue
      }
    }
  };
  
  const handleSendMessage = async (threadId: string, content: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      senderId: userRole === UserRole.ADMIN ? activeEmployee.id : activeHomeowner.id,
      senderName: userRole === UserRole.ADMIN ? activeEmployee.name : activeHomeowner.name,
      senderRole: userRole,
      content,
      timestamp: new Date()
    };
    
    // Optimistic Update
    let updatedThread: MessageThread | undefined;
    setMessages(prev => prev.map(t => {
      if (t.id === threadId) {
        updatedThread = { ...t, lastMessageAt: newMessage.timestamp, messages: [...t.messages, newMessage] };
        return updatedThread;
      }
      return t;
    }));

    if (isDbConfigured && updatedThread) {
       try {
         await db.update(messageThreadsTable).set({
            messages: updatedThread.messages,
            lastMessageAt: updatedThread.lastMessageAt
         } as any).where(eq(messageThreadsTable.id, threadId));
         console.log("✅ Message thread updated in database");
       } catch(e) { 
         console.log("Message threads table not found, using local storage:", e);
         // Thread is still saved to local storage, so user can continue
       }
    }

    // Track claim-related message if message is from admin and thread is claim-related
    if (userRole === UserRole.ADMIN && updatedThread) {
      // Try to find a claim with matching title
      const associatedClaim = claims.find(c => c.title === updatedThread!.subject);
      if (associatedClaim) {
        const homeowner = homeowners.find(h => h.id === updatedThread!.homeownerId);
        trackClaimMessage(associatedClaim.id, {
          type: 'HOMEOWNER',
          threadId: updatedThread.id,
          subject: updatedThread.subject,
          recipient: homeowner?.name || 'Homeowner',
          recipientEmail: homeowner?.email || '',
          content: content,
          senderName: activeEmployee.name
        });
      }
    }
  };

  const handleUpdateThread = async (threadId: string, updates: Partial<MessageThread>) => {
    // Update local state
    setMessages(prev => prev.map(t => 
      t.id === threadId ? { ...t, ...updates } : t
    ));

    // Update database if configured
    if (isDbConfigured) {
      try {
        await db.update(messageThreadsTable).set({
          ...updates,
          lastMessageAt: updates.lastMessageAt || undefined
        } as any).where(eq(messageThreadsTable.id, threadId));
        console.log("✅ Message thread updated in database");
      } catch(e: any) { 
        console.log("Message threads table not found, using local storage:", e.message);
        // Thread is still updated in local storage, so user can continue
      }
    }
  };

  const handleCreateThread = async (homeownerId: string, subject: string, content: string) => {
    const sender = userRole === UserRole.ADMIN ? activeEmployee : activeHomeowner;
    const newThread: MessageThread = {
      id: crypto.randomUUID(),
      subject,
      homeownerId,
      participants: [sender.name],
      isRead: true,
      lastMessageAt: new Date(),
      messages: [{ id: crypto.randomUUID(), senderId: sender.id, senderName: sender.name, senderRole: userRole, content, timestamp: new Date() }]
    };
    setMessages(prev => [newThread, ...prev]);

    if (isDbConfigured) {
       try {
         await db.insert(messageThreadsTable).values({
            id: newThread.id,
            subject: newThread.subject,
            homeownerId: newThread.homeownerId,
            participants: newThread.participants,
            isRead: newThread.isRead,
            lastMessageAt: newThread.lastMessageAt,
            messages: newThread.messages
         } as any);
         console.log("✅ Message thread saved to database");
       } catch(e) { 
         console.log("Message threads table not found, using local storage:", e);
         // Thread is still saved to local storage, so user can continue
       }
    }

    // Track claim-related message if thread is from admin and claim-related
    if (userRole === UserRole.ADMIN) {
      // Try to find a claim with matching title
      const associatedClaim = claims.find(c => c.title === subject);
      if (associatedClaim) {
        const homeowner = homeowners.find(h => h.id === homeownerId);
        trackClaimMessage(associatedClaim.id, {
          type: 'HOMEOWNER',
          threadId: newThread.id,
          subject: subject,
          recipient: homeowner?.name || 'Homeowner',
          recipientEmail: homeowner?.email || '',
          content: content,
          senderName: activeEmployee.name
        });
      }
    }
  };

  const handleContactAboutClaim = async (claim: Claim) => {
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
        const newId = crypto.randomUUID();
        threadIdToOpen = newId;
        const sender = userRole === UserRole.ADMIN ? activeEmployee : activeHomeowner;
        const newThread: MessageThread = {
          id: newId,
          subject: claim.title,
          homeownerId: associatedHomeownerId,
          participants: [sender.name],
          isRead: true,
          lastMessageAt: new Date(),
          messages: [{ id: crypto.randomUUID(), senderId: sender.id, senderName: sender.name, senderRole: userRole, content: `Started a new conversation regarding claim #${claim.id}: ${claim.title}`, timestamp: new Date() }]
        };
        setMessages(prev => [newThread, ...prev]);

        if (isDbConfigured) {
            db.insert(messageThreadsTable).values({
                id: newThread.id,
                subject: newThread.subject,
                homeownerId: newThread.homeownerId,
                participants: newThread.participants,
                isRead: newThread.isRead,
                lastMessageAt: newThread.lastMessageAt,
                messages: newThread.messages
            } as any).catch(e => console.error(e));
        }

        // Track claim-related message when a new message thread is created for a claim
        if (userRole === UserRole.ADMIN) {
          const initialMessage = newThread.messages[0]?.content || '';
          const homeowner = homeowners.find(h => h.id === associatedHomeownerId);
          trackClaimMessage(claim.id, {
            type: 'HOMEOWNER',
            threadId: newThread.id,
            subject: newThread.subject,
            recipient: homeowner?.name || 'Homeowner',
            recipientEmail: homeowner?.email || '',
            content: initialMessage,
            senderName: activeEmployee.name
          });
        }
    }
    setDashboardConfig({ initialTab: 'MESSAGES', initialThreadId: threadIdToOpen });
    setCurrentView('DASHBOARD');
  };

  useEffect(() => { window.scrollTo(0, 0); }, [currentView]);

  // Handle hash routing for messages (#messages?threadId=xxx)
  useEffect(() => {
    if (typeof window !== 'undefined' && currentView === 'DASHBOARD') {
      const hash = window.location.hash;
      if (hash.startsWith('#messages')) {
        // Parse threadId from hash query params
        const hashParts = hash.split('?');
        let threadId: string | null = null;
        if (hashParts.length > 1) {
          const params = new URLSearchParams(hashParts[1]);
          threadId = params.get('threadId');
        }
        
        // Set dashboard config to open messages tab
        setDashboardConfig({ initialTab: 'MESSAGES', initialThreadId: threadId });
        
        // Clean up URL hash after setting config
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
      }
    }
  }, [currentView]);

  // If auth timed out, treat as not signed in and allow app to proceed
  // This prevents the app from being stuck on a loading screen
  const effectiveIsLoaded = isLoaded || authTimeout;
  const effectiveIsSignedIn = isSignedIn && !authTimeout;

  // Use Better Auth's session to determine if we show AuthScreen
  // Log authentication state for debugging
  if (typeof window !== 'undefined') {
    console.log('Auth state check:', { 
      isSignedIn, 
      effectiveIsSignedIn,
      isLoaded, 
      effectiveIsLoaded,
      authTimeout,
      user: authUser?.id 
    });
  }
  
  // Show loading screen only if auth is still loading and hasn't timed out
  if (!isLoaded && !authTimeout) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-surface-on-variant dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  // TEMPORARY: Disable authentication for testing
  // TODO: Re-enable authentication after testing - set TEMP_DISABLE_AUTH to false
  const TEMP_DISABLE_AUTH = true;
  
  // Check if user explicitly logged out (check for logout flag in sessionStorage)
  const [hasLoggedOut, setHasLoggedOut] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('cascade_logged_out') === 'true';
    }
    return false;
  });
  
  // Check if user wants to force show login (for testing)
  const [forceShowLogin, setForceShowLogin] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('cascade_force_login') === 'true';
    }
    return false;
  });
  
  // Show AuthScreen if:
  // 1. Auth is enabled and user is not signed in, OR
  // 2. User explicitly logged out, OR
  // 3. User wants to force show login (for testing when auth is disabled)
  if ((!TEMP_DISABLE_AUTH && (!effectiveIsSignedIn && effectiveIsLoaded || hasLoggedOut)) || (TEMP_DISABLE_AUTH && (hasLoggedOut || forceShowLogin))) {
    console.log('Showing AuthScreen - user not signed in, logged out, or login forced');
    return <AuthScreenWrapper />;
  }
  
  // If auth is disabled, log a warning and allow access
  if (TEMP_DISABLE_AUTH && !forceShowLogin && !hasLoggedOut) {
    console.warn('⚠️ Authentication is temporarily disabled for testing');
  }
  

  // Show homeowner selector if multiple homeowners match the user's email
  if (matchingHomeowners && matchingHomeowners.length > 1) {
    return (
      <HomeownerSelector
        homeowners={matchingHomeowners}
        onSelect={(homeowner) => {
          setActiveHomeowner(homeowner);
          setSelectedHomeownerId(homeowner.id);
          setMatchingHomeowners(null);
          
          // Store selection for this email
          if (typeof window !== 'undefined' && authUser?.primaryEmailAddress?.emailAddress) {
            const email = authUser.primaryEmailAddress.emailAddress.toLowerCase();
            localStorage.setItem(`cascade_selected_homeowner_${email}`, homeowner.id);
          }
        }}
      />
    );
  }

  return (
    <Layout 
      userRole={userRole} 
      // Switch Role now rotates through roles (for demo/admin testing) but respects Neon Auth session
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
      onSignOut={async () => {
        // Mark as logged out in sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('cascade_logged_out', 'true');
          sessionStorage.setItem('cascade_force_login', 'true'); // Force show login screen
        }
        await signOut();
      }}
    >
      {currentView === 'DASHBOARD' && (
        <Dashboard 
          claims={claims} 
          userRole={userRole} 
          onSelectClaim={handleSelectClaim}
          onNewClaim={handleNewClaimStart}
          onCreateClaim={handleCreateClaim}
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
          onUpdateThread={handleUpdateThread}
          onAddInternalNote={addInternalNoteToClaim}
          onTrackClaimMessage={trackClaimMessage}
          onUpdateClaim={handleUpdateClaim}
          contractors={contractors}
          claimMessages={claimMessages || []}
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
          <div className="bg-surface dark:bg-gray-800 p-8 rounded-3xl shadow-elevation-1 border border-surface-outline-variant">
            <TaskList tasks={tasks} employees={employees} currentUser={activeEmployee} claims={claims} homeowners={homeowners} onAddTask={handleAddTask} onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask} onClose={() => setCurrentView('DASHBOARD')} />
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
          builderUsers={builderUsers}
          builderGroups={builderGroups}
          onAddBuilderUser={handleAddBuilderUser}
          onUpdateBuilderUser={handleUpdateBuilderUser}
          onDeleteBuilderUser={handleDeleteBuilderUser}
          onClose={() => setCurrentView('DASHBOARD')}
          initialTab={currentView === 'SUBS' ? 'SUBS' : 'EMPLOYEES'}
        />
      )}
      {currentView === 'BUILDERS' && (
        <BuilderManagement builderGroups={builderGroups} onAddGroup={handleAddBuilderGroup} onUpdateGroup={handleUpdateBuilderGroup} onDeleteGroup={handleDeleteBuilderGroup} onClose={() => setCurrentView('DASHBOARD')} />
      )}
      {currentView === 'HOMEOWNERS' && (
        <HomeownersList 
          homeowners={availableHomeowners}
          builderGroups={builderGroups}
          onUpdateHomeowner={handleUpdateHomeowner}
          onDeleteHomeowner={handleDeleteHomeowner}
          onClose={() => setCurrentView('DASHBOARD')}
        />
      )}
      {currentView === 'EMAIL_HISTORY' && (
        <EmailHistory onClose={() => setCurrentView('DASHBOARD')} />
      )}
      {currentView === 'BACKEND' && (
        <BackendDashboard onClose={() => setCurrentView('DASHBOARD')} />
      )}
      {currentView === 'DATA' && (
        <DataImport 
          onImportClaims={handleImportClaims} 
          onImportHomeowners={handleImportHomeowners} 
          onClearHomeowners={handleClearHomeowners} 
          existingBuilderGroups={builderGroups} 
          onImportBuilderGroups={handleImportBuilderGroups}
          onImportBuilderUsers={handleImportBuilderUsers}
          onImportTasks={handleImportTasks}
          onImportMessages={handleImportMessages}
          employees={employees.map(e => ({ id: e.id, name: e.name }))}
          homeowners={homeowners.map(h => ({ id: h.id, email: h.email }))}
          onClose={() => setCurrentView('DASHBOARD')} 
        />
      )}
      {currentView === 'NEW' && (
        <div className="max-w-4xl mx-auto bg-surface p-8 rounded-3xl shadow-elevation-1 border border-surface-outline-variant">
          <h2 className="text-2xl font-normal text-surface-on mb-6">Create Warranty Claim</h2>
          <NewClaimForm onSubmit={handleCreateClaim} onCancel={() => setCurrentView('DASHBOARD')} contractors={contractors} activeHomeowner={(userRole === UserRole.ADMIN || userRole === UserRole.BUILDER) && targetHomeowner ? targetHomeowner : activeHomeowner} userRole={userRole} />
        </div>
      )}
      {currentView === 'DETAIL' && selectedClaim && (
        <ClaimDetail 
          claim={selectedClaim} 
          currentUserRole={userRole} 
          onUpdateClaim={handleUpdateClaim} 
          onBack={() => {
            setClaimEditMode(false);
            setCurrentView('DASHBOARD');
          }} 
          contractors={contractors} 
          onSendMessage={handleContactAboutClaim}
          startInEditMode={claimEditMode}
          currentUser={activeEmployee}
          onAddInternalNote={addInternalNoteToClaim}
          claimMessages={(claimMessages || []).filter(m => m.claimId === selectedClaim.id)}
          onTrackClaimMessage={trackClaimMessage}
          onNavigate={(view, config) => {
            if (config) {
              setDashboardConfig(config);
            }
            setCurrentView(view);
          }}
        />
      )}
      {currentView === 'INVOICES' && (
        <InvoicesModal
          isOpen={currentView === 'INVOICES'}
          onClose={() => {
            // Clear prefill data when closing
            sessionStorage.removeItem('invoicePrefill');
            setCurrentView('DASHBOARD');
          }}
          prefillData={(() => {
            // Get prefill data from sessionStorage
            try {
              const stored = sessionStorage.getItem('invoicePrefill');
              if (stored) {
                return JSON.parse(stored);
              }
            } catch (e) {
              console.error('Error parsing invoice prefill data:', e);
            }
            return undefined;
          })()}
        />
      )}
      <HomeownerEnrollment isOpen={isEnrollmentOpen} onClose={() => setIsEnrollmentOpen(false)} onEnroll={handleEnrollHomeowner} builderGroups={builderGroups} />
    </Layout>
  );
}

export default App;
