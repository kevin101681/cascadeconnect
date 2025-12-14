
import React, { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

interface HeaderMenuProps {
  children: React.ReactNode;
}

export const HeaderMenu: React.FC<HeaderMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop View: Show inline */}
      <div className="hidden md:flex w-full items-center justify-between gap-4">
        {children}
      </div>

      {/* Mobile View: Toggle Button */}
      <div className="md:hidden flex justify-end w-full">
        <button 
            onClick={() => setIsOpen(true)}
            className="w-10 h-10 rounded-full bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 flex items-center justify-center"
        >
            <SlidersHorizontal size={20} />
        </button>
      </div>

      {/* Mobile Sheet/Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 md:hidden animate-fade-in" onClick={() => setIsOpen(false)}>
            <div 
                className="absolute top-0 right-0 h-full w-3/4 max-w-sm bg-surface p-6 shadow-xl flex flex-col gap-6 animate-slide-left"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-onSurface">Filters & Options</h3>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-surface-container dark:bg-gray-700 rounded-full">
                        <X size={24} />
                    </button>
                </div>
                <div className="flex flex-col gap-4 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
      )}
    </>
  );
};
