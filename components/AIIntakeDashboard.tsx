import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Call, Homeowner } from '../types';
import { Phone, MapPin, Clock, AlertCircle, CheckCircle, XCircle, Calendar, Building2, User, Mail, ExternalLink, Play, Download, Search, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronUp, StickyNote } from 'lucide-react';
import { db, isDbConfigured } from '../db';
import { calls, homeowners } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import SMSChatView from './SMSChatView';
import { useTaskStore } from '../stores/useTaskStore';
import { CallerCard } from './ui/CallerCard';

interface AIIntakeDashboardProps {
  onNavigate?: (view: string) => void;
  onSelectHomeowner?: (homeownerId: string) => void;
}

const AIIntakeDashboard: React.FC<AIIntakeDashboardProps> = ({ onNavigate, onSelectHomeowner }) => {
  const [callsData, setCallsData] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'urgent'>('all');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const ITEMS_PER_PAGE = 9;
  const callDetailsRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadCalls();
    
    // Auto-refresh calls every 30 seconds to pick up new calls
    const interval = setInterval(() => {
      loadCalls();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Scroll to top of call details when a new call is selected (desktop only)
  useEffect(() => {
    if (selectedCall && !isMobile) {
      // Desktop: scroll the right column to top
      if (callDetailsRef.current) {
        callDetailsRef.current.scrollTop = 0;
      }
    }
  }, [selectedCall, isMobile]);

  // Handle browser back button for mobile modal
  useEffect(() => {
    if (selectedCall && isMobile) {
      // Push a history state when modal opens
      window.history.pushState({ modalOpen: 'callDetails' }, '');

      const handlePopState = (e: PopStateEvent) => {
        // Close modal when back button is pressed
        setSelectedCall(null);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [selectedCall, isMobile]);

  const loadCalls = async () => {
    if (!isDbConfigured) {
      console.warn('Database not configured');
      setLoading(false);
      return;
    }

    try {
      // Fetch calls with joined homeowner data
      const callsList = await db
        .select({
          id: calls.id,
          vapiCallId: calls.vapiCallId,
          homeownerId: calls.homeownerId,
          homeownerName: calls.homeownerName,
          phoneNumber: calls.phoneNumber,
          propertyAddress: calls.propertyAddress,
          issueDescription: calls.issueDescription,
          isUrgent: calls.isUrgent,
          transcript: calls.transcript,
          recordingUrl: calls.recordingUrl,
          isVerified: calls.isVerified,
          addressMatchSimilarity: calls.addressMatchSimilarity,
          createdAt: calls.createdAt,
          verifiedBuilderName: homeowners.builder,
          verifiedClosingDate: homeowners.closingDate,
        })
        .from(calls)
        .leftJoin(homeowners, eq(calls.homeownerId, homeowners.id))
        .orderBy(desc(calls.createdAt))
        .limit(100);

      const mappedCalls: Call[] = callsList.map((c: any) => ({
        id: c.id,
        vapiCallId: c.vapiCallId,
        homeownerId: c.homeownerId,
        homeownerName: c.homeownerName,
        phoneNumber: c.phoneNumber,
        propertyAddress: c.propertyAddress,
        issueDescription: c.issueDescription,
        isUrgent: c.isUrgent || false,
        transcript: c.transcript,
        recordingUrl: c.recordingUrl,
        isVerified: c.isVerified || false,
        addressMatchSimilarity: c.addressMatchSimilarity,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        verifiedBuilderName: c.verifiedBuilderName,
        verifiedClosingDate: c.verifiedClosingDate ? new Date(c.verifiedClosingDate) : undefined,
      }));

      setCallsData(mappedCalls);
    } catch (error) {
      console.error('Error loading calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCall = async (callId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection when clicking delete
    
    if (!window.confirm('Are you sure you want to delete this call? This action cannot be undone.')) {
      return;
    }

    if (!isDbConfigured) {
      console.warn('Database not configured');
      return;
    }

    try {
      await db.delete(calls).where(eq(calls.id, callId));
      
      // Remove from local state
      setCallsData(prev => prev.filter(c => c.id !== callId));
      
      // Clear selection if deleted call was selected
      if (selectedCall?.id === callId) {
        setSelectedCall(null);
      }
      
      console.log(`✅ Call ${callId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting call:', error);
      alert('Failed to delete call. Please try again.');
    }
  };

  // Filter calls by status filter - memoized to prevent recreation
  const statusFilteredCalls = useMemo(() => {
    return callsData.filter(call => {
      if (filter === 'verified') return call.isVerified;
      if (filter === 'unverified') return !call.isVerified;
      if (filter === 'urgent') return call.isUrgent;
      return true;
    });
  }, [callsData, filter]);

  // Search across all fields - memoized to prevent recreation
  const filteredCalls = useMemo(() => {
    return statusFilteredCalls.filter(call => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        call.homeownerName?.toLowerCase().includes(query) ||
        call.phoneNumber?.toLowerCase().includes(query) ||
        call.propertyAddress?.toLowerCase().includes(query) ||
        call.issueDescription?.toLowerCase().includes(query) ||
        call.verifiedBuilderName?.toLowerCase().includes(query) ||
        call.transcript?.toLowerCase().includes(query)
      );
    });
  }, [statusFilteredCalls, searchQuery]);

  // Derive the actual selected call or fallback to first call on desktop only
  // On mobile, only show selected call if user explicitly selected one
  // This avoids useEffect infinite loops and prevents auto-showing details on mobile
  const actualSelectedCall = useMemo(() => {
    if (filteredCalls.length === 0) return null;
    if (selectedCall && filteredCalls.find(c => c.id === selectedCall.id)) {
      return selectedCall;
    }
    // Only auto-select first call on desktop
    if (!isMobile) {
      return filteredCalls[0];
    }
    return null; // No auto-selection on mobile
  }, [filteredCalls, selectedCall, isMobile]);

  // Pagination
  const totalPages = Math.ceil(filteredCalls.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCalls = filteredCalls.slice(startIndex, endIndex);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter]);

  const stats = {
    total: callsData.length,
    verified: callsData.filter(c => c.isVerified).length,
    unverified: callsData.filter(c => !c.isVerified).length,
    urgent: callsData.filter(c => c.isUrgent).length,
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleViewHomeowner = (homeownerId: string | null | undefined) => {
    if (homeownerId && onNavigate && onSelectHomeowner) {
      onSelectHomeowner(homeownerId);
      onNavigate('DASHBOARD');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-surface-on-variant dark:text-gray-400">Loading calls...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white dark:bg-white md:rounded-3xl md:border border-surface-outline-variant dark:border-gray-700 flex flex-col max-h-[calc(100vh-8rem)]">
      {/* Two Column Layout */}
      {filteredCalls.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-12 text-center border border-surface-outline-variant dark:border-gray-600">
            <Phone className="h-12 w-12 text-surface-outline-variant dark:text-gray-500 mx-auto mb-4" />
            <p className="text-surface-on-variant dark:text-gray-400">
              {searchQuery ? 'No calls match your search' : 'No calls found'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* LEFT COLUMN - Call Cards List */}
          <div className={`w-full md:w-96 border-r border-surface-outline-variant dark:border-gray-700 overflow-y-auto flex-shrink-0 ${actualSelectedCall ? 'hidden md:block' : 'block'}`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30">
              <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">Calls</h2>
            </div>
            
            {/* Search Bar - Pill shaped */}
            <div className="p-4 pb-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                <input
                  id="calls-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search calls..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-full text-sm text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {paginatedCalls.map((call) => (
                <CallerCard
                  key={call.id}
                  callerName={call.homeownerName || 'Unknown Caller'}
                  dateTime={formatDate(call.createdAt)}
                  description={call.issueDescription || 'No description provided'}
                  status={call.isVerified ? 'Verified' : 'Unverified'}
                  onDelete={() => handleDeleteCall(call.id, new MouseEvent('click') as any)}
                  onClick={() => setSelectedCall(call)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-surface dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <span className="text-xs text-surface-on-variant dark:text-gray-400">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-surface dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Call Details - Desktop Only */}
          <div ref={callDetailsRef} className={`flex-1 overflow-y-auto p-6 pr-8 ${actualSelectedCall ? 'hidden md:block' : 'hidden md:block'}`}>
            {actualSelectedCall ? (
              <div className="space-y-6">
                {/* Back Button for Mobile */}
                <button
                  onClick={() => setSelectedCall(null)}
                  className="md:hidden flex items-center gap-2 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 mb-4"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="text-sm font-medium">Back to calls</span>
                </button>

                {/* Date & Status Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-normal text-surface-on dark:text-gray-100">
                    {formatDate(actualSelectedCall.createdAt)}
                  </h3>
                  <div className="flex items-center gap-2">
                    {actualSelectedCall.isUrgent && (
                      <span className="bg-red-500/30 text-red-700 dark:text-red-300 text-sm font-bold px-3 py-1 rounded-full">
                        URGENT
                      </span>
                    )}
                    {actualSelectedCall.isVerified ? (
                      <span className="bg-green-500/30 text-green-700 dark:text-green-300 text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap">
                        Verified
                      </span>
                    ) : (
                      <span className="bg-orange-500/30 text-orange-700 dark:text-orange-300 text-sm font-medium px-3 py-1 rounded-full">
                        Unverified
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                    <div className="p-2 bg-surface dark:bg-gray-600 rounded-lg">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-surface-on-variant dark:text-gray-400">Homeowner</p>
                      <p className="text-sm font-medium text-surface-on dark:text-gray-100">
                        {actualSelectedCall.homeownerName || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  {actualSelectedCall.phoneNumber && actualSelectedCall.phoneNumber !== 'CALLER_ID' && actualSelectedCall.phoneNumber !== 'not provided' && actualSelectedCall.phoneNumber !== 'Not Provided' && (
                    <div className="flex items-center gap-3 p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                      <div className="p-2 bg-surface dark:bg-gray-600 rounded-lg">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-surface-on-variant dark:text-gray-400">Phone</p>
                        <p className="text-sm font-medium text-surface-on dark:text-gray-100">
                          {actualSelectedCall.phoneNumber}
                        </p>
                      </div>
                    </div>
                  )}

                  {actualSelectedCall.propertyAddress && (
                    <div className="flex items-center gap-3 p-4 bg-surface-container dark:bg-gray-700 rounded-lg md:col-span-2">
                      <div className="p-2 bg-surface dark:bg-gray-600 rounded-lg">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-surface-on-variant dark:text-gray-400">Address</p>
                        <p className="text-sm font-medium text-surface-on dark:text-gray-100">
                          {actualSelectedCall.propertyAddress}
                        </p>
                      </div>
                    </div>
                  )}

                  {actualSelectedCall.verifiedBuilderName && (
                    <div className="flex items-center gap-3 p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                      <div className="p-2 bg-surface dark:bg-gray-600 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-surface-on-variant dark:text-gray-400">Builder</p>
                        <p className="text-sm font-bold text-surface-on dark:text-gray-100">
                          {actualSelectedCall.verifiedBuilderName}
                        </p>
                      </div>
                    </div>
                  )}

                  {actualSelectedCall.verifiedClosingDate && (
                    <div className="flex items-center gap-3 p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                      <div className="p-2 bg-surface dark:bg-gray-600 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-surface-on-variant dark:text-gray-400">Closing Date</p>
                        <p className="text-sm font-bold text-surface-on dark:text-gray-100">
                          {new Date(actualSelectedCall.verifiedClosingDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Match Confidence */}
                {actualSelectedCall.addressMatchSimilarity !== null && actualSelectedCall.addressMatchSimilarity !== undefined && typeof actualSelectedCall.addressMatchSimilarity === 'number' && (
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400 mb-2 block">
                      Match Confidence
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-surface-container dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.round(actualSelectedCall.addressMatchSimilarity * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-surface-on dark:text-gray-100">
                        {Math.round(actualSelectedCall.addressMatchSimilarity * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Issue Description */}
                {actualSelectedCall.issueDescription && (
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400 mb-2 block">Issue Description</label>
                    <div className="p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                      <p className="text-base text-surface-on dark:text-gray-100 whitespace-pre-wrap">
                        {actualSelectedCall.issueDescription}
                      </p>
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {actualSelectedCall.transcript && (
                  <div>
                    <button
                      onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                      className="w-full flex items-center justify-between text-sm text-surface-on-variant dark:text-gray-400 mb-2 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
                    >
                      <span>Call Transcript</span>
                      {isTranscriptExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {isTranscriptExpanded && (
                      <div className="p-4 bg-surface-container dark:bg-gray-700 rounded-lg max-h-64 overflow-y-auto">
                        <p className="text-sm text-surface-on dark:text-gray-100 whitespace-pre-wrap">
                          {actualSelectedCall.transcript}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* SMS Chat - Show if homeowner is verified and has phone number */}
                {actualSelectedCall.homeownerId && actualSelectedCall.phoneNumber && (
                  <div className="mt-6">
                    <SMSChatView
                      homeownerId={actualSelectedCall.homeownerId}
                      homeownerName={actualSelectedCall.homeownerName}
                      homeownerPhone={actualSelectedCall.phoneNumber}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t border-surface-outline-variant dark:border-gray-700 space-y-3">
                  {/* Add Note Button */}
                  <button
                    onClick={() => {
                      const callerName = actualSelectedCall.homeownerName || 'Unknown Caller';
                      const phoneNumber = actualSelectedCall.phoneNumber || 'unknown number';
                      const contextLabel = `Call • ${callerName} • ${formatDate(actualSelectedCall.createdAt)}`;
                      const prefilledBody = `Call ${callerName} (${phoneNumber}) back.`;
                      
                      useTaskStore.getState().openTasks(
                        actualSelectedCall.homeownerId || undefined,
                        contextLabel,
                        'call',
                        prefilledBody
                      );
                    }}
                    className="w-full px-4 py-2 bg-primary/10 text-primary border border-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <StickyNote className="h-4 w-4" />
                    Add Note
                  </button>
                  
                  {actualSelectedCall.homeownerId && (
                    <button
                      onClick={() => {
                        handleViewHomeowner(actualSelectedCall.homeownerId);
                      }}
                      className="w-full px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Homeowner
                    </button>
                  )}
                  
                  {/* Call Recording Audio Player */}
                  {actualSelectedCall.recordingUrl && (
                    <div className="mt-4 p-4 border border-surface-outline-variant dark:border-gray-700 rounded-lg bg-surface-container/30 dark:bg-gray-800/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Play className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium text-surface-on dark:text-gray-200">Call Recording</p>
                      </div>
                      <audio 
                        controls 
                        src={actualSelectedCall.recordingUrl} 
                        className="w-full"
                        preload="metadata"
                      />
                      <a
                        href={actualSelectedCall.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                      >
                        Open in new tab
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
                <p className="text-surface-on-variant dark:text-gray-400">Select a call to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    
    {/* Mobile Full-Screen Overlay for Call Details */}
    {actualSelectedCall && (
      <div className="md:hidden fixed inset-0 z-50 bg-surface dark:bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="h-16 shrink-0 px-6 border-b border-surface-outline-variant dark:border-gray-700 flex items-center justify-between bg-surface-container/30 dark:bg-gray-700/30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedCall(null)} 
              className="p-2 -ml-2 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="text-sm font-medium text-surface-on dark:text-gray-100">
              Call Details
            </h3>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 overflow-y-auto p-6 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
        >
          <div className="space-y-6">
            {/* Date & Status Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg md:text-2xl font-normal text-surface-on dark:text-gray-100">
                {formatDate(actualSelectedCall.createdAt)}
              </h3>
              <div className="flex items-center gap-2">
                {actualSelectedCall.isUrgent && (
                  <span className="bg-red-500/30 text-red-700 dark:text-red-300 text-sm font-bold px-3 py-1 rounded-full">
                    URGENT
                  </span>
                )}
                {actualSelectedCall.isVerified ? (
                  <span className="bg-green-500/30 text-green-700 dark:text-green-300 text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap">
                    Verified
                  </span>
                ) : (
                  <span className="bg-orange-500/30 text-orange-700 dark:text-orange-300 text-sm font-medium px-3 py-1 rounded-full">
                    Unverified
                  </span>
                )}
              </div>
            </div>

            {/* Contact Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                <div className="p-2 bg-surface dark:bg-gray-600 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-surface-on-variant dark:text-gray-400">Homeowner</p>
                  <p className="text-sm font-medium text-surface-on dark:text-gray-100">
                    {actualSelectedCall.homeownerName || 'Not provided'}
                  </p>
                </div>
              </div>

              {actualSelectedCall.phoneNumber && actualSelectedCall.phoneNumber !== 'CALLER_ID' && actualSelectedCall.phoneNumber !== 'not provided' && actualSelectedCall.phoneNumber !== 'Not Provided' && (
                <div className="flex items-center gap-3 p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                  <div className="p-2 bg-surface dark:bg-gray-600 rounded-lg">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-on-variant dark:text-gray-400">Phone</p>
                    <p className="text-sm font-medium text-surface-on dark:text-gray-100">
                      {actualSelectedCall.phoneNumber}
                    </p>
                  </div>
                </div>
              )}

              {actualSelectedCall.propertyAddress && (
                <div className="flex items-center gap-3 p-4 bg-surface-container dark:bg-gray-700 rounded-lg md:col-span-2">
                  <div className="p-2 bg-surface dark:bg-gray-600 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-on-variant dark:text-gray-400">Address</p>
                    <p className="text-sm font-medium text-surface-on dark:text-gray-100">
                      {actualSelectedCall.propertyAddress}
                    </p>
                  </div>
                </div>
              )}

              {actualSelectedCall.verifiedBuilderName && (
                <div className="flex items-center gap-3 p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                  <div className="p-2 bg-surface dark:bg-gray-600 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-on-variant dark:text-gray-400">Builder</p>
                    <p className="text-sm font-bold text-surface-on dark:text-gray-100">
                      {actualSelectedCall.verifiedBuilderName}
                    </p>
                  </div>
                </div>
              )}

              {actualSelectedCall.verifiedClosingDate && (
                <div className="flex items-center gap-3 p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                  <div className="p-2 bg-surface dark:bg-gray-600 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-on-variant dark:text-gray-400">Closing Date</p>
                    <p className="text-sm font-bold text-surface-on dark:text-gray-100">
                      {new Date(actualSelectedCall.verifiedClosingDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Match Confidence */}
            {actualSelectedCall.addressMatchSimilarity !== null && actualSelectedCall.addressMatchSimilarity !== undefined && typeof actualSelectedCall.addressMatchSimilarity === 'number' && (
              <div>
                <label className="text-sm text-surface-on-variant dark:text-gray-400 mb-2 block">
                  Match Confidence
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-surface-container dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.round(actualSelectedCall.addressMatchSimilarity * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-surface-on dark:text-gray-100">
                    {Math.round(actualSelectedCall.addressMatchSimilarity * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Issue Description */}
            {actualSelectedCall.issueDescription && (
              <div>
                <label className="text-sm text-surface-on-variant dark:text-gray-400 mb-2 block">Issue Description</label>
                <div className="p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                  <p className="text-base text-surface-on dark:text-gray-100 whitespace-pre-wrap">
                    {actualSelectedCall.issueDescription}
                  </p>
                </div>
              </div>
            )}

            {/* Transcript */}
            {actualSelectedCall.transcript && (
              <div>
                <button
                  onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                  className="w-full flex items-center justify-between text-sm text-surface-on-variant dark:text-gray-400 mb-2 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
                >
                  <span>Call Transcript</span>
                  {isTranscriptExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {isTranscriptExpanded && (
                  <div className="p-4 bg-surface-container dark:bg-gray-700 rounded-lg max-h-64 overflow-y-auto">
                    <p className="text-sm text-surface-on dark:text-gray-100 whitespace-pre-wrap">
                      {actualSelectedCall.transcript}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SMS Chat */}
            {actualSelectedCall.homeownerId && actualSelectedCall.phoneNumber && (
              <div className="mt-6">
                <SMSChatView
                  homeownerId={actualSelectedCall.homeownerId}
                  homeownerName={actualSelectedCall.homeownerName}
                  homeownerPhone={actualSelectedCall.phoneNumber}
                />
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-surface-outline-variant dark:border-gray-700 space-y-3">
              {/* Add Note Button */}
              <button
                onClick={() => {
                  const callerName = actualSelectedCall.homeownerName || 'Unknown Caller';
                  const phoneNumber = actualSelectedCall.phoneNumber || 'unknown number';
                  const contextLabel = `Call • ${callerName} • ${formatDate(actualSelectedCall.createdAt)}`;
                  const prefilledBody = `Call ${callerName} (${phoneNumber}) back.`;
                  
                  useTaskStore.getState().openTasks(
                    actualSelectedCall.homeownerId || undefined,
                    contextLabel,
                    'call',
                    prefilledBody
                  );
                }}
                className="w-full px-4 py-2 bg-primary/10 text-primary border border-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
              >
                <StickyNote className="h-4 w-4" />
                Add Note
              </button>
              
              {actualSelectedCall.homeownerId && (
                <button
                  onClick={() => {
                    handleViewHomeowner(actualSelectedCall.homeownerId);
                  }}
                  className="w-full px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Homeowner
                </button>
              )}
              
              {/* Call Recording Audio Player */}
              {actualSelectedCall.recordingUrl && (
                <div className="mt-4 p-4 border border-surface-outline-variant dark:border-gray-700 rounded-lg bg-surface-container/30 dark:bg-gray-800/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Play className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-surface-on dark:text-gray-200">Call Recording</p>
                  </div>
                  <audio 
                    controls 
                    src={actualSelectedCall.recordingUrl} 
                    className="w-full"
                    preload="metadata"
                  />
                  <a
                    href={actualSelectedCall.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AIIntakeDashboard;

