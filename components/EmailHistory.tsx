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
  msg_id: string;
  from: string;
  from_name?: string;
  subject: string;
  to: string[];
  status: string;
  opens_count: number;
  clicks_count: number;
  last_event_time: string;
  sent_at?: string;
  opens?: Array<{
    email: string;
    timestamp: string;
    ip?: string;
    user_agent?: string;
  }>;
  clicks?: Array<{
    email: string;
    timestamp: string;
    url?: string;
    ip?: string;
    user_agent?: string;
  }>;
}

interface EmailAnalyticsData {
  success: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  aggregatedBy: string;
  stats: EmailStats[];
  totals: Record<string, number>;
  activity: EmailActivity[];
  activityCount: number;
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
  const [aggregatedBy, setAggregatedBy] = useState<'day' | 'week' | 'month'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailActivity | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the same endpoint pattern as email-send to avoid CORS issues
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let apiEndpoint: string;
      if (isLocalDev) {
        apiEndpoint = 'http://localhost:3000/api/email/analytics';
      } else {
        // Always use www subdomain to avoid redirect issues
        const protocol = window.location.protocol;
        apiEndpoint = `${protocol}//www.cascadeconnect.app/api/email/analytics`;
      }

      const url = new URL(apiEndpoint);
      url.searchParams.set('start_date', startDate);
      url.searchParams.set('end_date', endDate);
      url.searchParams.set('aggregated_by', aggregatedBy);
      url.searchParams.set('limit', '500'); // Request more emails

      console.log('Fetching email analytics from:', url.toString());
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url.toString(), {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('Email analytics API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Failed to fetch email analytics (${response.status})`);
      }

      const result = await response.json();
      console.log('Email analytics response:', result);
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
  }, [startDate, endDate, aggregatedBy]);

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
        <p className="text-sm text-surface-on-variant dark:text-gray-400">SendGrid email analytics and statistics</p>
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

  const totals = data?.totals || {};

  // Filter emails based on search query
  const filteredActivity = useMemo(() => {
    if (!data?.activity) return [];
    if (!searchQuery.trim()) return data.activity;
    
    const query = searchQuery.toLowerCase();
    return data.activity.filter(email => 
      email.from?.toLowerCase().includes(query) ||
      email.subject?.toLowerCase().includes(query) ||
      email.to?.some(to => typeof to === 'string' ? to.toLowerCase().includes(query) : false) ||
      email.status?.toLowerCase().includes(query)
    );
  }, [data?.activity, searchQuery]);

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
            <div className="flex items-center gap-2">
              <label className="text-sm text-surface-on-variant dark:text-gray-400">Group By:</label>
              <select
                value={aggregatedBy}
                onChange={(e) => setAggregatedBy(e.target.value as 'day' | 'week' | 'month')}
                className="bg-surface-container-high dark:bg-gray-600 rounded-lg px-3 py-1.5 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
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
              {formatNumber(totals.requests || 0)}
            </div>
            <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
              {formatPercentage(totals.delivered || 0, totals.requests || 1)} delivered
            </div>
            </div>

            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-on-variant dark:text-gray-400">Delivered</span>
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
                {formatNumber(totals.delivered || 0)}
              </div>
              <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                {formatPercentage(totals.delivered || 0, totals.requests || 1)} of sent
              </div>
            </div>

            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-on-variant dark:text-gray-400">Opens</span>
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
                {formatNumber(totals.unique_opens || 0)}
              </div>
              <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                {formatPercentage(totals.unique_opens || 0, totals.delivered || 1)} open rate
              </div>
            </div>

            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-on-variant dark:text-gray-400">Clicks</span>
                <MousePointerClick className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
                {formatNumber(totals.unique_clicks || 0)}
              </div>
              <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                {formatPercentage(totals.unique_clicks || 0, totals.delivered || 1)} click rate
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-on-variant dark:text-gray-400">Bounces</span>
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                {formatNumber(totals.bounces || 0)}
              </div>
            </div>

            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-on-variant dark:text-gray-400">Spam Reports</span>
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                {formatNumber(totals.spam_reports || 0)}
              </div>
            </div>

            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-on-variant dark:text-gray-400">Unsubscribes</span>
                <TrendingUp className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
              </div>
              <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                {formatNumber(totals.unsubscribes || 0)}
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
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">From</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">To</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">Subject</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">
                          <Eye className="h-4 w-4 inline mr-1" />
                          Opens
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">
                          <MousePointerClick className="h-4 w-4 inline mr-1" />
                          Clicks
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">Sent</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-600">
                      {filteredActivity.map((email, idx) => (
                        <React.Fragment key={email.msg_id || idx}>
                          <tr 
                            className={`hover:bg-surface-container-high dark:hover:bg-gray-600 transition-colors cursor-pointer ${selectedEmail?.msg_id === email.msg_id ? 'bg-surface-container-high dark:bg-gray-600' : ''}`}
                            onClick={() => setSelectedEmail(selectedEmail?.msg_id === email.msg_id ? null : email)}
                          >
                            <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">
                              <div className="font-medium">{email.from_name || email.from}</div>
                              {email.from_name && email.from !== email.from_name && (
                                <div className="text-xs text-surface-on-variant dark:text-gray-400">{email.from}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">
                              <div className="max-w-xs truncate">
                                {Array.isArray(email.to) ? email.to.slice(0, 2).join(', ') : email.to}
                                {Array.isArray(email.to) && email.to.length > 2 && (
                                  <span className="text-surface-on-variant dark:text-gray-400"> +{email.to.length - 2} more</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">
                              <div className="max-w-xs truncate" title={email.subject}>
                                {email.subject}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                                {email.status || 'unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100 text-center">
                              {email.opens_count || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100 text-center">
                              {email.clicks_count || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                              {formatDateTime(email.last_event_time || email.sent_at)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {selectedEmail?.msg_id === email.msg_id ? (
                                <ChevronUp className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                              )}
                            </td>
                          </tr>
                          {/* Expanded Details Row */}
                          {selectedEmail?.msg_id === email.msg_id && (
                            <tr className="bg-surface-container-high/50 dark:bg-gray-600/50">
                              <td colSpan={8} className="px-4 py-4">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-1">Message ID</div>
                                      <div className="text-sm text-surface-on dark:text-gray-100 font-mono break-all">{email.msg_id}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-1">Status</div>
                                      <div className="text-sm text-surface-on dark:text-gray-100">{email.status || 'unknown'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-1">Sent At</div>
                                      <div className="text-sm text-surface-on dark:text-gray-100">{formatDateTime(email.sent_at || email.last_event_time)}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-1">Last Event</div>
                                      <div className="text-sm text-surface-on dark:text-gray-100">{formatDateTime(email.last_event_time)}</div>
                                    </div>
                                  </div>
                                  
                                  {/* Opens and Clicks Details */}
                                  <div className="grid grid-cols-2 gap-4">
                                    {(email.opens && email.opens.length > 0) && (
                                      <div>
                                        <div className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                          <Eye className="h-3 w-3" />
                                          Opens ({email.opens.length})
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                          {email.opens.slice(0, 5).map((open: any, idx: number) => (
                                            <div key={idx} className="text-xs text-surface-on dark:text-gray-100 bg-surface dark:bg-gray-700 rounded px-2 py-1">
                                              <div className="font-medium">{open.email}</div>
                                              <div className="text-surface-on-variant dark:text-gray-400">
                                                {formatDateTime(open.timestamp)}
                                              </div>
                                            </div>
                                          ))}
                                          {email.opens.length > 5 && (
                                            <div className="text-xs text-surface-on-variant dark:text-gray-400">
                                              +{email.opens.length - 5} more
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {(email.clicks && email.clicks.length > 0) && (
                                      <div>
                                        <div className="text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                          <MousePointerClick className="h-3 w-3" />
                                          Clicks ({email.clicks.length})
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                          {email.clicks.slice(0, 5).map((click: any, idx: number) => (
                                            <div key={idx} className="text-xs text-surface-on dark:text-gray-100 bg-surface dark:bg-gray-700 rounded px-2 py-1">
                                              <div className="font-medium">{click.email}</div>
                                              <div className="text-surface-on-variant dark:text-gray-400 truncate" title={click.url}>
                                                {click.url}
                                              </div>
                                              <div className="text-surface-on-variant dark:text-gray-400">
                                                {formatDateTime(click.timestamp)}
                                              </div>
                                            </div>
                                          ))}
                                          {email.clicks.length > 5 && (
                                            <div className="text-xs text-surface-on-variant dark:text-gray-400">
                                              +{email.clicks.length - 5} more
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Link to SendGrid */}
                                  <div className="pt-2 border-t border-surface-outline-variant dark:border-gray-600">
                                    <a
                                      href={`https://app.sendgrid.com/email_logs?msg_id=${email.msg_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      View in SendGrid
                                    </a>
                                  </div>
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

