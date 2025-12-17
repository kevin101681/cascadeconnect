// Better Auth Netlify Function
// This function handles all Better Auth API routes (/api/auth/*)
// Uses Express and serverless-http to convert Better Auth handler to Netlify Function format

const express = require("express");
const serverless = require("serverless-http");

// Better Auth uses ES modules, so we need to use dynamic import
let authHandler = null;
let authInitialized = false;

async function initializeAuth() {
  if (authInitialized) return authHandler;
  
  try {
    // Dynamic import for ES modules
    const { betterAuth } = await import("better-auth");
    const { toNodeHandler } = await import("better-auth/node");
    
    // Get database connection string from environment
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.warn("⚠️ Database URL not found. Better Auth will not work without a database connection.");
    }

    // Better Auth configuration with Neon PostgreSQL database
    const auth = betterAuth({
      database: databaseUrl ? {
        provider: "postgresql",
        url: databaseUrl,
      } : undefined,
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // Set to true in production
      },
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          enabled: !!process.env.GOOGLE_CLIENT_ID,
        },
      },
      // Session configuration
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
      },
      // Base URL for callbacks - use the actual Netlify site URL
      baseURL: process.env.URL || process.env.DEPLOY_URL || process.env.BETTER_AUTH_URL || "https://cascadeconnect.app",
      basePath: "/api/auth",
    });

    // Create Express app wrapper for Better Auth
    const app = express();

    // Add CORS middleware
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Parse JSON body for POST requests
    app.use(express.json());

    // Mount Better Auth handler using toNodeHandler
    app.all("/api/auth/*", toNodeHandler(auth));

    // Convert Express app to Netlify Function using serverless-http
    authHandler = serverless(app, {
      binary: ['image/*', 'application/pdf'],
    });
    
    authInitialized = true;
    return authHandler;
  } catch (error) {
    console.error('Failed to initialize Better Auth:', error);
    throw error;
  }
}

// Get database connection string from environment
const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("⚠️ Database URL not found. Better Auth will not work without a database connection.");
}

// Better Auth configuration with Neon PostgreSQL database
const auth = betterAuth({
  database: databaseUrl ? {
    provider: "postgresql",
    url: databaseUrl,
  } : undefined,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
  },
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  // Base URL for callbacks - use the actual Netlify site URL
  baseURL: process.env.URL || process.env.DEPLOY_URL || process.env.BETTER_AUTH_URL || "https://cascadeconnect.app",
  basePath: "/api/auth",
});

// Create Express app wrapper for Better Auth
const app = express();

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Parse JSON body for POST requests
app.use(express.json());

// Mount Better Auth handler using toNodeHandler
app.all("/api/auth/*", toNodeHandler(auth));

// Convert Express app to Netlify Function using serverless-http
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
});

exports.handler = async (event, context) => {
  // Ensure context.callbackWaitsForEmptyEventLoop is set
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Initialize auth handler if not already done
    const handler = await initializeAuth();
    return await handler(event, context);
  } catch (error) {
    console.error('Better Auth function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
