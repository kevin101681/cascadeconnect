
import React, { useState, useRef, useEffect } from 'react';
import { UserRole, Homeowner } from '../types';
import { UserCircle, Users, ChevronDown, Search, ArrowRight, X, Menu, LogOut, Database, UserPlus, Building2, HardHat } from 'lucide-react';

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
  onNavigate: (view: 'DASHBOARD' | 'TEAM' | 'BUILDERS' | 'DATA' | 'TASKS' | 'SUBS') => void;
  onOpenEnrollment: () => void;
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
  onOpenEnrollment
}) => {
  const isAdmin = userRole === UserRole.ADMIN;
  const isBuilder = userRole === UserRole.BUILDER;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleMenuAction = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* M3 Small Top App Bar */}
      <header className="bg-surface text-surface-on sticky top-0 z-50 transition-shadow duration-200 border-b border-surface-container">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            
            {/* Logo */}
            <button onClick={() => onNavigate('DASHBOARD')} className="flex items-center gap-3 flex-shrink-0 focus:outline-none">
              <div className="bg-white p-1 rounded-xl border border-surface-outline-variant shadow-sm h-10 w-10 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Cascade Connect" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-normal text-surface-on tracking-tight hidden md:block">Cascade Connect</span>
            </button>
            
            {/* Centered Search Bar (Admin & Builder Only) */}
            {(isAdmin || isBuilder) && (
              <div className="flex-1 max-w-sm relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant" />
                  <input 
                    type="text" 
                    placeholder="Search homeowners..."
                    className="w-full bg-surface-container rounded-full pl-9 pr-8 py-2 text-sm border-none focus:ring-2 focus:ring-primary focus:outline-none text-surface-on placeholder-surface-outline-variant transition-all"
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
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-xl shadow-elevation-2 border border-surface-outline-variant overflow-hidden max-h-80 overflow-y-auto z-50">
                    {searchResults.length > 0 ? (
                      searchResults.map(h => (
                        <button
                          key={h.id}
                          onClick={() => onSelectHomeowner(h)}
                          className="w-full text-left px-4 py-3 hover:bg-surface-container flex items-center justify-between group border-b border-surface-outline-variant/50 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-surface-on text-sm">{h.name}</p>
                            <p className="text-xs text-surface-on-variant">{h.address}</p>
                          </div>
                          <ArrowRight className="h-3 w-3 text-surface-outline-variant group-hover:text-primary" />
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-surface-on-variant text-xs">No homeowners found.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Right Actions */}
            <div className="flex items-center gap-4 flex-shrink-0">
              
              {/* Homeowner Switcher (Visible only in Homeowner View for testing) */}
              {!isAdmin && !isBuilder && (
                <div className="relative group hidden sm:block">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-surface-on-variant hover:bg-surface-container transition-colors">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(activeHomeowner.name)}&background=random`} 
                      alt="" 
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="hidden md:inline">{activeHomeowner.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-1 w-56 bg-surface rounded-xl shadow-elevation-2 border border-surface-outline-variant overflow-hidden hidden group-hover:block">
                    <div className="px-4 py-2 bg-surface-container-high/50 border-b border-surface-outline-variant">
                      <p className="text-xs font-bold text-surface-outline">SWITCH ACCOUNT (TESTING)</p>
                    </div>
                    {homeowners.map(h => (
                      <button
                        key={h.id}
                        onClick={() => onSwitchHomeowner(h.id)}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-container flex items-center gap-3 ${activeHomeowner.id === h.id ? 'bg-primary-container/30 text-primary' : 'text-surface-on'}`}
                      >
                         <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(h.name)}&background=random`} 
                          alt="" 
                          className="w-6 h-6 rounded-full"
                        />
                        {h.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Menu Dropdown */}
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-surface-container transition-colors text-surface-on"
                >
                  <Menu className="h-6 w-6" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-surface rounded-xl shadow-elevation-2 border border-surface-outline-variant overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    {/* User Info Header */}
                    <div className="px-4 py-3 bg-surface-container-high/30 border-b border-surface-outline-variant">
                      <p className="text-sm font-bold text-surface-on">
                        {isAdmin ? 'Administrator' : isBuilder ? 'Builder Account' : activeHomeowner.name}
                      </p>
                      <p className="text-xs text-surface-on-variant">
                        {isAdmin ? 'Internal Portal' : isBuilder ? 'Access: Read Only' : 'Homeowner Portal'}
                      </p>
                    </div>

                    <div className="py-2">
                      {/* Admin Only Links */}
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('TEAM'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on hover:bg-surface-container flex items-center gap-3"
                          >
                            <Users className="h-4 w-4 text-surface-outline" />
                            Internal Users
                          </button>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('SUBS'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on hover:bg-surface-container flex items-center gap-3"
                          >
                            <HardHat className="h-4 w-4 text-surface-outline" />
                            Subs (Contractors)
                          </button>
                           <button 
                            onClick={() => handleMenuAction(() => onNavigate('BUILDERS'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on hover:bg-surface-container flex items-center gap-3"
                          >
                            <Building2 className="h-4 w-4 text-surface-outline" />
                            Builders
                          </button>
                          <button 
                            onClick={() => handleMenuAction(() => onNavigate('DATA'))}
                            className="w-full text-left px-4 py-2.5 text-sm text-surface-on hover:bg-surface-container flex items-center gap-3"
                          >
                            <Database className="h-4 w-4 text-surface-outline" />
                            Data Import
                          </button>
                          
                          <div className="my-1 border-t border-surface-outline-variant/50"></div>
                          
                          <button 
                            onClick={() => handleMenuAction(onOpenEnrollment)}
                            className="w-full text-left px-4 py-2.5 text-sm text-primary font-medium hover:bg-surface-container flex items-center gap-3"
                          >
                            <UserPlus className="h-4 w-4 text-primary" />
                            Enroll Homeowner
                          </button>
                        </>
                      )}

                      <div className="my-1 border-t border-surface-outline-variant"></div>

                      {/* Switch Role / Logout */}
                      <button 
                        onClick={() => handleMenuAction(onSwitchRole)}
                        className="w-full text-left px-4 py-2.5 text-sm text-surface-on hover:bg-surface-container flex items-center gap-3"
                      >
                        {userRole === UserRole.ADMIN ? (
                          <><UserCircle className="h-4 w-4 text-surface-outline" /> Switch to Homeowner View</>
                        ) : (
                          <><Users className="h-4 w-4 text-surface-outline" /> Switch to Admin View</>
                        )}
                      </button>
                      
                       <button 
                        onClick={() => window.location.reload()}
                        className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-error/5 flex items-center gap-3"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
