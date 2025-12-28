/**
 * NETLIFY SERVICE
 * Centralized Netlify API operations
 * Follows .cursorrules: Type safety, error handling, env checks
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface NetlifyDeployment {
  id: string;
  state: string;
  is_published: boolean;
  branch?: string;
  commit_ref?: string;
  commit_url?: string;
  published_at?: string;
  created_at?: string;
}

export interface NetlifyDeploymentsResponse {
  success: boolean;
  deployments?: NetlifyDeployment[];
  count?: number;
  error?: string;
}

export interface NetlifySiteDetails {
  name?: string;
  url?: string;
  ssl_url?: string;
  plan?: string;
  build_settings?: {
    provider?: string;
    repo_branch?: string;
  };
}

export interface NetlifyDeployStatus {
  state: string;
  deploy_time?: number;
  published_at?: string;
  framework?: string;
  error_message?: string;
}

export interface NetlifySiteInfo {
  siteId?: string;
  deployUrl?: string;
  deployId?: string;
  context?: string;
  branch?: string;
  commitRef?: string;
  buildId?: string;
  region?: string;
  netlifyEnv?: string;
  netlifyBuildTime?: string;
}

export interface NetlifySystemInfo {
  nodeVersion?: string;
  platform?: string;
  arch?: string;
  uptime?: number;
  pid?: number;
  cwd?: string;
  execPath?: string;
  memoryUsage?: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
}

export interface NetlifyApiStatus {
  netlifyApiAvailable: boolean;
}

export interface NetlifyFunctionsInfo {
  functionCount: number;
  availableFunctions: string[];
}

export interface NetlifyEnvVars {
  count: number;
  names: string[];
}

export interface NetlifyInfoResponse {
  success: boolean;
  siteInfo?: NetlifySiteInfo;
  deployStatus?: NetlifyDeployStatus;
  siteDetails?: NetlifySiteDetails;
  system?: NetlifySystemInfo;
  apiStatus?: NetlifyApiStatus;
  functions?: NetlifyFunctionsInfo;
  environmentVariables?: NetlifyEnvVars;
  request?: {
    functionName?: string;
    requestId?: string;
    httpMethod?: string;
    path?: string;
  };
  timestamp?: string;
  error?: string;
}

export interface NeonStats {
  success: boolean;
  stats?: {
    databaseSize?: {
      formatted: string;
    };
    connectionStats?: {
      total_connections: number;
      active_connections: number;
      idle_connections: number;
    };
    connectionInfo?: {
      isPooled: boolean;
    };
    queryStats?: {
      transactions_committed: number;
      transactions_rolled_back: number;
      cache_blocks_hit: number;
      disk_blocks_read: number;
      tuples_returned: number;
    };
    tableStats?: Array<{
      tablename: string;
      size: string;
    }>;
    neonExtension?: {
      available: boolean;
      cacheStats?: {
        file_cache_hits: number;
        file_cache_misses: number;
        file_cache_used: string;
        file_cache_hit_ratio: number;
      };
    };
  };
  error?: string;
}

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * Get the base API URL for Netlify functions
 */
function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    throw new Error('Netlify service can only be used in browser environment');
  }

  const isLocalDev = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';

  if (isLocalDev) {
    return 'http://localhost:3000/api';
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const domain = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
  
  return `${protocol}//${domain}/api`;
}

// ==========================================
// NETLIFY OPERATIONS
// ==========================================

/**
 * Fetch Netlify site information
 */
export async function getNetlifyInfo(): Promise<NetlifyInfoResponse> {
  console.log('📊 Fetching Netlify info...');

  try {
    const endpoint = `${getBaseUrl()}/netlify/info`;
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to fetch Netlify information');
    }

    const result = await response.json();
    console.log('✅ Netlify info fetched successfully');
    
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to fetch Netlify info:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Fetch Netlify deployment history
 */
export async function getNetlifyDeploys(): Promise<NetlifyDeploymentsResponse> {
  console.log('📊 Fetching Netlify deployments...');

  try {
    const endpoint = `${getBaseUrl()}/netlify/deploys`;
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to fetch deployments');
    }

    const result = await response.json();
    console.log('✅ Netlify deployments fetched successfully');
    
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to fetch Netlify deployments:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Rollback to a specific deployment
 * @param deployId - The deployment ID to rollback to
 */
export async function rollbackDeployment(deployId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`🔄 Rolling back to deployment: ${deployId}`);

  if (!deployId || !deployId.trim()) {
    console.error('❌ Deploy ID is required');
    return {
      success: false,
      error: 'Deploy ID is required',
    };
  }

  try {
    const endpoint = `${getBaseUrl()}/netlify/deploys`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deploy_id: deployId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to rollback deployment');
    }

    const result = await response.json();
    console.log('✅ Deployment rollback initiated successfully');
    
    return {
      success: true,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to rollback deployment:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Fetch Neon database statistics
 */
export async function getNeonStats(): Promise<NeonStats> {
  console.log('📊 Fetching Neon stats...');

  try {
    const endpoint = `${getBaseUrl()}/neon/stats`;
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to fetch Neon statistics');
    }

    const result = await response.json();
    console.log('✅ Neon stats fetched successfully');
    
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to fetch Neon stats:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Check if Netlify API is configured
 * (by attempting to fetch info)
 */
export async function isNetlifyApiConfigured(): Promise<boolean> {
  const info = await getNetlifyInfo();
  return info.success && !!info.apiStatus?.netlifyApiAvailable;
}

/**
 * Get deployment state display text
 */
export function getDeploymentStateDisplay(state: string, isPublished?: boolean): {
  text: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
} {
  if (isPublished) {
    return { text: 'Published', color: 'green' };
  }
  
  switch (state.toLowerCase()) {
    case 'ready':
      return { text: 'Ready', color: 'gray' };
    case 'building':
      return { text: 'Building', color: 'yellow' };
    case 'error':
      return { text: 'Error', color: 'red' };
    default:
      return { text: state, color: 'gray' };
  }
}

