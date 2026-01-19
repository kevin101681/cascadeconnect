import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveTextareaProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  label?: string;
  placeholder?: string;
  rows?: number;
  debounceMs?: number;
  className?: string;
  disabled?: boolean;
  showSaveStatus?: boolean;
  actionButton?: React.ReactNode; // Custom action button in bottom-right
}

/**
 * AutoSaveTextarea - Google Docs-style auto-save textarea
 * 
 * Features:
 * - Immediate local state updates (no lag)
 * - Debounced server saves (1000ms default)
 * - Force save on blur
 * - Visual save status indicator
 * - Error handling
 * 
 * Usage:
 * ```tsx
 * <AutoSaveTextarea
 *   value={claim.description}
 *   onSave={async (newValue) => {
 *     await updateClaim(claim.id, { description: newValue });
 *   }}
 *   label="Description"
 *   placeholder="Enter description..."
 * />
 * ```
 */
export const AutoSaveTextarea: React.FC<AutoSaveTextareaProps> = ({
  value: initialValue,
  onSave,
  label,
  placeholder,
  rows = 6,
  debounceMs = 1000,
  className = '',
  disabled = false,
  showSaveStatus = true,
  actionButton,
}) => {
  const [localValue, setLocalValue] = useState(initialValue);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedValueRef = useRef(initialValue);
  const isMountedRef = useRef(true);

  // Update local value when prop changes (external updates)
  useEffect(() => {
    setLocalValue(initialValue);
    lastSavedValueRef.current = initialValue;
  }, [initialValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Save function with error handling
   */
  const performSave = useCallback(async (valueToSave: string) => {
    // Don't save if value hasn't changed
    if (valueToSave === lastSavedValueRef.current) {
      return;
    }

    setSaveStatus('saving');
    setErrorMessage('');

    try {
      await onSave(valueToSave);
      
      if (isMountedRef.current) {
        lastSavedValueRef.current = valueToSave;
        setSaveStatus('saved');
        
        // Fade out "saved" status after 2 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus('idle');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('AutoSave error:', error);
      
      if (isMountedRef.current) {
        setSaveStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save');
      }
    }
  }, [onSave]);

  /**
   * Handle text change - updates local state immediately
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced save timer
    debounceTimerRef.current = setTimeout(() => {
      performSave(newValue);
    }, debounceMs);
  };

  /**
   * Handle blur - force immediate save if there are unsaved changes
   */
  const handleBlur = () => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Force save if there are changes
    if (localValue !== lastSavedValueRef.current) {
      performSave(localValue);
    }
  };

  /**
   * Render save status indicator
   */
  const renderSaveStatus = () => {
    if (!showSaveStatus) return null;

    switch (saveStatus) {
      case 'saving':
        return (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        );
      
      case 'saved':
        return (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3 w-3" />
            All changes saved
          </span>
        );
      
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400" title={errorMessage}>
            <AlertCircle className="h-3 w-3" />
            Error saving
          </span>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="w-full relative">
      {label && (
        <label className="text-sm font-medium text-surface-on dark:text-gray-200 mb-2 block">
          {label}
        </label>
      )}
      
      <textarea
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full bg-white dark:bg-white border border-surface-outline-variant dark:border-gray-600 rounded-lg px-3 ${
          actionButton ? 'pr-12 pb-10' : 'pr-3 py-2'
        } ${!actionButton ? 'py-2' : 'pt-2'} text-surface-on dark:text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-colors ${
          saveStatus === 'error' ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      />
      
      {/* Action button in bottom-right corner */}
      {actionButton && (
        <div className="absolute bottom-2 right-2 z-10">
          {actionButton}
        </div>
      )}
      
      {/* Fixed position save status - bottom right, shifted left if action button exists */}
      {showSaveStatus && renderSaveStatus() && (
        <div className={`absolute bottom-2 ${actionButton ? 'right-14' : 'right-2'} pointer-events-none`}>
          {renderSaveStatus()}
        </div>
      )}
      
      {saveStatus === 'error' && errorMessage && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default AutoSaveTextarea;
