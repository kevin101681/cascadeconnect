import React from 'react';
import { UserRole, Homeowner } from '../types';
import { ShieldCheck, UserCircle, Users, ChevronDown, Search, ArrowRight, X } from 'lucide-react';
import Button from './Button';

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
  onClearSelection
}) => {
  const isAdmin = userRole === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* M3 Small Top App Bar */}
      <header className="bg-surface text-surface-on sticky top-0 z-50 transition-shadow duration-200 border-b border-surface-container">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <span className="text-xl font-normal text-surface-on tracking-tight hidden md:block">Cascade Connect</span>
            </div>
            
            {/* Centered Search Bar (Admin Only) */}
            {isAdmin && (
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
              {!isAdmin && (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-surface-on-variant hover:bg-surface-container transition-colors">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(activeHomeowner.name)}&background=random`} 
                      alt="" 
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="hidden sm:inline">{activeHomeowner.name}</span>
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

              <div className="h-6 w-px bg-surface-outline-variant mx-1 hidden md:block"></div>

              <span className="text-xs text-surface-on-variant hidden md:inline">Role:</span>
              <button
                onClick={onSwitchRole}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  userRole === UserRole.ADMIN 
                    ? 'bg-secondary-container text-secondary-on-container hover:shadow-elevation-1' 
                    : 'border border-surface-outline text-primary hover:bg-primary/5'
                }`}
              >
                {userRole === UserRole.ADMIN ? (
                  <><Users className="h-3 w-3 mr-1.5" /> Admin Portal</>
                ) : (
                  <><UserCircle className="h-3 w-3 mr-1.5" /> Homeowner Portal</>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-surface-container mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-surface-on-variant">
            &copy; 2024 Cascade Connect Inc. Construction Warranty Management System.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;