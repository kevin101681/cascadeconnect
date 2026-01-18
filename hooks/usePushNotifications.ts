/**
 * PUSH NOTIFICATIONS HOOK
 * React hook for managing push notification subscriptions
 * Handles service worker registration, permission requests, and subscription management
 * January 18, 2026
 */

import { useState, useEffect, useCallback } from 'react';

interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribeToPush: (userId: string) => Promise<void>;
  unsubscribeFromPush: (userId: string) => Promise<void>;
  requestPermission: () => Promise<NotificationPermission>;
}

/**
 * Hook for managing push notification subscriptions
 * 
 * @returns {UsePushNotificationsResult} Push notification state and methods
 * 
 * @example
 * ```tsx
 * const { subscribeToPush, permission, isSubscribed } = usePushNotifications();
 * 
 * useEffect(() => {
 *   if (permission === 'granted' && !isSubscribed && userId) {
 *     subscribeToPush(userId);
 *   }
 * }, [permission, isSubscribed, userId]);
 * ```
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  /**
   * Request notification permission from the user
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      if (!isSupported) {
        throw new Error('Push notifications are not supported in this browser');
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request permission';
      setError(message);
      console.error('[usePushNotifications] Permission request error:', err);
      return 'denied';
    }
  }, [isSupported]);

  /**
   * Register service worker and subscribe to push notifications
   * 
   * @param userId - Clerk ID of the user to subscribe
   */
  const subscribeToPush = useCallback(
    async (userId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!isSupported) {
          throw new Error('Push notifications are not supported in this browser');
        }

        // Check permission
        if (permission !== 'granted') {
          const newPermission = await requestPermission();
          if (newPermission !== 'granted') {
            throw new Error('Notification permission denied');
          }
        }

        console.log('[usePushNotifications] Registering service worker...');

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        console.log('[usePushNotifications] Service worker registered:', registration);

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();

        if (existingSubscription) {
          console.log('[usePushNotifications] Already subscribed, updating subscription...');
          // Update existing subscription on the server
          await sendSubscriptionToServer(userId, existingSubscription);
          setIsSubscribed(true);
          return;
        }

        // Get VAPID public key from environment
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) {
          throw new Error('VAPID public key not configured');
        }

        console.log('[usePushNotifications] Subscribing to push manager...');

        // Convert VAPID key to Uint8Array (BufferSource for PushManager)
        const applicationServerKey: BufferSource = urlBase64ToUint8Array(vapidPublicKey);

        // Subscribe to push manager
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        console.log('[usePushNotifications] Push subscription created:', subscription);

        // Send subscription to server
        await sendSubscriptionToServer(userId, subscription);

        setIsSubscribed(true);
        console.log('✅ [usePushNotifications] Successfully subscribed to push notifications');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to subscribe';
        setError(message);
        console.error('[usePushNotifications] Subscription error:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, permission, requestPermission]
  );

  /**
   * Unsubscribe from push notifications
   * 
   * @param userId - Clerk ID of the user to unsubscribe
   */
  const unsubscribeFromPush = useCallback(
    async (userId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!isSupported) {
          throw new Error('Push notifications are not supported in this browser');
        }

        console.log('[usePushNotifications] Unsubscribing from push notifications...');

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Get existing subscription
        const subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          console.log('[usePushNotifications] No subscription found');
          setIsSubscribed(false);
          return;
        }

        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove subscription from server
        await removeSubscriptionFromServer(userId, subscription.endpoint);

        setIsSubscribed(false);
        console.log('✅ [usePushNotifications] Successfully unsubscribed from push notifications');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to unsubscribe';
        setError(message);
        console.error('[usePushNotifications] Unsubscribe error:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported]
  );

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribeToPush,
    unsubscribeFromPush,
    requestPermission,
  };
}

/**
 * Send subscription to backend
 */
async function sendSubscriptionToServer(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  const subscriptionJson = subscription.toJSON();

  const response = await fetch('/.netlify/functions/push-subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      subscription: subscriptionJson,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to save subscription');
  }

  console.log('[usePushNotifications] Subscription saved to server');
}

/**
 * Remove subscription from backend
 */
async function removeSubscriptionFromServer(
  userId: string,
  endpoint: string
): Promise<void> {
  const response = await fetch('/.netlify/functions/push-subscribe', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      endpoint,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to remove subscription');
  }

  console.log('[usePushNotifications] Subscription removed from server');
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
