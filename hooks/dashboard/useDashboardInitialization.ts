/**
 * Dashboard Initialization Hook
 * Handles component mounting, URL parsing, responsive listeners, and deep-link bootstrap
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export interface UseDashboardInitializationParams {
  // No params needed - this hook manages global browser/window state
}

export interface UseDashboardInitializationReturn {
  // URL State Management
  searchParams: URLSearchParams;
  updateSearchParams: (updates: Record<string, string | null>) => void;
  
  // Current tab derived from URL
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  
  // Mobile/Responsive
  isMobileView: boolean;
  
  // User interaction tracking
  userInteractionRef: React.MutableRefObject<boolean>;
  initialLoadRef: React.MutableRefObject<boolean>;
  mountTimeRef: React.MutableRefObject<number>;
  
  // Tab history
  previousTabRef: React.MutableRefObject<TabType>;
  
  // Initialization complete
  isReady: boolean;
}

export type TabType = 'CLAIMS' | 'MESSAGES' | 'TASKS' | 'CALLS' | 'DOCUMENTS' | 'MANUAL' | 'HELP' | 'INVOICES' | 'SCHEDULE' | 'PUNCHLIST' | 'CHAT' | null;

/**
 * Hook for managing Dashboard initialization and URL-based state
 */
export function useDashboardInitialization(): UseDashboardInitializationReturn {
  // Track component lifecycle
  const initialLoadRef = useRef(true);
  const mountTimeRef = useRef(Date.now());
  const userInteractionRef = useRef(false);
  const previousTabRef = useRef<TabType>(null);
  
  // Initialization complete flag
  const [isReady, setIsReady] = useState(false);
  
  // URL-based navigation: Read view from URL search params
  const [searchParams, setSearchParams] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });
  
  // Mobile detection state
  const [isMobileView, setIsMobileView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  
  // Helper to update URL search params
  const updateSearchParams = useCallback((updates: Record<string, string | null>) => {
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const newParams = new URLSearchParams(window.location.search);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    
    const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
    // Avoid creating duplicate history entries
    if (newUrl === currentUrl) {
      // Still sync local state so dependent memos update predictably
      setSearchParams(newParams);
      return;
    }
    window.history.pushState({}, '', newUrl);
    setSearchParams(newParams);
  }, []);
  
  // Helper function to set current tab via URL
  const setCurrentTab = useCallback((tab: TabType) => {
    if (tab === null) {
      // Close all tabs - clear view param
      updateSearchParams({ view: null, taskId: null, claimId: null });
    } else {
      // Open tab - set view param
      updateSearchParams({ view: tab.toLowerCase() });
    }
  }, [updateSearchParams]);
  
  // Derive current tab from URL
  const currentTab = useMemo<TabType>(() => {
    const view = searchParams.get('view');
    if (!view) return null;

    const validTabs: TabType[] = ['CLAIMS', 'MESSAGES', 'TASKS', 'CALLS', 'DOCUMENTS', 'MANUAL', 'HELP', 'INVOICES', 'SCHEDULE', 'PUNCHLIST', 'CHAT'];
    const upperView = view.toUpperCase() as TabType;

    return validTabs.includes(upperView) ? upperView : null;
  }, [searchParams]);
  
  // =============================================================================
  // INITIALIZATION EFFECTS
  // =============================================================================
  
  /**
   * Track user interactions on mobile to distinguish user-initiated vs auto-opens
   */
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;
    
    const handleUserInteraction = () => {
      userInteractionRef.current = true;
      console.log('👆 User interaction detected on mobile');
    };
    
    // Listen for any user interaction
    window.addEventListener('click', handleUserInteraction, { capture: true, once: false });
    window.addEventListener('touchstart', handleUserInteraction, { capture: true, once: false });
    
    return () => {
      window.removeEventListener('click', handleUserInteraction, { capture: true });
      window.removeEventListener('touchstart', handleUserInteraction, { capture: true });
    };
  }, []);
  
  /**
   * Listen to popstate (back/forward button) AND custom navigation events
   */
  useEffect(() => {
    const handlePopState = () => {
      console.log('🔄 [Dashboard] Popstate detected, syncing URL to state');
      setSearchParams(new URLSearchParams(window.location.search));
    };
    
    // Custom event for React Router navigation (navigate() calls)
    const handleNavigate = () => {
      console.log('🔄 [Dashboard] Navigation detected, syncing URL to state');
      setSearchParams(new URLSearchParams(window.location.search));
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Intercept history.pushState to detect React Router navigate() calls
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      const result = originalPushState.apply(this, args);
      // Trigger sync after pushState completes
      setTimeout(() => handleNavigate(), 0);
      return result;
    };
    
    window.history.replaceState = function(...args) {
      const result = originalReplaceState.apply(this, args);
      // Trigger sync after replaceState completes
      setTimeout(() => handleNavigate(), 0);
      return result;
    };
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Restore original methods on cleanup
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);
  
  /**
   * Deep-link bootstrap:
   * If the app is loaded directly into a tab view (e.g. `?view=claims`),
   * insert a synthetic base (dashboard) history entry so Back doesn't exit the app
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const hasDeepLink =
        Boolean(params.get('view')) ||
        Boolean(params.get('claimId')) ||
        Boolean(params.get('taskId'));

      if (!hasDeepLink) return;

      // Only do this when there is effectively no "back stack" for this tab
      if (window.history.length > 1) return;

      // Build the "dashboard" URL by stripping tab/detail params
      const baseParams = new URLSearchParams(window.location.search);
      baseParams.delete('view');
      baseParams.delete('claimId');
      baseParams.delete('taskId');

      const baseUrl = `${window.location.pathname}${baseParams.toString() ? `?${baseParams.toString()}` : ''}`;
      const fullUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;

      // Replace current entry with dashboard, then push the deep-linked view
      window.history.replaceState({ __ccDeepLinkBootstrapped: true, __ccBase: true }, '', baseUrl);
      window.history.pushState({ __ccDeepLinkBootstrapped: true, __ccView: true }, '', fullUrl);

      // Sync local state to the deep-linked view (no popstate event for pushState)
      setSearchParams(params);
    } catch (e) {
      console.warn('Deep-link history bootstrap failed:', e);
    }
  }, []);
  
  /**
   * Set up responsive listener for mobile/desktop detection
   */
  useEffect(() => {
    const checkMobile = () => {
      const nextIsMobile = window.innerWidth < 768;
      setIsMobileView((prev) => (prev === nextIsMobile ? prev : nextIsMobile));
    };
    
    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  /**
   * Responsive initialization: Open Claims tab automatically on desktop
   */
  useEffect(() => {
    // Only open automatically if we are on a large screen (desktop) and no view is set
    if (typeof window !== 'undefined' && window.innerWidth >= 1024 && !searchParams.get('view')) {
      updateSearchParams({ view: 'claims' });
      previousTabRef.current = 'CLAIMS';
    }
    
    // Mark initialization as complete after all setup is done
    setIsReady(true);
  }, []); // Run only once on mount
  
  /**
   * Debug: Log when currentTab changes
   */
  useEffect(() => {
    console.log('📍 Current tab state changed to:', currentTab);
  }, [currentTab]);
  
  return {
    searchParams,
    updateSearchParams,
    currentTab,
    setCurrentTab,
    isMobileView,
    userInteractionRef,
    initialLoadRef,
    mountTimeRef,
    previousTabRef,
    isReady
  };
}
