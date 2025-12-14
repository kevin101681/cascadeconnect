// Netlify Deployments Function - Lists deployments and allows rollback
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
  const siteId = process.env.SITE_ID;

  if (!netlifyToken || !siteId) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'Netlify API token or Site ID not configured',
        deployments: [],
        message: 'Set NETLIFY_AUTH_TOKEN and SITE_ID environment variables to enable deployment management'
      })
    };
  }

  try {
    // Handle GET - List deployments
    if (event.httpMethod === 'GET') {
      const page = event.queryStringParameters?.page || '1';
      const perPage = event.queryStringParameters?.per_page || '10';
      
      const response = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/deploys?page=${page}&per_page=${perPage}`,
        {
          headers: {
            'Authorization': `Bearer ${netlifyToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch deployments: ${response.status}`);
      }

      const deployments = await response.json();
      
      // Get current published deploy
      const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
        headers: {
          'Authorization': `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      let publishedDeployId = null;
      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        publishedDeployId = siteData.published_deploy?.id || null;
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          deployments: deployments.map(deploy => ({
            id: deploy.id,
            state: deploy.state,
            branch: deploy.branch,
            commit_ref: deploy.commit_ref,
            commit_url: deploy.commit_url,
            title: deploy.title,
            created_at: deploy.created_at,
            published_at: deploy.published_at,
            deploy_time: deploy.deploy_time,
            error_message: deploy.error_message,
            framework: deploy.framework,
            ssl_url: deploy.ssl_url,
            is_published: deploy.id === publishedDeployId,
            context: deploy.context
          })),
          published_deploy_id: publishedDeployId,
          count: deployments.length
        })
      };
    }

    // Handle POST - Rollback to a specific deployment
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const deployId = body.deploy_id;

      if (!deployId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
          },
          body: JSON.stringify({
            success: false,
            error: 'deploy_id is required'
          })
        };
      }

      // Restore/rollback to the specified deployment
      const response = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deployId}/restore`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${netlifyToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to rollback deployment: ${response.status}`);
      }

      const result = await response.json();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          message: 'Deployment rollback initiated',
          deploy: {
            id: result.id,
            state: result.state,
            branch: result.branch,
            commit_ref: result.commit_ref
          }
        })
      };
    }

    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error("NETLIFY DEPLOYS ERROR:", {
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ 
        success: false,
        error: error.message || "Failed to process deployment request",
        details: error.stack
      })
    };
  }
};
