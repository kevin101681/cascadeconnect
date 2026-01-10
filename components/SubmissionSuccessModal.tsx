import React from 'react';
import { CheckCircle, X, ClipboardList } from 'lucide-react';
import Button from './Button';

interface SystemReview {
  status: 'Approved' | 'Denied' | 'Needs Info';
  reasoning: string;
}

interface SubmissionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimCount: number;
  aiAnalysis?: SystemReview | null;
}

const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({
  isOpen,
  onClose,
  claimCount,
  aiAnalysis
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface dark:bg-gray-800 px-6 py-5 border-b border-surface-outline-variant dark:border-gray-700 rounded-t-3xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-surface-on dark:text-white">
                  Claim{claimCount > 1 ? 's' : ''} Submitted Successfully
                </h2>
                <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-0.5">
                  {claimCount} item{claimCount > 1 ? 's' : ''} submitted
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-xl p-4">
            <p className="text-surface-on dark:text-gray-200 leading-relaxed">
              Thank you for submitting your warranty claim{claimCount > 1 ? 's' : ''}. 
              We will review {claimCount > 1 ? 'them' : 'it'} and be in touch shortly.
            </p>
          </div>

          {/* Preliminary System Review */}
          {aiAnalysis && (
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                  <ClipboardList className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-surface-on dark:text-white mb-1">
                    Preliminary System Review
                  </h3>
                  <p className="text-xs text-surface-on-variant dark:text-gray-400 leading-relaxed">
                    Based on the details and photos provided, our system has generated a preliminary assessment. 
                    A warranty specialist will review your claim shortly to make a final determination.
                  </p>
                </div>
              </div>

              {/* System Assessment */}
              <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Automated Assessment
                  </p>
                </div>
                <p className="text-sm text-surface-on dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {aiAnalysis.reasoning}
                </p>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <svg 
                  className="h-4 w-4 text-gray-500 dark:text-gray-500 flex-shrink-0 mt-0.5" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                    clipRule="evenodd" 
                  />
                </svg>
                <p className="text-xs text-gray-600 dark:text-gray-500">
                  This is an automated report for your records. A human warranty specialist will review 
                  your claim shortly to make a final determination.
                </p>
              </div>
            </div>
          )}

          {/* Call to Action */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={onClose}
              variant="filled"
              className="!px-8"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionSuccessModal;
