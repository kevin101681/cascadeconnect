import React, { useState } from 'react';
import type { DashboardProps } from '../AdminDashboard';
import type { Homeowner } from '../../types';
import { 
  X, Search, Loader2, ChevronRight, ChevronDown,
  ClipboardList, Calendar, HardHat, Shield,
  Phone, MessageCircle, MapPin, Mail,
  FileText, Home, Settings, Users, DollarSign,
  Bell, Archive, BarChart
} from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { formatDate } from '../../lib/utils/dateHelpers';
import { ClaimStatus } from '../../types';

/**
 * Admin Mobile View - Dashboard Layout
 * 
 * A button-based mobile dashboard that provides quick access to all admin features.
 * After selecting a homeowner, shows:
 * 1. Collapsible homeowner info header
 * 2. PROJECT section (Warranty, Tasks, Schedule, BlueTag)
 * 3. QUICK ACTIONS section (Call, Text, Maps, Message)
 * 4. BACKEND section (All admin tools from desktop header)
 */
export const AdminMobile: React.FC<DashboardProps> = (props) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [isHomeownerExpanded, setIsHomeownerExpanded] = useState(false);
  
  const {
    claims,
    userRole,
    homeowners,
    activeHomeowner,
    targetHomeowner,
    onClearHomeownerSelection,
    searchQuery,
    onSearchChange,
    searchResults,
    onSelectHomeowner,
    documents,
    messages,
    onSelectClaim,
    onNewClaim,
    onNavigate,
  } = props;

  // Determine which homeowner to display
  const displayHomeowner = targetHomeowner || activeHomeowner;

  // Debug logging
  console.log('📱 AdminMobile render:', {
    targetHomeowner: targetHomeowner?.name || 'null',
    activeHomeowner: activeHomeowner?.name || 'null',
    displayHomeowner: displayHomeowner?.name || 'null',
    isSelecting,
  });

  // Handler for homeowner selection
  const handleHomeownerSelect = (homeowner: Homeowner) => {
    console.log('📱 AdminMobile: Homeowner selected:', homeowner.name, homeowner.id);
    setIsSelecting(true);
    
    if (onSelectHomeowner) {
      onSelectHomeowner(homeowner);
    }
    
    if (onSearchChange) {
      onSearchChange('');
    }
    
    setTimeout(() => {
      console.log('📱 AdminMobile: Loading complete, showing dashboard');
      setIsSelecting(false);
    }, 800);
  };

  // Handler to clear selection and return to search
  const handleClearSelection = () => {
    console.log('📱 AdminMobile: Clearing homeowner selection, returning to search');
    setIsHomeownerExpanded(false);
    if (onClearHomeownerSelection) {
      onClearHomeownerSelection();
    }
  };

  // Action button component
  const ActionButton: React.FC<{
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }> = ({ icon: Icon, label, onClick, variant = 'secondary' }) => (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-3 rounded-2xl p-6 transition-all active:scale-95
        ${variant === 'primary' 
          ? 'bg-primary/10 text-primary border-2 border-primary/20' 
          : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
        }
      `}
      style={{ minHeight: '110px' }}
    >
      <Icon className={`h-8 w-8 ${variant === 'primary' ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`} />
      <span className={`text-sm font-medium text-center ${variant === 'primary' ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
        {label}
      </span>
    </button>
  );

  // ========== DASHBOARD STATE (Homeowner Selected) ==========
  if (displayHomeowner) {
    console.log('✅ AdminMobile: Rendering dashboard for', displayHomeowner.name);
    
    const homeownerClaims = claims.filter(c => 
      c.homeownerEmail?.toLowerCase() === displayHomeowner.email?.toLowerCase()
    );

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 px-4 py-4 shadow-sm sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              CASCADE CONNECT
            </h1>
            <button
              onClick={handleClearSelection}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Search className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Collapsible Homeowner Info Card */}
        <div className="mx-4 mt-4 mb-6">
          <button
            onClick={() => setIsHomeownerExpanded(!isHomeownerExpanded)}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {displayHomeowner.name}
                  </h2>
                  {homeownerClaims.length > 0 && homeownerClaims[0].status && (
                    <StatusBadge status={homeownerClaims[0].status} />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {displayHomeowner.jobName || 'No project'} • {formatDate(displayHomeowner.closingDate)}
                </p>
              </div>
              {isHomeownerExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
              )}
            </div>

            {/* Expanded Details */}
            {isHomeownerExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Email</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium truncate">{displayHomeowner.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{displayHomeowner.phone || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Address</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{displayHomeowner.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Builder</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{displayHomeowner.builder || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Closing Date</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(displayHomeowner.closingDate)}</p>
                  </div>
                </div>
              </div>
            )}
          </button>
        </div>

        {/* PROJECT Section */}
        <div className="px-4 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            PROJECT
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={ClipboardList}
              label="Tasks"
              onClick={() => {
                console.log('📋 Tasks clicked');
                // Future: Open tasks modal
              }}
            />
            <ActionButton
              icon={Calendar}
              label="Schedule"
              onClick={() => {
                console.log('📅 Schedule clicked');
                // Future: Open schedule modal
              }}
            />
            <ActionButton
              icon={HardHat}
              label="BlueTag"
              onClick={() => {
                console.log('🏗️ BlueTag clicked');
                // Future: Open punch list modal
              }}
            />
            <ActionButton
              icon={Shield}
              label="Warranty"
              onClick={() => {
                console.log('🛡️ Warranty clicked');
                // Future: Open warranty modal
              }}
            />
          </div>
        </div>

        {/* QUICK ACTIONS Section */}
        <div className="px-4 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            QUICK ACTIONS
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={MessageCircle}
              label="Text"
              onClick={() => {
                if (displayHomeowner.phone) {
                  window.open(`sms:${displayHomeowner.phone}`, '_blank');
                }
              }}
            />
            <ActionButton
              icon={MapPin}
              label="Maps"
              onClick={() => {
                if (displayHomeowner.address) {
                  const encodedAddress = encodeURIComponent(displayHomeowner.address);
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
                }
              }}
            />
            <ActionButton
              icon={Phone}
              label="Call"
              onClick={() => {
                if (displayHomeowner.phone) {
                  window.open(`tel:${displayHomeowner.phone}`, '_blank');
                }
              }}
            />
            <ActionButton
              icon={Mail}
              label="Message"
              onClick={() => {
                console.log('💬 Message clicked');
                // Future: Open messages modal
              }}
            />
          </div>
        </div>

        {/* BACKEND Section */}
        <div className="px-4 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            BACKEND
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={Home}
              label="Claims"
              onClick={() => {
                console.log('🏠 Claims clicked - showing first claim or new claim form');
                if (homeownerClaims.length > 0) {
                  onSelectClaim(homeownerClaims[0]);
                } else {
                  onNewClaim(displayHomeowner.id);
                }
              }}
              variant="primary"
            />
            <ActionButton
              icon={Mail}
              label="Messages"
              onClick={() => {
                console.log('📧 Messages (backend) clicked');
                // Future: Navigate to messages tab
              }}
            />
            <ActionButton
              icon={FileText}
              label="Documents"
              onClick={() => {
                console.log('📄 Documents clicked');
                // Future: Navigate to documents tab
              }}
            />
            <ActionButton
              icon={Users}
              label="Homeowners"
              onClick={() => {
                console.log('👥 Homeowners clicked');
                // Future: Navigate to homeowners list
              }}
            />
            <ActionButton
              icon={DollarSign}
              label="Invoices"
              onClick={() => {
                console.log('💰 Invoices clicked');
                // Future: Navigate to invoices
              }}
            />
            <ActionButton
              icon={BarChart}
              label="Analytics"
              onClick={() => {
                console.log('📊 Analytics clicked');
                // Future: Navigate to analytics
              }}
            />
            <ActionButton
              icon={Bell}
              label="Notifications"
              onClick={() => {
                console.log('🔔 Notifications clicked');
                // Future: Open notifications
              }}
            />
            <ActionButton
              icon={Settings}
              label="Settings"
              onClick={() => {
                console.log('⚙️ Settings clicked');
                // Future: Navigate to settings
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ========== SEARCH STATE (No Homeowner Selected) ==========
  console.log('📱 AdminMobile: Rendering search screen');
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Loading Overlay */}
      {isSelecting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 mx-4 shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-900 dark:text-gray-100 font-medium text-lg">Loading dashboard...</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-4 py-4 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
          CASCADE CONNECT
        </h1>
      </div>

      {/* Mobile-First Search Content */}
      <div className="flex-1 flex flex-col p-4 pt-6 space-y-6">
        {/* Icon and Header */}
        <div className="flex flex-col items-center text-center space-y-4 pt-8">
          <div className="bg-primary/10 dark:bg-primary/20 p-8 rounded-full">
            <Search className="h-16 w-16 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Homeowner Search
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 px-4">
              Search to open dashboard for a homeowner
            </p>
          </div>
        </div>

        {/* Search Input */}
        {searchQuery !== undefined && onSearchChange && searchResults && onSelectHomeowner && (
          <div className="w-full relative">
            <div className="relative">
              <Search 
                className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 pointer-events-none" 
              />
              <input
                type="text"
                placeholder="Search by name, email, or job..."
                className="w-full bg-white dark:bg-gray-800 rounded-2xl pl-14 pr-12 py-5 text-lg border-2 border-gray-300 dark:border-gray-600 focus:ring-4 focus:ring-primary/20 focus:border-primary focus:outline-none text-gray-900 dark:text-gray-100 transition-all shadow-sm"
                style={{ minHeight: '56px' }}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                disabled={isSelecting}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors active:scale-95"
                  disabled={isSelecting}
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <div className="mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[60vh] overflow-y-auto">
                {searchResults.map((homeowner, index) => (
                  <button
                    key={homeowner.id}
                    onClick={() => handleHomeownerSelect(homeowner)}
                    disabled={isSelecting}
                    className={`
                      w-full text-left px-6 py-5 
                      active:bg-primary/10 
                      hover:bg-gray-50 dark:hover:bg-gray-700 
                      border-b border-gray-200 dark:border-gray-700 
                      last:border-0 
                      transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${index === 0 ? 'rounded-t-2xl' : ''}
                      ${index === searchResults.length - 1 ? 'rounded-b-2xl' : ''}
                    `}
                    style={{ minHeight: '72px' }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-semibold text-lg">
                          {homeowner.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      
                      {/* Homeowner Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                          {homeowner.name}
                        </p>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {homeowner.builder && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              🏗️ {homeowner.builder}
                            </p>
                          )}
                          {homeowner.jobName && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              📋 {homeowner.jobName}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Chevron */}
                      <ChevronRight className="flex-shrink-0 h-6 w-6 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {searchQuery && searchResults.length === 0 && (
              <div className="mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                <Search className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400 text-lg">No homeowners found</p>
                <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMobile;
