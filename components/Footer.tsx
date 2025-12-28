import React from 'react';

interface FooterProps {
  onNavigate?: (route: 'privacy' | 'terms') => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-8 px-4 bg-surface-container/50 dark:bg-gray-800/50 border-t border-surface-outline-variant dark:border-gray-700">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img 
              src="/logo.svg" 
              alt="Cascade Connect" 
              className="h-6 w-6 object-contain" 
            />
            <span className="text-sm text-surface-on-variant dark:text-gray-400">
              © {currentYear} Cascade Connect
            </span>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate?.('privacy')}
              className="text-sm text-surface-on-variant dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onNavigate?.('terms')}
              className="text-sm text-surface-on-variant dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Terms of Service
            </button>
          </div>

        </div>

        {/* Additional Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-surface-on-variant dark:text-gray-500">
            Cascade Connect is a warranty management platform. For SMS support, reply STOP to opt out or HELP for assistance.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

