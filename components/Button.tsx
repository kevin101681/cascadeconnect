import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'filled', 
  isLoading = false, 
  className = '', 
  icon,
  ...props 
}) => {
  // M3 Button Specs: Height 40px, rounded-full (but allow height override for compact buttons)
  const baseStyles = "inline-flex items-center justify-center px-6 h-10 text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-38 disabled:cursor-not-allowed gap-2 relative overflow-hidden";
  
  const variants = {
    // Primary / Filled Button - Now matches outlined style for consistency
    filled: "border border-surface-outline text-primary bg-surface dark:bg-gray-800 hover:bg-primary/10 focus:bg-primary/10",
    // Secondary / Tonal Button
    tonal: "bg-secondary-container text-secondary-on-container hover:bg-opacity-92 hover:shadow-elevation-1",
    // Outlined Button - Same as filled for consistency
    outlined: "border border-surface-outline text-primary bg-surface dark:bg-gray-800 hover:bg-primary/10 focus:bg-primary/10",
    // Text Button
    text: "text-primary hover:bg-primary/10 px-3",
    // Danger / Error Button
    danger: "bg-error text-error-on hover:bg-error/90 hover:shadow-elevation-1"
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