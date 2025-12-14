import React from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalWrapperProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl';
  actions?: React.ReactNode;
  className?: string;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = '7xl',
  actions,
  className = ''
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '7xl': 'max-w-7xl'
  };

  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto ${className}`}>
      <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-1 border border-surface-outline-variant dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-surface-outline-variant dark:border-gray-700">
          <div className="flex-1">
            <h1 className="text-2xl font-normal text-surface-on dark:text-gray-100">{title}</h1>
            {subtitle && (
              <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {actions}
            <Button
              variant="text"
              onClick={onClose}
              icon={<X className="h-4 w-4" />}
              className="flex-shrink-0"
            >
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ModalWrapper;

