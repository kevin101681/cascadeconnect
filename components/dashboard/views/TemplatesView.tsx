/**
 * Templates View - Embedded Adapter
 * 
 * Wraps Settings component (response templates) for flat page use (not modal).
 * Removes modal styling and adapts layout for split-pane design.
 */

import React from 'react';
import { FileText } from 'lucide-react';

const TemplatesView: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-surface dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700/50 flex-shrink-0 p-6">
        <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Response Templates
        </h3>
        <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
          Manage reusable response templates for claims
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-surface-on dark:text-gray-100">
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
            Create and manage response templates for common warranty claim responses.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplatesView;
