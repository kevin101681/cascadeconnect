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
        const url = `https://api.netlify.com/api/v1/badges/${siteId}/deploy-status`;
        const response = await fetch(url, { method: 'HEAD' });
        
        const contentDisposition = response.headers.get('Content-Disposition');
        
        if (contentDisposition) {
          if (contentDisposition.includes('success')) {
            setStatus('success');
          } else if (contentDisposition.includes('building')) {
            setStatus('building');
          } else if (contentDisposition.includes('failed')) {
            setStatus('failed');
          } else {
            setStatus('unknown');
          }
        }
      } catch (error) {
        console.error('Failed to check Netlify status:', error);
        setStatus('unknown');
      }
    };

    // Check immediately
    checkStatus();

    // Poll every 10 seconds
    const interval = setInterval(checkStatus, 10000);

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
