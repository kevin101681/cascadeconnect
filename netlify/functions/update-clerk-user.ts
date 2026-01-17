/**
 * UPDATE CLERK USER - Netlify Function
 * Server-side function to update Clerk users via API
 * 
 * This function is necessary because:
 * 1. Clerk Admin SDK requires server-side API keys (cannot be exposed to client)
 * 2. Updates must be atomic (Clerk first, then DB)
 * 3. Provides centralized error handling for Clerk API failures
 * 
 * Endpoint: /.netlify/functions/update-clerk-user
 * Method: POST
 * Body: { clerkId: string, updates: { firstName?, lastName?, publicMetadata? } }
 * 
 * January 17, 2026
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { Clerk } from '@clerk/backend';

// Initialize Clerk with server API key
const clerk = new Clerk({ 
  secretKey: process.env.CLERK_SECRET_KEY 
});

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { clerkId, updates } = JSON.parse(event.body || '{}');

    if (!clerkId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'clerkId is required' }),
      };
    }

    console.log(`🔧 [update-clerk-user] Updating Clerk user ${clerkId}`, updates);

    // Validate Clerk SDK is configured
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('❌ [update-clerk-user] CLERK_SECRET_KEY not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Clerk authentication not configured. Contact administrator.' 
        }),
      };
    }

    // Update user in Clerk
    const updatedUser = await clerk.users.updateUser(clerkId, {
      firstName: updates.firstName,
      lastName: updates.lastName,
      publicMetadata: updates.publicMetadata || {},
    });

    console.log(`✅ [update-clerk-user] Successfully updated Clerk user ${clerkId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
        }
      }),
    };

  } catch (error: any) {
    console.error('❌ [update-clerk-user] Error:', error);

    // Handle specific Clerk API errors
    if (error.status === 404) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'User not found in Clerk. They may have been deleted.' 
        }),
      };
    }

    if (error.status === 422) {
      return {
        statusCode: 422,
        body: JSON.stringify({ 
          error: 'Invalid update data: ' + (error.message || 'Unknown validation error') 
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to update user: ' + (error.message || 'Unknown error') 
      }),
    };
  }
};
