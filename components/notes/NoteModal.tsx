/**
 * Note Modal Component
 * 
 * Modal for adding notes/tasks linked to a specific claim or as standalone.
 * Integrates with the global modal store and the task service.
 */

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useModalStore } from '@/hooks/use-modal-store';
import { createTask } from '@/services/taskService';

interface NoteModalProps {
  data?: {
    claimId?: string | null;
    contextLabel?: string;
    contextType?: 'claim' | 'task' | undefined;
  };
  modalId: string;
}

export const NoteModal: React.FC<NoteModalProps> = ({ data, modalId }) => {
  const { onClose } = useModalStore();
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await createTask(inputValue.trim(), data?.claimId || null);
      
      // Clear input and close modal
      setInputValue('');
      onClose();
      
      // Optionally, you can trigger a refresh of the notes list here
      // by dispatching a custom event or updating a global state
    } catch (error) {
      console.error('Failed to create note:', error);
      // You could show an error toast here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
      >
        <div 
          className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-5 w-full max-w-lg pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700">
            <div>
              <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">
                Add Note
              </h2>
              {data?.contextLabel && (
                <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
                  {data.contextLabel}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-4">
              <label 
                htmlFor="note-input" 
                className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2"
              >
                Note Content
              </label>
              <input
                ref={inputRef}
                id="note-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter your note..."
                className="w-full px-4 py-3 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-xl text-surface-on dark:text-gray-100 placeholder-surface-on-variant/50 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 bg-surface-container hover:bg-surface-container-high text-surface-on dark:text-gray-100 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!inputValue.trim() || isSubmitting}
                className="px-6 py-2 border border-primary text-primary hover:bg-primary/10 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default NoteModal;

