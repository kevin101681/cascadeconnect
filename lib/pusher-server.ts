/**
 * PUSHER SERVER CONFIGURATION
 * Real-time messaging infrastructure for SMS
 * December 29, 2025
 */

import Pusher from 'pusher';

// Singleton instance
let pusherServerInstance: Pusher | null = null;

/**
 * Get or create Pusher server instance
 * Uses credentials from environment variables
 */
export function getPusherServer(): Pusher {
  if (pusherServerInstance) {
    return pusherServerInstance;
  }

  // Get credentials from environment
  const appId = process.env.PUSHER_APP_ID || process.env.VITE_PUSHER_APP_ID || '2096499';
  const key = process.env.PUSHER_KEY || process.env.VITE_PUSHER_KEY || '7d086bfe1d6c16271315';
  const secret = process.env.PUSHER_SECRET || process.env.VITE_PUSHER_SECRET || 'd3031c6b8b9c90a0ab86';
  const cluster = process.env.PUSHER_CLUSTER || process.env.VITE_PUSHER_CLUSTER || 'us2';

  if (!appId || !key || !secret) {
    throw new Error('❌ Pusher server credentials are not configured');
  }

  pusherServerInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  console.log('✅ Pusher server initialized');
  return pusherServerInstance;
}

/**
 * Trigger a real-time event
 * @param channel - Channel name (e.g., 'sms-channel')
 * @param event - Event name (e.g., 'new-message')
 * @param data - Event payload
 */
export async function triggerPusherEvent(
  channel: string,
  event: string,
  data: any
): Promise<void> {
  try {
    const pusher = getPusherServer();
    await pusher.trigger(channel, event, data);
    console.log(`📡 Pusher event triggered: ${channel}/${event}`);
  } catch (error) {
    console.error('❌ Failed to trigger Pusher event:', error);
    throw error;
  }
}

/**
 * Trigger SMS message event
 * Convenience function for SMS-specific events
 */
export async function triggerSmsMessageEvent(data: {
  id: string;
  threadId: string;
  homeownerId: string;
  direction: 'inbound' | 'outbound';
  body: string;
  phoneNumber: string;
  createdAt: Date;
}): Promise<void> {
  await triggerPusherEvent('sms-channel', 'new-message', data);
}

