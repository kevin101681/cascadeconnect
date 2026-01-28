import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerSimpleProps {
  selectedDate?: string; // YYYY-MM-DD format
  onDateSelect: (date: string) => void;
  onClose: () => void;
}

const CalendarPickerSimple: React.FC<CalendarPickerSimpleProps> = ({
  selectedDate,
  onDateSelect,
  onClose,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
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
  }, [onClose]);

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

  const isDateSelected = (year: number, month: number, day: number) => {
    if (!selectedDate) return false;
    const [y, m, d] = selectedDate.split('-').map(Number);
    return year === y && month === m && day === d;
  };

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date();
    return (
      year === today.getFullYear() &&
      month === today.getMonth() + 1 &&
      day === today.getDate()
    );
  };

  const handleDateClick = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDateSelect(dateString);
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

  const calendarContent = (
    <div 
      ref={calendarRef}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-80 border border-gray-200 dark:border-gray-700 animate-[scale-in_0.15s_ease-out] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Calendar */}
      <div className="p-5 bg-white dark:bg-gray-800">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-gray-700 dark:text-gray-100 hover:shadow-sm active:scale-95"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h4>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-gray-700 dark:text-gray-100 hover:shadow-sm active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {dayNames.map(day => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={index} className="aspect-square" />;
            }

            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            const selected = isDateSelected(year, month, day);
            const isTodayDate = isToday(year, month, day);

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                className={`
                  aspect-square rounded-full text-sm font-semibold transition-all duration-200
                  flex items-center justify-center relative
                  ${selected
                    ? 'bg-primary text-white shadow-md hover:shadow-lg hover:bg-primary/90 scale-105'
                    : isTodayDate
                    ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200 ring-offset-1 hover:bg-blue-100'
                    : 'text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 active:bg-gray-200 dark:active:bg-gray-600 active:scale-100'
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

  // Use portal to render at body level with very high z-index
  return createPortal(
    <div className="fixed inset-0 z-[100005] pointer-events-none">
      <div className="pointer-events-auto absolute" style={{ 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)' 
      }}>
        {calendarContent}
      </div>
    </div>,
    document.body
  );
};

export default CalendarPickerSimple;
