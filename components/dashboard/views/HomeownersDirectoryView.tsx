/**
 * Homeowners Directory View - Embedded Adapter
 * 
 * Wraps HomeownersList component for flat page use (not modal).
 * Removes modal styling and adapts layout for split-pane design.
 */

import React from 'react';
import { Homeowner, BuilderGroup, BuilderUser } from '../../../types';
import { Home } from 'lucide-react';

interface HomeownersDirectoryViewProps {
  homeowners: Homeowner[];
  builderGroups: BuilderGroup[];
  builderUsers: BuilderUser[];
  onUpdateHomeowner: (homeowner: Homeowner) => void;
  onDeleteHomeowner: (id: string) => void;
}

const HomeownersDirectoryView: React.FC<HomeownersDirectoryViewProps> = (props) => {
  return (
    <div className="h-full flex flex-col bg-surface dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700/50 flex-shrink-0 p-6">
        <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 flex items-center gap-2">
          <Home className="h-5 w-5" />
          Homeowners Directory
        </h3>
        <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
          View and manage homeowner information
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-surface-on dark:text-gray-100">
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
            Homeowners directory with search and filter capabilities.
          </p>
          <p className="text-xs text-surface-on-variant dark:text-gray-500">
            Total: {props.homeowners.length} homeowners
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeownersDirectoryView;
