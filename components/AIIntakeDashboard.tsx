import React, { useState, useEffect } from 'react';
import { Call, Homeowner } from '../types';
import { Phone, MapPin, Clock, AlertCircle, CheckCircle, XCircle, Calendar, Building2, User, Mail, ExternalLink, Play, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { db, isDbConfigured } from '../db';
import { calls, homeowners } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import CallSmsChat from './CallSmsChat';

interface AIIntakeDashboardProps {
  onNavigate?: (view: string) => void;
  onSelectHomeowner?: (homeownerId: string) => void;
}

const AIIntakeDashboard: React.FC<AIIntakeDashboardProps> = ({ onNavigate, onSelectHomeowner }) => {
  const [callsData, setCallsData] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'urgent'>('all');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

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

  const filteredCalls = callsData.filter(call => {
    if (filter === 'verified') return call.isVerified;
    if (filter === 'unverified') return !call.isVerified;
    if (filter === 'urgent') return call.isUrgent;
    return true;
  });

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
    <div className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-1">
      <div className="p-6">
        {/* Calls List */}
        {filteredCalls.length === 0 ? (
          <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-12 text-center border border-surface-outline-variant dark:border-gray-600">
            <Phone className="h-12 w-12 text-surface-outline-variant dark:text-gray-500 mx-auto mb-4" />
            <p className="text-surface-on-variant dark:text-gray-400">No calls found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCalls.map((call, index) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-surface dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600 hover:shadow-elevation-1 transition-all cursor-pointer group"
                onClick={() => setSelectedCall(call)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-surface-on dark:text-gray-100 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                      {call.homeownerName || 'Unknown Caller'}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {call.isUrgent && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          URGENT
                        </span>
                      )}
                      {call.isVerified ? (
                        <span className="bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="bg-orange-500 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                  {call.homeownerId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewHomeowner(call.homeownerId);
                      }}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="View Homeowner"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-2 text-xs text-surface-on-variant dark:text-gray-400">
                  {call.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{call.phoneNumber}</span>
                    </div>
                  )}
                  {call.propertyAddress && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{call.propertyAddress}</span>
                    </div>
                  )}
                  {call.verifiedBuilderName && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate font-medium text-surface-on dark:text-gray-300">{call.verifiedBuilderName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{formatDate(call.createdAt)}</span>
                  </div>
                </div>
                
                {call.issueDescription && (
                  <div className="mt-3 p-2 bg-surface-container/50 dark:bg-gray-600/50 rounded-lg">
                    <p className="text-xs text-surface-on dark:text-gray-100 line-clamp-2">{call.issueDescription}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Call Detail Modal */}
      {selectedCall && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCall(null)}
        >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-surface-on dark:text-gray-100">
                  Call Details
                </h2>
                <button
                  onClick={() => setSelectedCall(null)}
                  className="p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XCircle className="h-6 w-6 text-surface-on-variant dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Call Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400">Homeowner Name</label>
                    <p className="text-base font-medium text-surface-on dark:text-gray-100">{selectedCall.homeownerName || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400">Phone Number</label>
                    <p className="text-base font-medium text-surface-on dark:text-gray-100">{selectedCall.phoneNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400">Property Address</label>
                    <p className="text-base font-medium text-surface-on dark:text-gray-100">{selectedCall.propertyAddress || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400">Status</label>
                    <p className="text-base font-medium">
                      {selectedCall.isVerified ? (
                        <span className="text-green-600 dark:text-green-400">✓ Verified</span>
                      ) : (
                        <span className="text-orange-600 dark:text-orange-400">⚠ Unverified</span>
                      )}
                    </p>
                  </div>
                  {selectedCall.verifiedBuilderName && (
                    <div>
                      <label className="text-sm text-surface-on-variant dark:text-gray-400">Verified Builder</label>
                      <p className="text-base font-bold text-surface-on dark:text-gray-100">{selectedCall.verifiedBuilderName}</p>
                    </div>
                  )}
                  {selectedCall.verifiedClosingDate && (
                    <div>
                      <label className="text-sm text-surface-on-variant dark:text-gray-400">Verified Closing Date</label>
                      <p className="text-base font-bold text-surface-on dark:text-gray-100">
                        {new Date(selectedCall.verifiedClosingDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400">Call Date</label>
                    <p className="text-base text-surface-on dark:text-gray-100">{formatDate(selectedCall.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400">Urgent</label>
                    <p className="text-base font-medium">
                      {selectedCall.isUrgent ? (
                        <span className="text-red-600 dark:text-red-400">Yes</span>
                      ) : (
                        <span className="text-surface-on-variant dark:text-gray-400">No</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Issue Description */}
                {selectedCall.issueDescription && (
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400 mb-2 block">Issue Description</label>
                    <div className="p-4 bg-surface-container dark:bg-gray-700 rounded-lg">
                      <p className="text-base text-surface-on dark:text-gray-100 whitespace-pre-wrap">
                        {selectedCall.issueDescription}
                      </p>
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {selectedCall.transcript && (
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400 mb-2 block">Call Transcript</label>
                    <div className="p-4 bg-surface-container dark:bg-gray-700 rounded-lg max-h-96 overflow-y-auto">
                      <p className="text-sm text-surface-on dark:text-gray-100 whitespace-pre-wrap">
                        {selectedCall.transcript}
                      </p>
                    </div>
                  </div>
                )}

                {/* Recording */}
                {selectedCall.recordingUrl && (
                  <div>
                    <label className="text-sm text-surface-on-variant dark:text-gray-400 mb-2 block">Recording</label>
                    <a
                      href={selectedCall.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      Listen to Recording
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                  {selectedCall.homeownerId && (
                    <button
                      onClick={() => {
                        handleViewHomeowner(selectedCall.homeownerId);
                        setSelectedCall(null);
                      }}
                      className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Homeowner
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCall(null)}
                    className="px-4 py-2 bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100 rounded-lg hover:bg-surface-container-high dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
    </div>
  );
};

export default AIIntakeDashboard;

