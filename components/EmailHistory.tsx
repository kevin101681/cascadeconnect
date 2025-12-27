import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Mail, Send, CheckCircle, XCircle, Eye, MousePointerClick, AlertCircle, TrendingUp, Calendar, RefreshCw, X, Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import Button from './Button';

interface EmailStats {
  date: string;
  stats: Array<{
    metrics: {
      blocks: number;
      bounce_drops: number;
      bounces: number;
      clicks: number;
      deferred: number;
      delivered: number;
      invalid_emails: number;
      opens: number;
      processed: number;
      requests: number;
      spam_report_drops: number;
      spam_reports: number;
      unique_clicks: number;
      unique_opens: number;
      unsubscribe_drops: number;
      unsubscribes: number;
    };
  }>;
}

interface EmailActivity {
  id: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  // Legacy SendGrid fields (kept for backward compatibility if needed)
  msg_id?: string;
  from?: string;
  from_name?: string;
  to?: string[];
  opens_count?: number;
  clicks_count?: number;
  last_event_time?: string;
  sent_at?: string;
}

interface EmailAnalyticsData {
  success: boolean;
  logs: EmailActivity[];
  stats: {
    total: number;
    sent: number;
    failed: number;
  };
  // Legacy SendGrid fields (kept for backward compatibility)
  dateRange?: {
    start: string;
    end: string;
  };
  aggregatedBy?: string;
  stats_legacy?: EmailStats[];
  totals?: Record<string, number>;
  activity?: EmailActivity[];
  activityCount?: number;
  warning?: string;
}

interface EmailHistoryProps {
  onClose: () => void;
}

const EmailHistory: React.FC<EmailHistoryProps> = ({ onClose }) => {
  const [data, setData] = useState<EmailAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  // Removed aggregatedBy - not needed for simple email logs
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailActivity | null>(null);

  // Filter emails based on search query - MUST be before any early returns
  const filteredActivity = useMemo(() => {
    const logs = data?.logs || data?.activity || [];
    if (!searchQuery.trim()) return logs;
    
    const query = searchQuery.toLowerCase();
    return logs.filter(email => 
      email.recipient?.toLowerCase().includes(query) ||
      email.subject?.toLowerCase().includes(query) ||
      email.status?.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In development, try Express server first (runs with 'npm run dev')
      // Then try Netlify function (requires 'netlify dev')
      // In production, use the redirect path
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // Build URL - use new email logs endpoint
      let url: URL;
      if (isLocalDev) {
        // Try Netlify function path (requires 'netlify dev')
        url = new URL('/.netlify/functions/email-logs', window.location.origin);
      } else {
        // Use redirect path in production
        url = new URL('/api/email/logs', window.location.origin);
      }
      
      url.searchParams.set('start_date', startDate);
      url.searchParams.set('end_date', endDate);
      url.searchParams.set('limit', '500'); // Request more emails

      console.log('Fetching email analytics from:', url.toString());
      console.log('Is local dev:', isLocalDev);
      console.log('Current origin:', window.location.origin);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let response: Response | null = null;
      try {
        // Don't set Content-Type header for GET requests - it can cause CORS preflight issues
        response = await fetch(url.toString(), {
          signal: controller.signal,
          method: 'GET',
          // Explicitly set mode to handle CORS
          mode: 'cors',
          credentials: 'omit',
        });
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        // Handle network errors
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        console.error('Network error fetching email analytics:', {
          error: fetchError,
          message: fetchError.message,
          name: fetchError.name,
          url: url.toString()
        });
        
        // Try fallback paths
        if (isLocalDev) {
          // Try Netlify function path (requires 'netlify dev')
          console.log('Attempting fallback to Netlify function path...');
          const fallbackUrl = new URL('/.netlify/functions/email-analytics', window.location.origin);
          fallbackUrl.search = url.search; // Copy query parameters
          
          try {
            response = await fetch(fallbackUrl.toString(), {
              signal: controller.signal,
              method: 'GET',
              mode: 'cors',
              credentials: 'omit',
            });
            
            // Check if we got HTML (means function not available)
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
              throw new Error('Netlify function returned HTML - functions not available. Are you running "netlify dev"?');
            }
            
            console.log('✅ Fallback to Netlify function succeeded');
          } catch (fallbackError: any) {
            throw new Error(`Failed to connect to email analytics service. Please ensure you're running 'npm run dev' (for Express server) or 'netlify dev' (for Netlify functions). Original error: ${fetchError.message}`);
          }
        } else {
          // In production, try direct Netlify function path as fallback
          console.log('Attempting fallback to direct Netlify function path...');
          const fallbackUrl = new URL('/.netlify/functions/email-analytics', window.location.origin);
          fallbackUrl.search = url.search; // Copy query parameters
          
          try {
            response = await fetch(fallbackUrl.toString(), {
              signal: controller.signal,
              method: 'GET',
              mode: 'cors',
              credentials: 'omit',
            });
            console.log('✅ Fallback request succeeded');
          } catch (fallbackError: any) {
            throw new Error(`Failed to connect to email analytics service: ${fetchError.message}. Fallback also failed: ${fallbackError.message}`);
          }
        }
      }
      
      if (!response) {
        throw new Error('No response received from email analytics service');
      }
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If we got HTML instead of JSON, it's likely an error page
          if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
            // Try to extract error message from HTML if possible
            const titleMatch = errorText.match(/<title[^>]*>([^<]+)<\/title>/i);
            const h1Match = errorText.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            const errorMsg = titleMatch?.[1] || h1Match?.[1] || `Error ${response.status}`;
            
            errorData = { 
              error: `Server returned HTML error page (${errorMsg}). The Netlify function may not be available. Please ensure you're running 'netlify dev' and the function exists at netlify/functions/email-analytics.js` 
            };
          } else {
            errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
          }
        }
        console.error('Email analytics API error:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          error: errorData,
          url: url.toString(),
          responsePreview: errorText.substring(0, 200)
        });
        throw new Error(errorData.error || `Failed to fetch email analytics (${response.status})`);
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Unexpected content type:', {
          contentType,
          responsePreview: text.substring(0, 200),
          url: url.toString()
        });
        throw new Error(`Server returned ${contentType} instead of JSON. The endpoint may not be configured correctly.`);
      }

      const result = await response.json();
      console.log('Email analytics response:', result);
      console.log('Activity array length:', result.activity?.length || 0);
      console.log('Activity count:', result.activityCount || 0);
      console.log('First few activity items:', result.activity?.slice(0, 3));
      
      // Check if we got stats but no activity
      if (result.totals && result.totals.delivered > 0 && (!result.activity || result.activity.length === 0)) {
        console.warn('⚠️ WARNING: SendGrid Stats API shows delivered emails, but Messages API returned 0 messages');
        console.warn('This likely means:');
        console.warn('1. Your SendGrid account needs the "Email Activity History" add-on');
        console.warn('2. Your API key needs "messages.read" permission');
        console.warn('3. The Messages API only tracks emails sent via Mail Send API v3');
        console.warn('Stats show:', result.totals);
      }
      
      setData(result);
    } catch (err: any) {
      console.error('Failed to fetch email analytics:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err.message || 'Failed to load email analytics');
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number, total: number) => {
    if (total === 0) return '0%';
    return `${((num / total) * 100).toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'text-green-600 dark:text-green-400';
      case 'bounced':
      case 'blocked':
        return 'text-red-600 dark:text-red-400';
      case 'deferred':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-surface-on-variant dark:text-gray-400';
    }
  };

  const renderHeader = (actions?: React.ReactNode) => (
    <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center">
      <div>
        <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Email History
        </h3>
                <p className="text-sm text-surface-on-variant dark:text-gray-400">Self-hosted email history and statistics</p>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button 
          onClick={onClose} 
          className="p-2.5 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  if (loading && !data) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]">
        <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8">
          {renderHeader()}
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-surface-on-variant dark:text-gray-400">Loading email analytics...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]">
        <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8">
          {renderHeader(
            <Button onClick={fetchAnalytics} variant="outlined" icon={<RefreshCw className="h-4 w-4" />}>
              Retry
            </Button>
          )}
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-error" />
              <span className="ml-3 text-error">{error}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats || { total: 0, sent: 0, failed: 0 };
  const totals = {
    delivered: stats.sent,
    failed: stats.failed,
    processed: stats.total,
    requests: stats.total,
    unique_opens: 0, // Not tracked in self-hosted logs
    unique_clicks: 0, // Not tracked in self-hosted logs
    bounces: 0,
    spam_reports: 0,
    unsubscribes: 0,
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]">
      <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8">
        {renderHeader(
          <Button
            variant="outlined"
            onClick={fetchAnalytics}
            icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        )}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 p-4 bg-surface-container dark:bg-gray-700 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
              <label className="text-sm text-surface-on-variant dark:text-gray-400">Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-surface-container-high dark:bg-gray-600 rounded-lg px-3 py-1.5 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-surface-on-variant dark:text-gray-400">End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-surface-container-high dark:bg-gray-600 rounded-lg px-3 py-1.5 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-surface-on-variant dark:text-gray-400">Total Sent</span>
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
              {formatNumber(stats.sent || 0)}
            </div>
            <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
              {formatPercentage(stats.sent || 0, stats.total || 1)} success rate
            </div>
            </div>

            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-on-variant dark:text-gray-400">Delivered</span>
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
                {formatNumber(stats.sent || 0)}
              </div>
              <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                Successfully sent
              </div>
            </div>

            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-on-variant dark:text-gray-400">Total Processed</span>
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
                {formatNumber(stats.total || 0)}
              </div>
              <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                Sent + Failed
              </div>
            </div>

            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-on-variant dark:text-gray-400">Failed</span>
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-2xl font-medium text-red-600 dark:text-red-400">
                {formatNumber(stats.failed || 0)}
              </div>
              <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                {formatPercentage(stats.failed || 0, stats.total || 1)} failure rate
              </div>
            </div>
          </div>


          {/* Email Logs Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">
                Email Logs ({filteredActivity.length} of {data?.activityCount || 0} emails)
              </h2>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-surface-container dark:bg-gray-700 rounded-lg text-sm text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400 border border-surface-outline-variant dark:border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none w-64"
                />
              </div>
            </div>

            {filteredActivity.length > 0 ? (
              <div className="bg-surface-container dark:bg-gray-700 rounded-xl border border-surface-outline-variant overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-container-high dark:bg-gray-600 border-b border-surface-outline-variant">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">Recipient</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">Subject</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-600">
                      {filteredActivity.map((email, idx) => (
                        <React.Fragment key={email.id || email.msg_id || idx}>
                          <tr 
                            className={`hover:bg-surface-container-high dark:hover:bg-gray-600 transition-colors cursor-pointer ${selectedEmail?.msg_id === email.msg_id ? 'bg-surface-container-high dark:bg-gray-600' : ''}`}
                            onClick={() => setSelectedEmail(selectedEmail?.msg_id === email.msg_id ? null : email)}
                          >
                            <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                              {formatDateTime(email.created_at)}
                            </td>
                            <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">
                              <div className="max-w-xs truncate">
                                {email.recipient}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">
                              <div className="max-w-xs truncate" title={email.subject}>
                                {email.subject}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${email.status === 'sent' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {email.status === 'sent' ? 'Sent' : 'Failed'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {selectedEmail?.id === email.id ? (
                                <ChevronUp className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                              )}
                            </td>
                          </tr>
                          {/* Expanded Details Row */}
                          {selectedEmail?.id === email.id && (
                            <tr className="bg-surface-container-high/50 dark:bg-gray-600/50">
                              <td colSpan={5} className="px-4 py-4">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-1">ID</div>
                                      <div className="text-sm text-surface-on dark:text-gray-100 font-mono break-all">{email.id}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-1">Status</div>
                                      <div className="text-sm text-surface-on dark:text-gray-100">{email.status === 'sent' ? 'Sent' : 'Failed'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-1">Sent At</div>
                                      <div className="text-sm text-surface-on dark:text-gray-100">{formatDateTime(email.created_at)}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-1">Recipient</div>
                                      <div className="text-sm text-surface-on dark:text-gray-100">{email.recipient}</div>
                                    </div>
                                  </div>
                                  
                                  {/* Error message if failed */}
                                  {email.status === 'failed' && email.error && (
                                    <div className="pt-2 border-t border-surface-outline-variant dark:border-gray-600">
                                      <p className="text-sm text-error font-medium">Error:</p>
                                      <p className="text-sm text-error/80 mt-1">{email.error}</p>
                                    </div>
                                  )}
                                  
                                  {/* Metadata if available */}
                                  {email.metadata && Object.keys(email.metadata).length > 0 && (
                                    <div className="pt-2 border-t border-surface-outline-variant dark:border-gray-600">
                                      <p className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-2">Metadata</p>
                                      <div className="text-sm text-surface-on dark:text-gray-100 space-y-1">
                                        {email.metadata.type && <div>Type: {email.metadata.type}</div>}
                                        {email.metadata.messageId && <div>Message ID: {email.metadata.messageId}</div>}
                                        {email.metadata.from && <div>From: {email.metadata.from}</div>}
                                        {email.metadata.callId && <div>Call ID: {email.metadata.callId}</div>}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container dark:bg-gray-700 rounded-xl border border-surface-outline-variant p-8 text-center">
                <Mail className="h-12 w-12 text-surface-on-variant dark:text-gray-400 mx-auto mb-4" />
                <p className="text-surface-on-variant dark:text-gray-400">
                  {searchQuery ? 'No emails found matching your search.' : 'No email activity found for the selected date range.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailHistory;

