import React, { useState, useEffect, useRef } from 'react';
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
  const calendarRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add small delay to prevent immediate close from the button click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!isDateDisabled(date)) {
      onSelectDate(date);
      onClose();
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days: (number | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div 
      ref={calendarRef}
      className="absolute z-50 mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-lg w-80 border border-surface-outline-variant/50 dark:border-gray-700/50 animate-[scale-in_0.15s_ease-out] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Calendar - Material 3 popover style */}
      <div className="p-5 bg-surface dark:bg-gray-800">
          {/* Month Navigation - Material 3 */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-full hover:bg-surface-container-high dark:hover:bg-gray-700 transition-all duration-200 text-surface-on dark:text-gray-100 hover:shadow-sm active:scale-95"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h4 className="text-base font-semibold text-surface-on dark:text-gray-100 tracking-tight">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-full hover:bg-surface-container-high dark:hover:bg-gray-700 transition-all duration-200 text-surface-on dark:text-gray-100 hover:shadow-sm active:scale-95"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day Names - Material 3 */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {dayNames.map(day => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-surface-on-variant dark:text-gray-400 py-2 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid - Material 3 date cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={index} className="aspect-square" />;
              }

              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const disabled = isDateDisabled(date);
              const selected = isDateSelected(date);
              const isTodayDate = isToday(date);

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day)}
                  disabled={disabled}
                  className={`
                    aspect-square rounded-full text-sm font-semibold transition-all duration-200
                    flex items-center justify-center relative
                    ${disabled
                      ? 'text-surface-on-variant/30 dark:text-gray-600/30 cursor-not-allowed'
                      : selected
                      ? 'bg-primary dark:bg-primary text-primary-on dark:text-white shadow-md hover:shadow-lg hover:bg-primary/90 dark:hover:bg-primary/90 scale-105'
                      : isTodayDate
                      ? 'bg-primary-container dark:bg-primary-container/30 text-primary-on-container dark:text-primary-on-container ring-2 ring-primary dark:ring-primary/50 ring-offset-1 hover:bg-primary-container/80 dark:hover:bg-primary-container/40'
                      : 'text-surface-on dark:text-gray-100 hover:bg-surface-container-high dark:hover:bg-gray-700 hover:scale-105 active:bg-surface-container dark:active:bg-gray-600 active:scale-100'
                    }
                  `}
                  aria-label={`Select ${monthNames[currentMonth.getMonth()]} ${day}, ${currentMonth.getFullYear()}`}
                  aria-selected={selected}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
    </div>
  );
};

export default CalendarPicker;

