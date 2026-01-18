/**
 * NETLIFY FUNCTION: PUSH SUBSCRIPTION MANAGEMENT
 * Handles saving and removing push notification subscriptions
 * January 18, 2026
 */

import { Handler } from '@netlify/functions';
import { db } from '../../db';
import { pushSubscriptions } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

interface SubscribeRequest {
  userId: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

interface UnsubscribeRequest {
  userId: string;
  endpoint: string;
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // --- SUBSCRIBE (POST) ---
    if (event.httpMethod === 'POST') {
      const requestData: SubscribeRequest = JSON.parse(event.body || '{}');
      const { userId, subscription } = requestData;

      // Validate required fields
      if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing required fields: userId, subscription.endpoint, subscription.keys' 
          }),
        };
      }

      console.log(`📬 [Push Subscribe] Saving subscription for user ${userId}`);
      console.log(`📡 [Push Subscribe] Endpoint: ${subscription.endpoint.substring(0, 50)}...`);

      // Check if subscription already exists
      const existing = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
        .limit(1);

      if (existing.length > 0) {
        // Update existing subscription
        const [updated] = await db
          .update(pushSubscriptions)
          .set({
            userId,
            p256dhKey: subscription.keys.p256dh,
            authKey: subscription.keys.auth,
            updatedAt: new Date(),
          })
          .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
          .returning();

        console.log(`✅ [Push Subscribe] Updated existing subscription: ${updated.id}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Subscription updated',
            subscriptionId: updated.id,
          }),
        };
      } else {
        // Create new subscription
        const [newSubscription] = await db
          .insert(pushSubscriptions)
          .values({
            userId,
            endpoint: subscription.endpoint,
            p256dhKey: subscription.keys.p256dh,
            authKey: subscription.keys.auth,
          })
          .returning();

        console.log(`✅ [Push Subscribe] Created new subscription: ${newSubscription.id}`);

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Subscription created',
            subscriptionId: newSubscription.id,
          }),
        };
      }
    }

    // --- UNSUBSCRIBE (DELETE) ---
    if (event.httpMethod === 'DELETE') {
      const requestData: UnsubscribeRequest = JSON.parse(event.body || '{}');
      const { userId, endpoint } = requestData;

      // Validate required fields
      if (!userId || !endpoint) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing required fields: userId, endpoint' 
          }),
        };
      }

      console.log(`🗑️ [Push Subscribe] Removing subscription for user ${userId}`);

      // Delete subscription
      const deleted = await db
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, userId),
            eq(pushSubscriptions.endpoint, endpoint)
          )
        )
        .returning();

      if (deleted.length > 0) {
        console.log(`✅ [Push Subscribe] Deleted subscription: ${deleted[0].id}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Subscription removed',
          }),
        };
      } else {
        console.log(`⚠️ [Push Subscribe] Subscription not found`);

        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Subscription not found',
          }),
        };
      }
    }

    // Unsupported method
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  } catch (error) {
    console.error('❌ [Push Subscribe] Error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
