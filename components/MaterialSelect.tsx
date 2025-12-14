import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface MaterialSelectOption {
  value: string;
  label: string;
}

interface MaterialSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: MaterialSelectOption[];
  label?: string;
  disabled?: boolean;
  className?: string;
}

const MaterialSelect: React.FC<MaterialSelectProps> = ({
  value,
  onChange,
  options,
  label,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocused(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setFocused(false);
  };

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      {label && (
        <label className="block text-xs text-surface-on-variant dark:text-gray-400 mb-1 ml-1 font-medium">
          {label}
        </label>
      )}
      <div
        className={`
          relative w-full rounded-full border transition-all cursor-pointer
          ${disabled 
            ? 'bg-surface-container dark:bg-gray-700 border-surface-outline-variant dark:border-gray-600 cursor-not-allowed opacity-60' 
            : focused || isOpen
            ? 'border-primary ring-1 ring-primary bg-surface-container dark:bg-gray-700'
            : 'border-surface-outline dark:border-gray-600 bg-surface-container dark:bg-gray-700 hover:border-surface-on-variant dark:hover:border-gray-500'
          }
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onFocus={() => !disabled && setFocused(true)}
        onBlur={() => setFocused(false)}
        tabIndex={disabled ? -1 : 0}
      >
        <div className="flex items-center justify-between px-4 py-2 h-[2.5rem]">
          <span className={`text-sm ${value ? 'text-surface-on dark:text-gray-100' : 'text-surface-on-variant dark:text-gray-400'}`}>
            {selectedOption?.label || 'Select...'}
          </span>
          <ChevronDown 
            className={`h-4 w-4 text-surface-on-variant dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
        
        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-surface dark:bg-gray-800 rounded-lg border border-surface-outline-variant dark:border-gray-700 shadow-elevation-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                    ${value === option.value
                      ? 'bg-primary-container dark:bg-primary/20 text-primary-on-container dark:text-primary'
                      : 'text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <Check className="h-4 w-4 text-primary-on-container dark:text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialSelect;

