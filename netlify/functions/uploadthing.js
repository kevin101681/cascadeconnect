// Netlify Function for UploadThing
// Proxies requests directly to UploadThing's API

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-uploadthing-api-key',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    };
  }

  try {
    // Check for UploadThing credentials
    if (!process.env.UPLOADTHING_APP_ID || !process.env.UPLOADTHING_SECRET) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'UploadThing not configured',
          message: 'UPLOADTHING_APP_ID and UPLOADTHING_SECRET must be set in Netlify environment variables.',
        }),
      };
    }

    // Extract the action type and slug from the path
    const path = event.path.replace('/.netlify/functions/uploadthing', '').replace('/api/uploadthing', '');
    const queryParams = event.queryStringParameters || {};
    const actionType = queryParams.actionType || 'upload';
    const slug = queryParams.slug || 'attachmentUploader';

    // UploadThing API endpoint
    const uploadthingApiUrl = `https://api.uploadthing.com/v6/${process.env.UPLOADTHING_APP_ID}${path}`;

    // Prepare headers
    const headers = {
      'x-uploadthing-api-key': process.env.UPLOADTHING_SECRET,
      'x-uploadthing-version': '6.0.0',
    };

    // Copy relevant headers from the incoming request
    if (event.headers['content-type']) {
      headers['content-type'] = event.headers['content-type'];
    }
    if (event.headers['authorization']) {
      headers['authorization'] = event.headers['authorization'];
    }
    if (event.headers['x-uploadthing-behavior']) {
      headers['x-uploadthing-behavior'] = event.headers['x-uploadthing-behavior'];
    }

    // Proxy the request to UploadThing's API
    const response = await fetch(uploadthingApiUrl, {
      method: event.httpMethod,
      headers: headers,
      body: event.body || undefined,
    });

    const contentType = response.headers.get('content-type') || 'application/json';
    const responseBody = contentType.includes('application/json') 
      ? await response.json() 
      : await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-uploadthing-api-key',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error('UploadThing function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Upload failed',
        message: error.message || 'Internal server error',
      }),
    };
  }
};


