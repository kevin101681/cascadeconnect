import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Phone,
  MessageCircle,
  Navigation,
  Mail,
  ClipboardList,
  Calendar,
  Tag,
  Shield,
  MessagesSquare,
  StickyNote,
  PhoneCall,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Homeowner } from '../types';

interface HomeownerDashboardMobileProps {
  homeowner: Homeowner;
  onNavigateToModule: (module: string) => void;
}

const HomeownerDashboardMobile: React.FC<HomeownerDashboardMobileProps> = ({
  homeowner,
  onNavigateToModule,
}) => {
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

  // Quick action handlers for native actions
  const handleCall = () => {
    if (homeowner.phone) {
      window.location.href = `tel:${homeowner.phone}`;
    }
  };

  const handleSMS = () => {
    if (homeowner.phone) {
      window.location.href = `sms:${homeowner.phone}`;
    }
  };

  const handleNavigate = () => {
    if (homeowner.address) {
      const encodedAddress = encodeURIComponent(homeowner.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (homeowner.email) {
      window.location.href = `mailto:${homeowner.email}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      {/* Collapsible Header Card */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                {homeowner.name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                {homeowner.address}
              </p>
            </div>
            <button
              onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
              className="ml-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
              aria-label={isHeaderExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isHeaderExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Expanded Details */}
          {isHeaderExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
              {homeowner.builder && (
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Builder:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{homeowner.builder}</span>
                </div>
              )}
              {homeowner.email && (
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Email:</span>
                  <span className="text-gray-900 dark:text-white">{homeowner.email}</span>
                </div>
              )}
              {homeowner.closingDate && (
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Closing:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(homeowner.closingDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-around gap-2">
          <button
            onClick={handleCall}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
            aria-label="Call homeowner"
          >
            <Phone className="h-6 w-6" />
          </button>
          <button
            onClick={handleSMS}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
            aria-label="Send SMS"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
          <button
            onClick={handleNavigate}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
            aria-label="Navigate to address"
          >
            <Navigation className="h-6 w-6" />
          </button>
          <button
            onClick={handleEmail}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
            aria-label="Send email"
          >
            <Mail className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Categorized Modules */}
      <div className="px-4 py-4 space-y-4">
        {/* Project Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Project
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <ModuleButton
              icon={<ClipboardList className="h-5 w-5" />}
              label="Tasks"
              onClick={() => onNavigateToModule('TASKS')}
            />
            <ModuleButton
              icon={<Calendar className="h-5 w-5" />}
              label="Schedule"
              onClick={() => onNavigateToModule('SCHEDULE')}
            />
            <ModuleButton
              icon={<Tag className="h-5 w-5" />}
              label="BlueTag"
              onClick={() => onNavigateToModule('BLUETAG')}
            />
            <ModuleButton
              icon={<Shield className="h-5 w-5" />}
              label="Warranty"
              onClick={() => onNavigateToModule('CLAIMS')}
            />
          </div>
        </div>

        {/* Communication Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Communication
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <ModuleButton
              icon={<MessagesSquare className="h-5 w-5" />}
              label="Messages"
              onClick={() => onNavigateToModule('MESSAGES')}
            />
            <ModuleButton
              icon={<StickyNote className="h-5 w-5" />}
              label="Notes"
              onClick={() => onNavigateToModule('NOTES')}
            />
            <ModuleButton
              icon={<PhoneCall className="h-5 w-5" />}
              label="Calls"
              onClick={() => onNavigateToModule('CALLS')}
            />
          </div>
        </div>

        {/* Financial Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Financial
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <ModuleButton
              icon={<FileText className="h-5 w-5" />}
              label="Invoices"
              onClick={() => onNavigateToModule('INVOICES')}
            />
            <ModuleButton
              icon={<DollarSign className="h-5 w-5" />}
              label="Payroll"
              onClick={() => onNavigateToModule('PAYROLL')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Module Button Component
interface ModuleButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const ModuleButton: React.FC<ModuleButtonProps> = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-all active:scale-95 shadow-sm hover:shadow-md"
    >
      <div className="text-primary dark:text-primary">{icon}</div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
        {label}
      </span>
    </button>
  );
};

export default HomeownerDashboardMobile;

