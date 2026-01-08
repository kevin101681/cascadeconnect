/**
 * Date Picker Field Component
 * Uniform date picker with calendar icon and consistent styling
 */

import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../Button';
import { Label } from './label';

interface DatePickerFieldProps {
  label: string;
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePickerField({
  label,
  date,
  onSelect,
  placeholder = 'Pick a date',
  disabled = false,
  className,
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('grid gap-2', className)}>
      <Label className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </Label>
      <Button
        type="button"
        variant="outlined"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={cn(
          'h-10 w-full justify-start text-left font-normal border border-input hover:bg-accent hover:text-accent-foreground',
          !date && 'text-muted-foreground'
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? format(date, 'PPP') : <span>{placeholder}</span>}
      </Button>
      
      {/* Calendar picker modal would be triggered here */}
      {/* This would integrate with your existing CalendarPicker component */}
    </div>
  );
}

