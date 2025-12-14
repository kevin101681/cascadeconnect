import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle, XCircle, Eye, MousePointerClick, AlertCircle, TrendingUp, Calendar, RefreshCw, X } from 'lucide-react';
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
  subject: string;
  to: string[];
  status: string;
  opens_count: number;
  clicks_count: number;
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
          {data?.activity && data.activity.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-medium text-surface-on dark:text-gray-100 mb-4">
                Recent Email Activity ({data.activityCount} emails)
              </h2>
              <div className="bg-surface-container dark:bg-gray-700 rounded-xl border border-surface-outline-variant overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-container-high dark:bg-gray-600 border-b border-surface-outline-variant">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">From</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">To</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Subject</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Opens</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Clicks</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-600">
                      {data.activity.slice(0, 50).map((email, idx) => (
                        <tr key={email.msg_id || idx} className="hover:bg-surface-container-high dark:hover:bg-gray-600">
                          <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{email.from}</td>
                          <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">
                            {Array.isArray(email.to) ? email.to.join(', ') : email.to}
                          </td>
                          <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100 truncate max-w-xs">{email.subject}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${getStatusColor(email.status)}`}>
                            {email.status}
                          </td>
                          <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{email.opens_count || 0}</td>
                          <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{email.clicks_count || 0}</td>
                          <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                            {email.last_event_time ? new Date(email.last_event_time).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailHistory;

