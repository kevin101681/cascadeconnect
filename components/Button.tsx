import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'filled',
  size = 'md',
  isLoading = false, 
  className = '', 
  icon,
  ...props 
}) => {
  // Size styles
  const sizeStyles = {
    sm: "h-8 px-4 text-xs",
    md: "h-10 px-6 text-sm",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10 p-0"
  };
  
  // M3 Button Specs: Height 40px, rounded-full (but allow height override for compact buttons)
  const baseStyles = `inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 disabled:opacity-38 disabled:cursor-not-allowed gap-2 relative overflow-hidden hover:-translate-y-0.5 ${sizeStyles[size]}`;
  
  const variants = {
    // Primary / Filled Button - Vibrant primary color
    filled: "bg-primary text-white border-none hover:bg-primary/90 hover:shadow-lg active:bg-primary/80",
    // Secondary / Tonal Button
    tonal: "bg-secondary-container text-secondary-on-container hover:bg-opacity-92 hover:shadow-lg",
    // Outlined Button - Borderless with subtle hover background
    outlined: "text-primary bg-surface dark:bg-gray-800 hover:bg-black/5 dark:hover:bg-white/10 hover:shadow-md focus:bg-black/5 dark:focus:bg-white/10",
    outline: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:shadow-md focus:bg-gray-50",
    // Text Button
    text: "text-primary hover:bg-primary/10 px-3",
    // Ghost Button - transparent with hover effect
    ghost: "text-gray-600 hover:bg-gray-100 hover:shadow-sm focus:bg-gray-100",
    // Danger / Error Button
    danger: "bg-error text-error-on hover:bg-error/90 hover:shadow-lg"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* Ripple effect overlay could be added here, simplified for React without extra libs */}
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="-ml-1">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;