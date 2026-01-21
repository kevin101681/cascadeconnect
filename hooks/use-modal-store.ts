/**
 * Global Modal Store - Zustand
 * 
 * Manages modal state with support for stacking multiple modals.
 * Uses LIFO (Last In, First Out) for closing modals.
 * Each modal has a unique ID to allow multiple instances of the same type.
 * 
 * Usage:
 * ```tsx
 * import { useModalStore } from '@/hooks/use-modal-store';
 * 
 * // Open a modal
 * const { onOpen } = useModalStore();
 * onOpen('INVOICE_FORM', { invoiceId: '123' });
 * 
 * // Close the top modal (most recent)
 * const { onClose } = useModalStore();
 * onClose();
 * 
 * // Get current modals
 * const { modals } = useModalStore();
 * const isOpen = modals.length > 0;
 * const currentModal = modals[modals.length - 1];
 * ```
 */

import { create } from 'zustand';

// Modal Type Enum - Add your modal types here
export type ModalType =
  | 'INVOICE_FORM'
  | 'BUILDER_DETAILS'
  | 'HOMEOWNER_DETAILS'
  | 'CLAIM_DETAILS'
  | 'TASK_DETAILS'
  | 'MESSAGE_COMPOSE'
  | 'DOCUMENT_VIEWER'
  | 'IMAGE_VIEWER'
  | 'APPOINTMENT_FORM'
  | 'CONTRACTOR_FORM'
  | 'CONFIRM_DELETE'
  | 'EXPORT_MODAL'
  | 'IMPORT_MODAL'
  | 'SETTINGS_MODAL';

// Modal Data Interface - Extend this for specific modal data types
export interface ModalData {
  // Invoice Modal
  invoiceId?: string;
  invoiceData?: any;
  
  // Homeowner Modal
  homeownerId?: string;
  homeownerData?: any;
  
  // Claim Modal
  claimId?: string;
  claimData?: any;
  
  // Task Modal
  taskId?: string;
  taskData?: any;
  
  // Builder Modal
  builderId?: string;
  builderData?: any;
  
  // Contractor Modal
  contractorId?: string;
  contractorData?: any;
  
  // Document/Image Viewer
  documentUrl?: string;
  documentName?: string;
  imageUrl?: string;
  imageUrls?: string[];
  imageIndex?: number;
  
  // Message Compose
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  subject?: string;
  
  // Appointment Form
  appointmentId?: string;
  appointmentData?: any;
  homeownerForAppointment?: any;
  
  // Confirmation Modal
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  variant?: 'danger' | 'warning' | 'info';
  
  // Generic data
  [key: string]: any;
}

// Modal Instance Interface
export interface ModalInstance {
  id: string;           // Unique ID for this modal instance
  type: ModalType;      // Type of modal
  data?: ModalData;     // Optional data payload
  timestamp: number;    // When the modal was opened (for debugging)
}

// Store State Interface
interface ModalStore {
  modals: ModalInstance[];
  
  // Actions
  onOpen: (type: ModalType, data?: ModalData) => string;
  onClose: () => void;
  onCloseSpecific: (id: string) => void;
  onCloseAll: () => void;
  
  // Utility methods
  isOpen: (type: ModalType) => boolean;
  getModalData: (type: ModalType) => ModalData | undefined;
  getCurrentModal: () => ModalInstance | undefined;
}

// Generate unique ID for modal instances
const generateId = (): string => {
  return `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create the store
export const useModalStore = create<ModalStore>((set, get) => ({
  modals: [],
  
  /**
   * Open a new modal
   * Adds the modal to the end of the array (top of the stack)
   * 
   * @param type - The type of modal to open
   * @param data - Optional data to pass to the modal
   * @returns The unique ID of the opened modal
   */
  onOpen: (type: ModalType, data?: ModalData) => {
    const id = generateId();
    const newModal: ModalInstance = {
      id,
      type,
      data,
      timestamp: Date.now(),
    };
    
    set((state) => ({
      modals: [...state.modals, newModal],
    }));
    
    console.log(`📂 Modal opened: ${type} (ID: ${id})`);
    return id;
  },
  
  /**
   * Close the top modal (most recently opened)
   * Uses LIFO (Last In, First Out) strategy
   */
  onClose: () => {
    const { modals } = get();
    
    if (modals.length === 0) {
      console.warn('⚠️ Attempted to close modal but none are open');
      return;
    }
    
    const closedModal = modals[modals.length - 1];
    console.log(`📂 Modal closed: ${closedModal.type} (ID: ${closedModal.id})`);
    
    set((state) => ({
      modals: state.modals.slice(0, -1),
    }));
  },
  
  /**
   * Close a specific modal by ID
   * Useful for closing a modal that's not on top of the stack
   * 
   * @param id - The unique ID of the modal to close
   */
  onCloseSpecific: (id: string) => {
    const { modals } = get();
    const modalToClose = modals.find(m => m.id === id);
    
    if (!modalToClose) {
      console.warn(`⚠️ Attempted to close modal with ID ${id} but it doesn't exist`);
      return;
    }
    
    console.log(`📂 Modal closed (specific): ${modalToClose.type} (ID: ${id})`);
    
    set((state) => ({
      modals: state.modals.filter(m => m.id !== id),
    }));
  },
  
  /**
   * Close all open modals
   * Resets the modal stack to empty
   */
  onCloseAll: () => {
    const { modals } = get();
    
    if (modals.length === 0) {
      return;
    }
    
    console.log(`📂 All modals closed (${modals.length} modals)`);
    
    set({
      modals: [],
    });
  },
  
  /**
   * Check if a specific modal type is currently open
   * 
   * @param type - The modal type to check
   * @returns True if at least one modal of this type is open
   */
  isOpen: (type: ModalType) => {
    const { modals } = get();
    return modals.some(m => m.type === type);
  },
  
  /**
   * Get the data of the topmost modal of a specific type
   * 
   * @param type - The modal type to get data for
   * @returns The modal data or undefined if not found
   */
  getModalData: (type: ModalType) => {
    const { modals } = get();
    // Find the last (topmost) modal of this type
    const modal = [...modals].reverse().find(m => m.type === type);
    return modal?.data;
  },
  
  /**
   * Get the current (topmost) modal
   * 
   * @returns The current modal instance or undefined if none are open
   */
  getCurrentModal: () => {
    const { modals } = get();
    return modals.length > 0 ? modals[modals.length - 1] : undefined;
  },
}));

// Convenience hooks for common operations
export const useCurrentModal = () => {
  const getCurrentModal = useModalStore(state => state.getCurrentModal);
  return getCurrentModal();
};

export const useIsModalOpen = (type: ModalType) => {
  const isOpen = useModalStore(state => state.isOpen(type));
  return isOpen;
};

export const useModalData = <T = ModalData>(type: ModalType) => {
  const getModalData = useModalStore(state => state.getModalData);
  return getModalData(type) as T | undefined;
};

// Export types for use in components
export type { ModalStore };

