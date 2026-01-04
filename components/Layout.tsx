
import React, { useState, useRef, useEffect } from 'react';
import { UserRole, Homeowner } from '../types';
import { UserCircle, Users, ChevronDown, Search, X, Menu, Database, UserPlus, Building2, HardHat, Moon, Sun, BarChart3, FileText, Home, Mail, Server, MapPin, Loader2, Phone } from 'lucide-react';
import { useDarkMode } from './DarkModeProvider';
import { UserButton, useUser } from '@clerk/clerk-react';

interface LayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
  onSwitchRole: () => void;
  homeowners: Homeowner[];
  activeHomeowner: Homeowner;
  onSwitchHomeowner: (id: string) => void;
  
  // Search Props for Admin Header (legacy - kept for backward compatibility)
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: Homeowner[];
  onSelectHomeowner: (homeowner: Homeowner) => void;
  selectedHomeownerId: string | null;
  onClearSelection: () => void;
  
  // Global Search Props
  onOpenGlobalSearch?: () => void;

  // Navigation & Actions
  onNavigate: (view: 'DASHBOARD' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND' | 'CALLS' | 'INVOICES') => void;
  onOpenEnrollment: () => void;
  currentView?: 'DASHBOARD' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND' | 'CALLS' | 'INVOICES' | 'DETAIL' | 'NEW';

  // Auth
  onSignOut: () => Promise<void>;
  
  // Admin account indicator (to show menu even when viewing as homeowner)
  isAdminAccount?: boolean;
  
  // Current user to check permissions
  currentUser?: { role: string };
}


const Layout: React.FC<LayoutProps> = ({ 
  children, 
  userRole, 
  onSwitchRole, 
  homeowners, 
  activeHomeowner,
  onSwitchHomeowner,
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectHomeowner,
  selectedHomeownerId,
  onClearSelection,
  onNavigate,
  onOpenEnrollment,
  onSignOut,
  isAdminAccount = false,
  currentUser,
  currentView,
  onOpenGlobalSearch
}) => {
  // Minimal approach: Just ensure avatar is sized correctly, let CSS handle the rest
  useEffect(() => {
    // Only handle avatar sizing, let CSS handle visibility
    const sizeAvatar = () => {
      const triggerButtons = document.querySelectorAll('.cl-userButtonTrigger, [class*="cl-userButtonTrigger"]');
      triggerButtons.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.setProperty('width', '40px', 'important');
        htmlEl.style.setProperty('height', '40px', 'important');
        htmlEl.style.setProperty('min-width', '40px', 'important');
        htmlEl.style.setProperty('min-height', '40px', 'important');
        htmlEl.style.setProperty('max-width', '40px', 'important');
        htmlEl.style.setProperty('max-height', '40px', 'important');
        
        const avatarBox = htmlEl.querySelector('.cl-userButtonAvatarBox, [class*="cl-userButtonAvatarBox"]');
        if (avatarBox) {
          const avatarEl = avatarBox as HTMLElement;
          avatarEl.style.setProperty('width', '40px', 'important');
          avatarEl.style.setProperty('height', '40px', 'important');
          avatarEl.style.setProperty('min-width', '40px', 'important');
          avatarEl.style.setProperty('min-height', '40px', 'important');
          avatarEl.style.setProperty('max-width', '40px', 'important');
          avatarEl.style.setProperty('max-height', '40px', 'important');
          
          const avatarImg = avatarEl.querySelector('img');
          if (avatarImg) {
            avatarImg.style.setProperty('width', '40px', 'important');
            avatarImg.style.setProperty('height', '40px', 'important');
            avatarImg.style.setProperty('object-fit', 'cover', 'important');
          }
        }
      });
    };

    sizeAvatar();
    
    // Only resize avatar on mutations, don't touch popover content
    const observer = new MutationObserver(() => {
      sizeAvatar();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    return () => {
      observer.disconnect();
    };
  }, []);
  const isAdmin = userRole === UserRole.ADMIN;
  const isBuilder = userRole === UserRole.BUILDER;
  // Check if current user is Administrator (has full access)
  const isAdministrator = currentUser?.role === 'Administrator';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // Get Clerk user data to ensure it's loaded
  const { user, isLoaded: clerkLoaded } = useUser();
  
  // Debug: Log user data when it loads
  useEffect(() => {
    if (clerkLoaded) {
      if (user) {
        console.log('Clerk user loaded:', { id: user.id, imageUrl: user.imageUrl, hasImage: !!user.imageUrl, firstName: user.firstName });
      } else {
        console.warn('Clerk loaded but no user found');
      }
    }
  }, [clerkLoaded, user]);
  
  // Additional effect to ensure UserButton renders and is visible
  useEffect(() => {
    if (clerkLoaded && user) {
      // Force a re-check of the avatar after a short delay
      const timer = setTimeout(() => {
        const triggerButtons = document.querySelectorAll('.cl-userButtonTrigger, [class*="cl-userButtonTrigger"]');
        console.log('UserButton elements found:', triggerButtons.length);
        if (triggerButtons.length === 0) {
          console.warn('UserButton not found in DOM - Clerk may not be rendering it');
        } else {
          triggerButtons.forEach((el) => {
            const htmlEl = el as HTMLElement;
            // Force visibility
            htmlEl.style.setProperty('display', 'flex', 'important');
            htmlEl.style.setProperty('visibility', 'visible', 'important');
            htmlEl.style.setProperty('opacity', '1', 'important');
            
            // Check for avatar image
            const avatarImg = htmlEl.querySelector('img');
            if (avatarImg) {
              avatarImg.style.setProperty('display', 'block', 'important');
              avatarImg.style.setProperty('visibility', 'visible', 'important');
              avatarImg.style.setProperty('opacity', '1', 'important');
            }
            
            console.log('UserButton element:', {
              display: window.getComputedStyle(htmlEl).display,
              visibility: window.getComputedStyle(htmlEl).visibility,
              opacity: window.getComputedStyle(htmlEl).opacity,
              width: window.getComputedStyle(htmlEl).width,
              height: window.getComputedStyle(htmlEl).height,
              hasImage: !!avatarImg
            });
          });
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [clerkLoaded, user]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isMenuOpen]);



  const handleMenuAction = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col font-sans">
      {/* M3 Small Top App Bar */}
      <header className="bg-surface dark:bg-gray-800 text-surface-on dark:text-gray-100 sticky top-0 z-50 transition-shadow duration-200 border-b border-surface-container dark:border-gray-700 shadow-elevation-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            
            {/* Logo */}
            <button onClick={() => onNavigate('DASHBOARD')} className="flex items-center gap-3 flex-shrink-0 focus:outline-none">
              <div className="bg-gray-200 dark:bg-gray-800 p-2 rounded-xl border border-surface-outline-variant dark:border-gray-600 shadow-sm h-10 w-12 flex items-center justify-center overflow-hidden">
                <img 
                  src="/logo.svg" 
                  alt="CASCADE CONNECT Logo" 
                  className="h-6 w-6 object-contain" 
                />
              </div>
              <div className="relative hidden md:block">
                <img 
                  src="/connect.svg" 
                  alt="CASCADE CONNECT" 
                  className="h-7 object-contain"
                />
              </div>
            </button>
            
            {/* Global Search Bar (Admin & Builder Only) - Always Visible */}
            {(isAdmin || isBuilder) && onOpenGlobalSearch && (
              <div className="flex-1 max-w-md relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-400" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Global Search"
                    className="w-full bg-surface-container dark:bg-gray-700 rounded-full pl-9 pr-8 py-2 text-sm border-none focus:ring-2 focus:ring-primary focus:outline-none text-surface-on dark:text-gray-100 transition-all placeholder:text-surface-on-variant dark:placeholder:text-gray-500"
                    onFocus={onOpenGlobalSearch}
                    onClick={onOpenGlobalSearch}
                    readOnly
                  />
                </div>
              </div>
            )}
            
            {/* Legacy Homeowner Search Bar (Admin & Builder Only) - Hidden on Dashboard - Fallback if global search not available */}
            {(isAdmin || isBuilder) && currentView !== 'DASHBOARD' && !onOpenGlobalSearch && (
              <div className="flex-1 max-w-sm relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-400" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    className="w-full bg-surface-container dark:bg-gray-700 rounded-full pl-9 pr-8 py-2 text-sm border-none focus:ring-2 focus:ring-primary focus:outline-none text-surface-on dark:text-gray-100 transition-all"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => onSearchChange('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-outline-variant hover:text-surface-on"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface dark:bg-gray-800 rounded-xl shadow-elevation-2 border border-surface-outline-variant dark:border-gray-700 overflow-hidden max-h-80 overflow-y-auto z-50">
                    {searchResults.length > 0 ? (
                      searchResults.map(h => (
                        <button
                          key={h.id}
                          onClick={() => onSelectHomeowner(h)}
                          className="w-full text-left px-4 py-3 hover:bg-surface-container dark:hover:bg-gray-700 flex items-center justify-between group border-b border-surface-outline-variant/50 dark:border-gray-700/50 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-surface-on dark:text-gray-100 text-sm">{h.name}</p>
                            <p className="text-xs text-surface-on-variant dark:text-gray-300">
                              {h.jobName && <span className="font-medium text-primary mr-1">{h.jobName} •</span>}
                              {h.address}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-surface-on-variant dark:text-gray-400 text-xs">No homeowners found.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Right Actions */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-800 transition-colors"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                ) : (
                  <Moon className="h-5 w-5 text-surface-on-variant dark:text-gray-300" />
                )}
              </button>
              
              {/* Homeowner Switcher - Show if homeowner has multiple properties with same email */}
              {!isAdmin && !isBuilder && (() => {
                // Find all homeowners with the same email as the active homeowner
                const sameEmailHomeowners = homeowners.filter(h => 
                  h.email.toLowerCase() === activeHomeowner.email.toLowerCase()
                );
                
                // Only show switcher if there are multiple properties with same email
                if (sameEmailHomeowners.length <= 1) return null;
                
                return (
                  <div className="relative group hidden sm:block">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-surface-on-variant hover:bg-surface-container transition-colors">
                      <Home className="h-4 w-4" />
                      <span className="hidden md:inline">{activeHomeowner.jobName || activeHomeowner.address || activeHomeowner.name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-1 w-64 bg-surface dark:bg-gray-800 rounded-xl shadow-elevation-2 border border-surface-outline-variant dark:border-gray-700 overflow-hidden hidden group-hover:block z-50">
                      <div className="px-4 py-2 bg-surface-container-high/50 border-b border-surface-outline-variant">
                        <p className="text-xs font-bold text-surface-outline">SELECT PROPERTY</p>
                      </div>
                      {sameEmailHomeowners.map(h => (
                        <button
                          key={h.id}
                          onClick={() => onSwitchHomeowner(h.id)}
                          className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-container flex flex-col gap-1 ${activeHomeowner.id === h.id ? 'bg-primary-container/30' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <Home className="h-3.5 w-3.5 text-surface-outline-variant" />
                            <span className={`font-medium ${activeHomeowner.id === h.id ? 'text-primary' : 'text-surface-on'}`}>
                              {h.jobName || h.address || h.name}
                            </span>
                          </div>
                          {h.address && h.address !== (h.jobName || h.name) && (
                            <span className="text-xs text-surface-on-variant dark:text-gray-400 ml-5 truncate">
                              {h.address}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Clerk UserButton - Avatar visible, dropdown shows only Sign Out text */}
              {clerkLoaded ? (
                <div className="flex items-center justify-center w-10 h-10">
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonTrigger: "!flex !items-center !justify-center !w-10 !h-10 !min-w-[40px] !min-h-[40px] !max-w-[40px] !max-h-[40px] !visible !opacity-100 !relative",
                        userButtonAvatarBox: "!w-10 !h-10 !min-w-[40px] !min-h-[40px] !max-w-[40px] !max-h-[40px] !block !visible !opacity-100 !flex !items-center !justify-center !relative",
                        userButtonAvatar: "!w-full !h-full !block !visible !opacity-100 !relative",
                        userButtonPopoverCard: "shadow-elevation-2",
                        userButtonPopoverHeader: "hidden",
                        userButtonPopoverHeaderTitle: "hidden",
                        userButtonPopoverHeaderSubtitle: "hidden",
                        userButtonPopoverAvatarBox: "hidden",
                        userButtonPopoverActions: "p-2",
                        userButtonPopoverActionButtonIcon: "hidden",
                        userButtonPopoverActionButton__manageAccount: "hidden",
                        userButtonPopoverFooter: "hidden",
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-surface-container dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-surface-on-variant dark:text-gray-400" />
                </div>
              )}

              {/* Main Menu Dropdown - Show for Admin/Builder accounts (even when viewing as homeowner) */}
              {(isAdmin || isBuilder || isAdminAccount) && (
                <div className="relative" ref={menuRef}>
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-surface-container dark:hover:bg-gray-700 transition-colors text-surface-on dark:text-gray-100"
                  >
                    <Menu className="h-6 w-6" />
                  </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-2 border border-surface-outline-variant dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right max-h-[calc(100vh-5rem)] flex flex-col">
                    {/* User Info Header */}
                    <div className="px-6 py-4 bg-surface dark:bg-gray-800 border-b border-surface-outline-variant dark:border-gray-700 flex-shrink-0">
                      <p className="text-sm font-semibold text-surface-on dark:text-gray-100">
                        {isAdmin ? 'Administrator' : isBuilder ? 'Builder Account' : activeHomeowner.name}
                      </p>
                      <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-0.5">
                        {isAdmin ? 'Internal Portal' : isBuilder ? 'Access: Read Only' : 'Homeowner Portal'}
                      </p>
                    </div>

                    <div className="p-3 overflow-y-auto flex-1 min-h-0 space-y-1">
                      {/* Admin Only Links */}
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('TEAM'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full flex items-center gap-3 transition-colors"
                          >
                            <Users className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                            Internal Users
                          </button>
                           <button 
                            onClick={() => handleMenuAction(() => onNavigate('BUILDERS'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full flex items-center gap-3 transition-colors"
                          >
                            <Building2 className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                            Builders
                          </button>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('HOMEOWNERS'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full flex items-center gap-3 transition-colors"
                          >
                            <Home className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                            Homeowners
                          </button>
                          {isAdministrator && (
                            <>
                              <button 
                                onClick={() => handleMenuAction(() => onNavigate('DATA'))}
                                className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full flex items-center gap-3 transition-colors"
                              >
                                <Database className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                                Data Import
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('EMAIL_HISTORY'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full flex items-center gap-3 transition-colors"
                          >
                            <Mail className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                            Email History
                          </button>
                          {isAdministrator && (
                            <button 
                              onClick={() => handleMenuAction(() => onNavigate('BACKEND'))}
                              className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full flex items-center gap-3 transition-colors"
                            >
                              <Server className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                              Backend
                            </button>
                          )}
                          
                          <div className="my-2"></div>
                          
                          <button 
                            onClick={() => handleMenuAction(onOpenEnrollment)}
                            className="w-full text-left px-4 py-2.5 text-sm text-primary font-medium hover:bg-primary/10 dark:hover:bg-primary/20 rounded-full flex items-center gap-3 transition-colors"
                          >
                            <UserPlus className="h-4 w-4 text-primary" />
                            Enroll Homeowner
                          </button>
                        </>
                      )}

                      <div className="my-2"></div>

                      {/* Switch Role */}
                      <button 
                        onClick={() => handleMenuAction(onSwitchRole)}
                        className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full flex items-center gap-3 transition-colors"
                      >
                        {userRole === UserRole.ADMIN ? (
                          <><UserCircle className="h-4 w-4 text-surface-on-variant dark:text-gray-400" /> Switch to Homeowner View</>
                        ) : (
                          <><Users className="h-4 w-4 text-surface-on-variant dark:text-gray-400" /> Switch to Admin View</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
