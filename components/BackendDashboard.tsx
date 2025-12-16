import React, { useState, useEffect } from 'react';
import { Database, Users, Home, FileText, ClipboardList, MessageSquare, Building2, HardHat, CheckCircle, XCircle, RefreshCw, AlertCircle, TrendingUp, Server, Globe, Code, Key, Zap, X } from 'lucide-react';
import Button from './Button';
import { db, isDbConfigured } from '../db';
import { users as usersTable, homeowners as homeownersTable, claims as claimsTable, documents as documentsTable, tasks as tasksTable, messageThreads as messageThreadsTable, builderGroups as builderGroupsTable, contractors as contractorsTable } from '../db/schema';
import { eq, count, desc } from 'drizzle-orm';

interface BackendDashboardProps {
  onClose: () => void;
}

interface DashboardStats {
  users: {
    total: number;
    admins: number;
    builders: number;
    homeowners: number;
  };
  builderGroups: number;
  contractors: number;
  homeowners: number;
  claims: {
    total: number;
    byStatus: Record<string, number>;
  };
  documents: number;
  tasks: {
    total: number;
    completed: number;
    pending: number;
  };
  messageThreads: number;
}

const BackendDashboard: React.FC<BackendDashboardProps> = ({ onClose }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'HOMEOWNERS' | 'CLAIMS' | 'DOCUMENTS' | 'TASKS' | 'MESSAGES' | 'NEON' | 'NETLIFY'>('OVERVIEW');
  const [detailedData, setDetailedData] = useState<any>(null);
  const [netlifyInfo, setNetlifyInfo] = useState<any>(null);
  const [netlifyLoading, setNetlifyLoading] = useState(false);
  const [netlifyDeploys, setNetlifyDeploys] = useState<any>(null);
  const [netlifyDeploysLoading, setNetlifyDeploysLoading] = useState(false);
  const [neonStats, setNeonStats] = useState<any>(null);
  const [neonStatsLoading, setNeonStatsLoading] = useState(false);

  const fetchStats = async () => {
    if (!isDbConfigured) {
      // Don't set error - allow modal to show with helpful message
      setLoading(false);
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all statistics with error handling for missing tables
      // Each query is wrapped in a catch to handle missing tables gracefully
      const results = await Promise.allSettled([
        db.select({ count: count() }).from(usersTable),
        db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, 'ADMIN')),
        db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, 'BUILDER')),
        db.select({ count: count() }).from(builderGroupsTable),
        db.select({ count: count() }).from(contractorsTable),
        db.select({ count: count() }).from(homeownersTable),
        db.select({ count: count() }).from(claimsTable),
        db.select().from(claimsTable),
        db.select({ count: count() }).from(documentsTable),
        db.select({ count: count() }).from(tasksTable),
        db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.isCompleted, true)),
        db.select({ count: count() }).from(messageThreadsTable)
      ]);

      // Extract results, defaulting to 0 or [] if query failed
      const usersCount = results[0].status === 'fulfilled' ? results[0].value : [{ count: 0 }];
      const adminsCount = results[1].status === 'fulfilled' ? results[1].value : [{ count: 0 }];
      const buildersCount = results[2].status === 'fulfilled' ? results[2].value : [{ count: 0 }];
      const builderGroupsCount = results[3].status === 'fulfilled' ? results[3].value : [{ count: 0 }];
      const contractorsCount = results[4].status === 'fulfilled' ? results[4].value : [{ count: 0 }];
      const homeownersCount = results[5].status === 'fulfilled' ? results[5].value : [{ count: 0 }];
      const claimsCount = results[6].status === 'fulfilled' ? results[6].value : [{ count: 0 }];
      const claimsByStatus = results[7].status === 'fulfilled' ? results[7].value : [];
      const documentsCount = results[8].status === 'fulfilled' ? results[8].value : [{ count: 0 }];
      const tasksCount = results[9].status === 'fulfilled' ? results[9].value : [{ count: 0 }];
      const completedTasksCount = results[10].status === 'fulfilled' ? results[10].value : [{ count: 0 }];
      const messageThreadsCount = results[11].status === 'fulfilled' ? results[11].value : [{ count: 0 }];

      // Log any failed queries for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const tableNames = ['users', 'users (admin)', 'users (builder)', 'builder_groups', 'contractors', 'homeowners', 'claims', 'claims (status)', 'documents', 'tasks', 'tasks (completed)', 'message_threads'];
          console.warn(`⚠️ Failed to query ${tableNames[index]}:`, result.reason?.message || result.reason);
        }
      });

      // Process claims by status
      const statusCounts: Record<string, number> = {};
      claimsByStatus.forEach((claim: any) => {
        const status = claim.status || 'UNKNOWN';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      setStats({
        users: {
          total: usersCount[0]?.count || 0,
          admins: adminsCount[0]?.count || 0,
          builders: buildersCount[0]?.count || 0,
          homeowners: 0 // Not stored in users table
        },
        builderGroups: builderGroupsCount[0]?.count || 0,
        contractors: contractorsCount[0]?.count || 0,
        homeowners: homeownersCount[0]?.count || 0,
        claims: {
          total: claimsCount[0]?.count || 0,
          byStatus: statusCounts
        },
        documents: documentsCount[0]?.count || 0,
        tasks: {
          total: tasksCount[0]?.count || 0,
          completed: completedTasksCount[0]?.count || 0,
          pending: (tasksCount[0]?.count || 0) - (completedTasksCount[0]?.count || 0)
        },
        messageThreads: messageThreadsCount[0]?.count || 0
      });
    } catch (err: any) {
      console.error('Failed to fetch backend stats:', err);
      // Check if error is about missing table
      if (err.message && err.message.includes('does not exist')) {
        setError(`Database table missing: ${err.message}. Please run database migrations to create the required tables.`);
      } else {
        setError(err.message || 'Failed to load backend data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedData = async (table: string) => {
    if (!isDbConfigured) return;

    setLoading(true);
    try {
      let data: any[] = [];
      
      switch (table) {
        case 'USERS':
          data = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).catch(() => []);
          break;
        case 'HOMEOWNERS':
          data = await db.select().from(homeownersTable).orderBy(desc(homeownersTable.createdAt)).catch(() => []);
          break;
        case 'CLAIMS':
          data = await db.select().from(claimsTable).orderBy(desc(claimsTable.dateSubmitted)).catch(() => []);
          break;
        case 'DOCUMENTS':
          data = await db.select().from(documentsTable).orderBy(desc(documentsTable.uploadedAt)).catch(() => []);
          break;
        case 'TASKS':
          data = await db.select().from(tasksTable).orderBy(desc(tasksTable.dateAssigned)).catch(() => []);
          break;
        case 'MESSAGES':
          data = await db.select().from(messageThreadsTable).orderBy(desc(messageThreadsTable.lastMessageAt)).catch(() => []);
          break;
      }
      
      setDetailedData(data);
    } catch (err: any) {
      console.error(`Failed to fetch ${table} data:`, err);
      // Check if error is about missing table
      if (err.message && err.message.includes('does not exist')) {
        setError(`Database table missing: ${err.message}. Please run database migrations to create the required tables.`);
        setDetailedData([]); // Set empty array so UI shows "No data found" instead of error
      } else {
        setError(err.message || `Failed to load ${table} data`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchNetlifyInfo = async () => {
    setNetlifyLoading(true);
    try {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let apiEndpoint: string;
      if (isLocalDev) {
        apiEndpoint = 'http://localhost:3000/api/netlify/info';
      } else {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const domain = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
        apiEndpoint = `${protocol}//${domain}/api/netlify/info`;
      }

      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch Netlify information');
      }

      const result = await response.json();
      setNetlifyInfo(result);
    } catch (err: any) {
      console.error('Failed to fetch Netlify info:', err);
      setError(err.message || 'Failed to load Netlify information');
    } finally {
      setNetlifyLoading(false);
    }
  };

  const fetchNetlifyDeploys = async () => {
    setNetlifyDeploysLoading(true);
    try {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let apiEndpoint: string;
      if (isLocalDev) {
        apiEndpoint = 'http://localhost:3000/api/netlify/deploys';
      } else {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const domain = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
        apiEndpoint = `${protocol}//${domain}/api/netlify/deploys`;
      }

      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch deployments');
      }

      const result = await response.json();
      setNetlifyDeploys(result);
    } catch (err: any) {
      console.error('Failed to fetch Netlify deployments:', err);
      setError(err.message || 'Failed to load deployments');
    } finally {
      setNetlifyDeploysLoading(false);
    }
  };

  const rollbackDeployment = async (deployId: string) => {
    if (!confirm('Are you sure you want to rollback to this deployment? This will restore the site to a previous version.')) {
      return;
    }

    try {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let apiEndpoint: string;
      if (isLocalDev) {
        apiEndpoint = 'http://localhost:3000/api/netlify/deploys';
      } else {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const domain = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
        apiEndpoint = `${protocol}//${domain}/api/netlify/deploys`;
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deploy_id: deployId })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to rollback deployment');
      }

      const result = await response.json();
      alert('Rollback initiated successfully! The site will be restored to the selected deployment.');
      // Refresh deployments list
      fetchNetlifyDeploys();
      fetchNetlifyInfo();
    } catch (err: any) {
      console.error('Failed to rollback deployment:', err);
      alert(`Failed to rollback: ${err.message}`);
    }
  };

  const fetchNeonStats = async () => {
    setNeonStatsLoading(true);
    try {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let apiEndpoint: string;
      if (isLocalDev) {
        apiEndpoint = 'http://localhost:3000/api/neon/stats';
      } else {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const domain = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
        apiEndpoint = `${protocol}//${domain}/api/neon/stats`;
      }

      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch Neon statistics');
      }

      const result = await response.json();
      setNeonStats(result);
    } catch (err: any) {
      console.error('Failed to fetch Neon stats:', err);
      setError(err.message || 'Failed to load Neon statistics');
    } finally {
      setNeonStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'NETLIFY') {
      fetchNetlifyInfo();
      fetchNetlifyDeploys();
    } else if (activeTab === 'NEON') {
      fetchNeonStats();
    } else if (activeTab !== 'OVERVIEW') {
      fetchDetailedData(activeTab);
    } else {
      setDetailedData(null);
    }
  }, [activeTab]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const renderHeader = (actions?: React.ReactNode) => (
    <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center">
      <div>
        <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Backend Dashboard
        </h3>
        <p className="text-sm text-surface-on-variant dark:text-gray-400">Neon Database Overview & Management</p>
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

  if (loading && !stats) {
    return (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {renderHeader()}
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-surface-on-variant dark:text-gray-400">Loading backend data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats && isDbConfigured) {
    return (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {renderHeader(
            <Button onClick={fetchStats} variant="outlined" icon={<RefreshCw className="h-4 w-4" />}>
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

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {renderHeader(
          <Button
            variant="outlined"
            onClick={fetchStats}
            icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        )}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-surface-outline-variant dark:border-gray-700 overflow-x-auto">
            {(['OVERVIEW', 'USERS', 'HOMEOWNERS', 'CLAIMS', 'DOCUMENTS', 'TASKS', 'MESSAGES', 'NEON', 'NETLIFY'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'OVERVIEW' && (
            !isDbConfigured ? (
              <div className="space-y-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">Database Not Configured</h3>
                      <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
                        <p>
                          To use the Backend Dashboard, you need to configure your Neon database connection.
                        </p>
                        <div className="mt-4 space-y-2">
                          <p className="font-medium">To configure:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Create a <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code> file in your project root (if it doesn't exist)</li>
                            <li>Add your Neon database connection string:</li>
                          </ol>
                          <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded-lg p-3 mt-2">
                            <code className="text-xs font-mono text-yellow-900 dark:text-yellow-100">
                              VITE_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname
                            </code>
                          </div>
                          <p className="text-xs mt-2">
                            <strong>Note:</strong> For production, set this as an environment variable in your hosting platform (Netlify, Vercel, etc.)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                  <h3 className="text-sm font-medium text-surface-on dark:text-gray-100 mb-4">Available Tabs</h3>
                  <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
                    Even without database configuration, you can still view:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-surface-container-high dark:bg-gray-600 rounded-lg p-3 border border-surface-outline-variant">
                      <div className="flex items-center gap-2 mb-1">
                        <Server className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-surface-on dark:text-gray-100">NETLIFY Tab</span>
                      </div>
                      <p className="text-xs text-surface-on-variant dark:text-gray-400">View deployment information, site details, and system information</p>
                    </div>
                    <div className="bg-surface-container-high dark:bg-gray-600 rounded-lg p-3 border border-surface-outline-variant">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-surface-on dark:text-gray-100">NEON Tab</span>
                      </div>
                      <p className="text-xs text-surface-on-variant dark:text-gray-400">View database configuration and connection status</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : !stats ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-surface-outline-variant dark:text-gray-500 mx-auto mb-4 opacity-50" />
                <p className="text-surface-on-variant dark:text-gray-400">No data available. Click Refresh to load statistics.</p>
              </div>
            ) : (
            <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-on-variant dark:text-gray-400">Total Users</span>
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
                  {formatNumber(stats.users.total)}
                </div>
                <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                  {stats.users.admins} admins, {stats.users.builders} builders
                </div>
              </div>

              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-on-variant dark:text-gray-400">Homeowners</span>
                  <Home className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
                  {formatNumber(stats.homeowners)}
                </div>
                <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                  Enrolled in system
                </div>
              </div>

              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-on-variant dark:text-gray-400">Total Claims</span>
                  <ClipboardList className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
                  {formatNumber(stats.claims.total)}
                </div>
                <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                  Across all homeowners
                </div>
              </div>

              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-on-variant dark:text-gray-400">Documents</span>
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
                  {formatNumber(stats.documents)}
                </div>
                <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                  Uploaded files
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-on-variant dark:text-gray-400">Builder Groups</span>
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                  {formatNumber(stats.builderGroups)}
                </div>
              </div>

              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-on-variant dark:text-gray-400">Contractors</span>
                  <HardHat className="h-4 w-4 text-primary" />
                </div>
                <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                  {formatNumber(stats.contractors)}
                </div>
              </div>

              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-on-variant dark:text-gray-400">Message Threads</span>
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                  {formatNumber(stats.messageThreads)}
                </div>
              </div>
            </div>

            {/* Tasks Stats */}
            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-surface-on dark:text-gray-100">Tasks</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-lg font-medium text-surface-on dark:text-gray-100">
                    {formatNumber(stats.tasks.total)}
                  </div>
                  <div className="text-xs text-surface-on-variant dark:text-gray-400">Total</div>
                </div>
                <div>
                  <div className="text-lg font-medium text-green-600 dark:text-green-400">
                    {formatNumber(stats.tasks.completed)}
                  </div>
                  <div className="text-xs text-surface-on-variant dark:text-gray-400">Completed</div>
                </div>
                <div>
                  <div className="text-lg font-medium text-yellow-600 dark:text-yellow-400">
                    {formatNumber(stats.tasks.pending)}
                  </div>
                  <div className="text-xs text-surface-on-variant dark:text-gray-400">Pending</div>
                </div>
              </div>
            </div>

            {/* Claims by Status */}
            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-surface-on dark:text-gray-100">Claims by Status</span>
                <ClipboardList className="h-4 w-4 text-primary" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(stats.claims.byStatus).map(([status, count]) => (
                  <div key={status}>
                    <div className="text-lg font-medium text-surface-on dark:text-gray-100">
                      {formatNumber(count as number)}
                    </div>
                    <div className="text-xs text-surface-on-variant dark:text-gray-400 capitalize">
                      {status.toLowerCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
            )
          )}

          {/* Neon Database Tab */}
          {activeTab === 'NEON' && (
            <div className="mt-6 space-y-6">
              {neonStatsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-3 text-surface-on-variant dark:text-gray-400">Loading Neon statistics...</span>
                </div>
              ) : neonStats?.success && neonStats.stats ? (
                <>
                  {/* Database Performance Statistics */}
                  {neonStats.stats.databaseSize && (
                    <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Database Performance</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Database Size</div>
                          <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                            {neonStats.stats.databaseSize.formatted}
                          </div>
                        </div>
                        {neonStats.stats.connectionStats && (
                          <>
                            <div>
                              <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Total Connections</div>
                              <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                                {neonStats.stats.connectionStats.total_connections}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Active Connections</div>
                              <div className="text-xl font-medium text-green-600 dark:text-green-400">
                                {neonStats.stats.connectionStats.active_connections}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Idle Connections</div>
                              <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                                {neonStats.stats.connectionStats.idle_connections}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      {neonStats.stats.connectionInfo && (
                        <div className="mt-4 pt-4 border-t border-surface-outline-variant">
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Connection Type</div>
                          <div className="text-sm font-medium text-surface-on dark:text-gray-100">
                            {neonStats.stats.connectionInfo.isPooled ? (
                              <span className="text-green-600 dark:text-green-400">✓ Using Connection Pooling</span>
                            ) : (
                              <span className="text-yellow-600 dark:text-yellow-400">Direct Connection</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Query Statistics */}
                  {neonStats.stats.queryStats && (
                    <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                      <div className="flex items-center gap-2 mb-4">
                        <Database className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Query Statistics</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Transactions Committed</div>
                          <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                            {formatNumber(neonStats.stats.queryStats.transactions_committed || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Transactions Rolled Back</div>
                          <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                            {formatNumber(neonStats.stats.queryStats.transactions_rolled_back || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Cache Hit Ratio</div>
                          <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                            {neonStats.stats.queryStats.cache_blocks_hit && neonStats.stats.queryStats.disk_blocks_read
                              ? `${((neonStats.stats.queryStats.cache_blocks_hit / (neonStats.stats.queryStats.cache_blocks_hit + neonStats.stats.queryStats.disk_blocks_read)) * 100).toFixed(1)}%`
                              : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Tuples Returned</div>
                          <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                            {formatNumber(neonStats.stats.queryStats.tuples_returned || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Table Statistics */}
                  {neonStats.stats.tableStats && neonStats.stats.tableStats.length > 0 && (
                    <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                      <div className="flex items-center gap-2 mb-4">
                        <Database className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Table Sizes</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-surface-container-high dark:bg-gray-600 border-b border-surface-outline-variant">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Table</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Size</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-600">
                            {neonStats.stats.tableStats.slice(0, 10).map((table: any, idx: number) => (
                              <tr key={idx} className="hover:bg-surface-container-high dark:hover:bg-gray-600">
                                <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100 font-mono">{table.tablename}</td>
                                <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{table.size}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Neon Extension Cache Stats */}
                  {neonStats.stats.neonExtension?.available && neonStats.stats.neonExtension?.cacheStats && (
                    <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Neon File Cache Statistics</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Cache Hits</div>
                          <div className="text-xl font-medium text-green-600 dark:text-green-400">
                            {formatNumber(neonStats.stats.neonExtension.cacheStats.file_cache_hits || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Cache Misses</div>
                          <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                            {formatNumber(neonStats.stats.neonExtension.cacheStats.file_cache_misses || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Cache Used</div>
                          <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                            {neonStats.stats.neonExtension.cacheStats.file_cache_used || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Hit Ratio</div>
                          <div className="text-xl font-medium text-surface-on dark:text-gray-100">
                            {neonStats.stats.neonExtension.cacheStats.file_cache_hit_ratio 
                              ? `${(neonStats.stats.neonExtension.cacheStats.file_cache_hit_ratio * 100).toFixed(1)}%`
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-surface-container dark:bg-gray-700 rounded-xl">
                  <AlertCircle className="h-12 w-12 text-surface-outline-variant dark:text-gray-500 mx-auto mb-4 opacity-50" />
                  <p className="text-surface-on-variant dark:text-gray-400">
                    {neonStats?.error || 'Failed to load Neon statistics'}
                  </p>
                  <Button onClick={fetchNeonStats} variant="outlined" className="mt-4">Retry</Button>
                </div>
              )}

              {/* Database Backup & Recovery Info */}
              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Database Backup & Recovery</h2>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Backup Status</div>
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        ✓ Automatic Backups Enabled
                      </div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                        Neon provides continuous point-in-time backups
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Retention Period</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">
                        {(() => {
                          // Check if we can determine plan from connection string or env
                          // For now, show both options
                          return '7-30 days (depends on plan)';
                        })()}
                      </div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                        Free: 7 days | Paid: 30 days
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-surface-outline-variant">
                    <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-2">Recovery Options</div>
                    <div className="text-sm text-surface-on dark:text-gray-100 space-y-2">
                      <p>
                        <strong>Point-in-Time Restore:</strong> Restore your database to any point within the retention period. 
                        Available in Neon dashboard under "Branches" → "Create branch from point in time".
                      </p>
                      <p>
                        <strong>Database Branching:</strong> Create a test branch from any point in time to safely test restores 
                        without affecting production data.
                      </p>
                      <p className="text-yellow-600 dark:text-yellow-400">
                        <strong>Note:</strong> Application rollback (Netlify) and database restore (Neon) are separate operations. 
                        Rolling back code does NOT restore database data. All current data remains accessible.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Static Configuration Info */}
              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Neon Database Configuration</h2>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Database Status</div>
                  <div className="text-sm font-medium text-surface-on dark:text-gray-100">
                    {isDbConfigured ? (
                      <span className="text-green-600 dark:text-green-400">✓ Configured & Connected</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">✗ Not Configured</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Connection String</div>
                  <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono text-xs break-all">
                    {(() => {
                      const envUrl = (import.meta as any).env?.VITE_DATABASE_URL;
                      const processUrl = typeof process !== 'undefined' ? process.env?.DATABASE_URL : undefined;
                      const connectionString = envUrl || processUrl;
                      if (!connectionString) return 'Not available';
                      // Show first 30 chars and last 10 chars for security
                      if (connectionString.length > 40) {
                        return `${connectionString.substring(0, 30)}...${connectionString.substring(connectionString.length - 10)}`;
                      }
                      return connectionString.substring(0, 20) + '...';
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Database Provider</div>
                  <div className="text-sm font-medium text-surface-on dark:text-gray-100">Neon Serverless (PostgreSQL)</div>
                </div>
                <div>
                  <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">ORM</div>
                  <div className="text-sm font-medium text-surface-on dark:text-gray-100">Drizzle ORM</div>
                </div>
              </div>
            </div>

            {/* Database Tables */}
            <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Database Tables</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: 'users', description: 'User accounts (admins, builders)' },
                  { name: 'homeowners', description: 'Homeowner records' },
                  { name: 'claims', description: 'Warranty claims' },
                  { name: 'documents', description: 'Uploaded documents' },
                  { name: 'tasks', description: 'Task management' },
                  { name: 'message_threads', description: 'Message conversations' },
                  { name: 'builder_groups', description: 'Builder organizations' },
                  { name: 'contractors', description: 'Contractor/subcontractor records' }
                ].map(table => (
                  <div key={table.name} className="bg-surface-container-high dark:bg-gray-600 rounded-lg p-3 border border-surface-outline-variant">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="h-3 w-3 text-primary" />
                      <span className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono">{table.name}</span>
                    </div>
                    <div className="text-xs text-surface-on-variant dark:text-gray-400">{table.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Database Statistics */}
            {stats && (
              <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Database Statistics</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Total Records</div>
                    <div className="text-2xl font-medium text-surface-on dark:text-gray-100">
                      {formatNumber(
                        stats.users.total +
                        stats.homeowners +
                        stats.claims.total +
                        stats.documents +
                        stats.tasks.total +
                        stats.messageThreads +
                        stats.builderGroups +
                        stats.contractors
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Users</div>
                    <div className="text-xl font-medium text-surface-on dark:text-gray-100">{formatNumber(stats.users.total)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Homeowners</div>
                    <div className="text-xl font-medium text-surface-on dark:text-gray-100">{formatNumber(stats.homeowners)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Claims</div>
                    <div className="text-xl font-medium text-surface-on dark:text-gray-100">{formatNumber(stats.claims.total)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

        {/* Netlify Tab */}
        {activeTab === 'NETLIFY' && (
          <div className="mt-6 space-y-6">
            {netlifyLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-3 text-surface-on-variant dark:text-gray-400">Loading Netlify information...</span>
              </div>
            ) : netlifyInfo ? (
              <>
                {/* Deploy Status */}
                {netlifyInfo.deployStatus && (
                  <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Current Deploy Status</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Deploy State</div>
                        <div className="text-sm font-medium">
                          {netlifyInfo.deployStatus.state === 'ready' ? (
                            <span className="text-green-600 dark:text-green-400">✓ Ready</span>
                          ) : netlifyInfo.deployStatus.state === 'error' ? (
                            <span className="text-red-600 dark:text-red-400">✗ Error</span>
                          ) : netlifyInfo.deployStatus.state === 'building' ? (
                            <span className="text-yellow-600 dark:text-yellow-400">⏳ Building</span>
                          ) : (
                            <span className="text-surface-on dark:text-gray-100 capitalize">{netlifyInfo.deployStatus.state}</span>
                          )}
                        </div>
                      </div>
                      {netlifyInfo.deployStatus.deploy_time && (
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Deploy Time</div>
                          <div className="text-sm font-medium text-surface-on dark:text-gray-100">
                            {netlifyInfo.deployStatus.deploy_time} seconds
                          </div>
                        </div>
                      )}
                      {netlifyInfo.deployStatus.published_at && (
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Published At</div>
                          <div className="text-sm font-medium text-surface-on dark:text-gray-100">
                            {new Date(netlifyInfo.deployStatus.published_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                      {netlifyInfo.deployStatus.framework && (
                        <div>
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Framework</div>
                          <div className="text-sm font-medium text-surface-on dark:text-gray-100 capitalize">
                            {netlifyInfo.deployStatus.framework}
                          </div>
                        </div>
                      )}
                      {netlifyInfo.deployStatus.error_message && (
                        <div className="md:col-span-2">
                          <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Error Message</div>
                          <div className="text-sm font-medium text-red-600 dark:text-red-400">
                            {netlifyInfo.deployStatus.error_message}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Site Details from API */}
                {netlifyInfo.siteDetails && (
                  <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Site Details</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Site Name</div>
                        <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.siteDetails.name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Site URL</div>
                        <div className="text-sm font-medium text-primary break-all">{netlifyInfo.siteDetails.url || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">SSL URL</div>
                        <div className="text-sm font-medium text-primary break-all">{netlifyInfo.siteDetails.ssl_url || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Plan</div>
                        <div className="text-sm font-medium text-surface-on dark:text-gray-100 capitalize">
                          {netlifyInfo.siteDetails.plan || 'N/A'}
                        </div>
                      </div>
                      {netlifyInfo.siteDetails.build_settings && (
                        <>
                          <div>
                            <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Build Provider</div>
                            <div className="text-sm font-medium text-surface-on dark:text-gray-100 capitalize">
                              {netlifyInfo.siteDetails.build_settings.provider || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Repository Branch</div>
                            <div className="text-sm font-medium text-surface-on dark:text-gray-100">
                              {netlifyInfo.siteDetails.build_settings.repo_branch || 'N/A'}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Site Information */}
                <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Environment Information</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Site ID</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono">{netlifyInfo.siteInfo?.siteId || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Deploy URL</div>
                      <div className="text-sm font-medium text-primary break-all">{netlifyInfo.siteInfo?.deployUrl || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Deploy ID</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono">{netlifyInfo.siteInfo?.deployId || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Context</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 capitalize">{netlifyInfo.siteInfo?.context || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Branch</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.siteInfo?.branch || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Commit Ref</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono text-xs">{netlifyInfo.siteInfo?.commitRef || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Build ID</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono">{netlifyInfo.siteInfo?.buildId || 'N/A'}</div>
                    </div>
                    {netlifyInfo.apiStatus && (
                      <div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">API Status</div>
                        <div className="text-sm font-medium">
                          {netlifyInfo.apiStatus.netlifyApiAvailable ? (
                            <span className="text-green-600 dark:text-green-400">✓ API Connected</span>
                          ) : (
                            <span className="text-yellow-600 dark:text-yellow-400">⚠ API Token Not Configured</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* System Information */}
                <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                  <div className="flex items-center gap-2 mb-4">
                    <Server className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">System Information</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Node Version</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.system?.nodeVersion || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Platform</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.system?.platform || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Architecture</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.system?.arch || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Uptime</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">
                        {netlifyInfo.system?.uptime ? `${Math.floor(netlifyInfo.system.uptime / 60)} minutes` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Process ID</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono">{netlifyInfo.system?.pid || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Working Directory</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono text-xs break-all">{netlifyInfo.system?.cwd || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Executable Path</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono text-xs break-all">{netlifyInfo.system?.execPath || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Region</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.siteInfo?.region || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Netlify Environment</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.siteInfo?.netlifyEnv || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Build Time</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">
                        {netlifyInfo.siteInfo?.netlifyBuildTime ? new Date(netlifyInfo.siteInfo.netlifyBuildTime).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Last Updated</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">
                        {netlifyInfo.timestamp ? new Date(netlifyInfo.timestamp).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Memory Usage */}
                {netlifyInfo.system?.memoryUsage && (
                  <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                    <div className="flex items-center gap-2 mb-4">
                      <Server className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Memory Usage</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Resident Set Size (RSS)</div>
                        <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.system.memoryUsage.rss}</div>
                      </div>
                      <div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Heap Total</div>
                        <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.system.memoryUsage.heapTotal}</div>
                      </div>
                      <div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Heap Used</div>
                        <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.system.memoryUsage.heapUsed}</div>
                      </div>
                      <div>
                        <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">External</div>
                        <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.system.memoryUsage.external}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Functions */}
                <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Netlify Functions</h2>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-surface-on-variant dark:text-gray-400">
                      Total Functions: <span className="font-medium text-surface-on dark:text-gray-100">{netlifyInfo.functions?.functionCount || 0}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {netlifyInfo.functions?.availableFunctions?.map((func: string) => (
                      <div key={func} className="bg-surface-container-high dark:bg-gray-600 rounded-lg p-3 border border-surface-outline-variant">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-surface-on dark:text-gray-100">{func}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Environment Variables */}
                <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Environment Variables</h2>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-surface-on-variant dark:text-gray-400">
                      Total Variables: <span className="font-medium text-surface-on dark:text-gray-100">{netlifyInfo.environmentVariables?.count || 0}</span>
                    </div>
                    <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                      (Only variable names shown for security)
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                    {netlifyInfo.environmentVariables?.names?.map((varName: string) => (
                      <div key={varName} className="bg-surface-container-high dark:bg-gray-600 rounded-lg px-3 py-2 border border-surface-outline-variant">
                        <span className="text-xs font-mono text-surface-on dark:text-gray-100">{varName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Request Information */}
                <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                  <div className="flex items-center gap-2 mb-4">
                    <Code className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Request Information</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Function Name</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono">{netlifyInfo.request?.functionName || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Request ID</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono text-xs">{netlifyInfo.request?.requestId || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">HTTP Method</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100">{netlifyInfo.request?.httpMethod || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Path</div>
                      <div className="text-sm font-medium text-surface-on dark:text-gray-100 font-mono">{netlifyInfo.request?.path || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Important: Rollback Information */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Important: About Rollbacks</h3>
                      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                        <p>
                          <strong>Application Rollback:</strong> Rolling back a deployment only affects your application code (frontend/backend). 
                          <strong className="text-blue-900 dark:text-blue-100"> All database data remains intact.</strong>
                        </p>
                        <p>
                          <strong>Data Safety:</strong> If you rollback to a month-old deployment, all data created in the meantime (new users, claims, etc.) 
                          will still exist in your Neon database. The old code will see and use all current data.
                        </p>
                        <p>
                          <strong>Compatibility Warning:</strong> If the old code expects a different database schema (different columns, tables, etc.), 
                          you may encounter errors. Always test rollbacks in a staging environment first.
                        </p>
                        <p className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                          <strong>Database Backup:</strong> Neon automatically backs up your database with point-in-time recovery. 
                          If you need to restore the database itself (not just the code), use Neon's restore feature in their dashboard 
                          or create a database branch from a specific point in time.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deployment History & Rollback */}
                <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Deployment History</h2>
                    </div>
                    <Button 
                      onClick={fetchNetlifyDeploys} 
                      variant="outlined" 
                      icon={<RefreshCw className={`h-4 w-4 ${netlifyDeploysLoading ? 'animate-spin' : ''}`} />}
                    >
                      Refresh
                    </Button>
                  </div>
                  {netlifyDeploysLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-3 text-surface-on-variant dark:text-gray-400">Loading deployments...</span>
                    </div>
                  ) : netlifyDeploys?.success && netlifyDeploys.deployments ? (
                    <div className="space-y-3">
                      <div className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
                        {netlifyDeploys.count} recent deployments. Rollback to any previous version if issues occur.
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-surface-container-high dark:bg-gray-600 border-b border-surface-outline-variant">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">State</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Branch</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Commit</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Deployed</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-600">
                            {netlifyDeploys.deployments.map((deploy: any) => (
                              <tr key={deploy.id} className="hover:bg-surface-container-high dark:hover:bg-gray-600">
                                <td className="px-4 py-3 text-sm">
                                  {deploy.is_published ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="text-green-600 dark:text-green-400 font-medium">● Published</span>
                                    </span>
                                  ) : deploy.state === 'ready' ? (
                                    <span className="text-surface-on dark:text-gray-100">Ready</span>
                                  ) : deploy.state === 'error' ? (
                                    <span className="text-red-600 dark:text-red-400">Error</span>
                                  ) : (
                                    <span className="text-surface-on-variant dark:text-gray-400 capitalize">{deploy.state}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{deploy.branch || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm">
                                  {deploy.commit_ref ? (
                                    <a 
                                      href={deploy.commit_url || '#'} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline font-mono text-xs"
                                    >
                                      {deploy.commit_ref.substring(0, 7)}
                                    </a>
                                  ) : (
                                    <span className="text-surface-on-variant dark:text-gray-400">N/A</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">
                                  {deploy.published_at 
                                    ? new Date(deploy.published_at).toLocaleString()
                                    : deploy.created_at 
                                    ? new Date(deploy.created_at).toLocaleString()
                                    : 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {!deploy.is_published && deploy.state === 'ready' && (
                                    <Button
                                      variant="outlined"
                                      onClick={() => rollbackDeployment(deploy.id)}
                                      className="text-xs"
                                    >
                                      Rollback
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {netlifyDeploys.deployments.length === 0 && (
                        <div className="text-center py-8 text-surface-on-variant dark:text-gray-400">
                          No deployments found. Set NETLIFY_AUTH_TOKEN to view deployment history.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-surface-on-variant dark:text-gray-400">
                      {netlifyDeploys?.error || 'Failed to load deployments. Set NETLIFY_AUTH_TOKEN and SITE_ID to enable rollback.'}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-surface-container dark:bg-gray-700 rounded-xl">
                <AlertCircle className="h-12 w-12 text-surface-outline-variant dark:text-gray-500 mx-auto mb-4 opacity-50" />
                <p className="text-surface-on-variant dark:text-gray-400">Failed to load Netlify information</p>
                <Button onClick={fetchNetlifyInfo} variant="outlined" className="mt-4">Retry</Button>
              </div>
            )}
          </div>
        )}

          {/* Detailed Data Tables */}
          {activeTab !== 'OVERVIEW' && activeTab !== 'NETLIFY' && activeTab !== 'NEON' && (
            <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-3 text-surface-on-variant dark:text-gray-400">Loading...</span>
              </div>
            ) : detailedData && detailedData.length > 0 ? (
              <div className="bg-surface-container dark:bg-gray-700 rounded-xl border border-surface-outline-variant overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-container-high dark:bg-gray-600 border-b border-surface-outline-variant">
                      <tr>
                        {activeTab === 'USERS' && (
                          <>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Email</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Role</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Created</th>
                          </>
                        )}
                        {activeTab === 'HOMEOWNERS' && (
                          <>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Email</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Address</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Builder</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Created</th>
                          </>
                        )}
                        {activeTab === 'CLAIMS' && (
                          <>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Title</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Homeowner</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Status</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Submitted</th>
                          </>
                        )}
                        {activeTab === 'DOCUMENTS' && (
                          <>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Type</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Uploaded By</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Uploaded</th>
                          </>
                        )}
                        {activeTab === 'TASKS' && (
                          <>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Title</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Status</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Assigned</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Due Date</th>
                          </>
                        )}
                        {activeTab === 'MESSAGES' && (
                          <>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Subject</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Read</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-surface-on-variant dark:text-gray-400">Last Message</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-600">
                      {detailedData.slice(0, 100).map((item: any, idx: number) => (
                        <tr key={item.id || idx} className="hover:bg-surface-container-high dark:hover:bg-gray-600">
                          {activeTab === 'USERS' && (
                            <>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.name}</td>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.email}</td>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.role}</td>
                              <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">{formatDate(item.createdAt)}</td>
                            </>
                          )}
                          {activeTab === 'HOMEOWNERS' && (
                            <>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.name}</td>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.email}</td>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100 truncate max-w-xs">{item.address}</td>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.builder || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">{formatDate(item.createdAt)}</td>
                            </>
                          )}
                          {activeTab === 'CLAIMS' && (
                            <>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.title}</td>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.homeownerName || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.status}</td>
                              <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">{formatDate(item.dateSubmitted)}</td>
                            </>
                          )}
                          {activeTab === 'DOCUMENTS' && (
                            <>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.name}</td>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.type}</td>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.uploadedBy || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">{formatDate(item.uploadedAt)}</td>
                            </>
                          )}
                          {activeTab === 'TASKS' && (
                            <>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.title}</td>
                              <td className="px-4 py-3 text-sm">
                                {item.isCompleted ? (
                                  <span className="text-green-600 dark:text-green-400">Completed</span>
                                ) : (
                                  <span className="text-yellow-600 dark:text-yellow-400">Pending</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.assignedToId || 'Unassigned'}</td>
                              <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">{formatDate(item.dueDate)}</td>
                            </>
                          )}
                          {activeTab === 'MESSAGES' && (
                            <>
                              <td className="px-4 py-3 text-sm text-surface-on dark:text-gray-100">{item.subject}</td>
                              <td className="px-4 py-3 text-sm">
                                {item.isRead ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 inline" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 inline" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400">{formatDate(item.lastMessageAt)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detailedData.length > 100 && (
                  <div className="px-4 py-3 text-sm text-surface-on-variant dark:text-gray-400 border-t border-surface-outline-variant">
                    Showing first 100 of {formatNumber(detailedData.length)} records
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-surface-container dark:bg-gray-700 rounded-xl">
                <AlertCircle className="h-12 w-12 text-surface-outline-variant dark:text-gray-500 mx-auto mb-4 opacity-50" />
                <p className="text-surface-on-variant dark:text-gray-400">No data found</p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default BackendDashboard;

