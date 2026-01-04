/**
 * Modal Provider Component
 * 
 * Renders all open modals from the global modal store.
 * Supports stacking multiple modals with proper z-index layering.
 * Each modal is rendered based on its type from the store.
 * 
 * Usage:
 * Add <ModalProvider /> to your root layout or App component.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useModalStore } from '@/hooks/use-modal-store';
import type { ModalType } from '@/hooks/use-modal-store';

// ============================================================================
// PLACEHOLDER MODAL COMPONENTS
// Replace these with your actual modal components as you build them
// ============================================================================

interface ModalComponentProps {
  data?: any;
  modalId: string;
  onClose: () => void;
}

const InvoiceFormModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-2xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Invoice Form</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        Invoice ID: {data?.invoiceId || 'New'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const BuilderDetailsModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-2xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Builder Details</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        Builder ID: {data?.builderId || 'Unknown'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const HomeownerDetailsModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-2xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Homeowner Details</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        Homeowner ID: {data?.homeownerId || 'Unknown'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const ClaimDetailsModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-4xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Claim Details</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        Claim ID: {data?.claimId || 'Unknown'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const TaskDetailsModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-2xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Task Details</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        Task ID: {data?.taskId || 'Unknown'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const MessageComposeModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-2xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Compose Message</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        To: {data?.recipientName || data?.recipientEmail || 'Unknown'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const DocumentViewerModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-4xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Document Viewer</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        Document: {data?.documentName || 'Unknown'}
      </p>
      <p className="text-xs text-surface-on-variant dark:text-gray-500 mb-4">
        URL: {data?.documentUrl || 'No URL'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const ImageViewerModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-4xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Image Viewer</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        {data?.imageUrls ? `${data.imageUrls.length} images` : 'Single image'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const AppointmentFormModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-2xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Appointment Form</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        {data?.appointmentId ? 'Edit Appointment' : 'New Appointment'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const ContractorFormModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-2xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Contractor Form</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        Contractor ID: {data?.contractorId || 'New'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const ConfirmDeleteModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-md w-full">
      <h2 className="text-2xl font-semibold mb-4 text-red-600 dark:text-red-400">
        {data?.title || 'Confirm Delete'}
      </h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-6">
        {data?.message || 'Are you sure you want to delete this item?'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => {
            data?.onConfirm?.();
            onClose();
          }}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          {data?.confirmText || 'Delete'}
        </button>
        <button
          onClick={() => {
            data?.onCancel?.();
            onClose();
          }}
          className="flex-1 px-4 py-2 bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100 rounded-lg hover:bg-surface-container-high dark:hover:bg-gray-600"
        >
          {data?.cancelText || 'Cancel'}
        </button>
      </div>
    </div>
  </div>
);

const ExportModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-2xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Export Data</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        Choose export format and options
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const ImportModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-2xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Import Data</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        Upload file to import data
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

const SettingsModal: React.FC<ModalComponentProps> = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 p-6 max-w-3xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Settings</h2>
      <p className="text-surface-on-variant dark:text-gray-400 mb-4">
        Application settings and preferences
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  </div>
);

// ============================================================================
// MODAL COMPONENTS MAPPING
// Maps modal types to their corresponding React components
// ============================================================================

const MODAL_COMPONENTS: Record<ModalType, React.FC<ModalComponentProps>> = {
  INVOICE_FORM: InvoiceFormModal,
  BUILDER_DETAILS: BuilderDetailsModal,
  HOMEOWNER_DETAILS: HomeownerDetailsModal,
  CLAIM_DETAILS: ClaimDetailsModal,
  TASK_DETAILS: TaskDetailsModal,
  MESSAGE_COMPOSE: MessageComposeModal,
  DOCUMENT_VIEWER: DocumentViewerModal,
  IMAGE_VIEWER: ImageViewerModal,
  APPOINTMENT_FORM: AppointmentFormModal,
  CONTRACTOR_FORM: ContractorFormModal,
  CONFIRM_DELETE: ConfirmDeleteModal,
  EXPORT_MODAL: ExportModal,
  IMPORT_MODAL: ImportModal,
  SETTINGS_MODAL: SettingsModal,
};

// ============================================================================
// MODAL PROVIDER COMPONENT
// ============================================================================

export const ModalProvider: React.FC = () => {
  // Hydration check - only render on client to avoid SSR mismatch
  const [isMounted, setIsMounted] = useState(false);
  
  // Get modals from the store
  const modals = useModalStore((state) => state.modals);
  const onClose = useModalStore((state) => state.onClose);
  const onCloseSpecific = useModalStore((state) => state.onCloseSpecific);

  // Set mounted state on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render anything on server (prevents hydration mismatch)
  if (!isMounted) {
    return null;
  }

  // Don't render if no modals are open
  if (modals.length === 0) {
    return null;
  }

  console.log(`🎭 ModalProvider rendering ${modals.length} modal(s)`);

  return (
    <>
      {modals.map((modal, index) => {
        // Get the component for this modal type
        const ModalComponent = MODAL_COMPONENTS[modal.type];

        // If no component is found, log error and skip
        if (!ModalComponent) {
          console.error(`❌ No modal component found for type: ${modal.type}`);
          return null;
        }

        // Calculate z-index (base 100, increment by 10 for each modal)
        const zIndex = 100 + (index * 10);

        // Determine if this is the topmost modal
        const isTopmost = index === modals.length - 1;

        console.log(
          `  → Rendering ${modal.type} (ID: ${modal.id}) at z-index ${zIndex}${isTopmost ? ' (topmost)' : ''}`
        );

        return (
          <div
            key={modal.id}
            style={{ zIndex }}
            className="modal-layer"
            data-modal-type={modal.type}
            data-modal-id={modal.id}
            data-is-topmost={isTopmost}
          >
            <ModalComponent
              data={modal.data}
              modalId={modal.id}
              onClose={() => {
                // Close this specific modal (usually the topmost one)
                if (isTopmost) {
                  onClose(); // Use LIFO close for topmost
                } else {
                  onCloseSpecific(modal.id); // Use specific close for buried modals
                }
              }}
            />
          </div>
        );
      })}
    </>
  );
};

export default ModalProvider;

