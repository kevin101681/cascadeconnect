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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
      onClick={onClose}
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
              className="p-2 rounded-full hover:bg-surface-container-high dark:hover:bg-gray-700 active:bg-surface-container dark:active:bg-gray-600 transition-colors text-surface-on dark:text-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h4 className="text-base font-medium text-surface-on dark:text-gray-100">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-full hover:bg-surface-container-high dark:hover:bg-gray-700 active:bg-surface-container dark:active:bg-gray-600 transition-colors text-surface-on dark:text-gray-100"
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
                    aspect-square rounded-full text-sm font-medium transition-all duration-200
                    flex items-center justify-center relative
                    ${disabled
                      ? 'text-surface-on-variant/30 dark:text-gray-600/30 cursor-not-allowed'
                      : selected
                      ? 'bg-primary dark:bg-primary text-primary-on dark:text-primary-on shadow-elevation-1 hover:shadow-elevation-2 hover:bg-primary/90 dark:hover:bg-primary/90'
                      : isTodayDate
                      ? 'bg-primary-container dark:bg-primary-container/30 text-primary-on-container dark:text-primary-on-container border-2 border-primary dark:border-primary/50 hover:bg-primary-container/80 dark:hover:bg-primary-container/40'
                      : 'text-surface-on dark:text-gray-100 hover:bg-surface-container-high dark:hover:bg-gray-700 active:bg-surface-container dark:active:bg-gray-600'
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
    </div>
  );
};

export default CalendarPicker;

