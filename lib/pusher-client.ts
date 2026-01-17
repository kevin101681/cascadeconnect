/**
 * PUSHER CLIENT CONFIGURATION
 * Real-time messaging infrastructure for SMS (client-side)
 * December 29, 2025
 * 
 * ⚡️ CRITICAL: Singleton pattern ensures ONE shared connection across all components
 */

import PusherJS from 'pusher-js';

// ⚡️ SINGLETON: Global instance shared across all components
let pusherClientInstance: PusherJS | null = null;

/**
 * Get or create Pusher client instance (SINGLETON)
 * Uses credentials from environment variables
 * 
 * ⚡️ This function is called by ChatWidget, ChatSidebar, and ChatWindow
 * They all share the SAME Pusher connection via this singleton
 */
export function getPusherClient(): PusherJS {
  if (pusherClientInstance) {
    console.log('♻️ [Pusher] Reusing existing singleton instance');
    return pusherClientInstance;
  }

  // Get credentials from environment (supports both Vite and Next.js)
  const key = 
    (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_PUSHER_KEY) ||
    import.meta.env.VITE_PUSHER_KEY || 
    '7d086bfe1d6c16271315';
  
  const cluster = 
    (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_PUSHER_CLUSTER) ||
    import.meta.env.VITE_PUSHER_CLUSTER || 
    'us2';

  if (!key) {
    throw new Error('❌ Pusher client key is not configured');
  }

  console.log('🆕 [Pusher] Creating NEW singleton instance', {
    key: key.substring(0, 8) + '...',
    cluster
  });

  pusherClientInstance = new PusherJS(key, {
    cluster,
    forceTLS: true,
  });

  console.log('✅ [Pusher] Singleton client initialized and stored globally');
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
 * Subscribe to calls channel and listen for new/updated calls
 * @param onCallUpdate - Callback function to handle call updates
 * @returns Unsubscribe function
 */
export function subscribeCallsChannel(
  onCallUpdate: (data: {
    callId: string;
    type: 'new-call' | 'call-updated' | 'claim-created';
    homeownerId?: string | null;
    claimId?: string | null;
  }) => void
): () => void {
  const pusher = getPusherClient();
  const channel = pusher.subscribe('calls-channel');

  channel.bind('call-update', (data: any) => {
    console.log('📞 Call update received via Pusher:', data);
    onCallUpdate(data);
  });

  // Return unsubscribe function
  return () => {
    channel.unbind('call-update');
    pusher.unsubscribe('calls-channel');
    console.log('🔌 Unsubscribed from calls channel');
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

