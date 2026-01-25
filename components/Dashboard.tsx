import React, { Suspense, lazy } from 'react';
import { UserRole } from '../types';
import { useDashboardInitialization } from '../hooks/dashboard/useDashboardInitialization';
import { DashboardSkeleton } from './skeletons/DashboardSkeleton';
import type { DashboardProps } from './AdminDashboard'; // Re-export from AdminDashboard

// Lazy load dashboard components for code splitting
// This prevents homeowner users from downloading admin-specific code
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const HomeownerDashboard = lazy(() => import('./HomeownerDashboard'));

/**
 * Dashboard Router Component
 * 
 * This is the new orchestration layer that routes users to role-specific dashboards.
 * 
 * Architecture Decision (Phase 6):
 * - Instead of one monolithic 5,345-line Dashboard component
 * - We now split into AdminDashboard.tsx (admin/employee/builder) and HomeownerDashboard.tsx (homeowner)
 * - This permanent split reduces complexity and allows each view to evolve independently
 * 
 * Benefits:
 * 1. Reduced cognitive load - each file is role-specific
 * 2. Faster development - changes to admin features don't affect homeowner view
 * 3. Better bundle splitting - homeowner users don't download admin code
 * 4. Cleaner conditionals - no more `if (isAdmin)` checks scattered everywhere
 */
export const Dashboard: React.FC<DashboardProps> = (props) => {
  const { userRole, currentUser } = props;
  const { isReady } = useDashboardInitialization();

  // Show loading state while initialization hook prepares URL state, responsive detection, etc.
  if (!isReady) {
    return <DashboardSkeleton />;
  }

  // Route to appropriate dashboard based on user role
  const isAdminRole = userRole === UserRole.ADMIN;
  const isEmployeeRole = currentUser?.role === 'Employee'; // Employees use InternalEmployee.role field
  const isBuilderRole = userRole === UserRole.BUILDER;
  const isHomeownerRole = userRole === UserRole.HOMEOWNER;

  // Admin, Employee, and Builder users get the AdminDashboard (full-featured)
  if (isAdminRole || isEmployeeRole || isBuilderRole) {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminDashboard {...props} />
      </Suspense>
    );
  }

  // Homeowner users get the simplified HomeownerDashboard
  if (isHomeownerRole) {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <HomeownerDashboard {...props} />
      </Suspense>
    );
  }

  // Fallback for unknown roles (should never happen)
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface dark:bg-gray-900">
      <div className="text-center">
        <p className="text-red-500 mb-2">Unknown user role: {userRole}</p>
        <p className="text-surface-on-variant dark:text-gray-400 text-sm">
          Please contact support if this issue persists.
        </p>
      </div>
    </div>
  );
};

// Re-export DashboardProps type for convenience
export type { DashboardProps } from './AdminDashboard';

// Default export for backward compatibility
export default Dashboard;
