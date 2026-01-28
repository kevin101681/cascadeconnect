/**
 * AdminMobileHeader.tsx
 * Reusable header component for mobile admin views
 * Contains logo and side-by-side search (Homeowners + Global)
 */

import React from 'react';
import { Search } from 'lucide-react';

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
    <div
      className={[
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]',
        'p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]',
        className,
      ].join(' ')}
    >
      <div className="flex gap-3">
        {/* Left: Homeowner Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={homeownerPlaceholder}
            className="w-full h-12 bg-white border border-gray-200 rounded-lg pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-500 shadow-[0_2px_12px_rgba(59,130,246,0.08)] focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full h-12 bg-white border border-gray-200 rounded-lg pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-500 shadow-[0_2px_12px_rgba(59,130,246,0.08)] focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
            value={globalQuery}
            onChange={(e) => onGlobalSearch?.(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminMobileHeader;
