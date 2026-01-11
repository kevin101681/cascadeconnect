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
  MessageSquare,
  MapPin,
  Check,
  Eye,
  Clock,
} from 'lucide-react';
import { Homeowner } from '../types';

// Helper function to determine client status
type ClientStatus = 'active' | 'invite_read' | 'pending';

interface StatusBadgeProps {
  status: ClientStatus;
  showLabel?: boolean;
}

const getClientStatus = (homeowner: Homeowner): ClientStatus => {
  // Priority 1: Check if user has created an account (has clerkId)
  if (homeowner.clerkId) {
    return 'active';
  }
  
  // Priority 2: Check if invite email was read
  if (homeowner.inviteEmailRead) {
    return 'invite_read';
  }
  
  // Priority 3: Default to pending
  return 'pending';
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showLabel = true }) => {
  const configs = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      icon: Check,
      label: 'Active',
    },
    invite_read: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      icon: Eye,
      label: 'Viewed',
    },
    pending: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-800 dark:text-gray-300',
      icon: Clock,
      label: 'Pending',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2 py-0.5 ${config.bg} ${config.text}`}
      title={`Status: ${config.label}`}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

interface HomeownerDashboardMobileProps {
  homeowner: Homeowner;
  onNavigateToModule: (module: string) => void;
  onOpenNewMessage?: () => void; // For internal messaging
}

const HomeownerDashboardMobile: React.FC<HomeownerDashboardMobileProps> = ({
  homeowner,
  onNavigateToModule,
  onOpenNewMessage,
}) => {
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

  // Determine client status
  const clientStatus = getClientStatus(homeowner);

  // Format closing date nicely
  const formattedClosingDate = homeowner.closingDate 
    ? new Date(homeowner.closingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

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
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  };

  const handleMessage = () => {
    if (onOpenNewMessage) {
      onOpenNewMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      {/* Collapsible Header Card */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Name with Status Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                  {homeowner.name}
                </h1>
                <StatusBadge status={clientStatus} showLabel={true} />
              </div>
              {/* Project Name • Closing Date */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {homeowner.jobName || 'Project'} {formattedClosingDate && `• ${formattedClosingDate}`}
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
              {homeowner.address && (
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Address:</span>
                  <span className="text-gray-900 dark:text-white">{homeowner.address}</span>
                </div>
              )}
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
              {homeowner.phone && (
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Phone:</span>
                  <span className="text-gray-900 dark:text-white">{homeowner.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Categorized Modules - Full Width on Mobile */}
      <div className="px-0 md:px-4 py-4 space-y-4">
        {/* Project Section - 4 items (2x2 grid) */}
        <div className="bg-white dark:bg-gray-800 rounded-none md:rounded-xl shadow-sm border-y md:border border-x-0 md:border-x border-gray-200 dark:border-gray-700 p-4">
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

        {/* Quick Actions Section - 4 items (2x2 grid) */}
        <div className="bg-white dark:bg-gray-800 rounded-none md:rounded-xl shadow-sm border-y md:border border-x-0 md:border-x border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <ModuleButton
              icon={<MessageCircle className="h-5 w-5" />}
              label="Text"
              onClick={handleSMS}
            />
            <ModuleButton
              icon={<MapPin className="h-5 w-5" />}
              label="Maps"
              onClick={handleNavigate}
            />
            <ModuleButton
              icon={<Phone className="h-5 w-5" />}
              label="Call"
              onClick={handleCall}
            />
            <ModuleButton
              icon={<MessageSquare className="h-5 w-5" />}
              label="Message"
              onClick={handleMessage}
            />
          </div>
        </div>

        {/* Communication Section - 4 items (2x2 grid) */}
        <div className="bg-white dark:bg-gray-800 rounded-none md:rounded-xl shadow-sm border-y md:border border-x-0 md:border-x border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Communication
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <ModuleButton
              icon={<MessagesSquare className="h-5 w-5" />}
              label="Messages"
              onClick={() => onNavigateToModule('MESSAGES')}
            />
            <ModuleButton
              icon={<PhoneCall className="h-5 w-5" />}
              label="Calls"
              onClick={() => onNavigateToModule('CALLS')}
            />
            <ModuleButton
              icon={<MessageCircle className="h-5 w-5" />}
              label="Team Chat"
              onClick={() => onNavigateToModule('CHAT')}
            />
            <ModuleButton
              icon={<StickyNote className="h-5 w-5" />}
              label="Notes"
              onClick={() => onNavigateToModule('NOTES')}
            />
          </div>
        </div>

        {/* Financial Section - 2 items (2x1 grid) */}
        <div className="bg-white dark:bg-gray-800 rounded-none md:rounded-xl shadow-sm border-y md:border border-x-0 md:border-x border-gray-200 dark:border-gray-700 p-4">
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

