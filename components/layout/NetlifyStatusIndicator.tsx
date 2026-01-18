import React, { useState, useEffect } from 'react';

type DeployStatus = 'success' | 'building' | 'failed' | 'unknown';

const NetlifyStatusIndicator: React.FC = () => {
  const siteId = import.meta.env.VITE_NETLIFY_SITE_ID;
  const [status, setStatus] = useState<DeployStatus>('unknown');

  // Don't render if no site ID is configured
  if (!siteId) {
    return null;
  }

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Use backend proxy to avoid CORS header restrictions
        const res = await fetch('/.netlify/functions/deploy-status');
        const data = await res.json();
        
        if (data.status && data.status !== 'unknown') {
          setStatus(data.status as DeployStatus);
        } else {
          setStatus('unknown');
        }
      } catch (error) {
        console.error('Status check failed:', error);
        setStatus('unknown');
      }
    };

    // Check immediately
    checkStatus();

    // Poll every 2 seconds
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [siteId]);

  // Don't render unknown status
  if (status === 'unknown') {
    return null;
  }

  const statusColors: Record<DeployStatus, string> = {
    success: 'bg-green-500',
    building: 'bg-yellow-400 animate-pulse',
    failed: 'bg-red-500',
    unknown: 'bg-gray-400'
  };

  const statusTitles: Record<DeployStatus, string> = {
    success: 'Deploy successful',
    building: 'Deploy in progress',
    failed: 'Deploy failed',
    unknown: 'Deploy status unknown'
  };

  return (
    <div 
      className={`w-3 h-3 rounded-full border border-white/20 ${statusColors[status]}`}
      title={statusTitles[status]}
      aria-label={statusTitles[status]}
    />
  );
};

export default NetlifyStatusIndicator;
