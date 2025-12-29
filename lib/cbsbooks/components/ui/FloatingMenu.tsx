
import React, { useState } from 'react';
import { Menu, X, PieChart, Users, CreditCard, Receipt } from 'lucide-react';
import { ViewState } from '../../types';
import { createPortal } from 'react-dom';

export interface ActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface FloatingMenuProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  customActions?: ActionItem[];
  className?: string;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ 
  currentView, 
  onNavigate, 
  customActions = [], 
  className = '',
  isOpen: externalIsOpen,
  onToggle: externalOnToggle
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;
  
  const handleToggle = () => {
    if (isControlled && externalOnToggle) {
      externalOnToggle(!isOpen);
    } else {
      setInternalIsOpen(!isOpen);
    }
  };

  const closeMenu = () => {
    if (isControlled && externalOnToggle) {
      externalOnToggle(false);
    } else {
      setInternalIsOpen(false);
    }
  };

  const navItems = [
    { id: 'reports', label: 'Profit and Loss', icon: <PieChart size={20} /> },
    { id: 'clients', label: 'Builders', icon: <Users size={20} /> },
    { id: 'expenses', label: 'Expenses', icon: <CreditCard size={20} /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt size={20} /> },
  ];

  const handleNav = (id: string) => {
    onNavigate(id as ViewState);
    closeMenu();
  };

  return (
    <>
      {/* FAB Button */}
      <div className={`relative ${className}`} style={{ position: 'relative' }}>
        <button
          onClick={(e) => { 
            e.stopPropagation(); 
            handleToggle(); 
          }}
          className={`w-14 h-14 rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 bg-primary text-primary-on`}
          title="Menu"
        >
          <div className="relative w-6 h-6 flex items-center justify-center">
              <Menu 
                size={24} 
                className={`absolute transition-all duration-300 ${isOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} 
              />
              <X 
                size={24} 
                className={`absolute transition-all duration-300 ${isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} 
              />
          </div>
        </button>
      </div>
      
      {/* Menu Content - Portal to body to escape overflow:hidden */}
      {isOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 animate-fade-in"
            onClick={closeMenu}
            style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'auto' }}
          />
          
          {/* Menu - Center Screen */}
          <div 
            className="overflow-y-auto flex flex-col gap-2 p-2 animate-slide-up"
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 'auto',
              zIndex: 9999,
              pointerEvents: 'auto',
              width: 'min(calc(100vw - 2rem), 22rem)',
              height: 'fit-content',
              maxHeight: 'min(calc(100vh - 4rem), 36rem)'
            }}
          >
            {/* Custom Actions Section */}
            {customActions.length > 0 && (
              <div className="bg-surface-container dark:bg-gray-700 rounded-2xl p-2 shadow-xl border border-surfaceContainerHigh overflow-hidden">
                  <p className="text-xs font-bold text-primary px-4 py-2 uppercase tracking-wider">Actions</p>
                  {customActions.map((action, idx) => (
                      <button
                          key={idx}
                          onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation();
                            action.onClick(); 
                            closeMenu(); 
                          }}
                          className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl hover:bg-surface-container-high dark:hover:bg-gray-600 transition-colors text-surface-on dark:text-gray-200 text-sm font-medium whitespace-nowrap active:scale-95 touch-manipulation"
                      >
                          <span className="text-primary shrink-0">{action.icon}</span>
                          <span className="truncate">{action.label}</span>
                      </button>
                  ))}
              </div>
            )}

            {/* Navigation Section */}
            <div className="bg-surface-container dark:bg-gray-700 rounded-2xl p-2 shadow-xl border border-surfaceContainerHigh overflow-hidden">
               <p className="text-xs font-bold text-outline px-4 py-2 uppercase tracking-wider">Navigation</p>
              {navItems.map((item) => (
                  <button
                  key={item.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNav(item.id);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl transition-colors text-sm font-medium whitespace-nowrap active:scale-95 touch-manipulation ${
                      currentView === item.id 
                      ? 'bg-primary text-primary-on' 
                      : 'text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-600'
                  }`}
                  >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
