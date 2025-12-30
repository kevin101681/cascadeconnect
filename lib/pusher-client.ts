/**
 * PUSHER CLIENT CONFIGURATION
 * Real-time messaging infrastructure for SMS (client-side)
 * December 29, 2025
 */

import PusherJS from 'pusher-js';

// Singleton instance
let pusherClientInstance: PusherJS | null = null;

/**
 * Get or create Pusher client instance
 * Uses credentials from environment variables
 */
export function getPusherClient(): PusherJS {
  if (pusherClientInstance) {
    return pusherClientInstance;
  }

  // Get credentials from environment
  const key = import.meta.env.VITE_PUSHER_KEY || '7d086bfe1d6c16271315';
  const cluster = import.meta.env.VITE_PUSHER_CLUSTER || 'us2';

  if (!key) {
    throw new Error('❌ Pusher client key is not configured');
  }

  pusherClientInstance = new PusherJS(key, {
    cluster,
    forceTLS: true,
  });

  console.log('✅ Pusher client initialized');
  return pusherClientInstance;
}

/**
 * Subscribe to SMS channel and listen for new messages
 * @param onMessage - Callback function to handle new messages
 * @returns Unsubscribe function
 */
export function subscribeSmsChannel(
  onMessage: (data: {
    id: string;
    threadId: string;
    homeownerId: string;
    direction: 'inbound' | 'outbound';
    body: string;
    phoneNumber: string;
    createdAt: Date;
  }) => void
): () => void {
  const pusher = getPusherClient();
  const channel = pusher.subscribe('sms-channel');

  channel.bind('new-message', (data: any) => {
    console.log('📨 New SMS message received via Pusher:', data);
    onMessage(data);
  });

  // Return unsubscribe function
  return () => {
    channel.unbind('new-message');
    pusher.unsubscribe('sms-channel');
    console.log('🔌 Unsubscribed from SMS channel');
  };
}

/**
 * Disconnect Pusher client
 */
export function disconnectPusher(): void {
  if (pusherClientInstance) {
    pusherClientInstance.disconnect();
    pusherClientInstance = null;
    console.log('🔌 Pusher client disconnected');
  }
}

