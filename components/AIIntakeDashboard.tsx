import React, { useState, useEffect, useMemo } from 'react';
import { Call, Homeowner } from '../types';
import { Phone, MapPin, Clock, AlertCircle, CheckCircle, XCircle, Calendar, Building2, User, Mail, ExternalLink, Play, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { db, isDbConfigured } from '../db';
import { calls, homeowners } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import SMSChatView from './SMSChatView';

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
  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    loadCalls();
    
    // Auto-refresh calls every 30 seconds to pick up new calls
    const interval = setInterval(() => {
      loadCalls();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

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

  // Derive the actual selected call or fallback to first call
  // This avoids useEffect infinite loops
  const actualSelectedCall = useMemo(() => {
    if (filteredCalls.length === 0) return null;
    if (selectedCall && filteredCalls.find(c => c.id === selectedCall.id)) {
      return selectedCall;
    }
    return filteredCalls[0];
  }, [filteredCalls, selectedCall]);

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
    <div className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-1 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            Calls
            {stats.total > 0 && (
              <span className="inline-flex items-center justify-center px-2 h-6 rounded-full bg-primary text-primary-on text-xs font-medium">
                {stats.total}
              </span>
            )}
          </h2>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-on-variant dark:text-gray-400" />
          <input
            id="calls-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder=""
            className="w-full pl-10 pr-4 py-2 bg-surface dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

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
          <div className="w-full md:w-96 border-r border-surface-outline-variant dark:border-gray-700 overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-2">
              {paginatedCalls.map((call) => (
                <button
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    actualSelectedCall?.id === call.id
                      ? 'bg-primary/10 dark:bg-primary/20 border-primary shadow-sm'
                      : 'bg-surface dark:bg-gray-700 border-surface-outline-variant dark:border-gray-600 hover:bg-surface-container-high dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm text-surface-on dark:text-gray-100 truncate">
                      {call.homeownerName || (
                        <span className="inline-flex items-center gap-1">
                          <span>Unknown Caller</span>
                          <span className="bg-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full">
                            ?
                          </span>
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {call.isUrgent && (
                        <span className="bg-red-500/30 text-red-700 dark:text-red-300 text-xs font-bold px-2 py-0.5 rounded-full">
                          URGENT
                        </span>
                      )}
                      {call.homeownerName && (
                        call.isVerified ? (
                          <span className="bg-green-500/30 text-green-700 dark:text-green-300 text-xs font-medium px-2 py-0.5 rounded-full">
                            ✓
                          </span>
                        ) : (
                          <span className="bg-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-medium px-2 py-0.5 rounded-full">
                            ?
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-surface-on-variant dark:text-gray-400 mb-2">
                    {formatDate(call.createdAt)}
                  </p>
                  {call.issueDescription && (
                    <p className="text-xs text-surface-on-variant dark:text-gray-400 line-clamp-2">
                      {call.issueDescription}
                    </p>
                  )}
                </button>
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

          {/* RIGHT COLUMN - Call Details */}
          <div className="flex-1 p-6">
            {actualSelectedCall ? (
              <div className="space-y-6">
                {/* Date & Status Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-normal text-surface-on dark:text-gray-100">
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

                  {actualSelectedCall.phoneNumber && (
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
                    <label className="text-sm text-surface-on-variant dark:text-gray-400 mb-2 block">Call Transcript</label>
                    <div className="p-4 bg-surface-container dark:bg-gray-700 rounded-lg max-h-64 overflow-y-auto">
                      <p className="text-sm text-surface-on dark:text-gray-100 whitespace-pre-wrap">
                        {actualSelectedCall.transcript}
                      </p>
                    </div>
                  </div>
                )}

                {/* Recording */}
                {actualSelectedCall.recordingUrl && (
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400 mb-2 block">Recording</label>
                    <a
                      href={actualSelectedCall.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      Listen to Recording
                    </a>
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
                {actualSelectedCall.homeownerId && (
                  <div className="pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                    <button
                      onClick={() => {
                        handleViewHomeowner(actualSelectedCall.homeownerId);
                      }}
                      className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Homeowner
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-surface-on-variant dark:text-gray-400">Select a call to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntakeDashboard;

