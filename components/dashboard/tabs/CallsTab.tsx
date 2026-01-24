/**
 * Calls Tab - AI Intake Dashboard Wrapper
 * 
 * Displays the AI phone call intake dashboard for processing
 * incoming homeowner calls and extracting claim information.
 * 
 * Extracted from Dashboard.tsx (Phase 3)
 */

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { UserRole, Homeowner } from '../../../types';

// Lazy-load the heavy AIIntakeDashboard component
const AIIntakeDashboard = React.lazy(() => import('../../AIIntakeDashboard'));

interface CallsTabProps {
  homeowners: Homeowner[];
  activeHomeownerId?: string;
  isAdmin: boolean;
  userRole: UserRole;
  onNavigate?: (route: string) => void;
  onSelectHomeowner?: (homeowner: Homeowner) => void;
}

export const CallsTab: React.FC<CallsTabProps> = ({
  homeowners,
  activeHomeownerId,
  isAdmin,
  userRole,
  onNavigate,
  onSelectHomeowner,
}) => {
  return (
    <div className="flex flex-col h-full md:h-auto">
      <Suspense 
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <AIIntakeDashboard 
          onNavigate={onNavigate}
          onSelectHomeowner={(homeownerId) => {
            const homeowner = homeowners.find(h => h.id === homeownerId);
            if (homeowner && onSelectHomeowner) {
              onSelectHomeowner(homeowner);
            }
          }}
          activeHomeownerId={activeHomeownerId}
          isAdmin={isAdmin}
          userRole={userRole}
        />
      </Suspense>
    </div>
  );
};

export default CallsTab;
