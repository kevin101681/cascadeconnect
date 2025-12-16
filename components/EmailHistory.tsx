import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle, XCircle, Eye, MousePointerClick, AlertCircle, TrendingUp, Calendar, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
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

interface EmailOpen {
  email: string;
  timestamp: string;
  ip?: string;
  user_agent?: string;
}

interface EmailClick {
  email: string;
  timestamp: string;
  url: string;
  ip?: string;
  user_agent?: string;
}

interface EmailActivity {
  msg_id: string;
  from: string;
  from_name?: string;
  subject: string;
  to: string[];
  status: string;
  sent_at?: string;
  opens_count: number;
  clicks_count: number;
  opens: EmailOpen[];
  clicks: EmailClick[];
  last_event_time: string;
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
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [aggregatedBy, setAggregatedBy] = useState<'day' | 'week' | 'month'>('day');

  const fetchAnalytics = async () => {
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

      console.log('Fetching email analytics from:', url.toString());
      const response = await fetch(url.toString());
      
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
      console.log('Activity data:', result.activity);
      if (result.activity && result.activity.length > 0) {
        console.log('First email activity:', result.activity[0]);
        console.log('First email opens:', result.activity[0].opens);
        console.log('First email clicks:', result.activity[0].clicks);
      }
      setData(result);
    } catch (err: any) {
      console.error('Failed to fetch email analytics:', err);
      setError(err.message || 'Failed to load email analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, aggregatedBy]);

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

          {/* Recent Activity */}
          {data?.activity && Array.isArray(data.activity) && data.activity.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-lg font-medium text-surface-on dark:text-gray-100 mb-4">
                Email History ({data.activityCount || data.activity.length} emails)
              </h2>
              <div className="space-y-4">
                {data.activity.slice(0, 50).map((email, idx) => {
                  const emailId = email.msg_id || `email-${idx}`;
                  const isExpanded = expandedEmails.has(emailId);
                  return (
                    <div key={emailId} className="bg-surface-container dark:bg-gray-700 rounded-xl border border-surface-outline-variant overflow-hidden">
                      {/* Email Summary Row */}
                      <div 
                        className="p-4 hover:bg-surface-container-high dark:hover:bg-gray-600 cursor-pointer transition-colors"
                        onClick={() => {
                          const newExpanded = new Set(expandedEmails);
                          if (isExpanded) {
                            newExpanded.delete(emailId);
                          } else {
                            newExpanded.add(emailId);
                          }
                          setExpandedEmails(newExpanded);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-sm font-medium text-surface-on dark:text-gray-100 truncate">{email.subject}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-surface-on-variant dark:text-gray-400">
                              <div>
                                <span className="font-medium">From:</span> {email.from_name ? `${email.from_name} <${email.from}>` : email.from}
                              </div>
                              <div>
                                <span className="font-medium">To:</span> {Array.isArray(email.to) ? email.to.slice(0, 2).join(', ') + (email.to.length > 2 ? ` +${email.to.length - 2} more` : '') : email.to}
                              </div>
                              <div>
                                <span className="font-medium">Sent:</span> {email.sent_at || email.last_event_time ? new Date(email.sent_at || email.last_event_time).toLocaleString() : 'N/A'}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(email.status)} bg-opacity-10`}>
                                {email.status}
                              </span>
                              {email.opens_count > 0 && (
                                <span className="text-xs text-surface-on-variant dark:text-gray-400 flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {email.opens_count} {email.opens_count === 1 ? 'open' : 'opens'}
                                </span>
                              )}
                              {email.clicks_count > 0 && (
                                <span className="text-xs text-surface-on-variant dark:text-gray-400 flex items-center gap-1">
                                  <MousePointerClick className="h-3 w-3" />
                                  {email.clicks_count} {email.clicks_count === 1 ? 'click' : 'clicks'}
                                </span>
                              )}
                            </div>
                          </div>
                          <button className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100">
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-surface-outline-variant dark:border-gray-600 p-4 space-y-4 bg-surface dark:bg-gray-800">
                          {/* Email Details */}
                          <div>
                            <h4 className="text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Email Details</h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-surface-on-variant dark:text-gray-400 min-w-[80px]">Message ID:</span>
                                <span className="text-surface-on dark:text-gray-100 font-mono break-all">{email.msg_id || 'N/A'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-surface-on-variant dark:text-gray-400 min-w-[80px]">From:</span>
                                <span className="text-surface-on dark:text-gray-100">
                                  {email.from_name ? `${email.from_name} <${email.from}>` : email.from || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-surface-on-variant dark:text-gray-400 min-w-[80px]">Subject:</span>
                                <span className="text-surface-on dark:text-gray-100">{email.subject || 'N/A'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-surface-on-variant dark:text-gray-400 min-w-[80px]">Status:</span>
                                <span className={`font-medium ${getStatusColor(email.status)}`}>
                                  {email.status || 'unknown'}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-surface-on-variant dark:text-gray-400 min-w-[80px]">Sent:</span>
                                <span className="text-surface-on dark:text-gray-100">
                                  {email.sent_at || email.last_event_time 
                                    ? new Date(email.sent_at || email.last_event_time).toLocaleString() 
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Recipients */}
                          <div>
                            <h4 className="text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Recipients</h4>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(email.to) && email.to.length > 0 ? (
                                email.to.map((recipient, i) => (
                                  <span key={i} className="text-xs px-2 py-1 bg-surface-container dark:bg-gray-700 rounded-full text-surface-on dark:text-gray-100">
                                    {recipient}
                                  </span>
                                ))
                              ) : email.to && typeof email.to === 'string' ? (
                                <span className="text-xs px-2 py-1 bg-surface-container dark:bg-gray-700 rounded-full text-surface-on dark:text-gray-100">
                                  {email.to}
                                </span>
                              ) : (
                                <span className="text-xs text-surface-on-variant dark:text-gray-400">No recipients found</span>
                              )}
                            </div>
                          </div>

                          {/* Opens */}
                          {email.opens && Array.isArray(email.opens) && email.opens.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-medium text-surface-on dark:text-gray-100 mb-2 flex items-center gap-2">
                                <Eye className="h-4 w-4 text-primary" />
                                Opens ({email.opens.length})
                              </h4>
                              <div className="space-y-2">
                                {email.opens.map((open, i) => (
                                  <div key={i} className="text-xs bg-surface-container dark:bg-gray-700 rounded-lg p-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-surface-on dark:text-gray-100">{open.email || 'Unknown'}</span>
                                      <span className="text-surface-on-variant dark:text-gray-400">
                                        {open.timestamp ? new Date(open.timestamp).toLocaleString() : 'N/A'}
                                      </span>
                                    </div>
                                    {(open.ip && open.ip !== 'N/A') && (
                                      <div className="text-surface-on-variant dark:text-gray-400 mt-1">
                                        IP: {open.ip} {open.user_agent && open.user_agent !== 'N/A' && `• ${open.user_agent}`}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-sm font-medium text-surface-on dark:text-gray-100 mb-2 flex items-center gap-2">
                                <Eye className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                                Opens
                              </h4>
                              <div className="text-xs text-surface-on-variant dark:text-gray-400">
                                No opens recorded for this email
                              </div>
                            </div>
                          )}

                          {/* Clicks */}
                          {email.clicks && Array.isArray(email.clicks) && email.clicks.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-medium text-surface-on dark:text-gray-100 mb-2 flex items-center gap-2">
                                <MousePointerClick className="h-4 w-4 text-primary" />
                                Clicks ({email.clicks.length})
                              </h4>
                              <div className="space-y-2">
                                {email.clicks.map((click, i) => (
                                  <div key={i} className="text-xs bg-surface-container dark:bg-gray-700 rounded-lg p-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-surface-on dark:text-gray-100">{click.email || 'Unknown'}</span>
                                      <span className="text-surface-on-variant dark:text-gray-400">
                                        {click.timestamp ? new Date(click.timestamp).toLocaleString() : 'N/A'}
                                      </span>
                                    </div>
                                    {click.url && click.url !== 'N/A' && (
                                      <div className="text-primary mt-1 truncate" title={click.url}>
                                        {click.url}
                                      </div>
                                    )}
                                    {(click.ip && click.ip !== 'N/A') && (
                                      <div className="text-surface-on-variant dark:text-gray-400 mt-1">
                                        IP: {click.ip} {click.user_agent && click.user_agent !== 'N/A' && `• ${click.user_agent}`}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-sm font-medium text-surface-on dark:text-gray-100 mb-2 flex items-center gap-2">
                                <MousePointerClick className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                                Clicks
                              </h4>
                              <div className="text-xs text-surface-on-variant dark:text-gray-400">
                                No clicks recorded for this email
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : data?.activity && Array.isArray(data.activity) && data.activity.length === 0 ? (
            <div className="mt-6">
              <div className="text-center py-8 text-surface-on-variant dark:text-gray-400">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No email activity found for the selected date range.</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default EmailHistory;

