import type { ComponentProps } from 'react';
import BaseButton from '../Button';
import { cn } from '@/lib/utils';

export type ButtonProps = ComponentProps<typeof BaseButton>;

export const Button = (props: ButtonProps) => <BaseButton {...props} />;

// Helper function for button variant classes (used by Calendar component)
export function buttonVariants({ variant = "default" }: { variant?: string } = {}) {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variantClasses: Record<string, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };
  
  return cn(baseClasses, variantClasses[variant] || variantClasses.default);
}

export default Button;

