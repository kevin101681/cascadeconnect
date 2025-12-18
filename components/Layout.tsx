
import React, { useState, useRef, useEffect } from 'react';
import { UserRole, Homeowner } from '../types';
import { UserCircle, Users, ChevronDown, Search, ArrowRight, X, Menu, Database, UserPlus, Building2, HardHat, Moon, Sun, BarChart3, FileText, Home, Mail, Server, MapPin } from 'lucide-react';
import { useDarkMode } from './DarkModeProvider';
import { UserButton } from '@clerk/clerk-react';

interface LayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
  onSwitchRole: () => void;
  homeowners: Homeowner[];
  activeHomeowner: Homeowner;
  onSwitchHomeowner: (id: string) => void;
  
  // Search Props for Admin Header
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: Homeowner[];
  onSelectHomeowner: (homeowner: Homeowner) => void;
  selectedHomeownerId: string | null;
  onClearSelection: () => void;

  // Navigation & Actions
  onNavigate: (view: 'DASHBOARD' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'INVOICES' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND') => void;
  onOpenEnrollment: () => void;

  // Auth
  onSignOut: () => Promise<void>;
  
  // Admin account indicator (to show menu even when viewing as homeowner)
  isAdminAccount?: boolean;
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
  isAdminAccount = false
}) => {
  const isAdmin = userRole === UserRole.ADMIN;
  const isBuilder = userRole === UserRole.BUILDER;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

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
      <header className="bg-surface dark:bg-gray-800 text-surface-on dark:text-gray-100 sticky top-0 z-50 transition-shadow duration-200 border-b border-surface-container dark:border-gray-700">
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
            
            {/* Centered Search Bar (Admin & Builder Only) */}
            {(isAdmin || isBuilder) && (
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
                          <ArrowRight className="h-3 w-3 text-surface-outline-variant group-hover:text-primary" />
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

              {/* Clerk User Avatar - Shows email and logout */}
              <div className="flex items-center">
                <UserButton 
                  appearance={{
                    elements: {
                      // Avatar styling - primary color background
                      avatarBox: 'h-10 w-10 bg-primary',
                      avatarImage: 'rounded-full',
                      
                      // Popover card styling - CSS will handle dark mode
                      userButtonPopoverCard: '!bg-surface dark:!bg-gray-800 !rounded-xl !border !border-surface-outline-variant dark:!border-gray-700 !shadow-elevation-2 !p-2',
                      
                      // User info section
                      userButtonPopoverHeader: '!px-3 !py-2 !border-b !border-surface-outline-variant/50 dark:!border-gray-700/50 !bg-transparent',
                      userButtonPopoverHeaderTitle: '!text-sm !font-medium !text-surface-on dark:!text-white',
                      userButtonPopoverHeaderSubtitle: '!text-xs !text-surface-on-variant dark:!text-white',
                      
                      // Action buttons styling
                      userButtonPopoverActions: '!py-1 !bg-transparent',
                      userButtonPopoverActionButton: '!text-surface-on dark:!text-gray-100 hover:!bg-surface-container dark:hover:!bg-gray-700 !rounded-lg !px-3 !py-2 !text-sm !transition-colors !bg-transparent',
                      userButtonPopoverActionButtonText: '!text-surface-on dark:!text-gray-100',
                      userButtonPopoverActionButtonIcon: '!text-surface-outline-variant dark:!text-gray-500',
                      
                      // Hide account management
                      userButtonPopoverFooter: '!hidden',
                      userButtonPopoverActionButton__manageAccount: '!hidden',
                      
                      // Sign out button styling
                      userButtonPopoverActionButton__signOut: '!text-error hover:!bg-error/5 dark:hover:!bg-error/10',
                    }
                  }}
                  afterSignOutUrl="/"
                />
              </div>

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
                  <div className="absolute right-0 top-full mt-2 w-64 bg-surface dark:bg-gray-800 rounded-xl shadow-elevation-2 border border-surface-outline-variant dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right max-h-[calc(100vh-5rem)] flex flex-col">
                    {/* User Info Header */}
                    <div className="px-4 py-3 bg-surface-container-high/30 dark:bg-gray-700/30 border-b border-surface-outline-variant dark:border-gray-700 flex-shrink-0">
                      <p className="text-sm font-bold text-surface-on dark:text-gray-100">
                        {isAdmin ? 'Administrator' : isBuilder ? 'Builder Account' : activeHomeowner.name}
                      </p>
                      <p className="text-xs text-surface-on-variant dark:text-gray-400">
                        {isAdmin ? 'Internal Portal' : isBuilder ? 'Access: Read Only' : 'Homeowner Portal'}
                      </p>
                    </div>

                    <div className="py-2 overflow-y-auto flex-1 min-h-0">
                      {/* Admin Only Links */}
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('TEAM'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <Users className="h-4 w-4 text-surface-outline dark:text-gray-500" />
                            Internal Users
                          </button>
                           <button 
                            onClick={() => handleMenuAction(() => onNavigate('BUILDERS'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <Building2 className="h-4 w-4 text-surface-outline dark:text-gray-500" />
                            Builders
                          </button>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('HOMEOWNERS'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <Home className="h-4 w-4 text-surface-outline dark:text-gray-500" />
                            Homeowners
                          </button>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('DATA'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <Database className="h-4 w-4 text-surface-outline dark:text-gray-500" />
                            Data Import
                          </button>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('INVOICES'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <FileText className="h-4 w-4 text-surface-outline dark:text-gray-500" />
                            Invoices
                          </button>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('EMAIL_HISTORY'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <Mail className="h-4 w-4 text-surface-outline dark:text-gray-500" />
                            Email History
                          </button>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('BACKEND'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <Server className="h-4 w-4 text-surface-outline dark:text-gray-500" />
                            Backend
                          </button>
                          
                          <div className="my-1 border-t border-surface-outline-variant/50 dark:border-gray-700/50"></div>
                          
                          <button 
                            onClick={() => handleMenuAction(onOpenEnrollment)}
                            className="w-full text-left px-4 py-2.5 text-sm text-primary font-medium hover:bg-surface-container dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <UserPlus className="h-4 w-4 text-primary" />
                            Enroll Homeowner
                          </button>
                        </>
                      )}

                      <div className="my-1 border-t border-surface-outline-variant dark:border-gray-700"></div>

                      {/* Switch Role */}
                      <button 
                        onClick={() => handleMenuAction(onSwitchRole)}
                        className="w-full text-left px-4 py-2.5 text-sm text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700 flex items-center gap-3"
                      >
                        {userRole === UserRole.ADMIN ? (
                          <><UserCircle className="h-4 w-4 text-surface-outline dark:text-gray-500" /> Switch to Homeowner View</>
                        ) : (
                          <><Users className="h-4 w-4 text-surface-outline dark:text-gray-500" /> Switch to Admin View</>
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
