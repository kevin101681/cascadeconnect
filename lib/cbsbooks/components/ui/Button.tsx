import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal' | 'text' | 'danger' | 'outline';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center gap-2 px-6 h-10 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden";
  
  const variants = {
    primary: "bg-primary text-onPrimary hover:opacity-90 active:scale-[0.98] focus:ring-primary",
    secondary: "bg-secondaryContainer text-onSecondaryContainer hover:bg-opacity-80 active:scale-[0.98] focus:ring-secondary",
    tonal: "bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-200 hover:bg-opacity-80 active:scale-[0.98] focus:ring-outline",
    text: "bg-transparent text-primary hover:bg-primaryContainer/20 focus:ring-primary",
    danger: "bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500",
    outline: "bg-white border-2 border-primary text-primary hover:bg-primary/10 active:scale-[0.98] focus:ring-primary",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {icon && <span className="w-5 h-5 flex items-center justify-center shrink-0">{icon}</span>}
      {children}
    </button>
  );
};