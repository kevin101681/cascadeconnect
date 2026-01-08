/**
 * Search Input Field Component
 * Uniform search input with search icon
 */

import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Label } from './label';

interface SearchInputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

export function SearchInputField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: SearchInputFieldProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'h-10 w-full pl-9 pr-3 rounded-md border border-input bg-background text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'placeholder:text-muted-foreground'
          )}
        />
      </div>
    </div>
  );
}

