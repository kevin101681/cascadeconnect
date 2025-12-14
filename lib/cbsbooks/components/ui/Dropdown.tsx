
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface DropdownProps {
  value: string | number;
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  searchable?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...', 
  className = '',
  align = 'left',
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Initialize search query with selected label if exists
  useEffect(() => {
    if (selectedOption && !isOpen) {
      setSearchQuery(selectedOption.label);
    } else if (!value && !isOpen) {
        setSearchQuery('');
    }
  }, [selectedOption, value, isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query to selected value on blur without selection
        if (selectedOption) {
            setSearchQuery(selectedOption.label);
        } else {
            setSearchQuery('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
    const opt = options.find(o => o.value === val);
    if (opt) setSearchQuery(opt.label);
  };

  const filteredOptions = searchable 
    ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const toggleOpen = () => {
    if (searchable) {
        setIsOpen(true);
        inputRef.current?.focus();
        inputRef.current?.select();
    } else {
        setIsOpen(!isOpen);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
    if (e.target.value === '') {
        onChange('');
    }
  };

  // Logic: "The full list won't show unless you start typing"
  const showOptions = isOpen && (!searchable || searchQuery.length > 0);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {searchable ? (
        <div className="relative">
             <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onClick={toggleOpen}
                placeholder={placeholder}
                className={`w-full h-10 px-4 rounded-full bg-surface-container-high dark:bg-gray-600 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all pr-10 ${
                    value ? 'text-surface-on dark:text-gray-200' : 'text-outline'
                }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                <Search size={16} />
            </div>
             {value !== '' && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange('');
                        setSearchQuery('');
                        inputRef.current?.focus();
                    }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-black/5 rounded-full text-outline"
                >
                    <X size={14} />
                </button>
            )}
        </div>
      ) : (
        <button
            onClick={toggleOpen}
            className={`w-full h-10 px-4 rounded-full bg-surface-container-high dark:bg-gray-600 hover:bg-opacity-80 transition-all flex items-center justify-between gap-3 outline-none focus:ring-2 focus:ring-primary ${isOpen ? 'ring-2 ring-primary' : ''}`}
            type="button"
        >
            <span className={`text-sm font-medium truncate ${selectedOption ? 'text-surface-on dark:text-gray-200' : 'text-outline'}`}>
            {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown 
            size={16} 
            className={`text-surface-on dark:text-gray-200 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
        </button>
      )}

      {showOptions && (
            <div 
                className={`absolute top-full mt-2 w-full min-w-[200px] max-h-60 overflow-y-auto bg-surface-container-high dark:bg-gray-600 rounded-2xl shadow-xl z-50 p-2 border border-surfaceContainerHigh/50 animate-slide-up no-scrollbar ${align === 'right' ? 'right-0' : 'left-0'}`}
            >
            {filteredOptions.map((option) => (
                <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between group
                    ${option.value === value 
                    ? 'bg-primary text-onPrimary' 
                    : 'text-surface-on dark:text-gray-200 hover:bg-surface-container dark:bg-gray-700'
                    }`}
                >
                <span className="truncate">{option.label}</span>
                {option.value === value && <Check size={14} />}
                </button>
            ))}
            {filteredOptions.length === 0 && (
                <div className="px-4 py-3 text-sm text-outline text-center">No matches found</div>
            )}
            </div>
      )}
    </div>
  );
};
