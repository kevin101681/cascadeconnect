import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react"; 
import { Button, ButtonProps } from "@/components/ui/button"; // Imports your existing styles

interface DropdownOption {
  label: string;
  onClick: () => void;
  className?: string; // Optional for red/destructive items
}

interface DropdownButtonProps extends ButtonProps {
  label: string;
  options: DropdownOption[];
}

export function DropdownButton({ label, options, className, ...props }: DropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* 1. THE TRIGGER
        We spread {...props} so you can pass variants like variant="outline" or size="sm" 
        and they will pass through to your standard Button component.
      */}
      <Button 
        {...props}
        onClick={() => setIsOpen(!isOpen)}
        className={`gap-2 ${className || ""}`} 
      >
        {label}
        <ChevronDown 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
        />
      </Button>

      {/* 2. THE MENU */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  option.onClick();
                  setIsOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                  option.className || "text-gray-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

