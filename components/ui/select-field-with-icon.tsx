/**
 * Select Field with Icon Component
 * Uniform select dropdown with leading icon
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Label } from './label';

interface SelectFieldWithIconProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  className?: string;
}

export function SelectFieldWithIcon({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  options,
  disabled = false,
  className,
}: SelectFieldWithIconProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'h-10 w-full pl-9 pr-10 rounded-md border border-input bg-background text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'appearance-none cursor-pointer',
            !value && 'text-muted-foreground'
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

