/**
 * AdminMobileHeader.tsx
 * Reusable header component for mobile admin views
 * Contains logo and side-by-side search (Homeowners + Global)
 */

import React from 'react';
import { Search, Command } from 'lucide-react';

interface AdminMobileHeaderProps {
  /** Callback when homeowner search query changes */
  onHomeownerSearch?: (query: string) => void;
  /** Current homeowner search query value */
  homeownerQuery?: string;
  /** Callback when global search query changes */
  onGlobalSearch?: (query: string) => void;
  /** Current global search query value */
  globalQuery?: string;
  /** Optional additional CSS classes */
  className?: string;
  /** Placeholder text for homeowner search */
  homeownerPlaceholder?: string;
  /** Placeholder text for global search */
  globalPlaceholder?: string;
  /** Whether to autofocus the homeowner search input */
  autoFocusHomeowner?: boolean;
  /** Whether the homeowner search input is disabled */
  disabledHomeowner?: boolean;
}

export const AdminMobileHeader: React.FC<AdminMobileHeaderProps> = ({
  onHomeownerSearch,
  homeownerQuery = '',
  onGlobalSearch,
  globalQuery = '',
  className = '',
  homeownerPlaceholder = 'Homeowners',
  globalPlaceholder = 'Global',
  autoFocusHomeowner = false,
  disabledHomeowner = false,
}) => {
  
  return (
    <div className={`bg-white dark:bg-gray-800 px-4 py-6 shadow-sm border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Logo - Centered */}
      <div className="flex justify-center mb-4">
        <img 
          src="/connect.svg" 
          alt="Cascade Connect" 
          className="h-12"
        />
      </div>

      {/* Side-by-Side Search Layout */}
      <div className="flex gap-3">
        {/* Left: Homeowner Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={homeownerPlaceholder}
            className="w-full h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            value={homeownerQuery}
            onChange={(e) => onHomeownerSearch?.(e.target.value)}
            autoFocus={autoFocusHomeowner}
            disabled={disabledHomeowner}
          />
        </div>

        {/* Right: Global Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={globalPlaceholder}
            className="w-full h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
            value={globalQuery}
            onChange={(e) => onGlobalSearch?.(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminMobileHeader;
