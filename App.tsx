
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import HomeownerEnrollment from './components/HomeownerEnrollment';
import AuthScreenWrapper from './components/AuthScreenWrapper';
import TasksSheet from './components/TasksSheet';
import MessageSummaryModal, { ClaimMessage, TaskMessage } from './components/MessageSummaryModal';
import SubmissionSuccessModal from './components/SubmissionSuccessModal';
import { X, Info, CheckCircle, User } from 'lucide-react';
import HomeownerSelector from './components/HomeownerSelector';
import { LazyAppProviders } from './components/providers/LazyAppProviders';
import { Claim, UserRole, ClaimStatus, Homeowner, Task, HomeownerDocument, InternalEmployee, MessageThread, Message, Contractor, BuilderGroup, BuilderUser } from './types';
import { MOCK_CLAIMS, MOCK_HOMEOWNERS, MOCK_TASKS, MOCK_INTERNAL_EMPLOYEES, MOCK_CONTRACTORS, MOCK_DOCUMENTS, MOCK_THREADS, MOCK_BUILDER_GROUPS, MOCK_BUILDER_USERS, MOCK_CLAIM_MESSAGES } from './constants';
import { sendEmail, generateNotificationBody } from './services/emailService';

// Code-split non-critical views to reduce initial JS.
const ClaimDetail = React.lazy(() => import('./components/ClaimDetail'));
const NewClaimForm = React.lazy(() => import('./components/NewClaimForm'));
const Settings = React.lazy(() => import('./components/Settings'));
const InternalUserManagement = React.lazy(() => import('./components/InternalUserManagement'));
const HomeownersList = React.lazy(() => import('./components/HomeownersList'));
const EmailHistory = React.lazy(() => import('./components/EmailHistory'));
const BackendDashboard = React.lazy(() => import('./components/BackendDashboard'));
const UnifiedImportDashboard = React.lazy(() => import('./app/dashboard/admin/import/page'));
const WarrantyAnalytics = React.lazy(() => import('./components/WarrantyAnalytics'));

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

// Clerk integration
import { useUser as useClerkUser, useAuth as useClerkAuth } from '@clerk/clerk-react';

// Clerk hooks with compatibility mapping
const useUser = () => {
  const { isLoaded, isSignedIn, user } = useClerkUser();
  
  // Map Clerk user to standard format for compatibility
  return {
    isSignedIn: isSignedIn || false,
    user: user ? {
      id: user.id,
      primaryEmailAddress: { 
        emailAddress: user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || '' 
      },
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      fullName: user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || '',
    } : null,
    isLoaded,
  };
};

const useAuth = () => {
  const { signOut } = useClerkAuth();
  
  return { 
    signOut: async () => {
      try {
        // Sign out from Clerk
        await signOut();
        
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
        
        // Clerk will handle redirect via afterSignOutUrl in ClerkProvider
      } catch (err) {
        console.error("Clerk signOut error:", err);
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
  const location = useLocation();
  const navigate = useNavigate();
  // --- CLERK INTEGRATION ---
  // Use Clerk hooks with timeout protection
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
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(true);

  // Data State - Lazy Load from LS first
  // CRITICAL: FORCE_MOCK_DATA should be false in production to preserve data
  // Only set to true temporarily for testing/development
  const FORCE_MOCK_DATA = false; // Set to true ONLY for testing - will overwrite all data!
  
  const [homeowners, setHomeowners] = useState<Homeowner[]>(() => 
    FORCE_MOCK_DATA ? MOCK_HOMEOWNERS : loadState('cascade_homeowners', MOCK_HOMEOWNERS)
  );
  // Claims are not loaded from localStorage - large datasets (6,000+ records) exceed quota
  // Claims are loaded from the database instead
  const [claims, setClaims] = useState<Claim[]>(() => 
    FORCE_MOCK_DATA ? MOCK_CLAIMS : []
  );
  const [tasks, setTasks] = useState<Task[]>(() => 
    FORCE_MOCK_DATA ? MOCK_TASKS : loadState('cascade_tasks', MOCK_TASKS)
  );
  // Documents are not loaded from localStorage - they contain large base64 data URLs that exceed quota
  // Documents are loaded from the database instead
  const [documents, setDocuments] = useState<HomeownerDocument[]>(() => 
    FORCE_MOCK_DATA ? MOCK_DOCUMENTS : []
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
  const [taskMessages, setTaskMessages] = useState<TaskMessage[]>(() =>
    loadState('cascade_task_messages', [])
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

  // --- LOAD MOCK DATA ON FIRST MOUNT IF LOCALSTORAGE IS EMPTY ---
  useEffect(() => {
    // Check if localStorage is empty for key data, if so, load mock data
    const hasHomeowners = localStorage.getItem('cascade_homeowners');
    // Claims are not stored in localStorage (too large), loaded from DB only
    const hasBuilders = localStorage.getItem('cascade_builder_groups');
    const hasContractors = localStorage.getItem('cascade_contractors');
    
    if (!hasHomeowners && MOCK_HOMEOWNERS.length > 0) {
      setHomeowners(MOCK_HOMEOWNERS);
    }
    // Claims are loaded from database only, not from mock data or localStorage
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
  
  // Migration: Populate homeownerId for existing claims loaded from localStorage
  useEffect(() => {
    if (homeowners.length > 0 && claims.length > 0) {
      const needsMigration = claims.some(c => !(c as any).homeownerId);
      if (needsMigration) {
        const migratedClaims = claims.map(claim => {
          if ((claim as any).homeownerId) {
            return claim; // Already has homeownerId
          }
          
          // Try to find matching homeowner by email (case-insensitive)
          const claimEmail = claim.homeownerEmail?.toLowerCase().trim() || '';
          const matchingHomeowner = homeowners.find(h => {
            const homeownerEmail = h.email?.toLowerCase().trim() || '';
            return homeownerEmail === claimEmail;
          });
          
          if (matchingHomeowner) {
            const updatedClaim = { ...claim } as any;
            updatedClaim.homeownerId = matchingHomeowner.id;
            return updatedClaim;
          }
          
          return claim;
        });
        
        // Only update if we actually migrated some claims
        const hasChanges = migratedClaims.some((c, i) => (c as any).homeownerId !== (claims[i] as any).homeownerId);
        if (hasChanges) {
          console.log('🔄 Migrating claims: Populating homeownerId for existing claims');
          setClaims(migratedClaims);
        }
      }
    }
  }, [homeowners.length]); // Run when homeowners are first loaded
  
  // Claims are not saved to localStorage - large datasets (6,000+ records) exceed quota
  // Claims are stored in the database instead
  // useEffect(() => { saveState('cascade_claims', claims); }, [claims]);
  useEffect(() => { saveState('cascade_tasks', tasks); }, [tasks]);
  // Documents are not saved to localStorage - they contain large base64 data URLs that exceed quota
  // Documents are stored in the database instead
  // useEffect(() => { saveState('cascade_documents', documents); }, [documents]);
  useEffect(() => { saveState('cascade_employees', employees); }, [employees]);
  useEffect(() => { saveState('cascade_contractors', contractors); }, [contractors]);
  useEffect(() => { saveState('cascade_messages', messages); }, [messages]);
  useEffect(() => { saveState('cascade_builder_groups', builderGroups); }, [builderGroups]);
  useEffect(() => { saveState('cascade_builder_users', builderUsers); }, [builderUsers]);

  // Sync activeEmployee when employees array changes (e.g., role update)
  useEffect(() => {
    if (activeEmployee && activeEmployee.id !== 'placeholder') {
      const updatedEmployee = employees.find(e => e.id === activeEmployee.id);
      if (updatedEmployee && JSON.stringify(updatedEmployee) !== JSON.stringify(activeEmployee)) {
        console.log('🔄 Updating activeEmployee to reflect role/data change:', updatedEmployee.role);
        setActiveEmployee(updatedEmployee);
      }
    }
  }, [employees]);

  // --- REFRESH/RELOAD DATA FUNCTION ---
  // Exposed function to reload all data from the database (used by import after reset/import)
  const loadData = useCallback(async () => {
    if (!isDbConfigured) {
      console.warn('Database not configured, skipping data reload');
      return;
    }

    try {
      console.log('🔄 Reloading data from database...');

      // Reload homeowners
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
          builderId: h.builderGroupId || undefined, // Legacy
          builderUserId: h.builderUserId || undefined, // NEW: Direct link to builder user
          jobName: h.jobName || '',
          closingDate: h.closingDate ? new Date(h.closingDate) : new Date(),
          agentName: h.agentName || '',
          agentEmail: h.agentEmail || '',
          agentPhone: h.agentPhone || '',
          enrollmentComments: h.enrollmentComments || '',
          password: h.password || undefined
        }));
        setHomeowners(mappedHomeowners);
      } else {
        setHomeowners([]);
      }

      // Reload builder groups
      const dbBuilderGroups = await db.select().from(builderGroupsTable);
      if (dbBuilderGroups.length > 0) {
        const mappedGroups = dbBuilderGroups.map(bg => ({
          id: bg.id,
          name: bg.name,
          email: bg.email || ''
        }));
        setBuilderGroups(mappedGroups);
      } else {
        setBuilderGroups([]);
      }

      // Reload users (employees & builders)
      const dbUsers = await db.select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        internalRole: usersTable.internalRole,
        password: usersTable.password,
        builderGroupId: usersTable.builderGroupId
      }).from(usersTable);

      const fetchedEmployees: InternalEmployee[] = dbUsers
        .filter(u => u.role === 'ADMIN')
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.internalRole || 'Administrator',
          password: u.password || undefined,
          emailNotifyClaimSubmitted: true,
          emailNotifyHomeownerAcceptsAppointment: true,
          emailNotifySubAcceptsAppointment: true,
          emailNotifyHomeownerRescheduleRequest: true,
          emailNotifyTaskAssigned: true,
          pushNotifyClaimSubmitted: false,
          pushNotifyHomeownerAcceptsAppointment: false,
          pushNotifySubAcceptsAppointment: false,
          pushNotifyHomeownerRescheduleRequest: false,
          pushNotifyTaskAssigned: false,
          pushNotifyHomeownerMessage: false,
          pushNotifyHomeownerEnrollment: false,
          emailNotifyHomeownerEnrollment: true
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

      setEmployees(fetchedEmployees);
      setBuilderUsers(fetchedBuilders);

      console.log('✅ Data reload complete');
    } catch (error) {
      console.error('❌ Failed to reload data:', error);
    }
  }, []);

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
                builderUserId: h.builderUserId || undefined, // NEW: Direct link to builder user
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
                  // Include if not in DB by ID OR email (to catch cases where ID differs but email match)
                  return notInDbById && notInDbByEmail;
                });
                
                // Combine: DB data (source of truth) + local-only (pending sync)
                const merged = [...mappedHomeowners, ...localOnly];
                console.log(`✅ Loaded ${mappedHomeowners.length} homeowners from DB, ${localOnly.length} from local storage`);
                return merged;
              });
              loadedHomeowners = mappedHomeowners;

              // 🔗 CHAINED RESTORATION: Immediately restore selected homeowner after data load
              // This ensures restoration happens synchronously after DB fetch completes
              if (userRole !== UserRole.HOMEOWNER && !selectedAdminHomeownerId) {
                const savedId = localStorage.getItem("cascade_active_homeowner_id");
                console.log("🔗 Data loaded. Now attempting immediate restore for ID:", savedId);
                
                if (savedId) {
                  const found = mappedHomeowners.find(h => h.id === savedId);
                  
                  if (found) {
                    console.log("✅ RESTORED SESSION:", found.firstName || found.name);
                    setSelectedAdminHomeownerId(savedId);
                    setCurrentView('DASHBOARD');
                    setDashboardConfig({ initialTab: 'CLAIMS', initialThreadId: null });
                  } else {
                    console.warn("⚠️ Saved ID not found in new data. Clearing invalid storage.");
                    localStorage.removeItem("cascade_active_homeowner_id");
                  }
                } else {
                  console.log("ℹ️ No saved session found.");
                }
              }
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
                      builderUserId: h.builderUserId || undefined, // NEW: Direct link to builder user
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
            // Try selective query first to avoid errors if email notification columns don't exist
            try {
              // First, try to select only basic columns (safer - works even if email notification columns don't exist)
              const dbUsers = await db.select({
                id: usersTable.id,
                name: usersTable.name,
                email: usersTable.email,
                role: usersTable.role,
                internalRole: usersTable.internalRole, // CRITICAL: Load the internal role for ADMIN users
                password: usersTable.password,
                builderGroupId: usersTable.builderGroupId
              }).from(usersTable);
              
              console.log('👥 Loaded users from database:', dbUsers.length, 'users');
              
              if (dbUsers.length > 0) {
                // Try to fetch email notification preferences separately if columns exist
                let emailPrefsMap = new Map<string, any>();
                try {
                  // Only try to fetch preferences if we can safely query for them
                  // This avoids 400 errors if columns don't exist
                  const usersWithPrefs = await db.select({
                    id: usersTable.id,
                    emailNotifyClaimSubmitted: usersTable.emailNotifyClaimSubmitted,
                    emailNotifyHomeownerAcceptsAppointment: usersTable.emailNotifyHomeownerAcceptsAppointment,
                    emailNotifySubAcceptsAppointment: usersTable.emailNotifySubAcceptsAppointment,
                    emailNotifyHomeownerRescheduleRequest: usersTable.emailNotifyHomeownerRescheduleRequest,
                    emailNotifyTaskAssigned: usersTable.emailNotifyTaskAssigned,
                    emailNotifyHomeownerEnrollment: usersTable.emailNotifyHomeownerEnrollment,
                    pushNotifyClaimSubmitted: usersTable.pushNotifyClaimSubmitted,
                    pushNotifyHomeownerAcceptsAppointment: usersTable.pushNotifyHomeownerAcceptsAppointment,
                    pushNotifySubAcceptsAppointment: usersTable.pushNotifySubAcceptsAppointment,
                    pushNotifyHomeownerRescheduleRequest: usersTable.pushNotifyHomeownerRescheduleRequest,
                    pushNotifyTaskAssigned: usersTable.pushNotifyTaskAssigned,
                    pushNotifyHomeownerMessage: usersTable.pushNotifyHomeownerMessage,
                    pushNotifyHomeownerEnrollment: usersTable.pushNotifyHomeownerEnrollment
                  }).from(usersTable).catch((err: any) => {
                    // If query fails due to missing columns, return empty array
                    if (err?.message?.includes('email_notify') || err?.message?.includes('push_notify') || err?.statusCode === 400) {
                      console.log('⚠️ Email notification columns not found, using defaults');
                      return [];
                    }
                    throw err; // Re-throw other errors
                  });
                  
                  if (usersWithPrefs && usersWithPrefs.length > 0) {
                    usersWithPrefs.forEach(u => {
                      emailPrefsMap.set(u.id, {
                        emailNotifyClaimSubmitted: u.emailNotifyClaimSubmitted ?? true,
                        emailNotifyHomeownerAcceptsAppointment: u.emailNotifyHomeownerAcceptsAppointment ?? true,
                        emailNotifySubAcceptsAppointment: u.emailNotifySubAcceptsAppointment ?? true,
                        emailNotifyHomeownerRescheduleRequest: u.emailNotifyHomeownerRescheduleRequest ?? true,
                        emailNotifyTaskAssigned: u.emailNotifyTaskAssigned ?? true,
                        pushNotifyClaimSubmitted: u.pushNotifyClaimSubmitted === true,
                        pushNotifyHomeownerAcceptsAppointment: u.pushNotifyHomeownerAcceptsAppointment === true,
                        pushNotifySubAcceptsAppointment: u.pushNotifySubAcceptsAppointment === true,
                        pushNotifyHomeownerRescheduleRequest: u.pushNotifyHomeownerRescheduleRequest === true,
                        pushNotifyTaskAssigned: u.pushNotifyTaskAssigned === true,
                        pushNotifyHomeownerMessage: u.pushNotifyHomeownerMessage === true,
                        pushNotifyHomeownerEnrollment: u.pushNotifyHomeownerEnrollment === true,
                        emailNotifyHomeownerEnrollment: u.emailNotifyHomeownerEnrollment ?? true
                      });
                    });
                  }
                } catch (prefsError: any) {
                  // Email notification columns don't exist - use defaults
                  console.log('⚠️ Email notification columns not found, using defaults');
                }
                
                const fetchedEmployees: InternalEmployee[] = dbUsers
                  .filter(u => u.role === 'ADMIN')
                  .map(u => {
                    const prefs = emailPrefsMap.get(u.id);
                    return {
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        role: u.internalRole || 'Administrator', // Use internalRole if available, default to Administrator
                        password: u.password || undefined,
                        // Use preferences if available, otherwise default to true
                        emailNotifyClaimSubmitted: prefs?.emailNotifyClaimSubmitted ?? true,
                        emailNotifyHomeownerAcceptsAppointment: prefs?.emailNotifyHomeownerAcceptsAppointment ?? true,
                        emailNotifySubAcceptsAppointment: prefs?.emailNotifySubAcceptsAppointment ?? true,
                        emailNotifyHomeownerRescheduleRequest: prefs?.emailNotifyHomeownerRescheduleRequest ?? true,
                        emailNotifyTaskAssigned: prefs?.emailNotifyTaskAssigned ?? true,
                        pushNotifyClaimSubmitted: prefs?.pushNotifyClaimSubmitted === true,
                        pushNotifyHomeownerAcceptsAppointment: prefs?.pushNotifyHomeownerAcceptsAppointment === true,
                        pushNotifySubAcceptsAppointment: prefs?.pushNotifySubAcceptsAppointment === true,
                        pushNotifyHomeownerRescheduleRequest: prefs?.pushNotifyHomeownerRescheduleRequest === true,
                        pushNotifyTaskAssigned: prefs?.pushNotifyTaskAssigned === true,
                        pushNotifyHomeownerMessage: prefs?.pushNotifyHomeownerMessage === true,
                        pushNotifyHomeownerEnrollment: prefs?.pushNotifyHomeownerEnrollment === true,
                        emailNotifyHomeownerEnrollment: prefs?.emailNotifyHomeownerEnrollment ?? true
                    };
                  });
                
                console.log('📋 Loaded employees from database:', fetchedEmployees.map(e => ({ name: e.name, role: e.role, email: e.email })));
                
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
            } catch (userError: any) {
              console.error('❌ Failed to load users:', userError);
            }

            // 3. Skip bulk claims fetch - claims are now loaded per-homeowner (see useEffect below)
            // SECURITY: Never fetch all 6,200+ claims at once
            console.log('📋 Claims will be loaded when homeowner is selected');
            
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
                  phone: c.phone || '',
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

        // --- MAP CLERK USER TO INTERNAL USER ---
        if (isSignedIn && authUser) {
           // Clerk user is mapped to authUser format in useUser hook
           const email = authUser.primaryEmailAddress?.emailAddress.toLowerCase();
           if (email) {
              // 1. Check Employees
              const emp = loadedEmployees.find(e => e.email.toLowerCase() === email);
              if (emp) {
                 console.log('✅ User logged in as employee:', emp.name, 'Role:', emp.role);
                 setUserRole(UserRole.ADMIN);
                 setActiveEmployee(emp);
                 setIsRoleLoading(false);
                 return;
              }

              // 2. Check Builders
              const builder = loadedBuilders.find(b => b.email.toLowerCase() === email);
              if (builder) {
                 setUserRole(UserRole.BUILDER);
                 setCurrentBuilderId(builder.builderGroupId);
                 setIsRoleLoading(false);
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
                 
                 setIsRoleLoading(false);
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
              setIsRoleLoading(false);
           } else {
              // No email found, set loading to false anyway
              setIsRoleLoading(false);
           }
        } else {
           // Not signed in, set loading to false
           setIsRoleLoading(false);
        }

      } catch (e) {
        console.warn("Neon DB Connection Failed (Using Local Persistence):", e);
      }
    };

    syncDataAndUser();
  }, [isLoaded, isSignedIn, authUser?.id]); // Re-run when auth state changes

  // Handle deep linking to specific claim from email
  useEffect(() => {
    if (typeof window === 'undefined' || !claims || claims.length === 0) return;
    
    const hash = window.location.hash;
    
    // Check if URL has #claims?claimId=... format
    if (hash.startsWith('#claims') && hash.includes('?')) {
      const hashParts = hash.split('?');
      const urlParams = new URLSearchParams(hashParts[1] || '');
      const claimId = urlParams.get('claimId');
      
      if (claimId) {
        console.log(`📧 Deep link detected: Opening claim ${claimId}`);
        
        // Find the claim
        const targetClaim = claims.find(c => c.id === claimId);
        
        if (targetClaim) {
          // Open the claim detail view in edit mode
          setSelectedClaimId(targetClaim.id);
          setClaimEditMode(true); // Open in edit mode
          setCurrentView('DETAIL');
          
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
          console.log(`✅ Opened claim in edit mode: ${targetClaim.claimNumber}`);
        } else {
          console.warn(`⚠️ Claim ${claimId} not found`);
          // Clean up URL even if claim not found
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [claims]); // Re-run when claims are loaded

  // UI State - Persistent (but reset INVOICES on page load to prevent auto-opening)
  // Check URL hash for invoice creation link
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'DETAIL' | 'NEW' | 'TEAM' | 'DATA' | 'ANALYTICS' | 'TASKS' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND' | 'CALLS' | 'INVOICES' | 'SETTINGS'>(() => {
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
        }
        // Note: Invoice navigation handled via dashboardConfig instead of currentView
      }
    }
    const saved = loadState<'DASHBOARD' | 'DETAIL' | 'NEW' | 'TEAM' | 'DATA' | 'ANALYTICS' | 'TASKS' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'CALLS' | 'INVOICES' | 'SETTINGS'>('cascade_ui_view', 'DASHBOARD');
    // Don't auto-open modals on page load on mobile - always start at DASHBOARD
    // On desktop, allow restoring saved view
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile && saved === 'DETAIL') {
        return 'DASHBOARD';
      }
    }
    return saved;
  });

  // Route-based wiring: allow direct navigation to Analytics.
  useEffect(() => {
    if (location.pathname === '/dashboard/analytics') {
      setCurrentView('ANALYTICS');
    }
  }, [location.pathname]);
  
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(() => {
    // Don't restore selected claim on mobile to prevent modal from auto-opening
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        return null;
      }
    }
    return loadState('cascade_ui_claim_id', null);
  });
  
  const [selectedAdminHomeownerId, setSelectedAdminHomeownerId] = useState<string | null>(() => 
    loadState('cascade_ui_homeowner_id', null)
  );

  // --- FETCH CLAIMS FOR SELECTED HOMEOWNER ---
  // STRICT POLICY: Only fetch claims when a homeowner is selected
  // NEVER fetch all claims at once (6,200+ records)
  useEffect(() => {
    const fetchClaimsForHomeowner = async () => {
      // Determine which homeowner ID to use:
      // 1. For admin/builder users: selectedAdminHomeownerId (from homeowner selection)
      // 2. For homeowner users: activeHomeowner.id (their own account)
      const targetHomeownerId = userRole === UserRole.HOMEOWNER 
        ? activeHomeowner?.id 
        : selectedAdminHomeownerId;

      if (!targetHomeownerId) {
        console.log('📋 No homeowner selected, skipping claims fetch');
        setClaims([]); // Clear claims if no homeowner selected
        return;
      }

      try {
        console.log(`🔄 Homeowner changed to: ${targetHomeownerId} - Fetching claims now.`);
        
        const response = await fetch(`/.netlify/functions/get-claims?homeownerId=${targetHomeownerId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch claims: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.claims) {
          // Map database claims to frontend Claim type
          const mappedClaims: Claim[] = data.claims.map((c: any) => ({
            id: c.id,
            homeownerId: c.homeowner_id || c.homeownerId,
            claimNumber: c.claim_number || c.claimNumber || undefined,
            title: c.title || '',
            description: c.description || '',
            address: c.address || '',
            homeownerName: c.homeowner_name || c.homeownerName || '',
            homeownerEmail: c.homeowner_email || c.homeownerEmail || '',
            builderName: c.builder_name || c.builderName || '',
            jobName: c.job_name || c.jobName || '',
            status: (c.status as ClaimStatus) || 'SUBMITTED',
            classification: c.classification || 'Unclassified',
            dateSubmitted: c.date_submitted || c.dateSubmitted ? new Date(c.date_submitted || c.dateSubmitted) : new Date(),
            dateEvaluated: c.date_evaluated || c.dateEvaluated ? new Date(c.date_evaluated || c.dateEvaluated) : undefined,
            internalNotes: c.internal_notes || c.internalNotes || '',
            nonWarrantyExplanation: c.non_warranty_explanation || c.nonWarrantyExplanation || '',
            contractorId: c.contractor_id || c.contractorId || undefined,
            contractorName: c.contractor_name || c.contractorName || '',
            contractorEmail: c.contractor_email || c.contractorEmail || '',
            proposedDates: c.proposed_dates || c.proposedDates || [],
            attachments: c.attachments || [],
            comments: [],
          }));
          
          setClaims(mappedClaims);
          console.log(`✅ Loaded ${mappedClaims.length} claims for homeowner ${targetHomeownerId}`);
        } else {
          console.warn('⚠️ Invalid response from get-claims API:', data);
          setClaims([]);
        }
      } catch (error: any) {
        console.error('❌ Failed to fetch claims for homeowner:', error);
        setClaims([]); // Clear claims on error
      }
    };

    fetchClaimsForHomeowner();
  }, [selectedAdminHomeownerId, activeHomeowner?.id, userRole]);

  const [searchQuery, setSearchQuery] = useState('');

  const [dashboardConfig, setDashboardConfig] = useState<{
    initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS' | 'NOTES' | 'INVOICES';
    initialThreadId?: string | null;
  }>(() => {
    // Check if we should open invoices tab from URL hash
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('#invoices')) {
        return { initialTab: 'INVOICES' };
      }
    }
    return {};
  });

  // Track initial load period for mobile modal prevention
  const initialLoadRef = useRef(true);
  const mountTimeRef = useRef(Date.now());
  const userInteractionRef = useRef(false);
  
  // Track user interactions on mobile
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (!isMobile) return;
    
    const handleUserInteraction = () => {
      userInteractionRef.current = true;
      console.log('👆 User interaction detected on mobile (App.tsx)');
    };
    
    window.addEventListener('click', handleUserInteraction, { capture: true });
    window.addEventListener('touchstart', handleUserInteraction, { capture: true });
    
    return () => {
      window.removeEventListener('click', handleUserInteraction, { capture: true });
      window.removeEventListener('touchstart', handleUserInteraction, { capture: true });
    };
  }, []);
  
  // Prevent DETAIL view from opening on mobile during initial load or without user interaction
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (!isMobile) return;
    
    // Check if DETAIL view should be blocked
    if (currentView === 'DETAIL') {
      const timeSinceMount = Date.now() - mountTimeRef.current;
      const isInitialLoadPeriod = initialLoadRef.current && timeSinceMount < 5000;
      const hasNoUserInteraction = !userInteractionRef.current;
      
      console.log('🔍 Checking DETAIL view on mobile', {
        currentView,
        selectedClaimId,
        timeSinceMount,
        isInitialLoadPeriod,
        hasNoUserInteraction,
        willBlock: isInitialLoadPeriod || hasNoUserInteraction
      });
      
      // Block if in initial load period OR no user interaction (always block auto-opens)
      if (isInitialLoadPeriod || hasNoUserInteraction) {
        console.log('🚫 BLOCKING DETAIL view on mobile (preventing claim modal auto-open)', {
          isInitialLoadPeriod,
          hasNoUserInteraction,
          timeSinceMount,
          selectedClaimId
        });
        setCurrentView('DASHBOARD');
        setSelectedClaimId(null);
        return;
      }
      
      console.log('✅ Allowing DETAIL view on mobile (user interaction detected)', {
        timeSinceMount,
        selectedClaimId
      });
    }
  }, [currentView, selectedClaimId]);
  
  // Mark initial load period as complete after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      initialLoadRef.current = false;
      console.log('⏰ Initial load period complete (App.tsx - 5 seconds)');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // --- UI PERSISTENCE EFFECTS ---
  useEffect(() => { saveState('cascade_ui_view', currentView); }, [currentView]);
  useEffect(() => { saveState('cascade_ui_claim_id', selectedClaimId); }, [selectedClaimId]);
  useEffect(() => { saveState('cascade_ui_homeowner_id', selectedAdminHomeownerId); }, [selectedAdminHomeownerId]);
  
  // --- STATE WATCHER: AUTO-SAVE SELECTED HOMEOWNER TO LOCALSTORAGE ---
  // 🛡️ GUARANTEED PERSISTENCE
  // This runs automatically whenever the user selection changes
  // Decoupled from event handlers to survive crashes/errors in notification services
  useEffect(() => {
    // Only persist for admin/builder users
    if (userRole === UserRole.HOMEOWNER) return;

    if (selectedAdminHomeownerId) {
      console.log("💾 Auto-Saving Homeowner ID:", selectedAdminHomeownerId);
      try {
        localStorage.setItem("cascade_active_homeowner_id", String(selectedAdminHomeownerId));
        console.log("✅ Persistence confirmed:", localStorage.getItem("cascade_active_homeowner_id"));
      } catch (error) {
        console.error("🔥 Auto-save to localStorage failed:", error);
      }
    } else {
      // Clear when null (explicit deselection)
      console.log("💾 Clearing saved homeowner (null selection)");
      localStorage.removeItem("cascade_active_homeowner_id");
    }
  }, [selectedAdminHomeownerId, userRole]); // Watches for any change to selection
  
  // Redirect INVOICES view to Dashboard with Invoices tab
  useEffect(() => {
    if (currentView === 'INVOICES') {
      setDashboardConfig({ initialTab: 'INVOICES' });
      setCurrentView('DASHBOARD');
    }
  }, [currentView]);

  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  
  // Alert modal state
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'info' | 'success' | 'error'>('info');

  // Submission success modal state (with AI analysis)
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);
  const [submissionData, setSubmissionData] = useState<{
    claimCount: number;
    aiAnalysis?: { status: 'Approved' | 'Denied' | 'Needs Info'; reasoning: string } | null;
  } | null>(null);

  const selectedClaim = claims.find(c => c.id === selectedClaimId);
  const targetHomeowner = selectedAdminHomeownerId ? homeowners.find(h => h.id === selectedAdminHomeownerId) || null : null;

  const builderGroupUserIds = currentBuilderId
    ? new Set(
        builderUsers
          .filter(bu => bu.builderGroupId === currentBuilderId)
          .map(bu => bu.id)
      )
    : null;

  const builderGroupName = currentBuilderId
    ? (() => {
        const groupName = builderGroups.find(bg => bg.id === currentBuilderId)?.name;
        const normalized = groupName?.trim().toLowerCase() || null;
        return normalized && normalized.length > 0 ? normalized : null;
      })()
    : null;

  const builderAccessibleHomeowners = currentBuilderId
    ? homeowners.filter(h => {
        const builderIdMatch = h.builderId === currentBuilderId;
        const builderUserMatch = h.builderUserId ? builderGroupUserIds?.has(h.builderUserId) : false;
        const builderNameMatch = builderGroupName
          ? (h.builder || '').trim().toLowerCase() === builderGroupName
          : false;
        return builderIdMatch || builderUserMatch || builderNameMatch;
      })
    : homeowners;

  const availableHomeowners = (userRole === UserRole.BUILDER && currentBuilderId)
    ? builderAccessibleHomeowners
    : homeowners;

  const searchResults = searchQuery 
    ? availableHomeowners.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        h.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.jobName && h.jobName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSelectHomeowner = (homeowner: Homeowner) => {
    // 1. Debug Log (MANDATORY)
    console.log("🖱️ User selected:", homeowner.id, homeowner.firstName || homeowner.name);
    
    // 2. Set React State
    setSelectedAdminHomeownerId(homeowner.id);
    setSearchQuery('');
    setDashboardConfig({ initialTab: 'CLAIMS', initialThreadId: null });
    setCurrentView('DASHBOARD');
    
    // Note: Persistence now handled by State Watcher useEffect
    // This ensures it survives crashes in notification/other services
  };

  const handleClearHomeownerSelection = () => {
    setSelectedAdminHomeownerId(null);
    // Note: Persistence clearing now handled by State Watcher useEffect
  };

  const handleSwitchRole = async () => {
    if (userRole === UserRole.ADMIN) {
      // Switching from ADMIN to HOMEOWNER
      // Require a homeowner to be selected first
      if (!selectedAdminHomeownerId) {
        // Show custom alert modal - homeowner must be selected first
        setAlertMessage('Please select a homeowner first before switching to homeowner view.');
        return;
      }
      
      // If a homeowner is selected in admin view, set them as active homeowner
      // Keep selectedAdminHomeownerId so targetHomeowner is still available
      const homeowner = homeowners.find(h => h.id === selectedAdminHomeownerId);
      if (homeowner) {
        setActiveHomeowner(homeowner);
        // Keep selectedAdminHomeownerId so we can show admin-style card
        setUserRole(UserRole.HOMEOWNER);
      } else {
        setAlertType('error');
        setAlertMessage('Selected homeowner not found. Please select a homeowner first.');
        return;
      }
      setCurrentBuilderId(null);
    } else if (userRole === UserRole.BUILDER) {
      // Switching from BUILDER - go to HOMEOWNER if homeowner selected, otherwise ADMIN
      if (selectedAdminHomeownerId) {
        const homeowner = homeowners.find(h => h.id === selectedAdminHomeownerId);
        if (homeowner) {
          setActiveHomeowner(homeowner);
          setUserRole(UserRole.HOMEOWNER);
          // Keep selectedAdminHomeownerId so we can show admin-style card
        } else {
          setUserRole(UserRole.ADMIN);
        }
      } else {
        setUserRole(UserRole.ADMIN);
      }
      setCurrentBuilderId(null);
    } else {
      // Switching from HOMEOWNER to ADMIN
      // Preserve the current active homeowner as selected in admin view
      if (activeHomeowner && activeHomeowner.id !== 'placeholder') {
        setSelectedAdminHomeownerId(activeHomeowner.id);
      }
      setUserRole(UserRole.ADMIN);
      setCurrentBuilderId(null);
    }
    setCurrentView('DASHBOARD');
    setSelectedClaimId(null);
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
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    // On mobile, check if this is an auto-open (no user interaction)
    if (isMobile && !userInteractionRef.current) {
      const timeSinceMount = Date.now() - mountTimeRef.current;
      const isInitialLoadPeriod = initialLoadRef.current && timeSinceMount < 5000;
      
      if (isInitialLoadPeriod || !userInteractionRef.current) {
        console.log('🚫 BLOCKING handleSelectClaim on mobile (no user interaction)', {
          claimId: claim.id,
          claimTitle: claim.title,
          isInitialLoadPeriod,
          timeSinceMount
        });
        return; // Don't open the claim detail view
      }
    }
    
    console.log('✅ Allowing handleSelectClaim', {
      isMobile,
      claimId: claim.id,
      hasUserInteraction: userInteractionRef.current
    });
    
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

  // Helper function to track task-related messages
  const trackTaskMessage = (taskId: string, messageData: {
    type: 'EMPLOYEE';
    threadId?: string;
    subject: string;
    recipient: string;
    recipientEmail: string;
    content: string;
    senderName: string;
  }) => {
    const newTaskMessage: TaskMessage = {
      id: crypto.randomUUID(),
      taskId,
      ...messageData,
      timestamp: new Date()
    };
    
    setTaskMessages(prev => {
      const updated = [...prev, newTaskMessage];
      saveState('cascade_task_messages', updated);
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
  
  // Handle navigation from search results
  const handleSearchNavigate = useCallback((url: string) => {
    // Parse the URL hash format: #view?param=value
    if (url.startsWith('#')) {
      const hash = url.substring(1);
      const [view, queryString] = hash.split('?');
      
      if (queryString) {
        const params = new URLSearchParams(queryString);
        
        // Handle different view types
        if (view === 'homeowners') {
          const homeownerId = params.get('homeownerId');
          if (homeownerId) {
            const homeowner = availableHomeowners.find(h => h.id === homeownerId);
            if (homeowner) {
              setSelectedAdminHomeownerId(homeownerId);
              setCurrentView('DASHBOARD');
            }
          }
        } else if (view === 'claims') {
          const claimId = params.get('claimId');
          if (claimId) {
            const claim = claims.find(c => c.id === claimId);
            if (claim) {
              handleSelectClaim(claim);
            }
          }
        } else if (view === 'schedule') {
          // Navigate to dashboard - schedule tab is handled by Dashboard component
          setCurrentView('DASHBOARD');
          // TODO: Add schedule tab support to dashboardConfig if needed
        } else if (view === 'chat') {
          // Navigate to dashboard - chat tab is handled by Dashboard component
          setCurrentView('DASHBOARD');
          // TODO: Add chat tab support to dashboardConfig if needed
        }
      } else {
        // Simple view navigation
        if (view === 'DASHBOARD' || view === 'TEAM' || view === 'DATA' || view === 'ANALYTICS' || view === 'TASKS' || view === 'HOMEOWNERS' || view === 'EMAIL_HISTORY' || view === 'BACKEND' || view === 'CALLS' || view === 'INVOICES') {
          setCurrentView(view as any);
        }
      }
    }
  }, [availableHomeowners, claims, handleSelectClaim]);
  
  // Cmd/Ctrl+K keyboard shortcut: focus/open inline Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        console.log('🔍 Cmd+K pressed - Dispatching global search event');
        e.preventDefault();
        window.dispatchEvent(new Event('cascade:global-search-open'));
      }
    };

    console.log('🎧 Global search keyboard listener registered');
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      console.log('🔇 Global search keyboard listener removed');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleUpdateClaim = async (updatedClaim: Claim) => {
    // Get the previous claim state to detect changes
    const previousClaim = claims.find(c => c.id === updatedClaim.id);
    
    setClaims(prev => prev.map(c => c.id === updatedClaim.id ? updatedClaim : c));

    if (isDbConfigured) {
      try {
        // Validate UUIDs
        const isValidUUID = (str: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(str);
        };
        const dbContractorId = (updatedClaim.contractorId && isValidUUID(updatedClaim.contractorId)) ? updatedClaim.contractorId : null;
        
        await db.update(claimsTable).set({
          title: updatedClaim.title,
          description: updatedClaim.description,
          status: updatedClaim.status as any,
          classification: updatedClaim.classification,
          dateEvaluated: updatedClaim.dateEvaluated || null,
          scheduledAt: updatedClaim.scheduledAt || null,
          completedAt: updatedClaim.completedAt || null,
          internalNotes: updatedClaim.internalNotes || null,
          nonWarrantyExplanation: updatedClaim.nonWarrantyExplanation || null,
          contractorId: dbContractorId, // Use validated UUID or null
          contractorName: updatedClaim.contractorName || null,
          contractorEmail: updatedClaim.contractorEmail || null,
          proposedDates: updatedClaim.proposedDates,
          attachments: updatedClaim.attachments || [],
        } as any).where(eq(claimsTable.id, updatedClaim.id));
      } catch (e) {
        console.error("Failed to update claim in DB:", e);
      }
    }

    // Email notification logic based on claim changes
    if (previousClaim) {
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
        : 'https://www.cascadeconnect.app';
      const claimLink = `${baseUrl}#claims?claimId=${updatedClaim.id}`;

      // 1. Appointment scheduling and acceptance logic
      // Check if status changed to SCHEDULED and there's an ACCEPTED date
      const acceptedDate = updatedClaim.proposedDates?.find(d => d.status === 'ACCEPTED');
      const previousAcceptedDate = previousClaim.proposedDates?.find(d => d.status === 'ACCEPTED');
      
      if (updatedClaim.status === ClaimStatus.SCHEDULED && 
          acceptedDate && 
          !previousAcceptedDate &&
          previousClaim.status !== ClaimStatus.SCHEDULED) {
        
        // Determine who scheduled/accepted the appointment
        // Get current user's email from available sources
        const currentUserEmailValue = authUser?.primaryEmailAddress?.emailAddress || 
                                      activeEmployee?.email || 
                                      activeHomeowner?.email || 
                                      '';
        
        const isAdminScheduling = userRole === UserRole.ADMIN || userRole === UserRole.BUILDER;
        const isHomeownerAcceptance = userRole === UserRole.HOMEOWNER && !updatedClaim.contractorName;
        // Sub acceptance: must be homeowner role (subs might log in as homeowners) AND 
        // current user's email must match the contractor's email on the claim
        const isSubAcceptance = userRole === UserRole.HOMEOWNER && 
                                 !!updatedClaim.contractorName && 
                                 !!updatedClaim.contractorEmail &&
                                 currentUserEmailValue &&
                                 currentUserEmailValue.toLowerCase().trim() === updatedClaim.contractorEmail.toLowerCase().trim();
        
        if (isAdminScheduling) {
          // Admin/Builder scheduled an appointment - send email to homeowner and assigned sub
          const homeownerEmail = updatedClaim.homeownerEmail;
          if (homeownerEmail) {
            const emailBody = `
An appointment has been scheduled for your warranty claim ${updatedClaim.claimNumber}:

Claim: ${updatedClaim.title}
Scheduled Date: ${new Date(acceptedDate.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${acceptedDate.timeSlot}
${updatedClaim.contractorName ? `Assigned Subcontractor: ${updatedClaim.contractorName}` : ''}

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Claim</a>
</div>
            `.trim();

            try {
              await sendEmail({
                to: homeownerEmail,
                subject: `Appointment Scheduled: ${updatedClaim.claimNumber} - ${updatedClaim.title}`,
                body: emailBody,
                fromName: 'Cascade Builder Services',
                fromRole: UserRole.ADMIN
              });
            } catch (error) {
              console.error(`Failed to send appointment scheduled notification to homeowner ${homeownerEmail}:`, error);
            }
          }
          
          // Also send email to assigned sub if there is one
          if (updatedClaim.contractorEmail) {
            const subEmailBody = `
An appointment has been scheduled for claim ${updatedClaim.claimNumber}:

Claim: ${updatedClaim.title}
Scheduled Date: ${new Date(acceptedDate.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${acceptedDate.timeSlot}
Homeowner: ${updatedClaim.homeownerName}

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Claim</a>
</div>
            `.trim();

            try {
              await sendEmail({
                to: updatedClaim.contractorEmail,
                subject: `Appointment Scheduled: ${updatedClaim.claimNumber} - ${updatedClaim.title}`,
                body: subEmailBody,
                fromName: 'Cascade Builder Services',
                fromRole: UserRole.ADMIN
              });
            } catch (error) {
              console.error(`Failed to send appointment scheduled notification to sub ${updatedClaim.contractorEmail}:`, error);
            }
          }
        } else if (isHomeownerAcceptance) {
          // Homeowner accepted an appointment date
          const emailBody = `
A homeowner has accepted an appointment date for claim ${updatedClaim.claimNumber}:

Claim: ${updatedClaim.title}
Scheduled Date: ${new Date(acceptedDate.date).toLocaleDateString()} at ${acceptedDate.timeSlot}
Homeowner: ${updatedClaim.homeownerName}

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Claim</a>
</div>
          `.trim();

          for (const emp of employees) {
            if (emp.emailNotifyHomeownerAcceptsAppointment !== false) {
              try {
                await sendEmail({
                  to: emp.email,
                  subject: `Appointment Accepted: ${updatedClaim.claimNumber} - ${updatedClaim.title}`,
                  body: emailBody,
                  fromName: 'Cascade Connect',
                  fromRole: UserRole.ADMIN
                });
              } catch (error) {
                console.error(`Failed to send appointment acceptance notification to ${emp.email}:`, error);
              }
            }
          }
          
          // Also send email to assigned sub if there is one
          if (updatedClaim.contractorEmail) {
            const subEmailBody = `
A homeowner has accepted an appointment date for claim ${updatedClaim.claimNumber}:

Claim: ${updatedClaim.title}
Scheduled Date: ${new Date(acceptedDate.date).toLocaleDateString()} at ${acceptedDate.timeSlot}
Homeowner: ${updatedClaim.homeownerName}

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Claim</a>
</div>
            `.trim();

            try {
              await sendEmail({
                to: updatedClaim.contractorEmail,
                subject: `Appointment Accepted: ${updatedClaim.claimNumber} - ${updatedClaim.title}`,
                body: subEmailBody,
                fromName: 'Cascade Connect System',
                fromRole: UserRole.ADMIN
              });
            } catch (error) {
              console.error(`Failed to send appointment acceptance notification to sub ${updatedClaim.contractorEmail}:`, error);
            }
          }
          
          // Send push notifications
          try {
            const { pushNotificationService } = await import('./services/pushNotificationService');
            const permission = await pushNotificationService.requestPermission();
            if (permission === 'granted') {
              for (const emp of employees) {
                if (emp.pushNotifyHomeownerAcceptsAppointment === true) {
                  await pushNotificationService.notifyAppointmentAccepted(
                    updatedClaim.title,
                    updatedClaim.homeownerName || 'Homeowner',
                    updatedClaim.id,
                    acceptedDate.date
                  );
                  break; // Only send one notification per browser session
                }
              }
            }
          } catch (error) {
            console.error('Error sending push notifications:', error);
          }
        } else if (isSubAcceptance) {
          // Sub actually accepted an appointment date from their account
          // Send email to admins
          const adminEmailBody = `
A subcontractor has accepted an appointment date for claim ${updatedClaim.claimNumber}:

Claim: ${updatedClaim.title}
Scheduled Date: ${new Date(acceptedDate.date).toLocaleDateString()} at ${acceptedDate.timeSlot}
Subcontractor: ${updatedClaim.contractorName}
Homeowner: ${updatedClaim.homeownerName}

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Claim</a>
</div>
          `.trim();

          for (const emp of employees) {
            if (emp.emailNotifySubAcceptsAppointment !== false) {
              try {
                await sendEmail({
                  to: emp.email,
                  subject: `Sub Accepted Appointment: ${updatedClaim.claimNumber} - ${updatedClaim.title}`,
                  body: adminEmailBody,
                  fromName: 'Cascade Connect',
                  fromRole: UserRole.ADMIN
                });
              } catch (error) {
                console.error(`Failed to send sub appointment acceptance notification to ${emp.email}:`, error);
              }
            }
          }
          
          // Send push notifications
          try {
            const { pushNotificationService } = await import('./services/pushNotificationService');
            const permission = await pushNotificationService.requestPermission();
            if (permission === 'granted') {
              for (const emp of employees) {
                if (emp.pushNotifySubAcceptsAppointment === true) {
                  await pushNotificationService.notifySubAcceptedAppointment(
                    updatedClaim.title,
                    updatedClaim.contractorName || 'Subcontractor',
                    updatedClaim.id
                  );
                  break; // Only send one notification per browser session
                }
              }
            }
          } catch (error) {
            console.error('Error sending push notifications:', error);
          }

          // Send email to homeowner
          const homeownerEmail = updatedClaim.homeownerEmail;
          if (homeownerEmail) {
            const homeownerEmailBody = `
The subcontractor has accepted the appointment date for your warranty claim ${updatedClaim.claimNumber}:

Claim: ${updatedClaim.title}
Scheduled Date: ${new Date(acceptedDate.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${acceptedDate.timeSlot}
Subcontractor: ${updatedClaim.contractorName}

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Claim</a>
</div>
            `.trim();

            try {
              await sendEmail({
                to: homeownerEmail,
                subject: `Sub Accepted Appointment: ${updatedClaim.claimNumber} - ${updatedClaim.title}`,
                body: homeownerEmailBody,
                fromName: 'Cascade Builder Services',
                fromRole: UserRole.ADMIN
              });
            } catch (error) {
              console.error(`Failed to send sub appointment acceptance notification to homeowner ${homeownerEmail}:`, error);
            }
          }
        }
      }

      // 3. Homeowner requests reschedule
      // Check if status changed from SCHEDULED to SCHEDULING
      if (previousClaim.status === ClaimStatus.SCHEDULED && 
          updatedClaim.status === ClaimStatus.SCHEDULING &&
          userRole === UserRole.HOMEOWNER) {
        const emailBody = `
A homeowner has requested to reschedule claim ${updatedClaim.claimNumber}:

Claim: ${updatedClaim.title}
Homeowner: ${updatedClaim.homeownerName}
Previous Scheduled Date: ${previousAcceptedDate ? `${new Date(previousAcceptedDate.date).toLocaleDateString()} at ${previousAcceptedDate.timeSlot}` : 'N/A'}

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Claim</a>
</div>
        `.trim();

        for (const emp of employees) {
          if (emp.emailNotifyHomeownerRescheduleRequest !== false) {
            try {
              await sendEmail({
                to: emp.email,
                subject: `Reschedule Requested: ${updatedClaim.claimNumber} - ${updatedClaim.title}`,
                body: emailBody,
                fromName: 'Cascade Connect System',
                fromRole: UserRole.ADMIN
              });
            } catch (error) {
              console.error(`Failed to send reschedule request notification to ${emp.email}:`, error);
            }
          }
        }
        
        // Send push notifications
        try {
          const { pushNotificationService } = await import('./services/pushNotificationService');
          const permission = await pushNotificationService.requestPermission();
          if (permission === 'granted') {
            for (const emp of employees) {
              if (emp.pushNotifyHomeownerRescheduleRequest === true) {
                await pushNotificationService.notifyRescheduleRequested(
                  updatedClaim.title,
                  updatedClaim.homeownerName || 'Homeowner',
                  updatedClaim.id
                );
                break; // Only send one notification per browser session
              }
            }
          }
        } catch (error) {
          console.error('Error sending push notifications:', error);
        }
      }
    }
  };

  const handleNewClaimStart = (homeownerId?: string) => {
    if (userRole === UserRole.BUILDER) return;
    setCurrentView('NEW');
  };

  const handleCreateClaim = async (data: Partial<Claim> | Partial<Claim>[]) => {
    const subjectHomeowner = ((userRole === UserRole.ADMIN || userRole === UserRole.BUILDER) && targetHomeowner) ? targetHomeowner : activeHomeowner;
    if (!subjectHomeowner) return;

    // Check if this is a batch submission (array)
    const isBatch = Array.isArray(data);
    
    // For batch submissions, use the batch API endpoint
    if (isBatch && userRole === UserRole.HOMEOWNER) {
      try {
        const batchData = data as Partial<Claim>[];
        
        // Validate homeowner data
        if (!subjectHomeowner.id) {
          alert('Error: Homeowner ID is required for batch submission.');
          return;
        }

        // Call batch API endpoint
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiEndpoint = isLocalDev 
          ? 'http://localhost:8888/api/claims/batch'
          : `${window.location.protocol}//${window.location.hostname.startsWith('www.') ? window.location.hostname : `www.${window.location.hostname}`}/api/claims/batch`;
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            claims: batchData,
            homeownerId: subjectHomeowner.id,
            homeownerData: {
              name: subjectHomeowner.name,
              email: subjectHomeowner.email,
              address: subjectHomeowner.address,
              builder: subjectHomeowner.builder,
              jobName: subjectHomeowner.jobName,
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        const createdClaims = result.claims || [];

        // Update local state with new claims
        const newClaims: Claim[] = createdClaims.map((c: any, index: number) => ({
          id: c.id,
          claimNumber: c.claimNumber,
          title: c.title,
          description: batchData[index].description || '',
          address: subjectHomeowner.address,
          homeownerName: subjectHomeowner.name,
          homeownerEmail: subjectHomeowner.email,
          builderName: subjectHomeowner.builder,
          jobName: subjectHomeowner.jobName,
          closingDate: subjectHomeowner.closingDate,
          status: ClaimStatus.SUBMITTED,
          classification: 'Unclassified',
          dateSubmitted: new Date(),
          proposedDates: [],
          comments: [],
          attachments: batchData[index].attachments || [],
        } as Claim));

        setClaims(prev => [...newClaims, ...prev]);

        // Send ONE summary email to all admins
        const baseUrl = typeof window !== 'undefined' 
          ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
          : 'https://www.cascadeconnect.app';

        // Generate HTML table for batch summary
        const claimsTableRows = createdClaims.map((c: any, index: number) => {
          const claimData = batchData[index];
          const claimLink = `${baseUrl}#claims?claimId=${c.id}`;
          return `
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 12px; text-align: left;">
                <a href="${claimLink}" style="display: inline-block; background-color: #3c6b80; color: #FFFFFF; text-decoration: none; padding: 4px 12px; border-radius: 100px; font-weight: 500; font-size: 12px; font-family: Arial, sans-serif;">#${c.claimNumber || 'N/A'}</a>
              </td>
              <td style="padding: 12px; text-align: left;">${c.title}</td>
              <td style="padding: 12px; text-align: left;">${(claimData.description || '').substring(0, 100)}${(claimData.description || '').length > 100 ? '...' : ''}</td>
              <td style="padding: 12px; text-align: center;">${(claimData.attachments || []).length}</td>
            </tr>
          `;
        }).join('');

        const emailBody = `
          <p><strong>${createdClaims.length} new warranty claim${createdClaims.length > 1 ? 's have' : ' has'} been submitted:</strong></p>
          
          <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px 0; font-family: Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f5f5f5; border-bottom: 2px solid #ddd;">
                <th style="padding: 12px; text-align: left; font-weight: bold;">Claim #</th>
                <th style="padding: 12px; text-align: left; font-weight: bold;">Title</th>
                <th style="padding: 12px; text-align: left; font-weight: bold;">Description</th>
                <th style="padding: 12px; text-align: center; font-weight: bold;">Attachments</th>
              </tr>
            </thead>
            <tbody>
              ${claimsTableRows}
            </tbody>
          </table>

          <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Homeowner:</strong> ${subjectHomeowner.name}</p>
            <p style="margin: 8px 0;"><strong>Address:</strong> ${subjectHomeowner.address}</p>
            <p style="margin: 8px 0;"><strong>Builder:</strong> ${subjectHomeowner.builder || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>Project:</strong> ${subjectHomeowner.jobName || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>Closing Date:</strong> ${subjectHomeowner.closingDate ? new Date(subjectHomeowner.closingDate).toLocaleDateString() : 'N/A'}</p>
          </div>

          <div style="margin: 20px 0; text-align: center;">
            <a href="${baseUrl}#claims" style="display: inline-block; background-color: #3c6b80; color: #FFFFFF; text-decoration: none; padding: 10px 24px; border-radius: 100px; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif; border: none; cursor: pointer;">View All Claims</a>
          </div>
        `.trim();

        // Send to all employees who have this preference enabled
        console.log(`📧 [EMAIL] Preparing to send batch claim notification emails to ${employees.length} employees`);
        let emailSuccessCount = 0;
        let emailFailureCount = 0;
        
        for (const emp of employees) {
          if (emp.emailNotifyClaimSubmitted !== false) {
            try {
              console.log(`📧 [EMAIL] Sending batch claim notification to ${emp.email}...`);
              await sendEmail({
                to: emp.email,
                subject: `New Batch of Warranty Claims Submitted: ${createdClaims.length} claim${createdClaims.length > 1 ? 's' : ''} from ${subjectHomeowner.name}`,
                body: emailBody,
                fromName: 'Cascade Connect System',
                fromRole: UserRole.ADMIN,
              });
              emailSuccessCount++;
              console.log(`✅ [EMAIL] Successfully sent batch claim notification to ${emp.email}`);
            } catch (error: any) {
              emailFailureCount++;
              console.error(`❌ [EMAIL] Failed to send batch claim notification to ${emp.email}:`, error?.message || error);
            }
          } else {
            console.log(`⏭️ [EMAIL] Skipping ${emp.email} (emailNotifyClaimSubmitted is disabled)`);
          }
        }
        
        console.log(`📧 [EMAIL] Batch claim notification summary: ${emailSuccessCount} sent, ${emailFailureCount} failed`);

        // Show submission success modal with AI analysis (if homeowner)
        if (userRole === UserRole.HOMEOWNER) {
          setSubmissionData({
            claimCount: createdClaims.length,
            aiAnalysis: result.aiAnalysis || null
          });
          setShowSubmissionSuccess(true);
          setCurrentView('DASHBOARD'); // Navigate to dashboard in background
        } else {
          // For admins, just show the alert
          setAlertType('success');
          setAlertMessage(`Successfully submitted ${createdClaims.length} claim${createdClaims.length > 1 ? 's' : ''}!`);
          setCurrentView('DASHBOARD');
        }
        return;
      } catch (error: any) {
        console.error('Batch submission error:', error);
        alert(`Failed to submit claims: ${error.message || 'Unknown error'}`);
        return;
      }
    }

    // Single claim submission (existing behavior for admins)
    const singleData = data as Partial<Claim>;

    // Generate claim number per homeowner (starting at 1 for each homeowner)
    // Count existing claims for this specific homeowner
    const existingClaimsForHomeowner = claims.filter(c => {
      // Match by homeowner ID if available, otherwise by email
      if (subjectHomeowner.id) {
        return (c as any).homeownerId === subjectHomeowner.id || 
               c.homeownerEmail === subjectHomeowner.email;
      }
      return c.homeownerEmail === subjectHomeowner.email;
    });
    
    // Find the highest claim number for this homeowner
    // Look for simple numeric claim numbers (1, 2, 3, etc.)
    let maxNumber = 0;
    existingClaimsForHomeowner.forEach(c => {
      if (c.claimNumber) {
        // Try to parse as a simple number (1, 2, 3, etc.)
        const num = parseInt(c.claimNumber, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    // If no simple numeric claim numbers found, check if we should start at 1
    // Otherwise, assign the next sequential number
    // This ensures each homeowner's claims start at 1 and increment sequentially
    const claimNumber = (maxNumber + 1).toString();

    const newClaim: Claim = {
      id: crypto.randomUUID(),
      claimNumber: claimNumber,
      title: singleData.title || '',
      description: singleData.description || '',
      address: subjectHomeowner.address,
      homeownerName: subjectHomeowner.name,
      homeownerEmail: subjectHomeowner.email,
      builderName: subjectHomeowner.builder,
      jobName: subjectHomeowner.jobName,
      closingDate: subjectHomeowner.closingDate,
      status: singleData.status || ClaimStatus.SUBMITTED,
      classification: singleData.classification || 'Unclassified',
      dateEvaluated: singleData.dateEvaluated,
      nonWarrantyExplanation: singleData.nonWarrantyExplanation,
      internalNotes: singleData.internalNotes,
      contractorId: singleData.contractorId,
      contractorName: singleData.contractorName,
      contractorEmail: singleData.contractorEmail,
      dateSubmitted: new Date(),
      proposedDates: singleData.proposedDates || [],
      comments: [],
      attachments: singleData.attachments || []
    } as any;
    
    // Add homeownerId to the claim object for filtering
    if (subjectHomeowner.id) {
      (newClaim as any).homeownerId = subjectHomeowner.id;
    }
    
    // DB Insert - CRITICAL: Must save to database FIRST before updating UI
    // This prevents claims from appearing in UI if database save fails
    if (isDbConfigured) {
      try {
        console.log("🔄 Attempting to save claim to database...");
        
        // Validate UUIDs
        const isValidUUID = (str: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(str);
        };
        const dbHomeownerId = (subjectHomeowner.id && isValidUUID(subjectHomeowner.id)) ? subjectHomeowner.id : null;
        const dbContractorId = (newClaim.contractorId && isValidUUID(newClaim.contractorId)) ? newClaim.contractorId : null;
        
        // CRITICAL: Validate homeownerId exists (required for fetching claims later)
        if (!dbHomeownerId) {
          const errorMsg = `❌ CRITICAL: Cannot save claim - homeownerId is missing or invalid. subjectHomeowner.id: ${subjectHomeowner.id}`;
          console.error(errorMsg);
          throw new Error("Cannot save claim: Homeowner ID is required");
        }
        
        console.log("📝 Claim data to insert:", {
          id: newClaim.id,
          homeownerId: dbHomeownerId,
          title: newClaim.title,
          claimNumber: newClaim.claimNumber
        });
        
        const [insertedClaim] = await db.insert(claimsTable).values({
          id: newClaim.id, // Explicit ID
          homeownerId: dbHomeownerId, // Use validated UUID or null
          title: newClaim.title,
          description: newClaim.description,
          claimNumber: newClaim.claimNumber || null,
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
          contractorId: dbContractorId, // Use validated UUID or null
          contractorName: newClaim.contractorName || null,
          contractorEmail: newClaim.contractorEmail || null,
          proposedDates: [],
          summary: null
        } as any).returning(); // CRITICAL: Return the inserted row
        
        console.log("✅ Claim saved to Neon database successfully:", insertedClaim.id);
        console.log("📊 Insert result:", insertedClaim);
        
        // Update newClaim with the actual database values (ensures consistency)
        if (insertedClaim) {
          newClaim.id = insertedClaim.id;
          newClaim.dateSubmitted = insertedClaim.dateSubmitted ? new Date(insertedClaim.dateSubmitted) : newClaim.dateSubmitted;
          (newClaim as any).homeownerId = insertedClaim.homeownerId;
        }
        
      } catch (e: any) {
        console.error("🔥 FAILED TO CREATE CLAIM - DATABASE ERROR:", e);
        console.error("Error details:", {
          message: e?.message || 'Unknown error',
          stack: e?.stack,
          name: e?.name,
          code: e?.code
        });
        
        // Show user-friendly error with more details
        const errorMsg = e?.message || 'Unknown database error';
        alert(`❌ FAILED TO SAVE CLAIM TO DATABASE\n\nError: ${errorMsg}\n\nThe claim was NOT saved. Please:\n1. Check your internet connection\n2. Try again\n3. Contact support if the issue persists`);
        
        // Re-throw to prevent the UI from proceeding as if save was successful
        throw e;
      }
    } else {
      console.error("❌ Database not configured - claim will NOT be saved permanently!");
      alert("❌ Database is not configured. Claims cannot be saved. Please contact your administrator.");
      throw new Error("Database not configured");
    }

    // ✅ Database save succeeded - NOW update UI state
    console.log("✅ Updating UI state with new claim");
    setClaims(prev => [newClaim, ...prev]);
    setCurrentView('DASHBOARD');

    // Send push notifications to admin users if claim was submitted by homeowner
    if (userRole === UserRole.HOMEOWNER && employees.length > 0) {
      try {
        const { pushNotificationService } = await import('./services/pushNotificationService');
        const permission = await pushNotificationService.requestPermission();
        if (permission === 'granted') {
          // Send push notification to each admin user who has this preference enabled
          for (const emp of employees) {
            if (emp.pushNotifyClaimSubmitted === true) {
              await pushNotificationService.notifyNewClaim(
                newClaim.title,
                subjectHomeowner.name,
                newClaim.id
              );
              break; // Only send one notification per browser session
            }
          }
        }
      } catch (error) {
        console.error('Error sending push notifications:', error);
      }
    }

    // Send email notification to admins (non-blocking)
    try {
      const { notificationService } = await import('./services/notificationService');
      await notificationService.notifyClaimSubmitted(newClaim, employees);
    } catch (emailError) {
      console.error('❌ Failed to send claim notification email:', emailError);
      // Don't block claim creation if email fails
    }

    // Send email notifications to users who have this preference enabled
    // Note: This only applies to single claim submissions (admin-created claims)
    // Batch submissions by homeowners send emails in the batch submission path above
    if (userRole === UserRole.HOMEOWNER && !isBatch) {
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
        : 'https://www.cascadeconnect.app';
      const claimLink = `${baseUrl}#claims?claimId=${newClaim.id}`;

      const emailBody = `
<p><strong>A new claim has been submitted:</strong></p>

<table style="width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px 0; font-family: Arial, sans-serif; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <tr style="border-bottom: 1px solid #e0e0e0;">
    <td style="padding: 12px; font-weight: bold; width: 150px;">Claim Number:</td>
    <td style="padding: 12px;">
      <a href="${claimLink}" style="display: inline-block; background-color: #3c6b80; color: #FFFFFF; text-decoration: none; padding: 4px 12px; border-radius: 100px; font-weight: 500; font-size: 12px; font-family: Arial, sans-serif;">#${newClaim.claimNumber}</a>
    </td>
  </tr>
  <tr style="border-bottom: 1px solid #e0e0e0;">
    <td style="padding: 12px; font-weight: bold;">Title:</td>
    <td style="padding: 12px;">${newClaim.title}</td>
  </tr>
  <tr style="border-bottom: 1px solid #e0e0e0;">
    <td style="padding: 12px; font-weight: bold;">Description:</td>
    <td style="padding: 12px;">${newClaim.description}</td>
  </tr>
  <tr style="border-bottom: 1px solid #e0e0e0;">
    <td style="padding: 12px; font-weight: bold;">Attachments:</td>
    <td style="padding: 12px;">${(newClaim.attachments || []).length} photo${(newClaim.attachments || []).length !== 1 ? 's' : ''}</td>
  </tr>
</table>

<div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 8px 0;"><strong>Homeowner:</strong> ${newClaim.homeownerName}</p>
  <p style="margin: 8px 0;"><strong>Address:</strong> ${newClaim.address}</p>
  <p style="margin: 8px 0;"><strong>Builder:</strong> ${subjectHomeowner.builder || 'N/A'}</p>
  <p style="margin: 8px 0;"><strong>Project:</strong> ${subjectHomeowner.jobName || 'N/A'}</p>
  <p style="margin: 8px 0;"><strong>Closing Date:</strong> ${subjectHomeowner.closingDate ? new Date(subjectHomeowner.closingDate).toLocaleDateString() : 'N/A'}</p>
</div>

<div style="margin: 20px 0; text-align: center;">
  <a href="${claimLink}" style="display: inline-block; background-color: #3c6b80; color: #FFFFFF; text-decoration: none; padding: 10px 24px; border-radius: 100px; font-weight: 500; font-size: 14px; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Claim</a>
</div>
      `.trim();

      // Send to all employees who have this preference enabled
      console.log(`📧 [EMAIL] Preparing to send single claim notification emails to ${employees.length} employees`);
      let emailSuccessCount = 0;
      let emailFailureCount = 0;
      
      for (const emp of employees) {
        if (emp.emailNotifyClaimSubmitted !== false) {
          try {
            console.log(`📧 [EMAIL] Sending single claim notification to ${emp.email}...`);
            await sendEmail({
              to: emp.email,
              subject: `New Claim Submitted: ${newClaim.claimNumber} - ${newClaim.title}`,
              body: emailBody,
              fromName: 'Cascade Connect',
              fromRole: UserRole.ADMIN
            });
            emailSuccessCount++;
            console.log(`✅ [EMAIL] Successfully sent single claim notification to ${emp.email}`);
          } catch (error: any) {
            emailFailureCount++;
            console.error(`❌ [EMAIL] Failed to send single claim notification to ${emp.email}:`, error?.message || error);
          }
        } else {
          console.log(`⏭️ [EMAIL] Skipping ${emp.email} (emailNotifyClaimSubmitted is disabled)`);
        }
      }
      
      console.log(`📧 [EMAIL] Single claim notification summary: ${emailSuccessCount} sent, ${emailFailureCount} failed`);
    }
  };

  const handleEnrollHomeowner = async (data: Partial<Homeowner>, tradeListFile: File | null, subcontractorList?: any[]) => {
    // Scan subcontractor list and add new subs to contractors database
    if (subcontractorList && subcontractorList.length > 0) {
      console.log('📋 Scanning subcontractor list for new contractors...');
      
      // Normalize column names (case-insensitive lookup)
      const findColumn = (row: any, possibleNames: string[]): string | null => {
        const rowKeys = Object.keys(row);
        for (const name of possibleNames) {
          const found = rowKeys.find(key => key.toLowerCase() === name.toLowerCase());
          if (found && row[found]) {
            return String(row[found]).trim();
          }
        }
        return null;
      };
      
      let addedCount = 0;
      let skippedCount = 0;
      
      for (const subRow of subcontractorList) {
        // Extract email (try multiple column name variations)
        const email = findColumn(subRow, ['email', 'e-mail', 'email address', 'contact email', 'sub email']);
        if (!email) {
          console.log('⚠️ Skipping sub row - no email found:', subRow);
          skippedCount++;
          continue;
        }
        
        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();
        
        // Extract name (try multiple column name variations)
        const name = findColumn(subRow, ['name', 'contact name', 'contact', 'company name', 'company', 'sub name', 'subcontractor name']);
        
        // Check if contractor already exists by email or name (check both local state and database)
        const existingContractorByEmail = contractors.find(c => c.email.toLowerCase().trim() === normalizedEmail);
        const existingContractorByName = name ? contractors.find(c => 
          c.contactName?.toLowerCase().trim() === name.toLowerCase().trim() ||
          c.companyName.toLowerCase().trim() === name.toLowerCase().trim()
        ) : null;
        
        if (existingContractorByEmail || existingContractorByName) {
          console.log(`✓ Contractor already exists in local state: ${normalizedEmail}${name ? ` or ${name}` : ''}`);
          skippedCount++;
          continue;
        }
        
        // Also check database if configured
        if (isDbConfigured) {
          try {
            const dbContractors = await db.select().from(contractorsTable).where(eq(contractorsTable.email, normalizedEmail));
            if (dbContractors.length > 0) {
              console.log(`✓ Contractor already exists in database: ${normalizedEmail}`);
              skippedCount++;
              continue;
            }
          } catch (error) {
            // If contractors table doesn't exist, continue with adding
            console.log('⚠️ Could not check database for existing contractors, continuing...');
          }
        }
        
        const companyName = findColumn(subRow, ['company name', 'company', 'business name', 'firm name']) || name || 'Unknown Company';
        const contactName = name || findColumn(subRow, ['contact', 'contact person', 'rep name']) || '';
        
        // Extract phone (try multiple column name variations)
        const phone = findColumn(subRow, ['phone', 'phone number', 'contact phone', 'telephone', 'mobile', 'cell phone']) || undefined;
        
        // Extract specialty if available
        const specialty = findColumn(subRow, ['specialty', 'specialty type', 'trade', 'type', 'category']) || 'General';
        
        // Create new contractor
        const newContractor: Contractor = {
          id: crypto.randomUUID(),
          companyName: companyName,
          contactName: contactName || null,
          email: normalizedEmail,
          phone: phone,
          specialty: specialty
        };
        
        // Add to contractors database
        try {
          await handleAddContractor(newContractor);
          addedCount++;
          console.log(`✅ Added new contractor: ${companyName} (${normalizedEmail})`);
        } catch (error) {
          console.error(`❌ Failed to add contractor ${normalizedEmail}:`, error);
        }
      }
      
      console.log(`📊 Sub contractor scan complete: ${addedCount} added, ${skippedCount} skipped`);
    }
    
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
          // Use selective query to avoid errors if email notification columns don't exist
          let dbAdmins;
          try {
            dbAdmins = await db.select().from(usersTable).where(eq(usersTable.role, 'ADMIN'));
          } catch (selectError: any) {
            // Fallback to selective query if email notification columns don't exist
            if (selectError?.message?.includes('email_notify')) {
              dbAdmins = await db.select({
                id: usersTable.id,
                name: usersTable.name,
                email: usersTable.email,
                role: usersTable.role,
                password: usersTable.password,
                builderGroupId: usersTable.builderGroupId
              }).from(usersTable).where(eq(usersTable.role, 'ADMIN'));
            } else {
              throw selectError;
            }
          }
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
      
      // Send notifications to all employees who have preferences enabled
      if (employees.length > 0) {
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

        // Import push notification service
        const pushNotificationServiceModule = await import('./services/pushNotificationService');
        const pushNotificationService = pushNotificationServiceModule.pushNotificationService;

        // Send email and push notifications to all employees who have preferences enabled
        for (const emp of employees) {
          // Skip mock emails
          if (isMockEmail(emp.email || '')) {
            continue;
          }

          // Send email notification if preference is enabled
          if (emp.emailNotifyHomeownerEnrollment !== false) {
            try {
              console.log('📧 Sending enrollment notification email to:', emp.email);
              const emailResult = await sendEmail({
                to: emp.email!,
                subject: `New Homeowner Enrollment: ${newHomeowner.name}`,
                body: emailBody,
                fromName: 'Cascade Connect System',
                fromRole: UserRole.ADMIN
              });
              
              if (emailResult) {
                console.log('✅ Enrollment notification email sent successfully to:', emp.email);
              } else {
                console.warn('⚠️ Email service returned false - email may not have been sent');
              }
            } catch (error) {
              console.error(`Failed to send enrollment notification email to ${emp.email}:`, error);
            }
          }

          // Send push notification if preference is enabled
          if (emp.pushNotifyHomeownerEnrollment === true) {
            try {
              const permission = await pushNotificationService.requestPermission();
              if (permission === 'granted') {
                await pushNotificationService.notifyHomeownerEnrollment(newHomeowner.name, newHomeowner.id);
                console.log('✅ Enrollment push notification sent to:', emp.email);
              }
            } catch (error) {
              console.error(`Failed to send enrollment push notification to ${emp.email}:`, error);
            }
          }
        }
      } else {
        console.warn('⚠️ No employees found - enrollment notification not sent');
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
                      status: c.status,
                      address: c.address,
                      homeownerEmail: c.homeownerEmail,
                      dateSubmitted: c.dateSubmitted,
                  } as any))).returning(); // Return inserted rows
               } catch (batchErr) {
                   console.warn("Batch failed, trying sequential insert...", batchErr);
                   // Fallback: One by one
                   for (const c of batch) {
                       await db.insert(claimsTable).values({
                           id: c.id,
                           title: c.title,
                           description: c.description,
                           status: c.status,
                           address: c.address,
                           homeownerEmail: c.homeownerEmail,
                           dateSubmitted: c.dateSubmitted,
                       } as any).returning(); // Return inserted row
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

  const handleClearClaims = async () => {
      setClaims([]);
      if (isDbConfigured) {
         try {
           await db.delete(claimsTable);
         } catch (e) {
           console.error("Failed to clear claims from DB", e);
         }
      }
  };

  const handleClearContractors = async () => {
      setContractors([]);
      if (isDbConfigured) {
         try {
           await db.delete(contractorsTable);
         } catch (e) {
           console.error("Failed to clear contractors from DB", e);
         }
      }
  };

  const handleClearTasks = async () => {
      setTasks([]);
      if (isDbConfigured) {
         try {
           await db.delete(tasksTable);
         } catch (e) {
           console.error("Failed to clear tasks from DB", e);
         }
      }
  };

  const handleClearMessages = async () => {
      setMessages([]);
      if (isDbConfigured) {
         try {
           await db.delete(messageThreadsTable);
         } catch (e) {
           console.error("Failed to clear messages from DB", e);
         }
      }
  };

  const handleClearBuilders = async () => {
      setBuilderGroups([]);
      setBuilderUsers([]);
      if (isDbConfigured) {
         try {
           await db.delete(builderGroupsTable);
           // Builder users are in usersTable, so we need to delete them separately
           // Note: This will delete ALL builder users, not just those associated with builder groups
           // For a more precise deletion, we'd need to filter by role or builderGroupId
           const builderUserIds = builderUsers.map(u => u.id);
           if (builderUserIds.length > 0) {
             for (const userId of builderUserIds) {
               await db.delete(usersTable).where(eq(usersTable.id, userId));
             }
           }
         } catch (e) {
           console.error("Failed to clear builders from DB", e);
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
      setClaims(prev => {
        const deleteEmail = homeownerToDelete.email?.toLowerCase().trim() || '';
        return prev.filter(c => {
          const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
          return claimEmail !== deleteEmail;
        });
      });
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
  const handleAddTask = async (taskData: Partial<Task>): Promise<void> => {
    const newTask: Task = {
      // Allow callers to pre-generate an id (so UI can open/select the task immediately)
      id: taskData.id ?? crypto.randomUUID(),
      // Allow blank titles (""), but still default if title is undefined/null
      title: taskData.title ?? 'New Task',
      description: taskData.description ?? '',
      assignedToId: taskData.assignedToId || activeEmployee.id,
      assignedById: activeEmployee.id,
      isCompleted: false,
      dateAssigned: new Date(),
      dueDate: taskData.dueDate || new Date(Date.now() + 86400000),
      relatedClaimIds: taskData.relatedClaimIds || []
    };
    
    // Update state first (useEffect will save to localStorage)
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
        console.log('✅ Task saved to database:', newTask.id);
      } catch (e) {
        console.error("Failed to save task to DB", e);
        throw e; // Re-throw to let the form handler catch it
      }
    }

    // Send email notification to the assigned user if they have this preference enabled
    const assignedEmployee = employees.find(e => e.id === newTask.assignedToId);
    if (assignedEmployee && assignedEmployee.emailNotifyTaskAssigned !== false) {
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
        : 'https://www.cascadeconnect.app';
      const taskLink = `${baseUrl}#tasks`;

      const assignerName = employees.find(e => e.id === newTask.assignedById)?.name || 'System';
      const emailBody = `
A new task has been assigned to you:

Task: ${newTask.title}
${newTask.description ? `Description: ${newTask.description}` : ''}
Due Date: ${newTask.dueDate ? new Date(newTask.dueDate).toLocaleDateString() : 'Not set'}
Assigned By: ${assignerName}

<div style="margin: 20px 0;">
  <a href="${taskLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Tasks</a>
</div>
      `.trim();

      try {
        await sendEmail({
          to: assignedEmployee.email,
          subject: `New Task Assigned: ${newTask.title}`,
          body: emailBody,
          fromName: 'Cascade Connect System',
          fromRole: UserRole.ADMIN
        });
      } catch (error) {
        console.error(`Failed to send task assignment notification to ${assignedEmployee.email}:`, error);
        // Don't throw - email failure shouldn't prevent task creation
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
  
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      if (isDbConfigured) {
        // Update task in database
        await db.update(tasksTable)
          .set({
            ...updates,
            // Ensure date fields are properly handled
            dateAssigned: updates.dateAssigned ? new Date(updates.dateAssigned) : undefined,
            dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
          })
          .where(eq(tasksTable.id, taskId));
      } else {
        // Update task in local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId 
              ? { ...task, ...updates }
              : task
          )
        );
      }
    } catch (error) {
      console.error('Error updating task:', error);
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
           console.log('💾 Saving employee to database:', emp.name, emp.role);
           await db.insert(usersTable).values({
             id: emp.id,
             name: emp.name,
             email: emp.email,
             role: 'ADMIN',
             internalRole: emp.role, // Store the actual role (Administrator, Employee, etc.)
             password: emp.password,
             emailNotifyClaimSubmitted: emp.emailNotifyClaimSubmitted !== false,
             emailNotifyHomeownerAcceptsAppointment: emp.emailNotifyHomeownerAcceptsAppointment !== false,
             emailNotifySubAcceptsAppointment: emp.emailNotifySubAcceptsAppointment !== false,
             emailNotifyHomeownerRescheduleRequest: emp.emailNotifyHomeownerRescheduleRequest !== false,
            emailNotifyTaskAssigned: emp.emailNotifyTaskAssigned !== false,
            emailNotifyHomeownerEnrollment: emp.emailNotifyHomeownerEnrollment !== false,
            pushNotifyClaimSubmitted: emp.pushNotifyClaimSubmitted === true,
             pushNotifyHomeownerAcceptsAppointment: emp.pushNotifyHomeownerAcceptsAppointment === true,
             pushNotifySubAcceptsAppointment: emp.pushNotifySubAcceptsAppointment === true,
             pushNotifyHomeownerRescheduleRequest: emp.pushNotifyHomeownerRescheduleRequest === true,
             pushNotifyTaskAssigned: emp.pushNotifyTaskAssigned === true,
             pushNotifyHomeownerMessage: emp.pushNotifyHomeownerMessage === true,
             pushNotifyHomeownerEnrollment: emp.pushNotifyHomeownerEnrollment === true
           } as any);
           console.log('✅ Employee saved to database successfully');
         } catch(e) { 
           console.error('❌ Failed to save employee to database:', e);
           alert(`Failed to save employee to database: ${e instanceof Error ? e.message : 'Unknown error'}\n\nNote: If the error mentions "internal_role", you need to run the database migration first.`);
         }
      } else {
        console.warn('⚠️ Database not configured, employee only saved to localStorage');
      }
  };

  const handleUpdateEmployee = async (emp: InternalEmployee) => { 
      console.log('🔄 Updating employee:', emp.name, 'Role:', emp.role, 'ID:', emp.id);
      setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e)); 
      if (isDbConfigured) {
        try {
          console.log('💾 Updating employee in database...');
          await db.update(usersTable).set({
            name: emp.name,
            email: emp.email,
            internalRole: emp.role, // Update the internal role
            emailNotifyClaimSubmitted: emp.emailNotifyClaimSubmitted !== false,
            emailNotifyHomeownerAcceptsAppointment: emp.emailNotifyHomeownerAcceptsAppointment !== false,
            emailNotifySubAcceptsAppointment: emp.emailNotifySubAcceptsAppointment !== false,
            emailNotifyHomeownerRescheduleRequest: emp.emailNotifyHomeownerRescheduleRequest !== false,
            emailNotifyTaskAssigned: emp.emailNotifyTaskAssigned !== false,
            emailNotifyHomeownerEnrollment: emp.emailNotifyHomeownerEnrollment !== false,
            pushNotifyClaimSubmitted: emp.pushNotifyClaimSubmitted === true,
            pushNotifyHomeownerAcceptsAppointment: emp.pushNotifyHomeownerAcceptsAppointment === true,
            pushNotifySubAcceptsAppointment: emp.pushNotifySubAcceptsAppointment === true,
            pushNotifyHomeownerRescheduleRequest: emp.pushNotifyHomeownerRescheduleRequest === true,
            pushNotifyTaskAssigned: emp.pushNotifyTaskAssigned === true,
            pushNotifyHomeownerMessage: emp.pushNotifyHomeownerMessage === true,
            pushNotifyHomeownerEnrollment: emp.pushNotifyHomeownerEnrollment === true
          }).where(eq(usersTable.id, emp.id));
          console.log('✅ Employee updated in database successfully with role:', emp.role);
        } catch(e) { 
          console.error('❌ Failed to update employee in database:', e);
          alert(`Failed to update employee in database: ${e instanceof Error ? e.message : 'Unknown error'}\n\nThe change was saved locally but may not persist after refresh.`);
        }
      } else {
        console.warn('⚠️ Database not configured, employee only saved to localStorage');
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
          // Validate UUID
          const isValidUUID = (str: string) => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(str);
          };
          const dbId = (sub.id && isValidUUID(sub.id)) ? sub.id : crypto.randomUUID();
          
          await db.insert(contractorsTable).values({
             id: dbId,
             companyName: sub.companyName,
             contactName: sub.contactName || null,
             email: sub.email,
             phone: sub.phone || null,
             specialty: sub.specialty
          } as any);
          console.log("✅ Contractor saved to database");
        } catch(e: any) { 
          console.error("Failed to save contractor to database:", e);
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
             phone: sub.phone || null,
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
    // Scan subcontractor list and add new subs to contractors database
    if (updatedHomeowner.subcontractorList && updatedHomeowner.subcontractorList.length > 0) {
      console.log('📋 Scanning subcontractor list for new contractors...');
      
      // Normalize column names (case-insensitive lookup)
      const findColumn = (row: any, possibleNames: string[]): string | null => {
        const rowKeys = Object.keys(row);
        for (const name of possibleNames) {
          const found = rowKeys.find(key => key.toLowerCase() === name.toLowerCase());
          if (found && row[found]) {
            return String(row[found]).trim();
          }
        }
        return null;
      };
      
      let addedCount = 0;
      let skippedCount = 0;
      
      for (const subRow of updatedHomeowner.subcontractorList) {
        // Extract email (try multiple column name variations)
        const email = findColumn(subRow, ['email', 'e-mail', 'email address', 'contact email', 'sub email']);
        if (!email) {
          console.log('⚠️ Skipping sub row - no email found:', subRow);
          skippedCount++;
          continue;
        }
        
        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();
        
        // Extract name (try multiple column name variations)
        const name = findColumn(subRow, ['name', 'contact name', 'contact', 'company name', 'company', 'sub name', 'subcontractor name']);
        
        // Check if contractor already exists by email or name (check both local state and database)
        const existingContractorByEmail = contractors.find(c => c.email.toLowerCase().trim() === normalizedEmail);
        const existingContractorByName = name ? contractors.find(c => 
          c.contactName?.toLowerCase().trim() === name.toLowerCase().trim() ||
          c.companyName.toLowerCase().trim() === name.toLowerCase().trim()
        ) : null;
        
        if (existingContractorByEmail || existingContractorByName) {
          console.log(`✓ Contractor already exists: ${normalizedEmail}${name ? ` or ${name}` : ''}`);
          skippedCount++;
          continue;
        }
        
        // Also check database if configured
        if (isDbConfigured) {
          try {
            const dbContractors = await db.select().from(contractorsTable).where(eq(contractorsTable.email, normalizedEmail));
            if (dbContractors.length > 0) {
              console.log(`✓ Contractor already exists in database: ${normalizedEmail}`);
              skippedCount++;
              continue;
            }
          } catch (error) {
            // If contractors table doesn't exist, continue with adding
            console.log('⚠️ Could not check database for existing contractors, continuing...');
          }
        }
        
        const companyName = findColumn(subRow, ['company name', 'company', 'business name', 'firm name']) || name || 'Unknown Company';
        const contactName = name || findColumn(subRow, ['contact', 'contact person', 'rep name']) || '';
        
        // Extract phone (try multiple column name variations)
        const phone = findColumn(subRow, ['phone', 'phone number', 'contact phone', 'telephone', 'mobile', 'cell phone']) || undefined;
        
        // Extract specialty if available
        const specialty = findColumn(subRow, ['specialty', 'specialty type', 'trade', 'type', 'category']) || 'General';
        
        // Create new contractor
        const newContractor: Contractor = {
          id: crypto.randomUUID(),
          companyName: companyName,
          contactName: contactName || null,
          email: normalizedEmail,
          phone: phone,
          specialty: specialty
        };
        
        // Add to contractors database
        try {
          await handleAddContractor(newContractor);
          addedCount++;
          console.log(`✅ Added new contractor: ${companyName} (${normalizedEmail})`);
        } catch (error) {
          console.error(`❌ Failed to add contractor ${normalizedEmail}:`, error);
        }
      }
      
      console.log(`📊 Sub contractor scan complete: ${addedCount} added, ${skippedCount} skipped`);
    }

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
          builderGroupId: updatedHomeowner.builderId || null, // Legacy
          builderUserId: updatedHomeowner.builderUserId || null, // NEW: Direct link to builder user
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
    
    // Generate thumbnail for PDFs
    let thumbnailUrl: string | undefined = undefined;
    if (doc.type === 'PDF' && doc.url) {
      try {
        const { generatePDFThumbnail } = await import('./lib/pdfThumbnail');
        thumbnailUrl = await generatePDFThumbnail(doc.url);
        console.log("✅ PDF thumbnail generated");
      } catch (error) {
        console.error("Failed to generate PDF thumbnail:", error);
        // Continue without thumbnail - not critical
      }
    }
    
    const newDoc: HomeownerDocument = {
      id: crypto.randomUUID(),
      homeownerId: homeownerId, // Keep original for local storage
      name: doc.name || 'Untitled Document',
      uploadedBy: doc.uploadedBy || 'System',
      uploadDate: new Date(),
      url: doc.url || '#',
      type: doc.type || 'FILE',
      thumbnailUrl: thumbnailUrl
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

  const handleDeleteDocument = async (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));

    if (isDbConfigured) {
      try {
        await db.delete(documentsTable).where(eq(documentsTable.id, docId));
        console.log("✅ Document deleted from database");
      } catch(e) { 
        console.error("Failed to delete document from DB:", e);
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
      } else {
        // Try to find a task with matching subject (format: "Task: {task title}")
        if (updatedThread.subject.startsWith('Task: ')) {
          const taskTitle = updatedThread.subject.replace('Task: ', '');
          const associatedTask = tasks.find(t => t.title === taskTitle);
          if (associatedTask) {
            // Find the recipient (the creator or assigned user, depending on who sent the message)
            const recipient = employees.find(e => e.id === updatedThread!.homeownerId);
            if (recipient) {
              trackTaskMessage(associatedTask.id, {
                type: 'EMPLOYEE',
                threadId: updatedThread.id,
                subject: updatedThread.subject,
                recipient: recipient.name,
                recipientEmail: recipient.email,
                content: content,
                senderName: activeEmployee.name
              });
            }
          }
        }
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

    // Send email notification to homeowner when admin creates new thread
    if (userRole === UserRole.ADMIN) {
      const homeowner = homeowners.find(h => h.id === homeownerId);
      if (homeowner) {
        const baseUrl = typeof window !== 'undefined' 
          ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
          : 'https://www.cascadeconnect.app';
        const messagesLink = `${baseUrl}#messages${newThread.id ? `?threadId=${newThread.id}` : ''}`;

        try {
          await sendEmail({
            to: homeowner.email,
            subject: subject,
            body: generateNotificationBody(sender.name, content, 'MESSAGE', newThread.id, messagesLink),
            fromName: sender.name,
            fromRole: userRole,
            replyToId: newThread.id,
            replyToEmail: `${newThread.id}@replies.cascadeconnect.app` // Use subdomain format
          });
          console.log(`✅ Sent new thread notification email to ${homeowner.email}`);
        } catch (error) {
          console.error('Failed to send new thread notification email:', error);
        }
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

  const handleContactAboutTask = async (task: Task) => {
    // Find the task creator (assignedById) and the assigned user (assignedToId)
    const taskCreator = employees.find(e => e.id === task.assignedById);
    const assignedUser = employees.find(e => e.id === task.assignedToId);
    
    if (!taskCreator || !assignedUser) {
      console.error('Task creator or assigned user not found');
      return;
    }

    // Create a thread from the assigned user (assignedToId) to the creator (assignedById)
    const threadSubject = `Task: ${task.title}`;
    
    // Use the creator's ID as the homeownerId for thread identification
    const existingThread = messages.find(t => 
      t.subject === threadSubject && 
      t.homeownerId === taskCreator.id
    );
    
    let threadIdToOpen = '';

    if (existingThread) {
      threadIdToOpen = existingThread.id;
    } else {
      const newId = crypto.randomUUID();
      threadIdToOpen = newId;
      
      const initialMessageContent = `Started a conversation about task: ${task.title}`;
      
      const newThread: MessageThread = {
        id: newId,
        subject: threadSubject,
        homeownerId: taskCreator.id, // Using creator's ID as homeownerId for thread identification
        participants: [assignedUser.name, taskCreator.name],
        isRead: true,
        lastMessageAt: new Date(),
        messages: [{
          id: crypto.randomUUID(),
          senderId: assignedUser.id,
          senderName: assignedUser.name,
          senderRole: UserRole.ADMIN,
          content: initialMessageContent,
          timestamp: new Date()
        }]
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

      // Send email to the task creator
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
        : 'https://www.cascadeconnect.app';
      const messagesLink = `${baseUrl}#messages${newThread.id ? `?threadId=${newThread.id}` : ''}`;

      const emailBody = generateNotificationBody(
        assignedUser.name,
        initialMessageContent,
        'MESSAGE',
        newThread.id,
        messagesLink
      );

      try {
        await sendEmail({
          to: taskCreator.email,
          subject: `Re: ${threadSubject}`,
          body: emailBody,
          fromName: assignedUser.name,
          fromRole: UserRole.ADMIN,
          replyToId: newThread.id,
          replyToEmail: `${newThread.id}@replies.cascadeconnect.app` // Use subdomain format
        });
      } catch (error) {
        console.error('Failed to send task message email:', error);
      }

      // Track task-related message
      trackTaskMessage(task.id, {
        type: 'EMPLOYEE',
        threadId: newThread.id,
        subject: threadSubject,
        recipient: taskCreator.name,
        recipientEmail: taskCreator.email,
        content: initialMessageContent,
        senderName: assignedUser.name
      });
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

  // Use Clerk's session to determine if we show AuthScreen
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
  
  // Show loading screen only if auth is still loading and hasn't timed out, OR if role is being determined
  if ((!isLoaded && !authTimeout) || (effectiveIsSignedIn && isRoleLoading)) {
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
  const TEMP_DISABLE_AUTH = false; // Changed to false to enable proper Clerk authentication
  
  // Check if user explicitly logged out (read directly from sessionStorage, don't use state to avoid re-render loops)
  const hasLoggedOut = typeof window !== 'undefined' && sessionStorage.getItem('cascade_logged_out') === 'true';
  const forceShowLogin = typeof window !== 'undefined' && sessionStorage.getItem('cascade_force_login') === 'true';
  const bypassLogin = typeof window !== 'undefined' && sessionStorage.getItem('cascade_bypass_login') === 'true';
  
  // Show AuthScreen if:
  // 1. Auth is enabled and user is not signed in, OR
  // 2. User explicitly logged out, OR
  // 3. User wants to force show login (for testing when auth is disabled)
  // BUT: If user IS signed in with Clerk, always proceed to app (even if TEMP_DISABLE_AUTH is true)
  // BUT: If bypass login is set, skip auth screen
  const shouldShowAuthScreen = 
    !bypassLogin && (
      (!TEMP_DISABLE_AUTH && (!effectiveIsSignedIn && effectiveIsLoaded || hasLoggedOut)) || 
      (TEMP_DISABLE_AUTH && (hasLoggedOut || forceShowLogin) && !effectiveIsSignedIn)
    );
  
  if (shouldShowAuthScreen) {
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

  // Determine if user is logged in as admin account (has activeEmployee)
  const isAdminAccount = !!activeEmployee && activeEmployee.id !== 'placeholder';
  
  // Check if in development mode with bypass login and no homeowner selected
  const isDevelopmentBypass = typeof window !== 'undefined' && 
    sessionStorage.getItem('cascade_bypass_login') === 'true';
  const showDevHomeownerSelector = isDevelopmentBypass && 
    userRole === UserRole.ADMIN && 
    !selectedAdminHomeownerId &&
    availableHomeowners.length > 0;

  return (
    <>
      {/* Development-Only: Floating Homeowner Selector */}
      {showDevHomeownerSelector && (
        <div className="fixed bottom-6 right-6 z-[150]">
          <button
            onClick={() => {
              // Show homeowners list modal
              const homeownersList = availableHomeowners.map((h, i) => `${i + 1}. ${h.name} - ${h.jobName || h.address}`).join('\n');
              const selection = prompt(`🔧 DEV MODE: Select Homeowner\n\n${homeownersList}\n\nEnter number (1-${availableHomeowners.length}):`);
              
              if (selection) {
                const index = parseInt(selection) - 1;
                if (index >= 0 && index < availableHomeowners.length) {
                  handleSelectHomeowner(availableHomeowners[index]);
                }
              }
            }}
            className="group bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 animate-pulse hover:animate-none"
            title="Development Mode: Select a homeowner to test with"
          >
            <User className="h-6 w-6" />
            <span className="text-sm font-medium whitespace-nowrap">
              Select Homeowner
            </span>
          </button>
          <p className="text-xs text-center mt-2 text-gray-600 dark:text-gray-400">
            🔧 Dev Only
          </p>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertMessage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
          onClick={() => {
            setAlertMessage(null);
            setAlertType('info');
          }}
        >
          <div 
            className="bg-surface dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  alertType === 'success' 
                    ? 'bg-green-100 dark:bg-green-900/20' 
                    : alertType === 'error'
                    ? 'bg-red-100 dark:bg-red-900/20'
                    : 'bg-primary-container dark:bg-primary/20'
                }`}>
                  {alertType === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : alertType === 'error' ? (
                    <Info className="h-5 w-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <Info className="h-5 w-5 text-primary" />
                  )}
                </div>
                <h2 className="text-lg font-normal text-surface-on dark:text-gray-100">
                  {alertType === 'success' ? 'Success' : alertType === 'error' ? 'Error' : 'Notice'}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setAlertMessage(null);
                  setAlertType('info');
                }} 
                className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-surface-on dark:text-gray-100">
                {alertMessage}
              </p>
            </div>

            <div className="p-4 bg-surface-container dark:bg-gray-700 flex justify-end border-t border-surface-outline-variant dark:border-gray-700">
              <button
                onClick={() => {
                  setAlertMessage(null);
                  setAlertType('info');
                }}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-on dark:text-white font-medium rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

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
      currentView={currentView}
      onSignOut={async () => {
        // Mark as logged out in sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('cascade_logged_out', 'true');
          sessionStorage.setItem('cascade_force_login', 'true'); // Force show login screen
          sessionStorage.removeItem('cascade_bypass_login'); // Clear bypass flag to show login screen
        }
        await signOut();
      }}
      isAdminAccount={isAdminAccount}
      currentUser={activeEmployee}
      onGlobalSearchNavigate={handleSearchNavigate}
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
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          onSelectHomeowner={handleSelectHomeowner}
          documents={documents}
          onUploadDocument={handleUploadDocument}
          onDeleteDocument={handleDeleteDocument}
          messages={messages}
          onSendMessage={handleSendMessage}
          onCreateThread={handleCreateThread}
          onUpdateThread={handleUpdateThread}
          onAddInternalNote={addInternalNoteToClaim}
          onTrackClaimMessage={trackClaimMessage}
          onUpdateClaim={handleUpdateClaim}
          contractors={contractors}
          claimMessages={claimMessages || []}
          taskMessages={taskMessages || []}
          onTrackTaskMessage={trackTaskMessage}
          onSendTaskMessage={handleContactAboutTask}
          builderGroups={builderGroups}
          builderUsers={builderUsers}
          currentBuilderId={currentBuilderId}
          currentUserEmail={
            authUser?.primaryEmailAddress?.emailAddress || 
            activeEmployee?.email || 
            activeHomeowner?.email || 
            undefined
          }
          initialTab={dashboardConfig.initialTab}
          initialThreadId={dashboardConfig.initialThreadId}
          tasks={tasks}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          onNavigate={setCurrentView}
        />
      )}
      {currentView === 'TASKS' && (
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
          onDeleteDocument={handleDeleteDocument}
          messages={messages}
          onSendMessage={handleSendMessage}
          onCreateThread={handleCreateThread}
          onUpdateThread={handleUpdateThread}
          onAddInternalNote={addInternalNoteToClaim}
          onTrackClaimMessage={trackClaimMessage}
          onUpdateClaim={handleUpdateClaim}
          contractors={contractors}
          claimMessages={claimMessages || []}
          taskMessages={taskMessages || []}
          onTrackTaskMessage={trackTaskMessage}
          onSendTaskMessage={handleContactAboutTask}
          builderGroups={builderGroups}
          builderUsers={builderUsers}
          currentBuilderId={currentBuilderId}
          currentUserEmail={
            authUser?.primaryEmailAddress?.emailAddress || 
            activeEmployee?.email ||
            activeHomeowner?.email || 
            undefined
          }
          initialTab="TASKS"
          initialThreadId={null}
          tasks={tasks}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          onNavigate={setCurrentView}
        />
      )}
      {currentView === 'TEAM' && (
        <React.Suspense fallback={<div className="p-6 text-surface-on-variant">Loading…</div>}>
          <InternalUserManagement 
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
            homeowners={homeowners}
            onAddBuilderUser={handleAddBuilderUser}
            onUpdateBuilderUser={handleUpdateBuilderUser}
            onDeleteBuilderUser={handleDeleteBuilderUser}
            onClose={() => setCurrentView('DASHBOARD')}
            initialTab="EMPLOYEES"
            currentUser={activeEmployee}
          />
        </React.Suspense>
      )}
      {currentView === 'DATA' && (
        <React.Suspense fallback={<div className="p-6 text-surface-on-variant">Loading…</div>}>
          <UnifiedImportDashboard 
            onClose={() => setCurrentView('DASHBOARD')}
          />
        </React.Suspense>
      )}
      {currentView === 'HOMEOWNERS' && (
        <React.Suspense fallback={<div className="p-6 text-surface-on-variant">Loading…</div>}>
          <HomeownersList 
            homeowners={availableHomeowners}
            builderGroups={builderGroups}
            builderUsers={builderUsers}
            onUpdateHomeowner={handleUpdateHomeowner}
            onDeleteHomeowner={handleDeleteHomeowner}
            onClose={() => setCurrentView('DASHBOARD')}
          />
        </React.Suspense>
      )}
      {currentView === 'EMAIL_HISTORY' && (
        <React.Suspense fallback={<div className="p-6 text-surface-on-variant">Loading…</div>}>
          <EmailHistory onClose={() => setCurrentView('DASHBOARD')} />
        </React.Suspense>
      )}
      {currentView === 'BACKEND' && (
        <React.Suspense fallback={<div className="p-6 text-surface-on-variant">Loading…</div>}>
          <BackendDashboard onClose={() => setCurrentView('DASHBOARD')} />
        </React.Suspense>
      )}
      {currentView === 'ANALYTICS' && (
        <React.Suspense fallback={<div className="p-6 text-surface-on-variant">Loading…</div>}>
          <WarrantyAnalytics
            claims={claims}
            homeowners={availableHomeowners}
            builderGroups={builderGroups}
            builderUsers={builderUsers}
            claimMessages={claimMessages as any}
            onSelectClaim={(claim) => {
              handleSelectClaim(claim);
            }}
            onClose={() => {
              setCurrentView('DASHBOARD');
              navigate('/');
            }}
          />
        </React.Suspense>
      )}
      {currentView === 'SETTINGS' && (
        <React.Suspense fallback={<div className="p-6 text-surface-on-variant">Loading…</div>}>
          <Settings onNavigate={setCurrentView} />
        </React.Suspense>
      )}
      {currentView === 'NEW' && (
        <div className="flex flex-col h-screen overflow-hidden">
          {/* Fixed Header */}
          <div className="flex-none bg-surface border-b border-surface-outline-variant px-8 py-6">
            <h2 className="text-2xl font-normal text-surface-on">Create Warranty Claim</h2>
          </div>
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-4xl mx-auto">
              <React.Suspense fallback={<div className="p-6 text-surface-on-variant">Loading…</div>}>
                <NewClaimForm 
                  onSubmit={handleCreateClaim} 
                  onCancel={() => setCurrentView('DASHBOARD')} 
                  contractors={contractors} 
                  activeHomeowner={(userRole === UserRole.ADMIN || userRole === UserRole.BUILDER) && targetHomeowner ? targetHomeowner : activeHomeowner} 
                  userRole={userRole} 
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      )}
      {currentView === 'DETAIL' && selectedClaim && (
        <React.Suspense fallback={<div className="p-6 text-surface-on-variant">Loading…</div>}>
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
        </React.Suspense>
      )}
      <HomeownerEnrollment isOpen={isEnrollmentOpen} onClose={() => setIsEnrollmentOpen(false)} onEnroll={handleEnrollHomeowner} builderGroups={builderGroups} />
      
      {/* Global Tasks Sheet */}
      <TasksSheet
        onNavigateToClaim={(claimId) => {
          const claim = claims.find((c) => c.id === claimId);
          if (claim) {
            handleSelectClaim(claim);
          }
        }}
        claims={claims}
      />
      
      {/* Submission Success Modal with AI Analysis */}
      <SubmissionSuccessModal
        isOpen={showSubmissionSuccess}
        onClose={() => {
          setShowSubmissionSuccess(false);
          setSubmissionData(null);
        }}
        claimCount={submissionData?.claimCount || 0}
        aiAnalysis={submissionData?.aiAnalysis || null}
      />
      
      {/* Global Modal Provider - Renders all stacked modals */}
      <LazyAppProviders />
    </Layout>
    </>
  );
}

export default App;
