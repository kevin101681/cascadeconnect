import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate?: Date | null;
  minDate?: Date;
  maxDate?: Date;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  selectedDate,
  minDate,
  maxDate
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = selectedDate ? new Date(selectedDate) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;
    
    onSelectDate(date);
    onClose();
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days: (number | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const isToday = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return date.getTime() === selected.getTime();
  };

  const isDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
    >
      <div 
        className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-3 w-full max-w-sm mx-4 overflow-hidden animate-[scale-in_0.2s_ease-out] border border-surface-outline-variant/50 dark:border-gray-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Material 3 style with surface container */}
        <div className="bg-surface-container-high dark:bg-gray-700/50 px-6 py-4 flex items-center justify-between border-b border-surface-outline-variant/50 dark:border-gray-700/50">
          <h3 className="text-lg font-medium text-surface-on dark:text-gray-100">Select Date</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 transition-colors text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Calendar - Material 3 spacing and styling */}
        <div className="p-6 bg-surface dark:bg-gray-800">
          {/* Month Navigation - Material 3 icon buttons */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-full hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors text-surface-on-variant dark:text-gray-400"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h4 className="text-lg font-medium text-surface-on dark:text-gray-100">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-full hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors text-surface-on-variant dark:text-gray-400"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Day Names - Material 3 typography */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {dayNames.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium text-surface-on-variant dark:text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid - Material 3 date cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const disabled = isDisabled(day);
              const dayIsToday = isToday(day);
              const dayIsSelected = isSelected(day);

              return (
                <button
                  key={day}
                  onClick={() => !disabled && handleDateClick(day)}
                  disabled={disabled}
                  className={`
                    aspect-square rounded-full text-sm font-medium transition-all
                    ${disabled 
                      ? 'text-surface-on-variant/30 dark:text-gray-600 cursor-not-allowed' 
                      : dayIsSelected
                        ? 'bg-primary text-primary-on hover:bg-primary/90'
                        : dayIsToday
                          ? 'bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-600'
                          : 'text-surface-on dark:text-gray-100 hover:bg-surface-container-high dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPicker;
