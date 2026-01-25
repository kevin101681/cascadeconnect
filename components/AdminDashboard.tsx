import React from 'react';
import { AdminDesktop } from './admin/AdminDesktop';
import { AdminMobile } from './admin/AdminMobile';
import { useDashboardInitialization } from '../hooks/dashboard/useDashboardInitialization';
import type { Claim, ClaimStatus, UserRole, Homeowner, InternalEmployee, HomeownerDocument, MessageThread, Message, BuilderGroup, BuilderUser, Task, Contractor, Call } from '../types';
import type { ClaimMessage, TaskMessage } from './MessageSummaryModal';

/**
 * Admin Dashboard Router (Phase 8 - Controller/View Refactor)
 * 
 * Splits the Admin experience by platform to prevent bugs and isolate logic.
 * Follows the same pattern as HomeownerDashboard.
 * 
 * Architecture Benefits:
 * - Mobile-specific code (gestures, responsive UI) isolated in AdminMobile
 * - Desktop-specific code (sidebar, split views) isolated in AdminDesktop
 * - No more scattered `{isMobile && ...}` conditionals
 * - Platform-specific bugs can't affect the other platform
 * - Easier to maintain and test each view independently
 * 
 * Migration Status:
 * - ✅ AdminMobile: Uses HomeownerMobile for homeowner context, search UI for admin-only
 * - 🚧 AdminDesktop: Temporarily renders from original code, full extraction pending
 */

// Tab types for dashboard navigation (imported from initialization hook for consistency)
export type { TabType } from '../hooks/dashboard/useDashboardInitialization';

export interface DashboardProps {
  // Tab types for dashboard navigation
  claims: Claim[];
  userRole: UserRole;
  onSelectClaim: (claim: Claim, startInEditMode?: boolean) => void;
  onNewClaim: (homeownerId?: string) => void;
  onCreateClaim?: (data: Partial<Claim>) => void;
  homeowners: Homeowner[];
  activeHomeowner: Homeowner | null;
  employees: InternalEmployee[];
  currentUser: InternalEmployee;
  
  // Passed from App based on Search
  targetHomeowner: Homeowner | null;
  onClearHomeownerSelection: () => void;
  onUpdateHomeowner?: (homeowner: Homeowner) => void;
  
  // Search Props for Homeowner Search Bar
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchResults?: Homeowner[];
  onSelectHomeowner?: (homeowner: Homeowner) => void;
  
  // Documents
  documents: HomeownerDocument[];
  onUploadDocument: (doc: Partial<HomeownerDocument>) => void;
  onDeleteDocument?: (docId: string) => void;

  // Messaging
  messages: MessageThread[];
  onSendMessage: (threadId: string, content: string) => void;
  onCreateThread: (homeownerId: string, subject: string, content: string) => void;
  
  // Builder Users (for dropdown selections)
  builderUsers?: BuilderUser[];
  onUpdateThread?: (threadId: string, updates: Partial<MessageThread>) => void;
  onAddInternalNote?: (claimId: string, noteText: string, userName?: string) => Promise<void>;
  onTrackClaimMessage?: (claimId: string, messageData: {
    type: 'HOMEOWNER' | 'SUBCONTRACTOR';
    threadId?: string;
    subject: string;
    recipient: string;
    recipientEmail: string;
    content: string;
    senderName: string;
  }) => void;
  onUpdateClaim?: (claim: Claim) => void;
  contractors?: Contractor[];
  claimMessages?: ClaimMessage[];
  taskMessages?: TaskMessage[];
  onTrackTaskMessage?: (taskId: string, messageData: {
    type: 'EMPLOYEE';
    threadId?: string;
    subject: string;
    recipient: string;
    recipientEmail: string;
    content: string;
    senderName: string;
  }) => void;
  onSendTaskMessage?: (task: Task) => void;

  // Builder Groups for Dropdown
  builderGroups?: BuilderGroup[];
  
  // Additional props for filtering
  currentBuilderId?: string | null; // Builder group ID for builder users
  currentUserEmail?: string; // Current user's email for contractor matching

  // Initial State Control (Optional)
  initialTab?: string | null; // Accept string for flexibility
  initialThreadId?: string | null;

  // Tasks Widget Support
  tasks?: Task[];
  onAddTask: (task: Partial<Task>) => Promise<void> | void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onNavigate?: (view: 'DASHBOARD' | 'TEAM' | 'DATA' | 'TASKS' | 'INVOICES' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND' | 'CALLS') => void;

  // Internal Users Management (for Settings Tab)
  onAddEmployee?: (emp: InternalEmployee) => void;
  onUpdateEmployee?: (emp: InternalEmployee) => void;
  onDeleteEmployee?: (id: string) => void;
  onAddContractor?: (contractor: Contractor) => void;
  onUpdateContractor?: (contractor: Contractor) => void;
  onDeleteContractor?: (id: string) => void;
  onAddBuilderUser?: (user: BuilderUser, password?: string) => void;
  onUpdateBuilderUser?: (user: BuilderUser, password?: string) => void;
  onDeleteBuilderUser?: (id: string) => void;
  onDeleteHomeowner?: (id: string) => void;
  onDataReset?: () => void;
  onOpenTemplatesModal?: (tab?: 'warranty' | 'messages', prefill?: {subject?: string; body?: string}) => void;
}

export const AdminDashboard: React.FC<DashboardProps> = (props) => {
  const { isMobileView } = useDashboardInitialization();

  // Route to platform-specific component
  if (isMobileView) {
    return <AdminMobile {...props} />;
  }

  return <AdminDesktop {...props} />;
};

// Default export for backward compatibility
export default AdminDashboard;
