/**
 * Modal Management Hook
 * Centralized state management for all secondary modals in Dashboard
 */

import { useState, useCallback, useMemo } from 'react';
import type { HomeownerDocument, Claim } from '../../types';

export interface UseModalManagementReturn {
  // PDF Viewer Modal
  selectedDocument: HomeownerDocument | null;
  isPDFViewerOpen: boolean;
  openPDFViewer: (document: HomeownerDocument) => void;
  closePDFViewer: () => void;
  
  // Description Expand Modal (currently unused but available)
  expandedDescription: Claim | null;
  openDescriptionModal: (claim: Claim) => void;
  closeDescriptionModal: () => void;
  
  // Invite Homeowner Modal
  showInviteModal: boolean;
  setShowInviteModal: (show: boolean) => void;
  inviteName: string;
  inviteEmail: string;
  invitePhone: string;
  inviteAddress: string;
  inviteBody: string;
  isDrafting: boolean;
  openInviteModal: () => void;
  closeInviteModal: () => void;
  setInviteName: (name: string) => void;
  setInviteEmail: (email: string) => void;
  setInvitePhone: (phone: string) => void;
  setInviteAddress: (address: string) => void;
  setInviteBody: (body: string) => void;
  setIsDrafting: (drafting: boolean) => void;
  resetInviteForm: () => void;
  
  // Documents Upload Modal
  showDocsModal: boolean;
  setShowDocsModal: (show: boolean) => void;
  isDocUploading: boolean;
  openDocsModal: () => void;
  closeDocsModal: () => void;
  setIsDocUploading: (uploading: boolean) => void;
  
  // Edit Homeowner Modal
  showEditHomeownerModal: boolean;
  setShowEditHomeownerModal: (show: boolean) => void;
  editHomeownerName: string;
  editHomeownerEmail: string;
  editHomeownerPhone: string;
  editHomeownerAddress: string;
  editHomeownerStreet2: string;
  editHomeownerCity: string;
  editHomeownerState: string;
  editHomeownerZip: string;
  editHomeownerBuilder: string;
  editHomeownerBuilderId: string;
  editHomeownerJobName: string;
  editHomeownerClosingDate: string;
  editSubFile: File | null;
  editParsedSubs: any[];
  isParsingSubs: boolean;
  openEditHomeownerModal: (homeowner: {
    name: string;
    email: string;
    phone: string;
    address: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    builder?: string;
    builderId?: string;
    jobName?: string;
    closingDate?: string;
  }) => void;
  closeEditHomeownerModal: () => void;
  setEditHomeownerName: (name: string) => void;
  setEditHomeownerEmail: (email: string) => void;
  setEditHomeownerPhone: (phone: string) => void;
  setEditHomeownerAddress: (address: string) => void;
  setEditHomeownerStreet2: (street2: string) => void;
  setEditHomeownerCity: (city: string) => void;
  setEditHomeownerState: (state: string) => void;
  setEditHomeownerZip: (zip: string) => void;
  setEditHomeownerBuilder: (builder: string) => void;
  setEditHomeownerBuilderId: (builderId: string) => void;
  setEditHomeownerJobName: (jobName: string) => void;
  setEditHomeownerClosingDate: (closingDate: string) => void;
  setEditSubFile: (file: File | null) => void;
  setEditParsedSubs: (subs: any[]) => void;
  setIsParsingSubs: (parsing: boolean) => void;
  
  // Subcontractor List Modal
  showSubListModal: boolean;
  setShowSubListModal: (show: boolean) => void;
  openSubListModal: () => void;
  closeSubListModal: () => void;
  
  // Check if any modal is open (for body scroll locking)
  isAnySecondaryModalOpen: boolean;
  
  // Close all modals
  closeAllModals: () => void;
}

/**
 * Hook for managing all secondary modals in Dashboard
 */
export function useModalManagement(): UseModalManagementReturn {
  // PDF Viewer state
  const [selectedDocument, setSelectedDocument] = useState<HomeownerDocument | null>(null);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);
  
  // Description expand popup state (currently unused but available)
  const [expandedDescription, setExpandedDescription] = useState<Claim | null>(null);
  
  // Invite Modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteAddress, setInviteAddress] = useState('');
  const [inviteBody, setInviteBody] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  
  // Documents Modal state
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [isDocUploading, setIsDocUploading] = useState(false);
  
  // Edit Homeowner Modal state
  const [showEditHomeownerModal, setShowEditHomeownerModal] = useState(false);
  const [editHomeownerName, setEditHomeownerName] = useState('');
  const [editHomeownerEmail, setEditHomeownerEmail] = useState('');
  const [editHomeownerPhone, setEditHomeownerPhone] = useState('');
  const [editHomeownerAddress, setEditHomeownerAddress] = useState('');
  const [editHomeownerStreet2, setEditHomeownerStreet2] = useState('');
  const [editHomeownerCity, setEditHomeownerCity] = useState('');
  const [editHomeownerState, setEditHomeownerState] = useState('');
  const [editHomeownerZip, setEditHomeownerZip] = useState('');
  const [editHomeownerBuilder, setEditHomeownerBuilder] = useState('');
  const [editHomeownerBuilderId, setEditHomeownerBuilderId] = useState('');
  const [editHomeownerJobName, setEditHomeownerJobName] = useState('');
  const [editHomeownerClosingDate, setEditHomeownerClosingDate] = useState('');
  const [editSubFile, setEditSubFile] = useState<File | null>(null);
  const [editParsedSubs, setEditParsedSubs] = useState<any[]>([]);
  const [isParsingSubs, setIsParsingSubs] = useState(false);
  
  // Subcontractor List Modal state
  const [showSubListModal, setShowSubListModal] = useState(false);
  
  // PDF Viewer methods
  const openPDFViewer = useCallback((document: HomeownerDocument) => {
    setSelectedDocument(document);
    setIsPDFViewerOpen(true);
  }, []);
  
  const closePDFViewer = useCallback(() => {
    setIsPDFViewerOpen(false);
    setSelectedDocument(null);
  }, []);
  
  // Description modal methods
  const openDescriptionModal = useCallback((claim: Claim) => {
    setExpandedDescription(claim);
  }, []);
  
  const closeDescriptionModal = useCallback(() => {
    setExpandedDescription(null);
  }, []);
  
  // Invite modal methods
  const openInviteModal = useCallback(() => {
    setShowInviteModal(true);
  }, []);
  
  const closeInviteModal = useCallback(() => {
    setShowInviteModal(false);
  }, []);
  
  const resetInviteForm = useCallback(() => {
    setInviteName('');
    setInviteEmail('');
    setInvitePhone('');
    setInviteAddress('');
    setInviteBody('');
    setIsDrafting(false);
  }, []);
  
  // Documents modal methods
  const openDocsModal = useCallback(() => {
    setShowDocsModal(true);
  }, []);
  
  const closeDocsModal = useCallback(() => {
    setShowDocsModal(false);
  }, []);
  
  // Edit Homeowner modal methods
  const openEditHomeownerModal = useCallback((homeowner: {
    name: string;
    email: string;
    phone: string;
    address: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    builder?: string;
    builderId?: string;
    jobName?: string;
    closingDate?: string;
  }) => {
    setEditHomeownerName(homeowner.name);
    setEditHomeownerEmail(homeowner.email);
    setEditHomeownerPhone(homeowner.phone);
    setEditHomeownerAddress(homeowner.address);
    setEditHomeownerStreet2(homeowner.street2 || '');
    setEditHomeownerCity(homeowner.city || '');
    setEditHomeownerState(homeowner.state || '');
    setEditHomeownerZip(homeowner.zip || '');
    setEditHomeownerBuilder(homeowner.builder || '');
    setEditHomeownerBuilderId(homeowner.builderId || '');
    setEditHomeownerJobName(homeowner.jobName || '');
    setEditHomeownerClosingDate(homeowner.closingDate || '');
    setShowEditHomeownerModal(true);
  }, []);
  
  const closeEditHomeownerModal = useCallback(() => {
    setShowEditHomeownerModal(false);
  }, []);
  
  // Subcontractor list modal methods
  const openSubListModal = useCallback(() => {
    setShowSubListModal(true);
  }, []);
  
  const closeSubListModal = useCallback(() => {
    setShowSubListModal(false);
  }, []);
  
  // Check if any secondary modal is open
  const isAnySecondaryModalOpen = useMemo(() => {
    return showInviteModal || 
           showDocsModal || 
           showEditHomeownerModal || 
           showSubListModal || 
           isPDFViewerOpen ||
           expandedDescription !== null;
  }, [showInviteModal, showDocsModal, showEditHomeownerModal, showSubListModal, isPDFViewerOpen, expandedDescription]);
  
  // Close all modals
  const closeAllModals = useCallback(() => {
    closePDFViewer();
    closeDescriptionModal();
    closeInviteModal();
    closeDocsModal();
    closeEditHomeownerModal();
    closeSubListModal();
  }, [closePDFViewer, closeDescriptionModal, closeInviteModal, closeDocsModal, closeEditHomeownerModal, closeSubListModal]);
  
  return {
    // PDF Viewer
    selectedDocument,
    isPDFViewerOpen,
    openPDFViewer,
    closePDFViewer,
    
    // Description Modal
    expandedDescription,
    openDescriptionModal,
    closeDescriptionModal,
    
    // Invite Modal
    showInviteModal,
    setShowInviteModal,
    inviteName,
    inviteEmail,
    invitePhone,
    inviteAddress,
    inviteBody,
    isDrafting,
    openInviteModal,
    closeInviteModal,
    setInviteName,
    setInviteEmail,
    setInvitePhone,
    setInviteAddress,
    setInviteBody,
    setIsDrafting,
    resetInviteForm,
    
    // Documents Modal
    showDocsModal,
    setShowDocsModal,
    isDocUploading,
    openDocsModal,
    closeDocsModal,
    setIsDocUploading,
    
    // Edit Homeowner Modal
    showEditHomeownerModal,
    setShowEditHomeownerModal,
    editHomeownerName,
    editHomeownerEmail,
    editHomeownerPhone,
    editHomeownerAddress,
    editHomeownerStreet2,
    editHomeownerCity,
    editHomeownerState,
    editHomeownerZip,
    editHomeownerBuilder,
    editHomeownerBuilderId,
    editHomeownerJobName,
    editHomeownerClosingDate,
    editSubFile,
    editParsedSubs,
    isParsingSubs,
    openEditHomeownerModal,
    closeEditHomeownerModal,
    setEditHomeownerName,
    setEditHomeownerEmail,
    setEditHomeownerPhone,
    setEditHomeownerAddress,
    setEditHomeownerStreet2,
    setEditHomeownerCity,
    setEditHomeownerState,
    setEditHomeownerZip,
    setEditHomeownerBuilder,
    setEditHomeownerBuilderId,
    setEditHomeownerJobName,
    setEditHomeownerClosingDate,
    setEditSubFile,
    setEditParsedSubs,
    setIsParsingSubs,
    
    // Subcontractor List Modal
    showSubListModal,
    setShowSubListModal,
    openSubListModal,
    closeSubListModal,
    
    // Utilities
    isAnySecondaryModalOpen,
    closeAllModals
  };
}
