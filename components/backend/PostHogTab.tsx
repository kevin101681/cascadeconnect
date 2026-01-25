import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, TrendingDown, AlertTriangle, Chrome, Globe, BarChart3, PieChart, Table2, RefreshCw, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import Button from '../Button';
import {
  fetchAllPostHogAnalytics,
  isPostHogConfigured,
  type DeviceVolumeData,
  type FunnelStepData,
  type BrowserData,
} from '../../services/posthogAnalyticsService';

/**
 * PostHog Operational Efficiency Tab
 * 
 * Purpose: Identify UX friction for homeowners, specifically determining if mobile
 * users are struggling to complete claims compared to desktop users.
 * 
 * REQUIRED POSTHOG EVENTS TO TRACK:
 * ----------------------------------
 * 1. "claim_started" - When homeowner opens new claim modal/form
 *    Properties: { device_type, browser, browser_version }
 * 
 * 2. "claim_photo_uploaded" - When photo is successfully uploaded
 *    Properties: { device_type, browser, browser_version, file_size }
 * 
 * 3. "claim_submitted" - When claim is successfully saved to database
 *    Properties: { device_type, browser, browser_version, claim_id }
 * 
 * PostHog automatically captures $device_type, $browser, $browser_version
 */

interface PostHogTabProps {
  onRefresh?: () => void;
  loading?: boolean;
}

const PostHogTab: React.FC<PostHogTabProps> = ({ onRefresh, loading: externalLoading = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceVolume, setDeviceVolume] = useState<DeviceVolumeData>({ mobile: 0, desktop: 0, totalSubmissions: 0 });
  const [funnelData, setFunnelData] = useState<FunnelStepData[]>([]);
  const [browserData, setBrowserData] = useState<BrowserData[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isPostHogConfigured()) {
        throw new Error(
          'PostHog not configured. Please set VITE_POSTHOG_PROJECT_ID and VITE_POSTHOG_PERSONAL_API_KEY in your .env.local file.'
        );
      }

      const data = await fetchAllPostHogAnalytics();
      setDeviceVolume(data.deviceVolume);
      setFunnelData(data.funnelData);
      setBrowserData(data.browserData);
    } catch (err) {
      console.error('Failed to load PostHog data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
    if (onRefresh) {
      onRefresh();
    }
  };

  const loading = isLoading || externalLoading;
  const totalSubmissions = deviceVolume.totalSubmissions || deviceVolume.mobile + deviceVolume.desktop;
  const mobilePercentage = totalSubmissions > 0 ? ((deviceVolume.mobile / totalSubmissions) * 100).toFixed(1) : '0';
  const desktopPercentage = totalSubmissions > 0 ? ((deviceVolume.desktop / totalSubmissions) * 100).toFixed(1) : '0';

  // Calculate max values for funnel visualization
  const maxFunnelValue = funnelData.length > 0 
    ? Math.max(...funnelData.map(d => Math.max(d.mobile, d.desktop)))
    : 1;

  const getBrowserIcon = (browser: string) => {
    if (browser.toLowerCase().includes('chrome')) return <Chrome className="h-4 w-4" />;
    if (browser.toLowerCase().includes('safari')) return <Globe className="h-4 w-4" />;
    if (browser.toLowerCase().includes('firefox')) return <Globe className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-surface-on-variant dark:text-gray-400">Loading PostHog analytics...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-surface-on dark:text-gray-100">Operational Efficiency</h2>
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
              Identify UX friction: Mobile vs. Desktop claim completion rates
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outlined"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Retry
          </Button>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">Failed to load PostHog data</p>
          <p className="text-xs text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-surface-on dark:text-gray-100">Operational Efficiency</h2>
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
            Identify UX friction: Mobile vs. Desktop claim completion rates
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outlined"
          disabled={loading}
          icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Data
        </Button>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget 1: Device Volume (Pie Chart) */}
        <Card className="!p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium text-surface-on dark:text-gray-100">
              Device Volume Distribution
            </h3>
          </div>

          {/* Donut Chart Visualization */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              {/* SVG Donut Chart */}
              <svg viewBox="0 0 200 200" className="transform -rotate-90">
                {/* Desktop slice (starts at 0) */}
                <circle
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="40"
                  strokeDasharray={`${(parseFloat(desktopPercentage) / 100) * 439.8} 439.8`}
                />
                {/* Mobile slice (starts after desktop) */}
                <circle
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="40"
                  strokeDasharray={`${(parseFloat(mobilePercentage) / 100) * 439.8} 439.8`}
                  strokeDashoffset={`-${(parseFloat(desktopPercentage) / 100) * 439.8}`}
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-surface-on dark:text-gray-100">
                  {totalSubmissions}
                </div>
                <div className="text-xs text-surface-on-variant dark:text-gray-400">
                  Total Claims
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-[#10b981] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-surface-on-variant dark:text-gray-400" />
                  <span className="text-sm font-medium text-surface-on dark:text-gray-100">Mobile</span>
                </div>
                <div className="text-xl font-bold text-surface-on dark:text-gray-100">
                  {deviceVolume.mobile}
                  <span className="text-sm text-surface-on-variant dark:text-gray-400 ml-1">
                    ({mobilePercentage}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-[#3b82f6] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Monitor className="h-3.5 w-3.5 text-surface-on-variant dark:text-gray-400" />
                  <span className="text-sm font-medium text-surface-on dark:text-gray-100">Desktop</span>
                </div>
                <div className="text-xl font-bold text-surface-on dark:text-gray-100">
                  {deviceVolume.desktop}
                  <span className="text-sm text-surface-on-variant dark:text-gray-400 ml-1">
                    ({desktopPercentage}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Widget 2: Mobile Friction Funnel (Grouped Bar Chart) */}
        <Card className="!p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium text-surface-on dark:text-gray-100">
              Conversion Funnel: Mobile vs. Desktop
            </h3>
          </div>

          {/* Funnel Steps */}
          <div className="space-y-6">
            {funnelData.map((step, idx) => {
              const mobileWidth = (step.mobile / maxFunnelValue) * 100;
              const desktopWidth = (step.desktop / maxFunnelValue) * 100;

              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-surface-on dark:text-gray-100">
                      {step.step}
                    </span>
                    {step.mobileDropoff !== undefined && (
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-red-500" />
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {step.mobileDropoff}% mobile
                          </span>
                        </div>
                        <div className="text-surface-on-variant dark:text-gray-400">
                          {step.desktopDropoff}% desktop
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Bar */}
                  <div className="mb-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone className="h-3 w-3 text-surface-on-variant dark:text-gray-400" />
                      <span className="text-xs text-surface-on-variant dark:text-gray-400">Mobile</span>
                    </div>
                    <div className="w-full bg-surface-container-high dark:bg-gray-600 rounded-full h-7 overflow-hidden">
                      <div
                        className="bg-[#10b981] h-full rounded-full flex items-center justify-between px-3 transition-all duration-300"
                        style={{ width: `${mobileWidth}%` }}
                      >
                        <span className="text-xs font-medium text-white">{step.mobile} users</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Bar */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Monitor className="h-3 w-3 text-surface-on-variant dark:text-gray-400" />
                      <span className="text-xs text-surface-on-variant dark:text-gray-400">Desktop</span>
                    </div>
                    <div className="w-full bg-surface-container-high dark:bg-gray-600 rounded-full h-7 overflow-hidden">
                      <div
                        className="bg-[#3b82f6] h-full rounded-full flex items-center justify-between px-3 transition-all duration-300"
                        style={{ width: `${desktopWidth}%` }}
                      >
                        <span className="text-xs font-medium text-white">{step.desktop} users</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Friction Alert */}
          {funnelData.length > 0 && funnelData[1]?.mobileDropoff && funnelData[1].mobileDropoff > 20 && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100">
                    High mobile drop-off at photo upload
                  </p>
                  <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                    {funnelData[1].mobileDropoff}% of mobile users abandon after starting a claim. Consider file size limits or connection timeouts.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Widget 3: Browser Compatibility Table (Full Width) */}
      <Card className="!p-6">
        <div className="flex items-center gap-2 mb-6">
          <Table2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium text-surface-on dark:text-gray-100">
            Browser Compatibility Analysis
          </h3>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-outline-variant dark:border-gray-600">
                <th className="pb-3 pr-4 text-xs font-medium uppercase text-surface-on-variant dark:text-gray-400">
                  Browser
                </th>
                <th className="pb-3 px-4 text-xs font-medium uppercase text-surface-on-variant dark:text-gray-400">
                  Version
                </th>
                <th className="pb-3 px-4 text-xs font-medium uppercase text-surface-on-variant dark:text-gray-400 text-right">
                  Unique Users
                </th>
                <th className="pb-3 px-4 text-xs font-medium uppercase text-surface-on-variant dark:text-gray-400 text-right">
                  Completion Rate
                </th>
                <th className="pb-3 pl-4 text-xs font-medium uppercase text-surface-on-variant dark:text-gray-400 text-right">
                  Avg. Time
                </th>
              </tr>
            </thead>
            <tbody>
              {browserData.map((row, idx) => {
                const isLowPerformance = row.completionRate < 70;
                
                return (
                  <tr
                    key={idx}
                    className={`border-b border-surface-outline-variant dark:border-gray-700 ${
                      isLowPerformance ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {getBrowserIcon(row.browser)}
                        <span className="text-sm font-medium text-surface-on dark:text-gray-100">
                          {row.browser}
                        </span>
                        {isLowPerformance && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-surface-on-variant dark:text-gray-400 font-mono">
                        {row.version}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-medium text-surface-on dark:text-gray-100">
                        {row.uniqueUsers}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-surface-container-high dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              row.completionRate >= 85
                                ? 'bg-green-500'
                                : row.completionRate >= 70
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${row.completionRate}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            row.completionRate >= 85
                              ? 'text-green-600 dark:text-green-400'
                              : row.completionRate >= 70
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {row.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <span className="text-sm text-surface-on-variant dark:text-gray-400 font-mono">
                        {row.avgTimeToComplete}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Browser Insights */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Show warning if there's a browser with low completion rate */}
          {browserData.some(b => b.completionRate < 70) && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {(() => {
                    const worstBrowser = browserData.reduce((worst, current) => 
                      current.completionRate < worst.completionRate ? current : worst
                    , browserData[0]);
                    return (
                      <>
                        <p className="text-xs font-medium text-red-900 dark:text-red-100">
                          Low Performance: {worstBrowser.browser} {worstBrowser.version}
                        </p>
                        <p className="text-xs text-red-800 dark:text-red-200 mt-1">
                          {worstBrowser.uniqueUsers} users on {worstBrowser.browser} have only {worstBrowser.completionRate}% success rate. Consider showing browser update prompt.
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Show best performing browser */}
          {browserData.length > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Chrome className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {(() => {
                    const bestBrowser = browserData.reduce((best, current) => 
                      current.completionRate > best.completionRate ? current : best
                    , browserData[0]);
                    return (
                      <>
                        <p className="text-xs font-medium text-green-900 dark:text-green-100">
                          Best Performance: {bestBrowser.browser}
                        </p>
                        <p className="text-xs text-green-800 dark:text-green-200 mt-1">
                          {bestBrowser.browser} users have {bestBrowser.completionRate}% success rate and average completion time of {bestBrowser.avgTimeToComplete}.
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PostHogTab;
