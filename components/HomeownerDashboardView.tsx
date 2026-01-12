"use client";

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
import { StaggerContainer, FadeIn } from './motion/MotionWrapper';
import { SmoothHeightWrapper } from './motion/SmoothHeightWrapper';
import { Input } from './ui/input';

// Appointment interface for type safety
interface UpcomingAppointment {
  claimId: string;
  claimTitle: string;
  date: string; // ISO string format
  timeSlot: string | null | undefined;
  contractorName: string | null | undefined;
  count: number; // Number of appointments on this date
}

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

interface HomeownerDashboardViewProps {
  homeowner: Homeowner;
  onNavigateToModule: (module: string) => void;
  onOpenNewMessage?: () => void; // For internal messaging
  upcomingAppointment?: UpcomingAppointment | null; // Optional upcoming appointment data
  onAppointmentClick?: (claimId: string) => void; // Handler for appointment click
  // Optional admin search (Homeowner picker) - rendered above the info card
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchResults?: Homeowner[];
  onSelectHomeowner?: (homeowner: Homeowner) => void;
}

const HomeownerDashboardView: React.FC<HomeownerDashboardViewProps> = ({
  homeowner,
  onNavigateToModule,
  onOpenNewMessage,
  upcomingAppointment = null,
  onAppointmentClick,
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectHomeowner,
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
      {/* Edge-to-edge stacked cards (BlueTag-inspired) */}
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[24px] overflow-hidden">
          {/* First Card: Search + Homeowner Info */}
          <FadeIn direction="down" className="w-full">
            <div className="px-4 py-4">
              {/* Homeowner Search (Admin/Builder context) */}
              {searchQuery !== undefined && onSearchChange && searchResults && onSelectHomeowner && (
                <div className="mb-4 relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Homeowner Search"
                    className="w-full border border-input rounded-full bg-background"
                  />
                  {searchQuery && (
                    <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 max-h-80 overflow-y-auto overflow-x-hidden">
                      {searchResults.length > 0 ? (
                        searchResults.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              onSelectHomeowner(h);
                              onSearchChange('');
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-surface-container dark:hover:bg-gray-700 flex items-center justify-between group border-b border-surface-outline-variant/50 dark:border-gray-700/50 last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-surface-on dark:text-gray-100 text-sm truncate">{h.name}</p>
                              <p className="text-xs text-surface-on-variant dark:text-gray-300 truncate">
                                {h.jobName && <span className="font-medium text-primary mr-1">{h.jobName} •</span>}
                                {h.address}
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-surface-on-variant dark:text-gray-400 text-xs">No homeowners found.</div>
                      )}
                    </div>
                  )}
                </div>
              )}

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

              {/* Expanded Details with Smooth Height Animation */}
              <SmoothHeightWrapper>
                {isHeaderExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
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
              </SmoothHeightWrapper>
            </div>
          </FadeIn>

          {/* Thin separator between stacked sections */}
          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Optional: Upcoming Appointment (embedded into stack) */}
          {upcomingAppointment != null && (
            <>
              <FadeIn direction="down" className="w-full">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Next Appointment
                    </h3>
                  </div>
                  <button
                    onClick={() => onAppointmentClick?.(upcomingAppointment.claimId)}
                    className="w-full bg-primary/5 dark:bg-gray-700/50 hover:bg-primary/10 dark:hover:bg-gray-700 p-3 rounded-lg border border-primary/20 dark:border-gray-600 transition-all text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {upcomingAppointment.claimTitle}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          {new Date(upcomingAppointment.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                          {upcomingAppointment.timeSlot && ` • ${upcomingAppointment.timeSlot}`}
                        </p>
                        {upcomingAppointment.contractorName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {upcomingAppointment.contractorName}
                          </p>
                        )}
                      </div>
                      {upcomingAppointment.count > 1 && (
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-medium">
                          {upcomingAppointment.count}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </FadeIn>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
            </>
          )}

      {/* Categorized Modules - Staggered Cascade Animation */}
      <StaggerContainer className="px-0 py-4 space-y-0" staggerDelay={0.08}>
        {/* Project Section - 4 items (2x2 grid) */}
        <FadeIn direction="up" fullWidth>
          <div className="bg-white dark:bg-gray-800 p-4">
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
        </FadeIn>
        <div className="h-px bg-gray-200 dark:bg-gray-700" />

        {/* Quick Actions Section - 4 items (2x2 grid) */}
        <FadeIn direction="up" fullWidth>
          <div className="bg-white dark:bg-gray-800 p-4">
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
        </FadeIn>
        <div className="h-px bg-gray-200 dark:bg-gray-700" />

        {/* Communication Section - 4 items (2x2 grid) */}
        <FadeIn direction="up" fullWidth>
          <div className="bg-white dark:bg-gray-800 p-4">
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
        </FadeIn>
        <div className="h-px bg-gray-200 dark:bg-gray-700" />

        {/* Financial Section - 2 items (2x1 grid) */}
        <FadeIn direction="up" fullWidth>
          <div className="bg-white dark:bg-gray-800 p-4">
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
        </FadeIn>
      </StaggerContainer>
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

export default HomeownerDashboardView;
