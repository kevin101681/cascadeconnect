/**
 * AdminMobileHeader.tsx
 * Reusable header component for mobile admin views
 * Contains logo and side-by-side search (Homeowners + Global)
 */

import React, { useEffect, useRef, useState } from 'react';
import { CheckSquare, Mail, Plus, Search, ShieldAlert, StickyNote } from 'lucide-react';

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
  const [showMenu, setShowMenu] = useState(false);
  const menuRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMenu) return;
    const onMouseDown = (e: MouseEvent) => {
      const root = menuRootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showMenu]);

  const handleAction = (action: string) => {
    console.log(`[AdminMobile Quick Action] ${action}`);
    setShowMenu(false);
  };

  return (
    <div
      className={[
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]',
        'p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]',
        className,
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 flex gap-3">
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

        {/* Quick Actions */}
        <div ref={menuRootRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="w-12 h-12 rounded-xl bg-primary text-white shadow-md flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Quick actions"
            aria-expanded={showMenu}
            aria-haspopup="menu"
          >
            <Plus className="w-6 h-6" />
          </button>

          {showMenu && (
            <div
              className={[
                'absolute bottom-full right-0 mb-3',
                'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl p-2 min-w-[200px]',
                'flex flex-col gap-1',
                'origin-bottom animate-in fade-in slide-in-from-bottom-2',
              ].join(' ')}
              role="menu"
            >
              <button
                type="button"
                onClick={() => handleAction('Add Warranty Claim')}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 text-left transition-colors"
                role="menuitem"
              >
                <ShieldAlert className="h-5 w-5 text-primary" />
                Add Warranty Claim
              </button>
              <button
                type="button"
                onClick={() => handleAction('Add Task')}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 text-left transition-colors"
                role="menuitem"
              >
                <CheckSquare className="h-5 w-5 text-primary" />
                Add Task
              </button>
              <button
                type="button"
                onClick={() => handleAction('Add Message (Not Chat)')}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 text-left transition-colors"
                role="menuitem"
                title="Not Chat"
              >
                <Mail className="h-5 w-5 text-primary" />
                Add Message
              </button>
              <button
                type="button"
                onClick={() => handleAction('Add Note')}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 text-left transition-colors"
                role="menuitem"
              >
                <StickyNote className="h-5 w-5 text-primary" />
                Add Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMobileHeader;
