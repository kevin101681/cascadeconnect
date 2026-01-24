/**
 * Schedule Tab Wrapper - Calendar and Scheduling Interface
 * 
 * Wraps the legacy ScheduleTab component to display homeowner
 * appointments, service orders, and calendar events.
 * 
 * Extracted from Dashboard.tsx (Phase 3)
 * Note: Named "ScheduleTabWrapper" to avoid conflict with existing ScheduleTab component
 */

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { UserRole, Homeowner, Claim } from '../../../types';

// Lazy-load the ScheduleTab component (renamed to avoid conflict)
const LegacyScheduleTab = React.lazy(() => import('../../ScheduleTab'));

interface ScheduleTabWrapperProps {
  homeowners: Homeowner[];
  currentUserId?: string;
  claims: Claim[];
  userRole: UserRole;
  activeHomeownerId?: string;
  isAdmin: boolean;
}

export const ScheduleTabWrapper: React.FC<ScheduleTabWrapperProps> = ({
  homeowners,
  currentUserId,
  claims,
  userRole,
  activeHomeownerId,
  isAdmin,
}) => {
  return (
    <div className="bg-surface dark:bg-gray-800 md:rounded-3xl md:border border-surface-outline-variant dark:border-gray-700 flex flex-col h-full">
      <Suspense 
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <LegacyScheduleTab 
          homeowners={homeowners}
          currentUserId={currentUserId}
          claims={claims}
          userRole={userRole}
          activeHomeownerId={activeHomeownerId}
          isAdmin={isAdmin}
        />
      </Suspense>
    </div>
  );
};

export default ScheduleTabWrapper;
