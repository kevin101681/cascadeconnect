import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-6">
          {title && (
            <span className="bg-primary text-primary-on px-4 py-1.5 rounded-full text-sm font-medium">
              {title}
            </span>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

