// Netlify Info Function - Fetches Netlify site information
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get Netlify site information from environment variables and context
    const siteInfo = {
      siteId: process.env.SITE_ID || 'Not available',
      siteName: process.env.SITE_NAME || process.env.NETLIFY_SITE_NAME || 'Not available',
      deployUrl: process.env.DEPLOY_PRIME_URL || process.env.URL || 'Not available',
      deployId: process.env.DEPLOY_ID || 'Not available',
      context: process.env.CONTEXT || 'production',
      branch: process.env.BRANCH || 'main',
      commitRef: process.env.COMMIT_REF || 'Not available',
      commitMsg: process.env.COMMIT_MSG || 'Not available',
      buildId: process.env.BUILD_ID || 'Not available',
      nodeVersion: process.version,
      region: process.env.AWS_REGION || 'Not available',
      netlifyVersion: process.env.NETLIFY_VERSION || 'Not available',
      netlifyEnv: process.env.NETLIFY_ENV || process.env.NODE_ENV || 'Not available',
      netlifyBuildTime: process.env.NETLIFY_BUILD_TIME || 'Not available',
      netlifyBuildId: process.env.NETLIFY_BUILD_ID || process.env.BUILD_ID || 'Not available'
    };

    // Try to fetch deploy status from Netlify API if token is available
    let deployStatus = null;
    const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
    const siteId = process.env.SITE_ID;
    const currentDeployId = process.env.DEPLOY_ID;

    if (netlifyToken && siteId && currentDeployId) {
      try {
        const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys/${currentDeployId}`, {
          headers: {
            'Authorization': `Bearer ${netlifyToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (deployResponse.ok) {
          const deployData = await deployResponse.json();
          deployStatus = {
            state: deployData.state || 'unknown',
            published_at: deployData.published_at,
            created_at: deployData.created_at,
            updated_at: deployData.updated_at,
            deploy_time: deployData.deploy_time,
            build_id: deployData.build_id,
            branch: deployData.branch,
            commit_ref: deployData.commit_ref,
            commit_url: deployData.commit_url,
            error_message: deployData.error_message,
            title: deployData.title,
            review_id: deployData.review_id,
            review_url: deployData.review_url,
            screenshot_url: deployData.screenshot_url,
            site_id: deployData.site_id,
            ssl_url: deployData.ssl_url,
            draft: deployData.draft,
            required: deployData.required,
            required_functions: deployData.required_functions,
            framework: deployData.framework
          };
        }
      } catch (apiError) {
        console.warn('Could not fetch deploy status from Netlify API:', apiError.message);
      }
    }

    // Try to fetch site information from Netlify API
    let siteDetails = null;
    if (netlifyToken && siteId) {
      try {
        const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
          headers: {
            'Authorization': `Bearer ${netlifyToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (siteResponse.ok) {
          const siteData = await siteResponse.json();
          siteDetails = {
            name: siteData.name,
            url: siteData.url,
            ssl_url: siteData.ssl_url,
            admin_url: siteData.admin_url,
            deploy_hook: siteData.deploy_hook ? 'Configured' : 'Not configured',
            screenshot_url: siteData.screenshot_url,
            created_at: siteData.created_at,
            updated_at: siteData.updated_at,
            published_deploy: siteData.published_deploy ? {
              id: siteData.published_deploy.id,
              state: siteData.published_deploy.state,
              published_at: siteData.published_deploy.published_at
            } : null,
            build_settings: siteData.build_settings ? {
              provider: siteData.build_settings.provider,
              repo_url: siteData.build_settings.repo_url,
              repo_branch: siteData.build_settings.repo_branch,
              cmd: siteData.build_settings.cmd,
              dir: siteData.build_settings.dir
            } : null,
            capabilities: siteData.capabilities || {},
            plan: siteData.plan || 'unknown'
          };
        }
      } catch (apiError) {
        console.warn('Could not fetch site details from Netlify API:', apiError.message);
      }
    }

    // Get environment variable names (not values for security)
    const envVarNames = Object.keys(process.env)
      .filter(key => 
        key.startsWith('VITE_') || 
        key.startsWith('SENDGRID_') || 
        key.startsWith('SMTP_') || 
        key.startsWith('DATABASE_') ||
        key.startsWith('STACK_') ||
        key.startsWith('NEON_') ||
        key === 'NODE_ENV'
      )
      .sort();

    // Get Netlify Functions information
    const functionsInfo = {
      availableFunctions: [
        'email-send',
        'email-inbound',
        'email-analytics',
        'cbsbooks-invoices',
        'cbsbooks-expenses',
        'cbsbooks-clients',
        'upload',
        'netlify-info',
        'vapi-webhook'
      ],
      functionCount: 9
    };

    // Get request information
    const requestInfo = {
      headers: event.headers || {},
      httpMethod: event.httpMethod,
      path: event.path,
      queryStringParameters: event.queryStringParameters || {},
      requestId: context.requestId || 'Not available',
      functionName: context.functionName || 'netlify-info',
      awsRequestId: context.awsRequestId || 'Not available'
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        siteInfo,
        deployStatus,
        siteDetails,
        environmentVariables: {
          names: envVarNames,
          count: envVarNames.length
        },
        functions: functionsInfo,
        request: requestInfo,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime(),
          memoryUsage: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB'
          },
          cpuUsage: process.cpuUsage ? {
            user: process.cpuUsage().user + ' μs',
            system: process.cpuUsage().system + ' μs'
          } : 'Not available',
          pid: process.pid,
          title: process.title,
          execPath: process.execPath,
          cwd: process.cwd()
        },
        apiStatus: {
          netlifyApiAvailable: !!netlifyToken,
          siteIdConfigured: !!siteId,
          deployIdConfigured: !!currentDeployId
        }
      })
    };
  } catch (error) {
    console.error("NETLIFY INFO ERROR:", {
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({ 
        error: error.message || "Failed to fetch Netlify information",
        details: error.stack
      })
    };
  }
};

