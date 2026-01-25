import React from 'react';
import { HomeownerDesktop } from './homeowner/HomeownerDesktop';
import { HomeownerMobile } from './homeowner/HomeownerMobileRefactored';
import { useDashboardInitialization } from '../hooks/dashboard/useDashboardInitialization';
import type { DashboardProps } from './AdminDashboard';

/**
 * Homeowner Dashboard Router (Phase 7)
 * 
 * Splits the Homeowner experience by platform to prevent bugs and isolate logic.
 * 
 * Architecture Benefits:
 * - Mobile-specific code (bottom nav, swipe gestures) isolated
 * - Desktop-specific code (sidebar, hover states) isolated
 * - No more `{isMobile && ...}` conditionals scattered everywhere
 * - Platform-specific bugs can't affect the other platform
 * - Legacy issues (like Invoice modal) can be safely removed from Mobile only
 */
export const HomeownerDashboard: React.FC<DashboardProps> = (props) => {
  const { isMobileView } = useDashboardInitialization();

  // Route to platform-specific component
  if (isMobileView) {
    return <HomeownerMobile {...props} />;
  }

  return <HomeownerDesktop {...props} />;
};

// Default export for backward compatibility
export default HomeownerDashboard;
