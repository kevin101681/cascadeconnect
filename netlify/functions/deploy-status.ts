import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Use the server-side env var (NETLIFY_SITE_ID)
  // Fallback to VITE_ version if that's where it was set
  const siteId = process.env.NETLIFY_SITE_ID || process.env.VITE_NETLIFY_SITE_ID;

  if (!siteId) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Site ID not configured', status: 'unknown' }) 
    };
  }

  try {
    // Check the badge URL
    const response = await fetch(`https://api.netlify.com/api/v1/badges/${siteId}/deploy-status`, {
      method: 'HEAD',
    });

    const disposition = response.headers.get('content-disposition') || '';
    let status = 'unknown';

    // Check for exact badge filename patterns in Content-Disposition
    if (disposition.includes('badge-success')) {
      status = 'success';
    } else if (disposition.includes('badge-building')) {
      status = 'building';
    } else if (disposition.includes('badge-failed') || disposition.includes('badge-error')) {
      status = 'failed';
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify({ status }),
    };
  } catch (error) {
    console.error('Deploy status check failed:', error);
    return { 
      statusCode: 500, 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'unknown', error: 'Failed to check deploy status' }) 
    };
  }
};
