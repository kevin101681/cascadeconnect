/**
 * TYPING INDICATOR COMPONENT
 * Google-style bouncing dots animation (no avatars)
 * January 17, 2026
 */

import React from 'react';

interface TypingIndicatorProps {
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-start ${className}`}>
      {/* Bubble container */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg rounded-bl-none px-3 py-2 shadow-sm">
        <div className="flex items-center space-x-1">
          {/* Dot 1 */}
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
          {/* Dot 2 */}
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.4s' }}></div>
          {/* Dot 3 */}
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.4s' }}></div>
        </div>
      </div>
    </div>
  );
};
